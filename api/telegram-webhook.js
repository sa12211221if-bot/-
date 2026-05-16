// Designer OS — Telegram Webhook (optional)
//
// The app's primary integration uses long-polling (no server needed).
// This webhook is OPTIONAL and only useful if you want the bot to reply
// even when your browser/PWA is closed.
//
// Architecture:
//   Telegram → POST here → we forward {chat_id, text} to a queue
//   The app reads the queue when online via GET /api/telegram-webhook?since=ts
//
// Storage: Vercel KV (Upstash Redis). Set env var TELEGRAM_KV_URL or KV_REST_API_URL.
// If no KV is configured, the webhook just acks without storing.
//
// Setup:
//   1. Deploy → get URL https://YOUR-APP.vercel.app/api/telegram-webhook
//   2. Set bot webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<that-url>
//   3. (Optional) Add Vercel KV integration for persistence

const KV_URL = process.env.KV_REST_API_URL || process.env.TELEGRAM_KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.TELEGRAM_KV_TOKEN;

async function kvPush(key, value) {
  if (!KV_URL || !KV_TOKEN) return false;
  await fetch(`${KV_URL}/lpush/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}` }
  });
  return true;
}

async function kvDrain(key, max = 50) {
  if (!KV_URL || !KV_TOKEN) return [];
  const res = await fetch(`${KV_URL}/lrange/${encodeURIComponent(key)}/0/${max - 1}`, {
    headers: { 'Authorization': `Bearer ${KV_TOKEN}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  // Clear after read
  await fetch(`${KV_URL}/ltrim/${encodeURIComponent(key)}/${max}/-1`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}` }
  });
  return (data.result || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}

export default async function handler(req, res) {
  // CORS for browser polling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      // Incoming message from Telegram
      const update = req.body;
      const msg = update?.message || update?.edited_message;
      if (msg) {
        await kvPush('designer-os:telegram-queue', {
          updateId: update.update_id,
          chatId: msg.chat?.id,
          from: msg.from?.first_name || msg.from?.username,
          text: msg.text || msg.caption || '',
          date: msg.date,
          receivedAt: Date.now()
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      // Browser polls to drain the queue
      const items = await kvDrain('designer-os:telegram-queue', 50);
      return res.status(200).json({ items });
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    res.status(500).json({ error: 'webhook_error', message: err.message });
  }
}
