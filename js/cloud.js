// عبد سيف — Cloud sync layer (Supabase REST + Auth)
// ───────────────────────────────────────────────────────────────────────
// Design goals:
//   • Zero external dependencies (uses fetch + localStorage only).
//   • Optional: app works perfectly offline / without an account.
//   • Last-Write-Wins per-row sync using the `updatedAt` timestamp.
//   • Pull-on-login + push-on-change (debounced) + interval poll.
//   • Survives offline → queues changes, flushes on reconnect.
// ───────────────────────────────────────────────────────────────────────
import { db, STORE_NAMES } from './db.js';
import { getState, refreshAll, setSetting } from './store.js';

const LS_CONFIG = 'abdsaif:cloud:config';     // { url, anonKey }
const LS_SESSION = 'abdsaif:cloud:session';   // { access_token, refresh_token, user, expires_at }
const LS_LAST_SYNC = 'abdsaif:cloud:lastSync';

// Stores that are mirrored to the cloud. `settings` stays local (per-device).
const SYNC_STORES = STORE_NAMES.filter((s) => s !== 'settings');

let cloudConfig = null;
let session = null;
let pushTimer = null;
let pollTimer = null;
let pendingPush = new Set();
let listeners = new Set();
let onlineListenerInstalled = false;

// ───────────────────── State observers ──────────────────────
export function onCloudChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(ev) {
  for (const fn of listeners) {
    try { fn(ev, getCloudState()); } catch (e) { console.error(e); }
  }
}

export function getCloudState() {
  return {
    configured: !!cloudConfig,
    signedIn: !!session && !!session.user,
    user: session?.user || null,
    lastSync: parseInt(localStorage.getItem(LS_LAST_SYNC) || '0', 10) || null,
    online: navigator.onLine
  };
}

// ───────────────────── Config / boot ────────────────────────
export function configureCloud({ url, anonKey }) {
  if (!url || !anonKey) throw new Error('Supabase url and anonKey are required');
  cloudConfig = { url: url.replace(/\/+$/, ''), anonKey };
  localStorage.setItem(LS_CONFIG, JSON.stringify(cloudConfig));
  emit('configured');
}

export function clearCloudConfig() {
  cloudConfig = null;
  localStorage.removeItem(LS_CONFIG);
  emit('configured');
}

export async function bootCloud() {
  // Restore config + session from storage.
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (raw) cloudConfig = JSON.parse(raw);
  } catch {}
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (raw) session = JSON.parse(raw);
  } catch {}

  if (!onlineListenerInstalled) {
    window.addEventListener('online', () => {
      emit('online');
      if (session) flushPending().catch(() => {});
    });
    window.addEventListener('offline', () => emit('offline'));
    onlineListenerInstalled = true;
  }

  if (cloudConfig && session && session.expires_at && session.expires_at < Date.now()) {
    try { await refreshSession(); } catch { signOutLocal(); }
  }

  if (session && cloudConfig) {
    startBackgroundSync();
  }
  return getCloudState();
}

// ───────────────────── Auth (Supabase GoTrue) ───────────────
function authUrl(path) {
  if (!cloudConfig) throw new Error('Cloud not configured');
  return `${cloudConfig.url}/auth/v1${path}`;
}
function restUrl(path) {
  if (!cloudConfig) throw new Error('Cloud not configured');
  return `${cloudConfig.url}/rest/v1${path}`;
}
function authHeaders(extra = {}) {
  if (!cloudConfig) throw new Error('Cloud not configured');
  const h = { 'apikey': cloudConfig.anonKey, 'Content-Type': 'application/json', ...extra };
  if (session?.access_token) h['Authorization'] = `Bearer ${session.access_token}`;
  return h;
}

