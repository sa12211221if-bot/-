// Designer OS — Notion two-way sync
//
// Notion's API blocks direct browser calls (CORS). We have two paths:
//   1. PROXY (recommended): a tiny serverless function on Vercel/Cloudflare that
//      forwards requests to api.notion.com. URL set in settings.notionProxyUrl.
//      The proxy template is provided at /api/notion-proxy.js.
//   2. DIRECT: works from a Tauri/Electron app or with a CORS-disabled dev browser.
//      Not recommended for production.
//
// Sync model:
//   - Each Notion page maps to one local record via { localId, notionId } pairs
//   - Last-write-wins by `updatedAt` (or `last_edited_time` on Notion)
//   - We sync three databases: tasks, projects, clients (configurable IDs)

import { getState, setSetting, upsert } from './../store.js';
import { uid } from './../db.js';

const NOTION_VERSION = '2022-06-28';

// ============================================================
// Low-level fetch wrapper (uses proxy if configured)
// ============================================================

async function notionFetch(path, opts = {}) {
  const s = getState();
  if (!s.notionToken) throw new Error('Notion token missing');

  const useProxy = !!s.notionProxyUrl;
  const url = useProxy
    ? s.notionProxyUrl.replace(/\/$/, '') + path
    : 'https://api.notion.com/v1' + path;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + s.notionToken,
    'Notion-Version': NOTION_VERSION,
    ...(opts.headers || {})
  };

  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Notion API ' + res.status + ': ' + text.slice(0, 300));
  }
  return res.json();
}

// ============================================================
// Test connection
// ============================================================

