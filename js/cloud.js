// عبد سيف — Cloud sync layer (Supabase REST + Auth)
// Zero external deps (fetch + localStorage). Works offline with queue.
import { db, STORE_NAMES } from './db.js';
import { getState, refreshAll } from './store.js';

const LS_CONFIG = 'abdsaif:cloud:config';
const LS_SESSION = 'abdsaif:cloud:session';
const LS_LAST_SYNC = 'abdsaif:cloud:lastSync';
const SYNC_STORES = STORE_NAMES.filter((s) => s !== 'settings');

let cloudConfig = null, session = null, pushTimer = null, pollTimer = null;
let pendingPush = new Set(), listeners = new Set(), onlineListenerDone = false;

export function onCloudChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(ev) { for (const fn of listeners) try { fn(ev, getCloudState()); } catch(e) { console.error(e); } }

export function getCloudState() {
  return { configured: !!cloudConfig, signedIn: !!session?.user, user: session?.user||null,
    lastSync: parseInt(localStorage.getItem(LS_LAST_SYNC)||'0',10)||null, online: navigator.onLine };
}

export function configureCloud({ url, anonKey }) {
  if (!url || !anonKey) throw new Error('URL and anonKey required');
  cloudConfig = { url: url.replace(/\/+$/,''), anonKey };
  localStorage.setItem(LS_CONFIG, JSON.stringify(cloudConfig)); emit('configured');
}
export function clearCloudConfig() { cloudConfig=null; localStorage.removeItem(LS_CONFIG); emit('configured'); }

export async function bootCloud() {
  try { const r=localStorage.getItem(LS_CONFIG); if(r) cloudConfig=JSON.parse(r); } catch{}
  try { const r=localStorage.getItem(LS_SESSION); if(r) session=JSON.parse(r); } catch{}
  if (!onlineListenerDone) {
    window.addEventListener('online',()=>{ emit('online'); if(session) flushPending().catch(()=>{}); });
    window.addEventListener('offline',()=>emit('offline'));
    onlineListenerDone=true;
  }
  if (cloudConfig && session?.expires_at && session.expires_at < Date.now()) {
    try { await refreshSession(); } catch { signOutLocal(); }
  }
  if (session && cloudConfig) startBackgroundSync();
  return getCloudState();
}

// Auth
function authUrl(p){return `${cloudConfig.url}/auth/v1${p}`;}
function restUrl(p){return `${cloudConfig.url}/rest/v1${p}`;}
function hdrs(extra={}){ const h={'apikey':cloudConfig.anonKey,'Content-Type':'application/json',...extra}; if(session?.access_token) h['Authorization']=`Bearer ${session.access_token}`; return h; }

async function jsonFetch(url,opts){ const r=await fetch(url,opts); if(!r.ok){let m;try{m=(await r.json()).message}catch{m=r.statusText} throw new Error(m||`HTTP ${r.status}`);} if(r.status===204)return null; const t=await r.text(); return t?JSON.parse(t):null; }

function persistSession(s){ if(s&&s.expires_in&&!s.expires_at) s.expires_at=Date.now()+s.expires_in*1000-30000; session=s; if(s) localStorage.setItem(LS_SESSION,JSON.stringify(s)); else localStorage.removeItem(LS_SESSION); emit('auth'); }

export async function signUp(email,password){ const d=await jsonFetch(authUrl('/signup'),{method:'POST',headers:hdrs(),body:JSON.stringify({email,password})}); if(d?.access_token){persistSession(d);startBackgroundSync();await pullAndMerge();} return d; }
export async function signIn(email,password){ const d=await jsonFetch(authUrl('/token?grant_type=password'),{method:'POST',headers:hdrs(),body:JSON.stringify({email,password})}); persistSession(d); startBackgroundSync(); await pullAndMerge(); return d; }
export async function refreshSession(){ if(!session?.refresh_token) throw new Error('No refresh token'); const d=await jsonFetch(authUrl('/token?grant_type=refresh_token'),{method:'POST',headers:hdrs(),body:JSON.stringify({refresh_token:session.refresh_token})}); persistSession(d); return d; }
export async function signOut(){ try{if(session?.access_token) await fetch(authUrl('/logout'),{method:'POST',headers:hdrs()}).catch(()=>{});}finally{signOutLocal();} }
function signOutLocal(){ stopBackgroundSync(); persistSession(null); }

// Sync
const TABLE='app_data';
function chdrs(extra={}){return hdrs({'Prefer':'resolution=merge-duplicates,return=minimal',...extra});}

