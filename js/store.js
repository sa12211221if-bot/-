// Designer OS — App-wide reactive store backed by IndexedDB
import { db, uid, STORE_NAMES } from './db.js';

// Cloud sync hook (lazy — installed by app.js after cloud.js boots)
let cloudHook = null;
export function registerCloudHook(fn) { cloudHook = fn; }
function notifyCloud(store, id, payload, deleted = false) {
  if (cloudHook) try { cloudHook(store, id, payload, deleted); } catch(e) { console.error('[cloud]', e); }
}

const listeners = new Set();
const state = {
  ready: false,
  lang: 'ar',
  theme: 'dark',
  accent: '#7C6BFF',
  currency: 'IQD',
  // Pricing model: per-task / per-revision (NOT hourly)
  defaultTaskPrice: 50000,
  defaultRevisionPrice: 15000,
  pomodoroFocus: 25,
  pomodoroBreak: 5,
  pomodoroLong: 15,
  weekStart: 6,
  // Personal Command Center
  mode: 'normal',
  focusNow: null,
  // AI provider
  aiProvider: 'gemini', // gemini | openai
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  aiServerUrl: '', // optional proxy for production
  // Notion
  notionToken: '',
  notionTasksDbId: '',
  notionProjectsDbId: '',
  notionClientsDbId: '',
  notionLastSync: null,
  notionAutoSync: false,
  // Telegram
  telegramToken: '',
  telegramChatId: '',
  telegramServerUrl: '',
  // Prayer times / location
  prayerCity: '',
  prayerCountry: '',
  prayerLat: null,
  prayerLng: null,
  prayerMethod: 4, // Umm Al-Qura
  prayerTimes: null, // { Fajr, Dhuhr, Asr, Maghrib, Isha, date }
  prayerNotify: true,
  // Notifications
  notifEnabled: false,
  notifOverdueTasks: true,
  notifPrayer: true,
  notifHabitReminder: '20:00',
  notifChallenges: true,
  // Tips dismissed list
  tipsDismissed: [],
  // collections
  clients: [], projects: [], tasks: [], invoices: [], subscriptions: [],
  timeLogs: [], goals: [], ideas: [], focusSessions: [], inbox: [], expenses: [],
  habits: [], habitLogs: [], reviews: [], knowledge: [], areas: [], resources: [],
  vitals: [], aiSuggestions: [],
  chatThreads: [], chatMessages: [], notifications: [], challenges: [], rewards: [],
  syncLog: [],
  // v4 — finance + quotes
  finance: [], financeGoals: [], quotes: [],
  // ephemeral
  activeFocus: null,
  activeChatThreadId: null
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

export async function setMode(mode) {
  state.mode = mode || 'normal';
  await db.put('settings', { key: 'mode', value: state.mode });
  document.documentElement.dataset.mode = state.mode;
  emit();
}

export async function setFocusNow(focusNow) {
  state.focusNow = focusNow;
  await db.put('settings', { key: 'focusNow', value: focusNow });
  emit();
}

export function setActiveChatThread(id) {
  state.activeChatThreadId = id;
  emit();
}

// ---------- Selectors ----------
export const sel = {
  clientById: (id) => state.clients.find((c) => c.id === id),
  projectById: (id) => state.projects.find((p) => p.id === id),
  projectsForClient: (cid) => state.projects.filter((p) => p.clientId === cid),
  tasksForProject: (pid) => state.tasks.filter((t) => t.projectId === pid),
  tasksForClient: (cid) => {
    const ids = new Set(sel.projectsForClient(cid).map((p) => p.id));
    return state.tasks.filter((t) => ids.has(t.projectId));
  },
  invoicesForClient: (cid) => state.invoices.filter((i) => i.clientId === cid),
  upcomingTasks: (limit = 10) => state.tasks
    .filter((t) => t.status !== 'done' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, limit),
  todayTasks: () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    return state.tasks.filter((t) => {
      if (t.status === 'done' || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= today && d < tomorrow;
    });
  },
  overdueTasks: () => {
    const today = new Date(); today.setHours(0,0,0,0);
    return state.tasks.filter((t) => {
      if (t.status === 'done' || !t.dueDate) return false;
      return new Date(t.dueDate) < today;
    });
  },
  activeProjects: () => state.projects.filter((p) => p.status === 'active' || p.status === 'in_progress'),
  monthRevenue: (m, y) => {
    m = m ?? new Date().getMonth(); y = y ?? new Date().getFullYear();
    return state.invoices.filter((i) => i.status === 'paid')
      .filter((i) => { const d = new Date(i.paidDate || i.issueDate); return d.getMonth() === m && d.getFullYear() === y; })
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  },
  monthExpenses: (m, y) => {
    m = m ?? new Date().getMonth(); y = y ?? new Date().getFullYear();
    return state.expenses.filter((e) => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  },
  focusMinutesToday: () => {
    const today = new Date().toDateString();
    return state.focusSessions.filter((s) => new Date(s.date).toDateString() === today)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  },
  streak: () => {
    const days = new Set();
    state.focusSessions.filter((s) => s.completed).forEach((s) => days.add(new Date(s.date).toDateString()));
    state.tasks.filter((t) => t.status === 'done' && t.completedAt).forEach((t) => days.add(new Date(t.completedAt).toDateString()));
    let streak = 0;
    const cur = new Date(); cur.setHours(0,0,0,0);
    while (days.has(cur.toDateString())) { streak++; cur.setDate(cur.getDate() - 1); }
    return streak;
  },
  // Habits
  habitDoneToday: (id) => {
    const today = new Date().toDateString();
    return state.habitLogs.some((l) => l.habitId === id && new Date(l.date).toDateString() === today && l.status === 'done');
  },
  habitStreak: (id) => {
    const days = new Set(state.habitLogs.filter((l) => l.habitId === id && l.status === 'done').map((l) => new Date(l.date).toDateString()));
    let count = 0;
    const cur = new Date(); cur.setHours(0,0,0,0);
    if (!days.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
    while (days.has(cur.toDateString())) { count++; cur.setDate(cur.getDate() - 1); }
    return count;
  },
  habitsDoneToday: () => {
    const today = new Date().toDateString();
    const ids = new Set(state.habitLogs.filter((l) => new Date(l.date).toDateString() === today && l.status === 'done').map((l) => l.habitId));
    return state.habits.filter((h) => ids.has(h.id)).length;
  },
  // Vitals
  latestVitals: () => state.vitals.length ? state.vitals.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null,
  // Reviews
  todayReview: () => {
    const today = new Date().toDateString();
    return state.reviews.find((r) => r.type === 'daily' && new Date(r.date).toDateString() === today);
  },
  thisWeekReview: () => {
    const now = new Date();
    const ws = new Date(now); ws.setDate(now.getDate() - now.getDay()); ws.setHours(0,0,0,0);
    return state.reviews.find((r) => r.type === 'weekly' && new Date(r.date) >= ws);
  },
  // PARA
  knowledgeByCategory: (cat) => state.knowledge.filter((k) => (k.category || 'inbox') === cat),
  // AI suggestions
  activeSuggestions: () => state.aiSuggestions.filter((s) => !s.dismissed).sort((a, b) => (b.score || 0) - (a.score || 0)),
  // Focus candidate
  focusCandidate: () => {
    if (state.focusNow && state.focusNow.taskId) {
      const t = state.tasks.find((x) => x.id === state.focusNow.taskId);
      if (t && t.status !== 'done') return t;
    }
    const cands = state.tasks.filter((t) => t.status !== 'done' && t.dueDate);
    if (!cands.length) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const score = (t) => {
      let s = 0;
      if (t.priority === 'high') s += 30; else if (t.priority === 'medium') s += 15;
      const due = new Date(t.dueDate); due.setHours(0,0,0,0);
      if (due < today) s += 50;
      else if (due.getTime() === today.getTime()) s += 25;
      else s += Math.max(0, 20 - Math.round((due - today) / 86400000));
      return s;
    };
    return cands.slice().sort((a, b) => score(b) - score(a))[0];
  },
  // Chat
  chatThread: (id) => state.chatThreads.find((t) => t.id === id),
  messagesForThread: (tid) => state.chatMessages.filter((m) => m.threadId === tid).sort((a, b) => a.createdAt - b.createdAt),
  recentChatThreads: (limit = 10) => state.chatThreads.slice().sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)).slice(0, limit),
  // Challenges
  activeChallenge: () => state.challenges.find((c) => c.status === 'active'),
  completedChallenges: () => state.challenges.filter((c) => c.status === 'completed'),
  // Notifications pending
  pendingNotifications: () => state.notifications.filter((n) => !n.delivered && new Date(n.scheduledAt) <= new Date()),
  // Tips
  tipDismissed: (id) => (state.tipsDismissed || []).includes(id),

  // ============ FINANCE ============
  // Returns income/expense totals for a given month/year (defaults to current).
  financeMonth: (m, y) => {
    m = m ?? new Date().getMonth();
    y = y ?? new Date().getFullYear();
    const rows = (state.finance || []).filter((f) => {
      const d = new Date(f.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const income  = rows.filter((r) => r.type === 'income' ).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { income, expense, net: income - expense, count: rows.length };
  },
  financeYear: (y) => {
    y = y ?? new Date().getFullYear();
    const rows = (state.finance || []).filter((f) => new Date(f.date).getFullYear() === y);
    const income  = rows.filter((r) => r.type === 'income' ).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { income, expense, net: income - expense, count: rows.length };
  },
  // Active goals for current month / current year (the ones to display on dashboard).
  currentMonthlyGoal: () => {
    const m = new Date().getMonth(), y = new Date().getFullYear();
    return (state.financeGoals || []).find((g) => g.period === 'monthly' && g.month === m && g.year === y);
  },
  currentYearlyGoal: () => {
    const y = new Date().getFullYear();
    return (state.financeGoals || []).find((g) => g.period === 'yearly' && g.year === y);
  },
  // Group expenses by category for charts.
  financeByCategory: (m, y) => {
    m = m ?? new Date().getMonth();
    y = y ?? new Date().getFullYear();
    const rows = (state.finance || []).filter((f) => {
      const d = new Date(f.date);
      return d.getMonth() === m && d.getFullYear() === y && f.type === 'expense';
    });
    const map = {};
    rows.forEach((r) => {
      const cat = r.category || 'other';
      map[cat] = (map[cat] || 0) + (Number(r.amount) || 0);
    });
    return map;
  },

  // ============ QUOTES ============
  randomQuote: () => {
    const list = state.quotes || [];
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  },
  favoriteQuotes: () => (state.quotes || []).filter((q) => q.favorite)
};
