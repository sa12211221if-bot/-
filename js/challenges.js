// Designer OS — Challenges & Rewards engine
// Random challenges adapted to user's data and current state.
// Auto-suggests a daily challenge if none active. Awards small "rewards" on completion.

import { getState, sel, upsert } from './store.js';
import { uid } from './db.js';
import { getLang } from './i18n.js';
import { isSameDay, addDays } from './utils.js';

// ============================================================
// Challenge templates
// Each is a function that returns a challenge object IF conditions match user state,
// or null. The engine picks a matching template randomly.
// ============================================================

const TEMPLATES = [
  // Focus / deep work
  (s) => ({
    id: 'focus-90',
    title: { ar: '90 دقيقة تركيز عميق', en: '90 min deep focus' },
    desc: { ar: 'بدون مقاطعات، بدون موبايل', en: 'No interruptions, no phone' },
    metric: 'focusMinutes',
    target: 90,
    reward: { ar: '☕ قهوتك المفضلة', en: '☕ Your favorite coffee' },
    duration: 'today',
    period: 'day',
    when: () => true
  }),
  (s) => ({
    id: 'focus-3-sessions',
    title: { ar: '3 جلسات بومودورو متتالية', en: '3 back-to-back Pomodoros' },
    desc: { ar: '75 دقيقة عمل + استراحات قصيرة', en: '75 min focus + short breaks' },
    metric: 'sessions',
    target: 3,
    reward: { ar: '🍰 حلوى/تحلية', en: '🍰 Treat yourself' },
    period: 'day',
    when: () => true
  }),

  // Tasks
  (s) => sel.overdueTasks().length >= 3 ? ({
    id: 'clear-overdue',
    title: { ar: `أنجز ${Math.min(3, sel.overdueTasks().length)} مهام متأخرة`, en: `Clear ${Math.min(3, sel.overdueTasks().length)} overdue tasks` },
    desc: { ar: 'البداية بالأصعب يفتح اليوم', en: 'Hardest first unlocks the day' },
    metric: 'overdueCleared',
    target: Math.min(3, sel.overdueTasks().length),
    reward: { ar: '🎮 نصف ساعة لعبة', en: '🎮 30 min gaming' },
    period: 'day',
    when: () => true
  }) : null,

  (s) => ({
    id: 'today-tasks-all',
    title: { ar: 'أنجز كل مهام اليوم', en: 'Finish ALL today\'s tasks' },
    desc: { ar: 'يوم نظيف بلا مهام معلّقة', en: 'A clean day with zero hanging tasks' },
    metric: 'todayTasksDone',
    target: sel.todayTasks().length || 1,
    reward: { ar: '🍕 وجبتك المفضلة', en: '🍕 Your favorite meal' },
    period: 'day',
    when: () => sel.todayTasks().length >= 2
  }),

  // Inbox triage
  (s) => {
    const inbox = (s.knowledge || []).filter((k) => (k.category || 'inbox') === 'inbox');
    return inbox.length >= 5 ? ({
      id: 'inbox-zero',
      title: { ar: `صفّر الـ Inbox (${inbox.length} عنصر)`, en: `Inbox zero (${inbox.length} items)` },
      desc: { ar: 'صنّف كل العناصر إلى مكانها الصحيح', en: 'Triage every item to its proper place' },
      metric: 'inboxTriaged',
      target: inbox.length,
      reward: { ar: '🌅 نزهة قصيرة', en: '🌅 A short walk' },
      period: 'day',
      when: () => true
    }) : null;
  },

  // Habits
  (s) => s.habits.length >= 3 ? ({
    id: 'habits-all',
    title: { ar: 'أكمل كل عاداتك اليومية', en: 'Complete every daily habit' },
    desc: { ar: 'الالتزام يبني الهوية', en: 'Consistency builds identity' },
    metric: 'habitsAllDone',
    target: s.habits.filter((h) => (h.frequency || 'daily') === 'daily').length,
    reward: { ar: '⭐ تكتب إنجازك في دفتر يومياتك', en: '⭐ Journal this win' },
    period: 'day',
    when: () => true
  }) : null,

  // Review
  (s) => !sel.todayReview() ? ({
    id: 'daily-review',
    title: { ar: 'مراجعتك اليومية (3 دقائق)', en: 'Daily review (3 min)' },
    desc: { ar: 'حوّل تعلّمك اليوم إلى رؤية', en: 'Turn today\'s learning into insight' },
    metric: 'dailyReviewDone',
    target: 1,
    reward: { ar: '📖 صفحة قراءة من كتاب', en: '📖 Read a page from a book' },
    period: 'day',
    when: () => new Date().getHours() >= 17
  }) : null,

  // Capture
  (s) => ({
    id: 'capture-3',
    title: { ar: 'التقط 3 أفكار أو مراجع', en: 'Capture 3 ideas/references' },
    desc: { ar: 'استخدم Cmd+K بسرعة', en: 'Use Cmd+K rapidly' },
    metric: 'capturesAdded',
    target: 3,
    reward: { ar: '☁️ راحة 5 دقائق', en: '☁️ 5-min break' },
    period: 'day',
    when: () => true
  }),

  // Vitals
  (s) => !sel.latestVitals() || !isSameDay(sel.latestVitals().date, new Date()) ? ({
    id: 'log-vitals',
    title: { ar: 'سجّل حالتك الذهنية اليوم', en: 'Log your mental state today' },
    desc: { ar: 'الـ AI يستخدمها في اقتراحاته', en: 'AI uses this in its suggestions' },
    metric: 'vitalsLogged',
    target: 1,
    reward: { ar: '🧘 نفس عميق × 5', en: '🧘 5 deep breaths' },
    period: 'day',
    when: () => true
  }) : null,

  // Spirit (Islamic mode)
  (s) => s.mode === 'islamic' ? ({
    id: 'all-prayers-on-time',
    title: { ar: 'صلواتك الخمس في وقتها', en: 'All 5 prayers on time' },
    desc: { ar: 'الصلاة عمود الدين', en: 'Prayer is the pillar' },
    metric: 'prayersOnTime',
    target: 5,
    reward: { ar: '🤲 دعاء بظهر الغيب لشخص', en: '🤲 Pray for someone privately' },
    period: 'day',
    when: () => true
  }) : null,

  // Weekly
  (s) => ({
    id: 'no-overdue-week',
    title: { ar: 'أسبوع بدون مهام متأخرة', en: 'A week with zero overdue' },
    desc: { ar: 'صفر مهام متأخرة لمدة 7 أيام', en: 'Zero overdue for 7 days' },
    metric: 'overdueZeroDays',
    target: 7,
    reward: { ar: '🛍️ هدية لنفسك', en: '🛍️ Gift to yourself' },
    period: 'week',
    when: () => sel.overdueTasks().length === 0
  })
];