async function fetchUpdatedSince(since){ if(!session?.user?.id) return []; return await jsonFetch(restUrl(`/${TABLE}?user_id=eq.${session.user.id}&updated_at=gt.${since||0}&select=store,id,payload,updated_at,deleted&order=updated_at.asc&limit=10000`),{headers:hdrs()})||[]; }

async function mergeRowsIntoLocal(rows){ if(!rows?.length) return 0; let applied=0; for(const r of rows){ if(!SYNC_STORES.includes(r.store)) continue; if(r.deleted){ const ex=await db.get(r.store,r.id); if(ex){const la=ex.updatedAt||ex.createdAt||0; if((r.updated_at||0)>=la){await db.delete(r.store,r.id);applied++;}} continue;} const inc=r.payload; if(!inc?.id)continue; const ex=await db.get(r.store,r.id); const la=ex?.updatedAt||ex?.createdAt||0; const ra=inc.updatedAt||r.updated_at||0; if(!ex||ra>la){await rawPut(r.store,inc);applied++;}} return applied; }

function rawPut(store,value){return new Promise((res,rej)=>{const req=indexedDB.open('designer-os');req.onsuccess=e=>{const idb=e.target.result;const tx=idb.transaction(store,'readwrite');tx.objectStore(store).put(value).onsuccess=()=>res();tx.onerror=()=>rej(tx.error);tx.oncomplete=()=>idb.close();};req.onerror=()=>rej(req.error);});}

export async function pullAndMerge(){ if(!session?.user?.id||!cloudConfig||!navigator.onLine)return{applied:0}; emit('sync-start'); try{ const since=parseInt(localStorage.getItem(LS_LAST_SYNC)||'0',10)||0; const rows=await fetchUpdatedSince(since); const applied=await mergeRowsIntoLocal(rows); if(applied>0) await refreshAll(); localStorage.setItem(LS_LAST_SYNC,String(Date.now())); emit('sync-end'); return{applied}; }catch(e){emit('sync-error',e);throw e;} }

export async function pushAllLocal(){ if(!session?.user?.id||!cloudConfig||!navigator.onLine) return 0; let count=0; for(const store of SYNC_STORES){ const items=await db.getAll(store); if(!items.length) continue; const rows=items.map(p=>({user_id:session.user.id,store,id:p.id||p.key,payload:p,updated_at:p.updatedAt||p.createdAt||Date.now(),deleted:false})).filter(r=>r.id); const CHUNK=200; for(let i=0;i<rows.length;i+=CHUNK){await jsonFetch(restUrl(`/${TABLE}?on_conflict=user_id,store,id`),{method:'POST',headers:chdrs(),body:JSON.stringify(rows.slice(i,i+CHUNK))});count+=Math.min(CHUNK,rows.length-i);}} localStorage.setItem(LS_LAST_SYNC,String(Date.now())); emit('sync-end'); return count; }

export function notifyLocalChange(store,id,payload,deleted=false){ if(!session||!cloudConfig) return; pendingPush.add(JSON.stringify({store,id,deleted,payload:deleted?null:payload})); clearTimeout(pushTimer); pushTimer=setTimeout(()=>flushPending().catch(e=>emit('sync-error',e)),800); }

async function flushPending(){ if(!session?.user?.id||!cloudConfig||!navigator.onLine||pendingPush.size===0) return; const items=[...pendingPush].map(s=>JSON.parse(s)); pendingPush.clear(); const rows=items.map(it=>({user_id:session.user.id,store:it.store,id:it.id,payload:it.deleted?null:it.payload,updated_at:it.payload?.updatedAt||Date.now(),deleted:!!it.deleted})); try{await jsonFetch(restUrl(`/${TABLE}?on_conflict=user_id,store,id`),{method:'POST',headers:chdrs(),body:JSON.stringify(rows)}); localStorage.setItem(LS_LAST_SYNC,String(Date.now())); emit('sync-end');}catch(e){items.forEach(it=>pendingPush.add(JSON.stringify(it)));throw e;} }

export function startBackgroundSync(){ stopBackgroundSync(); pollTimer=setInterval(()=>{if(!document.hidden&&navigator.onLine) pullAndMerge().catch(()=>{});},60000); document.addEventListener('visibilitychange',visH); pullAndMerge().catch(()=>{}); }
export function stopBackgroundSync(){ if(pollTimer){clearInterval(pollTimer);pollTimer=null;} document.removeEventListener('visibilitychange',visH); }
function visH(){if(!document.hidden&&navigator.onLine&&session) pullAndMerge().catch(()=>{});}
