// Designer OS — AI Client
// Provider abstraction: Gemini (default, free tier) + OpenAI
// All providers expose the same shape:
//   chat({ messages, system, stream }) -> AsyncIterable<string> (deltas) or string
//
// Direct browser-to-API calls (no proxy needed for personal use).
// User pastes their API key in Settings.

import { getState } from './store.js';

// ============================================================
// Gemini provider (Google AI Studio - free tier)
// ============================================================

async function* geminiStream({ messages, system, model, apiKey, signal }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Convert messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body = {
    contents,
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 4096 }
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Gemini error: ' + err.slice(0, 300));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: lines start with "data: "
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const json = JSON.parse(data);
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch (e) { /* ignore parse errors on partial chunks */ }
    }
  }
}

async function geminiOnce({ messages, system, model, apiKey }) {
  let out = '';
  for await (const chunk of geminiStream({ messages, system, model, apiKey })) {
    out += chunk;
  }
  return out;
}

// ============================================================
// OpenAI provider
// ============================================================

async function* openaiStream({ messages, system, model, apiKey, signal }) {
  const fullMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model, messages: fullMessages, stream: true, temperature: 0.7
    }),
    signal
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('OpenAI error: ' + err.slice(0, 300));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      if (!data) continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch (e) { /* skip */ }
    }
  }
}

// ============================================================
// Public API
// ============================================================

export function isAIConfigured() {
  const s = getState();
  if (s.aiProvider === 'gemini') return !!s.geminiApiKey;
  if (s.aiProvider === 'openai') return !!s.openaiApiKey;
  return false;
}

export function currentProvider() {
  const s = getState();
  return {
    provider: s.aiProvider,
    model: s.aiProvider === 'gemini' ? s.geminiModel : s.openaiModel,
    configured: isAIConfigured()
  };
}

export const AVAILABLE_MODELS = {
  gemini: [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (سريع، مجاني)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (أقوى)' },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (تجريبي)' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (خفيف جداً)' }
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (موصى به - رخيص)' },
    { value: 'gpt-4o', label: 'GPT-4o (الأقوى)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ]
};

/**
 * Stream a chat completion. Yields text deltas.
 * @param {Object} opts
 * @param {Array<{role,content}>} opts.messages
 * @param {string} opts.system - optional system prompt
 */
export async function* streamChat({ messages, system, signal }) {
  const s = getState();
  if (s.aiProvider === 'gemini') {
    if (!s.geminiApiKey) throw new Error('Gemini API key missing. Add it in Settings.');
    yield* geminiStream({ messages, system, model: s.geminiModel || 'gemini-1.5-flash', apiKey: s.geminiApiKey, signal });
  } else if (s.aiProvider === 'openai') {
    if (!s.openaiApiKey) throw new Error('OpenAI API key missing. Add it in Settings.');
    yield* openaiStream({ messages, system, model: s.openaiModel || 'gpt-4o-mini', apiKey: s.openaiApiKey, signal });
  } else {
    throw new Error('Unknown AI provider: ' + s.aiProvider);
  }
}

/**
 * One-shot chat completion (collects stream into a string).
 */
export async function chatOnce({ messages, system }) {
  let out = '';
  for await (const chunk of streamChat({ messages, system })) out += chunk;
  return out;
}

/**
 * Ping the provider with a tiny request to validate the key.
 */
export async function testConnection() {
  try {
    const text = await chatOnce({
      messages: [{ role: 'user', content: 'Reply with just: OK' }],
      system: 'You are a test assistant. Reply with exactly "OK".'
    });
    return { ok: true, response: text.trim() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