// ============================================================
// Engine
// ============================================================

function pickTemplate() {
  const s = getState();
  const candidates = TEMPLATES
    .map((fn) => fn(s))
    .filter((c) => c && (!c.when || c.when()));
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Public: get a fresh challenge object based on user state, or null.
 */
export function generateChallenge() {
  const tpl = pickTemplate();
  if (!tpl) return null;
  const lang = getLang();
  return {
    id: uid(),
    sourceId: tpl.id,
    title: tpl.title[lang] || tpl.title.en,
    desc: tpl.desc?.[lang] || tpl.desc?.en || '',
    metric: tpl.metric,
    target: tpl.target,
    progress: 0,
    reward: tpl.reward?.[lang] || tpl.reward?.en || '',
    period: tpl.period,
    status: 'pending', // pending | active | completed | skipped
    createdAt: Date.now(),
    expiresAt: tpl.period === 'week' ? addDays(new Date(), 7).getTime() : addDays(new Date(), 1).getTime()
  };
}

/**
 * Make sure user has at least one pending/active challenge.
 * Returns the active/pending challenge.
 */
export async function ensureDailyChallenge() {
  const s = getState();
  // Already has active or pending → keep it
  const existing = s.challenges.find((c) => c.status === 'active' || c.status === 'pending');
  if (existing) {
    // Has it expired?
    if (existing.expiresAt && existing.expiresAt < Date.now() && existing.status !== 'completed') {
      await upsert('challenges', { ...existing, status: 'expired' });
    } else {
      return existing;
    }
  }
  // Already completed one today? Don't auto-suggest another until tomorrow.
  const completedToday = s.challenges.find((c) =>
    c.status === 'completed' && c.completedAt && isSameDay(c.completedAt, new Date())
  );
  if (completedToday) return null;

  const ch = generateChallenge();
  if (!ch) return null;
  await upsert('challenges', ch);
  return ch;
}

/**
 * Accept (move to active).
 */
export async function acceptChallenge(id) {
  const s = getState();
  const c = s.challenges.find((x) => x.id === id);
  if (!c) return;
  await upsert('challenges', { ...c, status: 'active', acceptedAt: Date.now() });
}

/**
 * Complete + grant reward.
 */
export async function completeChallenge(id) {
  const s = getState();
  const c = s.challenges.find((x) => x.id === id);
  if (!c || c.status === 'completed') return;
  await upsert('challenges', { ...c, status: 'completed', completedAt: Date.now() });
  // Persist reward record
  await upsert('rewards', {
    id: uid(),
    challengeId: id,
    text: c.reward,
    title: c.title,
    earnedAt: Date.now()
  });
  return c;
}

export async function skipChallenge(id) {
  const s = getState();
  const c = s.challenges.find((x) => x.id === id);
  if (!c) return;
  await upsert('challenges', { ...c, status: 'skipped', skippedAt: Date.now() });
}

/**
 * Auto-progress check for the active challenge based on its metric.
 * Called periodically (e.g., from app boot or after data changes).
 */
export async function autoProgressActive() {
  const s = getState();
  const active = s.challenges.find((c) => c.status === 'active');
  if (!active) return;
  const today = new Date();

  let progress = 0;
  switch (active.metric) {
    case 'focusMinutes':
      progress = sel.focusMinutesToday();
      break;
    case 'sessions':
      progress = s.focusSessions.filter((x) => x.completed && isSameDay(x.date, today)).length;
      break;
    case 'overdueCleared': {
      // count tasks completed today that were overdue (had dueDate before today)
      progress = s.tasks.filter((t) =>
        t.status === 'done' &&
        t.completedAt && isSameDay(t.completedAt, today) &&
        t.dueDate && new Date(t.dueDate) < today
      ).length;
      break;
    }
    case 'todayTasksDone': {
      progress = s.tasks.filter((t) =>
        t.status === 'done' &&
        t.completedAt && isSameDay(t.completedAt, today) &&
        t.dueDate && isSameDay(t.dueDate, today)
      ).length;
      break;
    }
    case 'inboxTriaged': {
      // hard to track historically without explicit log → use snapshot diff vs createdAt
      const triaged = (s.knowledge || []).filter((k) =>
        (k.category || 'inbox') !== 'inbox' &&
        k.updatedAt && k.updatedAt >= active.acceptedAt
      ).length;
      progress = triaged;
      break;
    }
    case 'habitsAllDone':
      progress = sel.habitsDoneToday();
      break;
    case 'dailyReviewDone':
      progress = sel.todayReview() ? 1 : 0;
      break;
    case 'capturesAdded':
      progress = (s.knowledge || []).filter((k) =>
        k.createdAt && k.createdAt >= active.acceptedAt
      ).length;
      break;
    case 'vitalsLogged':
      progress = sel.latestVitals() && isSameDay(sel.latestVitals().date, today) ? 1 : 0;
      break;
  }

  if (progress !== active.progress) {
    const updated = { ...active, progress };
    if (progress >= active.target) {
      updated.status = 'completed';
      updated.completedAt = Date.now();
      await upsert('challenges', updated);
      await upsert('rewards', {
        id: uid(),
        challengeId: active.id,
        text: active.reward,
        title: active.title,
        earnedAt: Date.now()
      });
    } else {
      await upsert('challenges', updated);
    }
  }
}
