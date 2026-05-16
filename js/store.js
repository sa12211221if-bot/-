// Designer OS — App-wide reactive store backed by IndexedDB
import { db, uid, STORE_NAMES } from './db.js';

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
  // Personal Command Center
  mode: 'normal', // normal | deep | creative | islamic | recovery
  focusNow: null, // { taskId, projectId, startedAt, plannedMinutes }
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
  // life-OS collections
  habits: [],
  habitLogs: [],
  reviews: [],
  knowledge: [],
  areas: [],
  resources: [],
  vitals: [],
  aiSuggestions: [],
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
  emit();
  return value;
}

export async function remove(store, id) {
  await db.delete(store, id);
  state[store] = await db.getAll(store);
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

// Mode setter (instant, persisted)
export async function setMode(mode) {
  state.mode = mode || 'normal';
  await db.put('settings', { key: 'mode', value: state.mode });
  document.documentElement.dataset.mode = state.mode;
  emit();
}

// Set the user's current focus target (one task or project)
export async function setFocusNow(focusNow) {
  state.focusNow = focusNow;
  await db.put('settings', { key: 'focusNow', value: focusNow });
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
  },

  // ---------- Life-OS selectors ----------

  // Habits
  habitLogsForHabit: (habitId) => state.habitLogs.filter((l) => l.habitId === habitId),
  habitDoneToday: (habitId) => {
    const today = new Date().toDateString();
    return state.habitLogs.some((l) => l.habitId === habitId && new Date(l.date).toDateString() === today && l.status === 'done');
  },
  habitStreak: (habitId) => {
    const days = new Set(
      state.habitLogs
        .filter((l) => l.habitId === habitId && l.status === 'done')
        .map((l) => new Date(l.date).toDateString())
    );
    let count = 0;
    const cur = new Date(); cur.setHours(0,0,0,0);
    // Allow today to be missing without breaking streak (until end of day)
    if (!days.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
    while (days.has(cur.toDateString())) {
      count++;
      cur.setDate(cur.getDate() - 1);
    }
    return count;
  },
  habitsDoneToday: () => {
    const today = new Date().toDateString();
    const doneIds = new Set(
      state.habitLogs
        .filter((l) => new Date(l.date).toDateString() === today && l.status === 'done')
        .map((l) => l.habitId)
    );
    return state.habits.filter((h) => doneIds.has(h.id)).length;
  },

  // Vitals (mental state)
  latestVitals: () => {
    if (!state.vitals.length) return null;
    return state.vitals.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  },
  vitalsToday: () => {
    const today = new Date().toDateString();
    return state.vitals.filter((v) => new Date(v.date).toDateString() === today);
  },

  // Reviews
  todayReview: () => {
    const today = new Date().toDateString();
    return state.reviews.find((r) => r.type === 'daily' && new Date(r.date).toDateString() === today);
  },
  thisWeekReview: () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0,0,0,0);
    return state.reviews.find((r) => r.type === 'weekly' && new Date(r.date) >= weekStart);
  },

  // Knowledge / PARA
  knowledgeByCategory: (category) =>
    state.knowledge.filter((k) => (k.category || 'inbox') === category),

  // AI suggestions (active = not dismissed)
  activeSuggestions: () =>
    state.aiSuggestions.filter((s) => !s.dismissed).sort((a, b) => (b.score || 0) - (a.score || 0)),

  // Focus now — what should the user work on right now?
  focusCandidate: () => {
    if (state.focusNow && state.focusNow.taskId) {
      const t = state.tasks.find((x) => x.id === state.focusNow.taskId);
      if (t && t.status !== 'done') return t;
    }
    // Pick highest priority overdue or today task with high energy match
    const candidates = state.tasks.filter((t) => t.status !== 'done' && t.dueDate);
    if (!candidates.length) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const score = (t) => {
      let s = 0;
      if (t.priority === 'high') s += 30;
      else if (t.priority === 'medium') s += 15;
      const due = new Date(t.dueDate); due.setHours(0,0,0,0);
      if (due < today) s += 50; // overdue
      else if (due.getTime() === today.getTime()) s += 25; // today
      else s += Math.max(0, 20 - Math.round((due - today) / 86400000));
      return s;
    };
    return candidates.slice().sort((a, b) => score(b) - score(a))[0];
  }
};