export async function testConnection() {
  try {
    const data = await notionFetch('/users/me');
    return { ok: true, name: data?.name || data?.bot?.owner?.user?.name || 'OK' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ============================================================
// Helpers — convert Notion property values to plain values
// ============================================================

function getProp(page, name) {
  const p = page?.properties?.[name];
  if (!p) return null;
  switch (p.type) {
    case 'title':       return (p.title || []).map((t) => t.plain_text).join('');
    case 'rich_text':   return (p.rich_text || []).map((t) => t.plain_text).join('');
    case 'select':      return p.select?.name || null;
    case 'multi_select':return (p.multi_select || []).map((x) => x.name);
    case 'status':      return p.status?.name || null;
    case 'date':        return p.date?.start || null;
    case 'number':      return p.number;
    case 'checkbox':    return !!p.checkbox;
    case 'url':         return p.url;
    case 'email':       return p.email;
    case 'phone_number':return p.phone_number;
    case 'relation':    return (p.relation || []).map((r) => r.id);
    case 'people':      return (p.people || []).map((u) => u.name).join(', ');
    default:            return null;
  }
}

// Find first property of given type (case-insensitive name guess)
function findPropName(props, candidates) {
  if (!props) return null;
  const keys = Object.keys(props);
  for (const c of candidates) {
    const hit = keys.find((k) => k.toLowerCase() === c.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

// ============================================================
// Pull from Notion → Local
// ============================================================

async function queryDatabase(dbId, cursor) {
  const body = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;
  return notionFetch(`/databases/${dbId}/query`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

async function fetchAllPages(dbId) {
  const out = [];
  let cursor = undefined;
  do {
    const data = await queryDatabase(dbId, cursor);
    out.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return out;
}

/**
 * Pull all tasks from Notion DB into local store.
 * Maps property names smartly: title="Name"/"Title"/"Task", status="Status", due="Due"/"Due Date", priority="Priority", project="Project"
 */
export async function pullTasks() {
  const s = getState();
  if (!s.notionTasksDbId) return { count: 0 };
  const pages = await fetchAllPages(s.notionTasksDbId);
  let count = 0;
  for (const page of pages) {
    const props = page.properties || {};
    const titleName = findPropName(props, ['Name', 'Title', 'Task', 'اسم', 'العنوان']);
    const statusName = findPropName(props, ['Status', 'الحالة']);
    const dueName = findPropName(props, ['Due Date', 'Due', 'Date', 'الموعد']);
    const priorityName = findPropName(props, ['Priority', 'الأولوية']);
    const energyName = findPropName(props, ['Energy', 'الطاقة']);

    const title = titleName ? getProp(page, titleName) : '';
    if (!title) continue;

    // Find existing
    const existing = s.tasks.find((t) => t.notionId === page.id);

    const mapStatus = (val) => {
      if (!val) return 'todo';
      const v = val.toLowerCase();
      if (v.includes('done') || v.includes('complete') || v.includes('تم')) return 'done';
      if (v.includes('progress') || v.includes('doing') || v.includes('قيد')) return 'doing';
      if (v.includes('block') || v.includes('متوقف')) return 'blocked';
      return 'todo';
    };
    const mapPriority = (val) => {
      if (!val) return 'medium';
      const v = String(val).toLowerCase();
      if (v.includes('high') || v.includes('عالي')) return 'high';
      if (v.includes('low') || v.includes('منخفض')) return 'low';
      return 'medium';
    };

    const payload = {
      ...(existing || {}),
      id: existing?.id || uid(),
      notionId: page.id,
      title,
      status: mapStatus(statusName ? getProp(page, statusName) : null),
      priority: mapPriority(priorityName ? getProp(page, priorityName) : null),
      energy: energyName ? mapPriority(getProp(page, energyName)) : (existing?.energy || 'medium'),
      dueDate: dueName ? getProp(page, dueName) : (existing?.dueDate || null),
      notionEditedTime: page.last_edited_time
    };

    // Last-write-wins: only update local if Notion edited later (or no local yet)
    if (!existing || (page.last_edited_time && (!existing.notionEditedTime || page.last_edited_time > existing.notionEditedTime))) {
      await upsert('tasks', payload);
      count++;
    }
  }
  return { count };
}

export async function pullProjects() {
  const s = getState();
  if (!s.notionProjectsDbId) return { count: 0 };
  const pages = await fetchAllPages(s.notionProjectsDbId);
  let count = 0;
  for (const page of pages) {
    const props = page.properties || {};
    const titleName = findPropName(props, ['Name', 'Title', 'Project', 'اسم', 'المشروع']);
    const statusName = findPropName(props, ['Status', 'الحالة']);
    const dueName = findPropName(props, ['Deadline', 'Due', 'Due Date', 'الموعد']);
    const briefName = findPropName(props, ['Brief', 'Description', 'الوصف']);
    const budgetName = findPropName(props, ['Budget', 'الميزانية']);

    const name = titleName ? getProp(page, titleName) : '';
    if (!name) continue;

    const existing = s.projects.find((p) => p.notionId === page.id);
    const mapStatus = (val) => {
      if (!val) return 'active';
      const v = val.toLowerCase();
      if (v.includes('idea') || v.includes('فكرة')) return 'idea';
      if (v.includes('progress') || v.includes('قيد')) return 'in_progress';
      if (v.includes('review') || v.includes('مراجعة')) return 'review';
      if (v.includes('done') || v.includes('complete') || v.includes('مكتمل')) return 'done';
      if (v.includes('archive') || v.includes('أرشيف')) return 'archived';
      return 'active';
    };

    const payload = {
      ...(existing || {}),
      id: existing?.id || uid(),
      notionId: page.id,
      name,
      status: mapStatus(statusName ? getProp(page, statusName) : null),
      dueDate: dueName ? getProp(page, dueName) : (existing?.dueDate || null),
      brief: briefName ? getProp(page, briefName) : (existing?.brief || ''),
      budget: budgetName ? Number(getProp(page, budgetName) || 0) : (existing?.budget || 0),
      notionEditedTime: page.last_edited_time
    };

    if (!existing || (page.last_edited_time && (!existing.notionEditedTime || page.last_edited_time > existing.notionEditedTime))) {
      await upsert('projects', payload);
      count++;
    }
  }
  return { count };
}

export async function pullClients() {
  const s = getState();
  if (!s.notionClientsDbId) return { count: 0 };
  const pages = await fetchAllPages(s.notionClientsDbId);
  let count = 0;
  for (const page of pages) {
    const props = page.properties || {};
    const titleName = findPropName(props, ['Name', 'Client', 'الاسم', 'العميل']);
    const companyName = findPropName(props, ['Company', 'Brand', 'الشركة', 'الجهة']);
    const emailName = findPropName(props, ['Email', 'البريد']);
    const phoneName = findPropName(props, ['Phone', 'Mobile', 'الهاتف']);
    const notesName = findPropName(props, ['Notes', 'Bio', 'ملاحظات']);

    const name = titleName ? getProp(page, titleName) : '';
    if (!name) continue;

    const existing = s.clients.find((c) => c.notionId === page.id);
    const payload = {
      ...(existing || {}),
      id: existing?.id || uid(),
      notionId: page.id,
      name,
      company: companyName ? getProp(page, companyName) : (existing?.company || ''),
      email: emailName ? getProp(page, emailName) : (existing?.email || ''),
      phone: phoneName ? getProp(page, phoneName) : (existing?.phone || ''),
      notes: notesName ? getProp(page, notesName) : (existing?.notes || ''),
      notionEditedTime: page.last_edited_time
    };

    if (!existing || (page.last_edited_time && (!existing.notionEditedTime || page.last_edited_time > existing.notionEditedTime))) {
      await upsert('clients', payload);
      count++;
    }
  }
  return { count };
}

// ============================================================
// Push from Local → Notion
// ============================================================

function titleProp(text) {
  return { title: [{ type: 'text', text: { content: text || '' } }] };
}
function richTextProp(text) {
  return { rich_text: [{ type: 'text', text: { content: text || '' } }] };
}
function selectProp(name) {
  return name ? { select: { name } } : { select: null };
}
function dateProp(iso) {
  return iso ? { date: { start: typeof iso === 'string' ? iso.slice(0, 10) : new Date(iso).toISOString().slice(0, 10) } } : { date: null };
}
function numberProp(n) {
  return { number: n == null ? null : Number(n) };
}

async function pushOne(dbId, mapping, existing, payload) {
  if (existing?.notionId) {
    // Update
    return notionFetch(`/pages/${existing.notionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: mapping })
    });
  } else {
    // Create
    return notionFetch('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: mapping
      })
    });
  }
}

/**
 * Push a single task to Notion (smart property naming based on existing DB schema).
 * NOTE: User must add these standard properties to their Notion DB:
 *   Name (title), Status (select), Due Date (date), Priority (select)
 */
export async function pushTask(task) {
  const s = getState();
  if (!s.notionTasksDbId) throw new Error('Tasks DB ID not set');

  // Get DB schema once
  const meta = await notionFetch(`/databases/${s.notionTasksDbId}`);
  const props = meta.properties || {};
  const titleName = findPropName(props, ['Name', 'Title', 'Task', 'اسم', 'العنوان']) || 'Name';
  const statusName = findPropName(props, ['Status', 'الحالة']);
  const dueName = findPropName(props, ['Due Date', 'Due', 'Date', 'الموعد']);
  const priorityName = findPropName(props, ['Priority', 'الأولوية']);

  const mapping = {};
  mapping[titleName] = titleProp(task.title);
  if (statusName) {
    const map = { todo: 'To do', doing: 'In progress', done: 'Done', blocked: 'Blocked' };
    const isStatusType = props[statusName].type === 'status';
    mapping[statusName] = isStatusType
      ? { status: { name: map[task.status] || 'To do' } }
      : selectProp(map[task.status] || 'To do');
  }
  if (dueName && task.dueDate) mapping[dueName] = dateProp(task.dueDate);
  if (priorityName && task.priority) {
    const map = { high: 'High', medium: 'Medium', low: 'Low' };
    mapping[priorityName] = selectProp(map[task.priority] || 'Medium');
  }

  const existing = s.tasks.find((t) => t.id === task.id);
  const result = await pushOne(s.notionTasksDbId, mapping, existing, task);
  // Save the Notion id back
  if (result?.id) {
    await upsert('tasks', { ...task, notionId: result.id, notionEditedTime: result.last_edited_time });
  }
  return result;
}

// ============================================================
// Full sync (pull + push) — smart resolution
// ============================================================

export async function syncAll() {
  const s = getState();
  if (!s.notionToken) throw new Error('Notion token missing');
  const log = { startedAt: Date.now(), pulled: {}, pushed: {}, errors: [] };

  // Pull
  try { log.pulled.tasks = (await pullTasks()).count; } catch (e) { log.errors.push('pullTasks: ' + e.message); }
  try { log.pulled.projects = (await pullProjects()).count; } catch (e) { log.errors.push('pullProjects: ' + e.message); }
  try { log.pulled.clients = (await pullClients()).count; } catch (e) { log.errors.push('pullClients: ' + e.message); }

  // Push: tasks that have no notionId (and tasks DB is set)
  if (s.notionTasksDbId) {
    const toPush = s.tasks.filter((t) => !t.notionId).slice(0, 25); // safety cap
    let pushed = 0;
    for (const task of toPush) {
      try { await pushTask(task); pushed++; } catch (e) { log.errors.push('pushTask "' + task.title + '": ' + e.message); }
    }
    log.pushed.tasks = pushed;
  }

  log.endedAt = Date.now();
  await setSetting('notionLastSync', log.endedAt);
  // Persist a sync log entry
  await upsert('syncLog', { id: uid(), provider: 'notion', ...log, createdAt: Date.now() });
  return log;
}

// ============================================================
// Auto sync timer
// ============================================================

let autoTimer = null;
export function startAutoSync(intervalMin = 15) {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    const s = getState();
    if (s.notionAutoSync && s.notionToken) {
      syncAll().catch((e) => console.error('Auto sync failed:', e));
    }
  }, intervalMin * 60 * 1000);
}

export function stopAutoSync() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
}
