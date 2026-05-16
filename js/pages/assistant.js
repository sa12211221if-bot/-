// Designer OS — AI Assistant page (real chat)
// Threads + streaming + slash commands + persistent history.

import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, fmtRelative } from '../i18n.js';
import { getState, sel, upsert, remove, setActiveChatThread } from '../store.js';
import { uid } from '../db.js';
import { streamChat, isAIConfigured, currentProvider } from '../aiClient.js';
import { buildSystemPrompt, expandCommand, commandList, COMMANDS } from '../aiContext.js';
import { navigate } from '../router.js';
import { input, toast, confirmDialog } from '../ui.js';

let abortController = null;
let lastInputValue = '';

export async function renderAssistant({ params } = {}) {
  const root = el('div', { class: 'assistant-page reveal' });
  const ar = getLang() === 'ar';
  const state = getState();

  // ============================================================
  // No-provider banner
  // ============================================================
  if (!isAIConfigured()) {
    root.appendChild(buildSetupBanner());
  }

  // ============================================================
  // Layout: sidebar (threads) + main (messages)
  // ============================================================
  const grid = el('div', { class: 'chat-grid' });
  root.appendChild(grid);

  // Threads sidebar
  const threadsAside = buildThreadsSidebar();
  grid.appendChild(threadsAside);

  // Main chat panel
  const main = el('div', { class: 'chat-main' });
  grid.appendChild(main);

  // Active thread
  let activeId = state.activeChatThreadId;
  if (!activeId && state.chatThreads.length) {
    activeId = state.chatThreads.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0].id;
    setActiveChatThread(activeId);
  }

  renderMain(main, activeId);

  return root;
}

// ============================================================
// Setup banner
// ============================================================
function buildSetupBanner() {
  const ar = getLang() === 'ar';
  const banner = el('div', { class: 'glass panel chat-setup-banner' });
  banner.innerHTML = `
    <div class="row gap-12 items-center">
      <div class="chat-setup-banner__icon">${icon('zap', { size: 22 })}</div>
      <div class="flex-1">
        <div style="font-weight:700;font-size:14.5px;">${t('chat_no_provider')}</div>
        <div class="text-sm text-muted" style="margin-top:2px;">${ar ? 'إعداد سريع في أقل من دقيقة' : 'Quick setup in under a minute'}</div>
      </div>
    </div>
  `;
  const btn = el('button', { class: 'btn btn--primary', onClick: () => navigate('/settings', { section: 'ai' }) });
  btn.innerHTML = icon('settings') + ' ' + t('chat_setup');
  banner.appendChild(btn);
  return banner;
}

// ============================================================
// Threads sidebar
// ============================================================
function buildThreadsSidebar() {
  const ar = getLang() === 'ar';
  const aside = el('aside', { class: 'chat-threads' });

  const head = el('div', { class: 'chat-threads__head' });
  const newBtn = el('button', { class: 'btn btn--primary btn--block', onClick: () => createNewThread() });
  newBtn.innerHTML = icon('plus') + ' ' + t('new_chat');
  head.appendChild(newBtn);
  aside.appendChild(head);

  const list = el('div', { class: 'chat-threads__list' });
  aside.appendChild(list);

  const refresh = () => {
    list.innerHTML = '';
    const threads = sel.recentChatThreads(50);
    if (!threads.length) {
      list.appendChild(el('div', { class: 'chat-threads__empty text-sm text-muted' }, ar ? 'لا محادثات بعد' : 'No chats yet'));
      return;
    }
    threads.forEach((th) => {
      const isActive = getState().activeChatThreadId === th.id;
      const item = el('div', { class: 'chat-thread-item' + (isActive ? ' active' : '') });
      const main = el('div', { class: 'chat-thread-item__main', onClick: () => switchThread(th.id) });
      main.innerHTML = `
        <div class="chat-thread-item__title">${escapeHtml(th.title || (ar ? 'محادثة' : 'Chat'))}</div>
        <div class="chat-thread-item__meta">${fmtRelative(th.updatedAt || th.createdAt)}</div>
      `;
      const del = el('button', { class: 'chat-thread-item__del', title: t('delete'), onClick: async (e) => {
        e.stopPropagation();
        const ok = await confirmDialog(t('confirm_delete'));
        if (!ok) return;
        // Delete messages too
        const msgs = sel.messagesForThread(th.id);
        for (const m of msgs) await remove('chatMessages', m.id);
        await remove('chatThreads', th.id);
        if (getState().activeChatThreadId === th.id) setActiveChatThread(null);
        toast(t('chat_thread_deleted'));
      }});
      del.innerHTML = icon('trash', { size: 14 });
      item.appendChild(main);
      item.appendChild(del);
      list.appendChild(item);
    });
  };
  refresh();

  // Re-render on store changes
  const observer = new MutationObserver(refresh);
  setTimeout(() => {
    if (aside.isConnected) {
      // Watch the store for changes via event-based subscribe
      import('../store.js').then(({ subscribe }) => {
        const unsub = subscribe(() => { if (aside.isConnected) refresh(); });
        aside.addEventListener('disconnected', unsub);
      });
    }
  }, 0);

  return aside;
}

