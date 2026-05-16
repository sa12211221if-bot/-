// Designer OS — Telegram Bot integration
//
// Two paths:
//  1. CLIENT-ONLY (works offline-first, simple):
//     - User creates bot via @BotFather, pastes token in settings
//     - "Detect Chat ID" calls /getUpdates and pulls the chat ID from the latest message
//     - Sending messages → direct browser fetch to api.telegram.org (allowed CORS)
//     - Polling for incoming messages → /getUpdates with long-poll loop
//
//  2. SERVERLESS WEBHOOK (recommended for "always-on"):
//     - Deploy /api/telegram-webhook.js to Vercel/Cloudflare
//     - Set webhook to that URL (one-click button in Settings)
//     - Webhook forwards new messages to a queue → app pulls via fetch
//     - Path here uses settings.telegramServerUrl as the queue endpoint

import { getState, setSetting, upsert } from './../store.js';
import { uid } from './../db.js';

const BASE = 'https://api.telegram.org';

// ============================================================
// Low-level
// ============================================================

async function tg(method, params = {}) {
  const s = getState();
  if (!s.telegramToken) throw new Error('Telegram bot token missing');
  const url = `${BASE}/bot${s.telegramToken}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const json = await res.json();
  if (!json.ok) throw new Error('Telegram: ' + (json.description || 'unknown error'));
  return json.result;
}

// ============================================================
// Setup helpers
// ============================================================

/**
 * Get bot info to verify token.
 */
export async function getMe() {
  try {
    const me = await tg('getMe');
    return { ok: true, name: me.first_name, username: me.username };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Auto-detect the user's Chat ID by fetching recent /getUpdates.
 * The user must send a message to the bot first.
 */
export async function detectChatId() {
  const updates = await tg('getUpdates', { limit: 20 });
  if (!updates || !updates.length) {
    throw new Error('No messages yet. Send any message to your bot first, then try again.');
  }
  // Pick the latest message's chat id
  const last = updates[updates.length - 1];
  const chatId = last.message?.chat?.id || last.edited_message?.chat?.id;
  if (!chatId) throw new Error('No chat found in updates.');
  await setSetting('telegramChatId', String(chatId));
  return chatId;
}

/**
 * Send a plain text message to the user.
 */
export async function sendMessage(text, opts = {}) {
  const s = getState();
  if (!s.telegramChatId) throw new Error('Telegram chat ID not set');
  return tg('sendMessage', {
    chat_id: s.telegramChatId,
    text,
    parse_mode: opts.parseMode || 'HTML',
    disable_web_page_preview: opts.noPreview ?? true
  });
}

export async function testSend() {
  const s = getState();
  return sendMessage(s.lang === 'en' ? '✅ Designer OS connected.' : '✅ Designer OS متصل بنجاح.');
}

/**
 * Set a webhook URL (for serverless backend) — clears polling.
 */
export async function setWebhook(url) {
  return tg('setWebhook', { url });
}

export async function deleteWebhook() {
  return tg('deleteWebhook');
}

// ============================================================
// Polling for incoming messages (no server needed)
// ============================================================

let pollingTimer = null;
let pollingOffset = 0;
let pollingActive = false;

/**
 * Process a single update — captures text into knowledge inbox, handles commands.
 */
async function handleUpdate(update) {
  const msg = update.message || update.edited_message;
  if (!msg) return;
  const text = msg.text || msg.caption || '';
  const voice = msg.voice;
  const photo = msg.photo;

  // Slash commands respond inline
  if (text.startsWith('/')) {
    const cmd = text.split(' ')[0].toLowerCase();
    const arg = text.slice(cmd.length).trim();

    if (cmd === '/start' || cmd === '/help') {
      await sendMessage([
        '👋 Designer OS Bot',
        '',
        'أرسل أي رسالة → تُحفظ في صندوق الالتقاط',
        'الأوامر:',
        '/report — تقرير اليوم',
        '/today — مهامك اليوم',
        '/overdue — المتأخرة',
        '/add &lt;المهمة&gt; — أضف مهمة'
      ].join('\n'));
      return;
    }

    if (cmd === '/today') {
      const { sel } = await import('./../store.js');
      const tasks = sel.todayTasks();
      const body = tasks.length
        ? '📋 مهام اليوم:\n' + tasks.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}`).join('\n')
        : '✅ لا توجد مهام لليوم';
      await sendMessage(body);
      return;
    }

    if (cmd === '/overdue') {
      const { sel } = await import('./../store.js');
      const overdue = sel.overdueTasks();
      const body = overdue.length
        ? '⚠️ متأخرات (' + overdue.length + '):\n' + overdue.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}`).join('\n')
        : '🎯 لا متأخرات!';
      await sendMessage(body);
      return;
    }

    if (cmd === '/report') {
      const { generateDailySummary } = await import('./../ai.js');
      const summary = generateDailySummary();
      await sendMessage('📊 ' + summary);
      return;
    }

    if (cmd === '/add' && arg) {
      await upsert('tasks', {
        id: uid(),
        title: arg,
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(new Date().setHours(23, 59, 0, 0)).toISOString(),
        source: 'telegram'
      });
      await sendMessage('✅ تمت الإضافة: ' + arg);
      return;
    }

    await sendMessage('❓ أمر غير معروف. أرسل /help');
    return;
  }

  // Non-command text → save to inbox + knowledge
  if (text) {
    const note = {
      id: uid(),
      content: text,
      type: 'note',
      source: 'telegram',
      category: 'inbox',
      createdAt: msg.date ? msg.date * 1000 : Date.now()
    };
    await upsert('knowledge', note);
    await upsert('inbox', { id: uid(), content: text, type: 'note', source: 'telegram' });
    await sendMessage('💾 تم حفظ في صندوق الالتقاط');
    return;
  }

  if (voice) {
    await sendMessage('🎙️ الرسائل الصوتية لم تُفعّل بعد. أرسل النص.');
    return;
  }

  if (photo) {
    await sendMessage('🖼️ الصور لم تُفعّل بعد. أرسل النص.');
    return;
  }
}

async function pollOnce() {
  try {
    const updates = await tg('getUpdates', {
      offset: pollingOffset,
      timeout: 25,
      allowed_updates: ['message', 'edited_message']
    });
    for (const u of updates) {
      pollingOffset = Math.max(pollingOffset, u.update_id + 1);
      await handleUpdate(u);
    }
  } catch (e) {
    console.error('Telegram poll error:', e);
    // Back off on errors
    await new Promise((r) => setTimeout(r, 5000));
  }
}

async function pollLoop() {
  while (pollingActive) {
    await pollOnce();
    // Small breath between long-polls
    await new Promise((r) => setTimeout(r, 300));
  }
}

/**
 * Start polling. Called on app boot if telegram is configured.
 */
export function startPolling() {
  const s = getState();
  if (!s.telegramToken || !s.telegramChatId) return;
  if (pollingActive) return;
  pollingActive = true;
  pollLoop();
}

export function stopPolling() {
  pollingActive = false;
  if (pollingTimer) clearTimeout(pollingTimer);
}