async function jsonFetch(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg;
    try { msg = (await res.json()).message || (await res.text()); } catch { msg = res.statusText; }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function persistSession(s) {
  // Supabase returns expires_in (seconds). Convert to absolute expires_at (ms).
  if (s && s.expires_in && !s.expires_at) {
    s.expires_at = Date.now() + s.expires_in * 1000 - 30_000; // 30s skew
  }
  session = s;
  if (s) localStorage.setItem(LS_SESSION, JSON.stringify(s));
  else localStorage.removeItem(LS_SESSION);
  emit('auth');
}

export async function signUp(email, password) {
  const data = await jsonFetch(authUrl('/signup'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password })
  });
  if (data && data.access_token) {
    persistSession(data);
    startBackgroundSync();
    await pullAndMerge();
  }
  return data;
}

export async function signIn(email, password) {
  const data = await jsonFetch(authUrl('/token?grant_type=password'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password })
  });
  persistSession(data);
  startBackgroundSync();
  await pullAndMerge();
  return data;
}

export async function signInMagicLink(email, redirectTo) {
  return jsonFetch(authUrl('/otp'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: redirectTo || location.href } })
  });
}

export async function refreshSession() {
  if (!session?.refresh_token) throw new Error('No refresh token');
  const data = await jsonFetch(authUrl('/token?grant_type=refresh_token'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  persistSession(data);
  return data;
}

export async function signOut() {
  try {
    if (session?.access_token) {
      await fetch(authUrl('/logout'), { method: 'POST', headers: authHeaders() }).catch(() => {});
    }
  } finally {
    signOutLocal();
  }
}
function signOutLocal() {
  stopBackgroundSync();
  persistSession(null);
}

// ───────────────────── Sync engine ──────────────────────────
//
// Cloud schema: a single table `app_data` with columns:
//   user_id (uuid), store (text), id (text), payload (jsonb),
//   updated_at (bigint, ms epoch), deleted (bool)
// PK: (user_id, store, id). RLS: each user sees only their rows.
//
// Push: upsert row. Delete: set deleted=true.
// Pull: fetch all rows for user where updated_at > lastSync.
// ────────────────────────────────────────────────────────────

const TABLE = 'app_data';

function cloudHeaders(extra = {}) {
  return authHeaders({
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal',
    ...extra
  });
}

async function pushRow(store, id, payload, deleted = false) {
  if (!session?.user?.id) return;
  const row = {
    user_id: session.user.id,
    store,
    id,
    payload: deleted ? null : payload,
    updated_at: payload?.updatedAt || Date.now(),
    deleted: !!deleted
  };
  await jsonFetch(restUrl(`/${TABLE}?on_conflict=user_id,store,id`), {
    method: 'POST',
    headers: cloudHeaders(),
    body: JSON.stringify([row])
  });
}

async function fetchUpdatedSince(sinceMs) {
  if (!session?.user?.id) return [];
  const since = sinceMs || 0;
  const url = restUrl(`/${TABLE}?user_id=eq.${session.user.id}&updated_at=gt.${since}&select=store,id,payload,updated_at,deleted&order=updated_at.asc&limit=10000`);
  return jsonFetch(url, { headers: authHeaders() }) || [];
}

// ── Merge incoming cloud rows into local IndexedDB (LWW) ──
async function mergeRowsIntoLocal(rows) {
  if (!rows || !rows.length) return 0;
  let applied = 0;
  for (const r of rows) {
    if (!SYNC_STORES.includes(r.store)) continue;
    if (r.deleted) {
      const existing = await db.get(r.store, r.id);
      if (existing) {
        // Only delete if cloud is newer than local
        const localAt = existing.updatedAt || existing.createdAt || 0;
        if ((r.updated_at || 0) >= localAt) {
          await db.delete(r.store, r.id);
          applied++;
        }
      }
      continue;
    }
    const incoming = r.payload;
    if (!incoming || !incoming.id) continue;
    const existing = await db.get(r.store, r.id);
    const localAt = existing?.updatedAt || existing?.createdAt || 0;
    const remoteAt = incoming.updatedAt || r.updated_at || 0;
    if (!existing || remoteAt > localAt) {
      await rawPutDirect(r.store, incoming);
      applied++;
    }
  }
  return applied;
}

// Direct IndexedDB put that preserves the incoming timestamps (no auto-stamping).
// We deliberately bypass db.put() because it overwrites updatedAt = now(), which
// would break Last-Write-Wins reconciliation across devices.
function rawPutDirect(store, value) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('designer-os');
    req.onsuccess = (e) => {
      const idb = e.target.result;
      const tx = idb.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const r = os.put(value);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
      tx.oncomplete = () => idb.close();
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Public sync entry points ──
export async function pullAndMerge() {
  if (!session?.user?.id || !cloudConfig) return { applied: 0 };
  if (!navigator.onLine) return { applied: 0, offline: true };
  emit('sync-start');
  try {
    const since = parseInt(localStorage.getItem(LS_LAST_SYNC) || '0', 10) || 0;
    const rows = await fetchUpdatedSince(since);
    const applied = await mergeRowsIntoLocal(rows);
    if (applied > 0) await refreshAll();
    localStorage.setItem(LS_LAST_SYNC, String(Date.now()));
    emit('sync-end');
    return { applied };
  } catch (e) {
    emit('sync-error', e);
    throw e;
  }
}

// Initial full upload (used after first sign-in if cloud is empty).
export async function pushAllLocal() {
  if (!session?.user?.id || !cloudConfig) return 0;
  if (!navigator.onLine) return 0;
  let count = 0;
  for (const store of SYNC_STORES) {
    const items = await db.getAll(store);
    if (!items.length) continue;
    const rows = items.map((p) => ({
      user_id: session.user.id,
      store,
      id: p.id || p.key,
      payload: p,
      updated_at: p.updatedAt || p.createdAt || Date.now(),
      deleted: false
    })).filter((r) => r.id);
    if (!rows.length) continue;
    // Chunk to avoid huge requests
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await jsonFetch(restUrl(`/${TABLE}?on_conflict=user_id,store,id`), {
        method: 'POST',
        headers: cloudHeaders(),
        body: JSON.stringify(rows.slice(i, i + CHUNK))
      });
      count += Math.min(CHUNK, rows.length - i);
    }
  }
  localStorage.setItem(LS_LAST_SYNC, String(Date.now()));
  emit('sync-end');
  return count;
}

// Hook: call this when a row changes locally to schedule a debounced push.
export function notifyLocalChange(store, id, payload, deleted = false) {
  if (!session || !cloudConfig) return;
  pendingPush.add(JSON.stringify({ store, id, deleted, payload: deleted ? null : payload }));
  schedulePush();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => flushPending().catch((e) => emit('sync-error', e)), 800);
}

async function flushPending() {
  if (!session?.user?.id || !cloudConfig) return;
  if (!navigator.onLine || pendingPush.size === 0) return;
  const items = [...pendingPush].map((s) => JSON.parse(s));
  pendingPush.clear();
  const rows = items.map((it) => ({
    user_id: session.user.id,
    store: it.store,
    id: it.id,
    payload: it.deleted ? null : it.payload,
    updated_at: (it.payload && it.payload.updatedAt) || Date.now(),
    deleted: !!it.deleted
  }));
  try {
    await jsonFetch(restUrl(`/${TABLE}?on_conflict=user_id,store,id`), {
      method: 'POST',
      headers: cloudHeaders(),
      body: JSON.stringify(rows)
    });
    localStorage.setItem(LS_LAST_SYNC, String(Date.now()));
    emit('sync-end');
  } catch (e) {
    // Re-queue on failure
    items.forEach((it) => pendingPush.add(JSON.stringify(it)));
    throw e;
  }
}

// ── Background timer ──
export function startBackgroundSync() {
  stopBackgroundSync();
  // Poll every 60s for remote updates while the app is open.
  pollTimer = setInterval(() => {
    if (!document.hidden && navigator.onLine) {
      pullAndMerge().catch(() => {});
    }
  }, 60_000);
  // Also pull immediately when tab becomes visible.
  document.addEventListener('visibilitychange', visHandler);
  // Kick off initial pull.
  pullAndMerge().catch(() => {});
}

export function stopBackgroundSync() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  document.removeEventListener('visibilitychange', visHandler);
}

function visHandler() {
  if (!document.hidden && navigator.onLine && session) {
    pullAndMerge().catch(() => {});
  }
}