async function createNewThread() {
  const ar = getLang() === 'ar';
  const thread = {
    id: uid(),
    title: ar ? 'محادثة جديدة' : 'New chat',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await upsert('chatThreads', thread);
  setActiveChatThread(thread.id);
}

function switchThread(id) {
  setActiveChatThread(id);
}

// ============================================================
// Main chat panel (messages + input)
// ============================================================
function renderMain(container, threadId) {
  container.innerHTML = '';
  const ar = getLang() === 'ar';
  if (!threadId) {
    container.appendChild(buildEmptyState());
    return;
  }
  const thread = sel.chatThread(threadId);
  if (!thread) {
    container.appendChild(buildEmptyState());
    return;
  }

  // Header
  const header = el('div', { class: 'chat-header' });
  const titleEl = el('div', { class: 'chat-header__title' }, thread.title);
  const provider = currentProvider();
  const providerLabel = el('div', { class: 'chat-header__provider' });
  providerLabel.innerHTML = `<span class="dot ${provider.configured ? 'dot--success' : 'dot--muted'}"></span> ${provider.provider} · ${provider.model}`;
  header.appendChild(titleEl);
  header.appendChild(providerLabel);
  container.appendChild(header);

  // Messages list
  const messagesEl = el('div', { class: 'chat-messages', id: 'chat-messages-' + threadId });
  container.appendChild(messagesEl);

  const messages = sel.messagesForThread(threadId);
  if (messages.length === 0) {
    messagesEl.appendChild(buildWelcome());
  } else {
    messages.forEach((m) => messagesEl.appendChild(buildMessage(m)));
  }

  // Auto-scroll on store updates
  setTimeout(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
    import('../store.js').then(({ subscribe }) => {
      let lastCount = messages.length;
      const unsub = subscribe(() => {
        if (!messagesEl.isConnected) { unsub(); return; }
        const cur = sel.messagesForThread(threadId);
        if (cur.length !== lastCount) {
          // Append new messages
          for (let i = lastCount; i < cur.length; i++) {
            messagesEl.appendChild(buildMessage(cur[i]));
          }
          lastCount = cur.length;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        } else {
          // Possibly streaming update — check last message
          const last = cur[cur.length - 1];
          if (last) {
            const lastEl = messagesEl.querySelector(`[data-mid="${last.id}"] .chat-msg__body`);
            if (lastEl && lastEl.dataset.snapshot !== String(last.content?.length || 0)) {
              lastEl.textContent = last.content || '';
              lastEl.dataset.snapshot = String(last.content?.length || 0);
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          }
        }
      });
    });
  }, 30);

  // Input
  const inputBox = buildInput(threadId, messagesEl);
  container.appendChild(inputBox);
}

function buildEmptyState() {
  const ar = getLang() === 'ar';
  const wrap = el('div', { class: 'chat-empty' });
  wrap.innerHTML = `
    <div class="chat-empty__icon">${icon('bot', { size: 36 })}</div>
    <h2 class="chat-empty__title">${t('chat_empty_title')}</h2>
    <p class="chat-empty__hint">${t('chat_empty_hint')}</p>
  `;
  const startBtn = el('button', { class: 'btn btn--primary', onClick: () => createNewThread() });
  startBtn.innerHTML = icon('plus') + ' ' + t('new_chat');
  wrap.appendChild(startBtn);
  return wrap;
}

function buildWelcome() {
  const ar = getLang() === 'ar';
  const wrap = el('div', { class: 'chat-welcome' });
  wrap.innerHTML = `
    <div class="chat-welcome__hero">
      <div class="chat-welcome__icon">${icon('bot', { size: 32 })}</div>
      <h3>${t('chat_empty_title')}</h3>
      <p class="text-muted">${t('chat_with_data')}</p>
    </div>
  `;
  const grid = el('div', { class: 'chat-commands-grid' });
  commandList().forEach((c) => {
    const card = el('button', {
      class: 'chat-command-card',
      onClick: () => {
        const inputEl = document.querySelector('.chat-input__field');
        if (inputEl) {
          inputEl.value = c.key + ' ';
          inputEl.focus();
        }
      }
    });
    card.innerHTML = `
      <div class="chat-command-card__icon">${icon(c.icon, { size: 16 })}</div>
      <div class="chat-command-card__text">
        <div class="chat-command-card__cmd">${c.key}</div>
        <div class="chat-command-card__label">${c.label[getLang()] || c.label.en}</div>
      </div>
    `;
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

function buildMessage(m) {
  const isUser = m.role === 'user';
  const wrap = el('div', { class: 'chat-msg chat-msg--' + (isUser ? 'user' : 'assistant'), dataset: { mid: m.id } });
  const avatar = el('div', { class: 'chat-msg__avatar' });
  avatar.innerHTML = isUser ? icon('user', { size: 16 }) : icon('bot', { size: 16 });
  wrap.appendChild(avatar);
  const body = el('div', { class: 'chat-msg__body' });
  body.textContent = m.content || '';
  body.dataset.snapshot = String(m.content?.length || 0);
  wrap.appendChild(body);

  if (!isUser && m.content) {
    const actions = el('div', { class: 'chat-msg__actions' });
    const copyBtn = el('button', { class: 'chat-msg__action', title: t('chat_copy'), onClick: () => {
      navigator.clipboard.writeText(m.content || '').then(() => toast(t('chat_copied'), 'success', 1200));
    }});
    copyBtn.innerHTML = icon('copy', { size: 12 });
    actions.appendChild(copyBtn);
    wrap.appendChild(actions);
  }
  return wrap;
}

// ============================================================
// Input box
// ============================================================
function buildInput(threadId, messagesEl) {
  const ar = getLang() === 'ar';
  const wrap = el('div', { class: 'chat-input-wrap' });

  // Slash command suggestions popup
  const suggestions = el('div', { class: 'chat-suggestions hidden' });
  wrap.appendChild(suggestions);

  const row = el('div', { class: 'chat-input' });
  const field = el('textarea', {
    class: 'chat-input__field',
    placeholder: t('chat_placeholder'),
    rows: 1
  });
  field.value = lastInputValue || '';
  field.addEventListener('input', () => {
    lastInputValue = field.value;
    autoResize(field);
    // Show command suggestions if starts with /
    if (field.value.trim().startsWith('/') && !field.value.includes(' ')) {
      suggestions.classList.remove('hidden');
      renderSuggestions(suggestions, field);
    } else {
      suggestions.classList.add('hidden');
    }
  });
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend(threadId, field, sendBtn, stopBtn, messagesEl);
    }
  });

  const sendBtn = el('button', { class: 'btn btn--primary chat-input__send', onClick: () => doSend(threadId, field, sendBtn, stopBtn, messagesEl) });
  sendBtn.innerHTML = icon('send', { size: 16 });

  const stopBtn = el('button', { class: 'btn btn--danger chat-input__stop hidden', onClick: () => { if (abortController) abortController.abort(); } });
  stopBtn.innerHTML = icon('stop', { size: 16 });

  row.appendChild(field);
  row.appendChild(sendBtn);
  row.appendChild(stopBtn);
  wrap.appendChild(row);

  // Hint line
  wrap.appendChild(el('div', { class: 'chat-input__hint text-sm text-muted' },
    (ar ? '↩ إرسال · ⇧↩ سطر جديد · جرّب /report ، /brief ، /price' : 'Enter to send · Shift+Enter newline · try /report, /brief, /price')
  ));

  setTimeout(() => field.focus(), 50);
  return wrap;
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function renderSuggestions(container, field) {
  container.innerHTML = '';
  const filter = field.value.trim().toLowerCase();
  const matches = commandList().filter((c) => c.key.startsWith(filter));
  if (!matches.length) { container.classList.add('hidden'); return; }
  matches.forEach((c) => {
    const item = el('button', {
      class: 'chat-suggestion',
      onClick: () => {
        field.value = c.key + ' ';
        field.focus();
        container.classList.add('hidden');
        autoResize(field);
      }
    });
    item.innerHTML = `
      <span class="chat-suggestion__icon">${icon(c.icon, { size: 14 })}</span>
      <span class="chat-suggestion__cmd">${c.key}</span>
      <span class="chat-suggestion__label">${c.label[getLang()] || c.label.en}</span>
    `;
    container.appendChild(item);
  });
}

// ============================================================
// Send + stream
// ============================================================
async function doSend(threadId, field, sendBtn, stopBtn, messagesEl) {
  const text = field.value.trim();
  if (!text) return;

  if (!isAIConfigured()) {
    toast(t('chat_no_provider'), 'error', 4000);
    navigate('/settings', { section: 'ai' });
    return;
  }

  // Expand slash commands
  const expanded = expandCommand(text);
  const userVisible = text;
  const userToAI = expanded || text;

  // Hide welcome state
  const welcome = messagesEl.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  // Push user message
  const userMsg = {
    id: uid(),
    threadId,
    role: 'user',
    content: userVisible,
    aiContent: userToAI,
    createdAt: Date.now()
  };
  await upsert('chatMessages', userMsg);

  // Update thread title from first message if still default
  const thread = sel.chatThread(threadId);
  if (thread && (thread.title === 'New chat' || thread.title === 'محادثة جديدة' || !thread.title)) {
    const newTitle = userVisible.slice(0, 50) + (userVisible.length > 50 ? '...' : '');
    await upsert('chatThreads', { ...thread, title: newTitle, updatedAt: Date.now() });
  } else if (thread) {
    await upsert('chatThreads', { ...thread, updatedAt: Date.now() });
  }

  // Clear input
  field.value = '';
  lastInputValue = '';
  autoResize(field);

  // Build messages array for AI: include thread history, but use aiContent for user messages
  const history = sel.messagesForThread(threadId);
  const aiMessages = history.map((m) => ({
    role: m.role,
    content: m.role === 'user' ? (m.aiContent || m.content) : m.content
  }));

  // Push placeholder assistant message
  const assistantMsg = {
    id: uid(),
    threadId,
    role: 'assistant',
    content: '',
    streaming: true,
    createdAt: Date.now() + 1
  };
  await upsert('chatMessages', assistantMsg);

  sendBtn.classList.add('hidden');
  stopBtn.classList.remove('hidden');
  abortController = new AbortController();

  try {
    let acc = '';
    const system = buildSystemPrompt();
    for await (const chunk of streamChat({ messages: aiMessages, system, signal: abortController.signal })) {
      if (abortController.signal.aborted) break;
      acc += chunk;
      // Update message in DB (debounced via direct put)
      await upsert('chatMessages', { ...assistantMsg, content: acc, streaming: true });
    }
    await upsert('chatMessages', { ...assistantMsg, content: acc, streaming: false });
  } catch (e) {
    const errText = (getLang() === 'ar' ? 'خطأ: ' : 'Error: ') + e.message;
    await upsert('chatMessages', { ...assistantMsg, content: errText, streaming: false, error: true });
    toast(errText, 'error', 5000);
  } finally {
    sendBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    abortController = null;
  }
}

// ============================================================
// Helpers
// ============================================================
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
