// Designer OS — App-wide reactive store backed by IndexedDB
import { db, uid, STORE_NAMES } from './db.js';

// Lazy hook for the cloud layer. cloud.js calls registerCloudHook() at boot
// to install its push function. We keep store.js dependency-free so it still
// works perfectly even if cloud.js is never loaded.
let cloudHook = null;
export function registerCloudHook(fn) { cloudHook = fn; }
function notifyCloud(store, id, payload, deleted = false) {
  if (cloudHook) {
    try { cloudHook(store, id, payload, deleted); } catch (e) { console.error('[cloud]', e); }
  }
}

const listeners = new Set();
const state = {
  ready: false,
  lang: 'ar',
  theme: 'dark',
  accent: '#FF6B35',
  currency: 'IQD',
  hourlyRate: 25000,
  pomodoroFocus: 25,
  pomodoroBreak: 5,
  pomodoroLong: 15,
  weekStart: 6, // Saturday
  // collections
  clients: [],
  projects: [],
  tasks: [],
  invoices: [],
  subscriptions: [],
  timeLogs: [],
  goals: [],
  ideas: [],
  focusSessions: [],
  inbox: [],
  expenses: [],
  // ephemeral
  activeFocus: null
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error(e); }
  }
}

export function getState() { return state; }

export async function loadAll() {
  for (const name of STORE_NAMES) {
    if (name === 'settings') continue;
    state[name] = await db.getAll(name);
  }
  const settings = await db.getAll('settings');
  for (const s of settings) {
    if (s.key in state) state[s.key] = s.value;
  }
  state.ready = true;
  emit();
}

export async function setSetting(key, value) {
  state[key] = value;
  await db.put('settings', { key, value });
  emit();
}

export async function upsert(store, value) {
  if (!value.id) value.id = uid();
  await db.put(store, value);
  state[store] = await db.getAll(store);
  // Read back the stamped row so cloud sees correct updatedAt.
  const stamped = await db.get(store, value.id) || value;
  notifyCloud(store, stamped.id, stamped, false);
  emit();
  return stamped;
}

export async function remove(store, id) {
  await db.delete(store, id);
  state[store] = await db.getAll(store);
  notifyCloud(store, id, null, true);
  emit();
}

export async function refresh(store) {
  state[store] = await db.getAll(store);
  emit();
}

export async function refreshAll() {
  for (const name of STORE_NAMES) {
    if (name === 'settings') continue;
    state[name] = await db.getAll(name);
  }
  emit();
}

export function setActiveFocus(session) {
  state.activeFocus = session;
  emit();
}

// ---------- Selectors ----------
export const sel = {
  clientById: (id) => state.clients.find((c) => c.id === id),
  projectById: (id) => state.projects.find((p) => p.id === id),
  projectsForClient: (clientId) => state.projects.filter((p) => p.clientId === clientId),
  tasksForProject: (projectId) => state.tasks.filter((t) => t.projectId === projectId),
  tasksForClient: (clientId) => {
    const projIds = new Set(sel.projectsForClient(clientId).map((p) => p.id));
    return state.tasks.filter((t) => projIds.has(t.projectId));
  },
  invoicesForClient: (clientId) => state.invoices.filter((i) => i.clientId === clientId),
  upcomingTasks: (limit = 10) => {
    const now = Date.now();
    return state.tasks
      .filter((t) => t.status !== 'done' && t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, limit);
  },
  todayTasks: () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return state.tasks.filter((t) => {
      if (t.status === 'done') return false;
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= today && d < tomorrow;
    });
  },
  overdueTasks: () => {
    const today = new Date(); today.setHours(0,0,0,0);
    return state.tasks.filter((t) => {
      if (t.status === 'done') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < today;
    });
  },
  activeProjects: () => state.projects.filter((p) => p.status === 'active' || p.status === 'in_progress'),
  monthRevenue: (month, year) => {
    const m = month ?? new Date().getMonth();
    const y = year ?? new Date().getFullYear();
    return state.invoices
      .filter((i) => i.status === 'paid')
      .filter((i) => {
        const d = new Date(i.paidDate || i.issueDate);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  },
  monthExpenses: (month, year) => {
    const m = month ?? new Date().getMonth();
    const y = year ?? new Date().getFullYear();
    return state.expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  },
  focusMinutesToday: () => {
    const today = new Date().toDateString();
    return state.focusSessions
      .filter((s) => new Date(s.date).toDateString() === today)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  },
  streak: () => {
    // Count consecutive days with at least one completed focus session OR completed task
    const days = new Set();
    state.focusSessions.filter((s) => s.completed).forEach((s) => {
      days.add(new Date(s.date).toDateString());
    });
    state.tasks.filter((t) => t.status === 'done' && t.completedAt).forEach((t) => {
      days.add(new Date(t.completedAt).toDateString());
    });
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0,0,0,0);
    while (days.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
};
