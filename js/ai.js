// Designer OS — Heuristic AI Engine
// A rules + scoring engine that surfaces intelligent suggestions.
// Designed with the same contract OpenAI would use, so it's swappable later.
//
// Output shape:
//   { id, type, title, reason, action, priority (0-100), createdAt }
//
// type: 'priority' | 'burnout' | 'recovery' | 'deepwork' | 'pattern' | 'breakdown' | 'review_due'

import { getState, sel } from './store.js';
import { isSameDay, addDays, startOfDay } from './utils.js';
import { t, getLang } from './i18n.js';

const lang = () => getLang();
const ar = () => lang() === 'ar';

// ============================================================
// Suggestions
// ============================================================

/**
 * Generate AI suggestions based on current state.
 * Returns an array of suggestion objects ordered by priority desc.
 */
export function generateSuggestions() {
  const state = getState();
  const out = [];

  // 1. Overdue tasks
  const overdue = sel.overdueTasks();
  if (overdue.length > 0) {
    out.push({
      id: 'overdue-' + overdue.length,
      type: 'priority',
      icon: 'alert',
      title: ar()
        ? `${overdue.length} مهام متأخرة تنتظرك`
        : `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} waiting`,
      reason: ar()
        ? 'البدء بالمتأخرات يقلل الضغط الذهني فوراً'
        : 'Clearing overdue tasks reduces mental load immediately',
      actionLabel: ar() ? 'عرض' : 'Review',
      actionPath: '/tasks',
      priority: 90 + Math.min(10, overdue.length)
    });
  }

  // 2. Burnout detection — focus minutes dropped >40% week over week
  const burnoutSignal = detectBurnout(state);
  if (burnoutSignal) {
    out.push({
      id: 'burnout',
      type: 'burnout',
      icon: 'flame',
      title: ar() ? 'مؤشرات إرهاق' : 'Burnout signals detected',
      reason: burnoutSignal,
      actionLabel: ar() ? 'فعّل وضع التعافي' : 'Switch to Recovery',
      actionMode: 'recovery',
      priority: 85
    });
  }

  // 3. Recovery — low energy 2+ days in a row
  const lowEnergyStreak = consecutiveLowEnergy(state);
  if (lowEnergyStreak >= 2 && state.mode !== 'recovery') {
    out.push({
      id: 'recovery-low-energy',
      type: 'recovery',
      icon: 'battery',
      title: ar() ? 'طاقتك منخفضة منذ يومين' : 'Low energy for 2+ days',
      reason: ar()
        ? 'التعافي القصير الآن يوفر ساعات لاحقاً'
        : 'Short recovery now saves hours later',
      actionLabel: ar() ? 'وضع التعافي' : 'Recovery mode',
      actionMode: 'recovery',
      priority: 80
    });
  }

  // 4. Deep work window — high energy + no active focus + has tasks
  const v = sel.latestVitals();
  if (v && v.energy >= 4 && !state.activeFocus && sel.todayTasks().length > 0 && state.mode !== 'deep') {
    const candidate = sel.focusCandidate();
    if (candidate) {
      out.push({
        id: 'deepwork-' + candidate.id,
        type: 'deepwork',
        icon: 'target',
        title: ar() ? 'طاقة عالية — وقت العمل العميق' : 'High energy — deep work window',
        reason: ar()
          ? `ابدأ بـ "${candidate.title}" لمدة 25-90 دقيقة`
          : `Start "${candidate.title}" for 25-90 min`,
        actionLabel: ar() ? 'ابدأ التركيز' : 'Start focus',
        actionPath: '/focus',
        actionMode: 'deep',
        actionFocusTaskId: candidate.id,
        priority: 75
      });
    }
  }

  // 5. Inbox triage
  const inbox = state.knowledge.filter((k) => (k.category || 'inbox') === 'inbox');
  if (inbox.length >= 5) {
    out.push({
      id: 'inbox-triage',
      type: 'priority',
      icon: 'inbox',
      title: ar()
        ? `${inbox.length} عنصر بانتظار الفرز`
        : `${inbox.length} items awaiting triage`,
      reason: ar()
        ? 'عقلٌ صافي = إنتاجية أفضل. صنّفها سريعاً'
        : 'A clear mind performs better. Triage now',
      actionLabel: ar() ? 'افرز' : 'Triage',
      actionPath: '/knowledge',
      priority: 60
    });
  }

  // 6. Daily review reminder (after 6pm and no review today)
  const hour = new Date().getHours();
  if (hour >= 18 && !sel.todayReview()) {
    out.push({
      id: 'daily-review',
      type: 'review_due',
      icon: 'check_circle',
      title: ar() ? 'وقت المراجعة اليومية' : "Time for today's review",
      reason: ar()
        ? '3 دقائق فقط — تحوّل التعلّم إلى نمو'
        : 'Just 3 minutes — turn learning into growth',
      actionLabel: ar() ? 'ابدأ المراجعة' : 'Start review',
      actionPath: '/reviews',
      priority: 70
    });
  }

  // 7. Pattern detection — best hour of day for focus
  const pattern = detectFocusPattern(state);
  if (pattern && pattern.confidence >= 0.6) {
    const nowH = new Date().getHours();
    if (Math.abs(nowH - pattern.peakHour) <= 1) {
      out.push({
        id: 'pattern-peak-hour',
        type: 'pattern',
        icon: 'trending',
        title: ar()
          ? `هذه ساعتك الذهبية (${pattern.peakHour}:00)`
          : `This is your peak hour (${pattern.peakHour}:00)`,
        reason: ar()
          ? 'بياناتك تُظهر إنتاجية أعلى في هذا الوقت'
          : 'Your data shows higher productivity around now',
        actionLabel: ar() ? 'ابدأ التركيز' : 'Start focus',
        actionPath: '/focus',
        priority: 65
      });
    }
  }

  // 8. Subscriptions due in <3 days
  const soonSubs = (state.subscriptions || []).filter((s) => {
    if (!s.nextBillingDate) return false;
    const days = (new Date(s.nextBillingDate) - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  });
  if (soonSubs.length > 0) {
    out.push({
      id: 'subs-soon',
      type: 'priority',
      icon: 'receipt',
      title: ar()
        ? `${soonSubs.length} اشتراك قادم خلال 3 أيام`
        : `${soonSubs.length} subscription(s) due in 3 days`,
      reason: ar()
        ? 'تأكد من رصيدك قبل الخصم التلقائي'
        : 'Make sure your balance is ready',
      actionLabel: ar() ? 'عرض' : 'View',
      actionPath: '/invoices',
      priority: 55
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

// ============================================================
// Daily summary
// ============================================================

export function generateDailySummary() {
  const state = getState();
  const today = new Date();
  const tasksDone = state.tasks.filter((t) => t.status === 'done' && t.completedAt && isSameDay(t.completedAt, today)).length;
  const focusMin = sel.focusMinutesToday();
  const sessions = state.focusSessions.filter((s) => isSameDay(s.date, today));
  const completedSessions = sessions.filter((s) => s.completed).length;
  const habitsDone = sel.habitsDoneToday();
  const habitsTotal = state.habits.filter((h) => (h.frequency || 'daily') === 'daily').length;
  const v = sel.latestVitals();

  const parts = [];

  if (focusMin > 0) {
    parts.push(ar()
      ? `أنجزت ${formatMinutes(focusMin)} من العمل العميق عبر ${completedSessions} جلسة.`
      : `You did ${formatMinutes(focusMin)} of deep work across ${completedSessions} session(s).`
    );
  } else {
    parts.push(ar()
      ? 'لا توجد جلسات تركيز اليوم بعد.'
      : 'No focus sessions logged today yet.'
    );
  }

  if (tasksDone > 0) {
    parts.push(ar()
      ? `أكملت ${tasksDone} مهام.`
      : `Completed ${tasksDone} task${tasksDone > 1 ? 's' : ''}.`
    );
  }

  if (habitsTotal > 0) {
    parts.push(ar()
      ? `العادات: ${habitsDone}/${habitsTotal}.`
      : `Habits: ${habitsDone}/${habitsTotal}.`
    );
  }

  if (v) {
    if (v.energy >= 4) parts.push(ar() ? 'طاقتك عالية — استثمرها.' : 'Energy is high — use it.');
    else if (v.energy <= 2) parts.push(ar() ? 'طاقتك منخفضة — خذ استراحة قصيرة.' : 'Energy is low — take a short break.');
  }

  // Closing nudge
  const overdue = sel.overdueTasks().length;
  if (overdue === 0 && tasksDone > 0) {
    parts.push(ar() ? 'يومٌ مرتّب 🎯' : 'Clean day 🎯');
  } else if (overdue > 0) {
    parts.push(ar()
      ? `${overdue} مهام متأخرة تحتاج إعادة جدولة.`
      : `${overdue} overdue task${overdue > 1 ? 's' : ''} need rescheduling.`
    );
  }

  return parts.join(' ');
}

// ============================================================
// Goal / Task breakdown — heuristic
// ============================================================

const BREAKDOWN_TEMPLATES = {
  logo: [
    { ar: 'بحث ومرجعيات (موود بورد)', en: 'Research + moodboard' },
    { ar: 'رسومات أولية (سكتشات)', en: 'Initial sketches' },
    { ar: 'تحويل لمتجه (vector)', en: 'Vectorize' },
    { ar: 'تطبيق على mockups', en: 'Apply on mockups' },
    { ar: 'تجهيز التسليم النهائي', en: 'Final delivery prep' }
  ],
  branding: [
    { ar: 'استكشاف المرجعيات والقيم', en: 'Discovery + values' },
    { ar: 'تطوير الشعار', en: 'Logo development' },
    { ar: 'لوحة الألوان', en: 'Color palette' },
    { ar: 'نظام الخطوط', en: 'Typography system' },
    { ar: 'القوالب والأمثلة', en: 'Templates + examples' },
    { ar: 'دليل الهوية النهائي', en: 'Final brand guide' }
  ],
  social: [
    { ar: 'موود بورد للحملة', en: 'Campaign moodboard' },
    { ar: 'تجهيز النصوص', en: 'Copywriting' },
    { ar: 'تصميم البوستات', en: 'Design posts' },
    { ar: 'مراجعة وتعديلات', en: 'Review + revisions' },
    { ar: 'تصدير وجدولة النشر', en: 'Export + schedule' }
  ],
  default: [
    { ar: 'تجهيز المتطلبات', en: 'Gather requirements' },
    { ar: 'تخطيط أولي', en: 'Initial planning' },
    { ar: 'التنفيذ', en: 'Execution' },
    { ar: 'مراجعة', en: 'Review' },
    { ar: 'التسليم', en: 'Delivery' }
  ]
};

/**
 * Break a task or project into subtasks using keyword detection.
 */
export function breakdownTask(text) {
  const lower = String(text || '').toLowerCase();
  let template = BREAKDOWN_TEMPLATES.default;
  if (/\b(logo|شعار)\b/.test(lower)) template = BREAKDOWN_TEMPLATES.logo;
  else if (/\b(brand|هوية|بصرية)\b/.test(lower)) template = BREAKDOWN_TEMPLATES.branding;
  else if (/\b(social|بوست|حملة|سوشيال|انستا|instagram)\b/.test(lower)) template = BREAKDOWN_TEMPLATES.social;
  return template.map((step) => ar() ? step.ar : step.en);
}

// ============================================================
// Internal heuristics
// ============================================================

function detectBurnout(state) {
  const today = startOfDay();
  const weekAgo = addDays(today, -7);
  const twoWeeksAgo = addDays(today, -14);
  const mins = (from, to) => state.focusSessions
    .filter((s) => new Date(s.date) >= from && new Date(s.date) < to)
    .reduce((sum, s) => sum + (s.duration || 0), 0);
  const lastWeek = mins(weekAgo, today);
  const prevWeek = mins(twoWeeksAgo, weekAgo);
  if (prevWeek === 0) return null;
  const drop = (prevWeek - lastWeek) / prevWeek;
  if (drop >= 0.4) {
    return ar()
      ? `انخفض وقت تركيزك ${Math.round(drop * 100)}% مقارنة بالأسبوع الماضي`
      : `Focus time dropped ${Math.round(drop * 100)}% vs last week`;
  }
  // also consider low energy logs in last 5 days
  const lowDays = state.vitals
    .filter((v) => new Date(v.date) >= addDays(today, -5))
    .filter((v) => v.energy <= 2).length;
  if (lowDays >= 3) {
    return ar()
      ? `طاقة منخفضة ${lowDays} أيام من آخر 5`
      : `Low energy on ${lowDays} of last 5 days`;
  }
  return null;
}

function consecutiveLowEnergy(state) {
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, -i);
    const dayLogs = state.vitals.filter((v) => isSameDay(v.date, d));
    if (!dayLogs.length) break;
    const avg = dayLogs.reduce((s, v) => s + (v.energy || 0), 0) / dayLogs.length;
    if (avg <= 2.5) count++;
    else break;
  }
  return count;
}

function detectFocusPattern(state) {
  const sessions = state.focusSessions.filter((s) => s.completed);
  if (sessions.length < 6) return null;
  const buckets = new Array(24).fill(0);
  sessions.forEach((s) => {
    const h = new Date(s.startedAt || s.date).getHours();
    buckets[h]++;
  });
  let peakHour = 0, peakCount = 0;
  buckets.forEach((c, h) => { if (c > peakCount) { peakCount = c; peakHour = h; } });
  const total = sessions.length;
  const confidence = peakCount / Math.max(1, total / 6);
  return { peakHour, peakCount, confidence: Math.min(1, confidence) };
}

function formatMinutes(mins) {
  if (mins < 60) return ar() ? `${Math.round(mins)} دقيقة` : `${Math.round(mins)} min`;
  const h = (mins / 60).toFixed(1);
  return ar() ? `${h} ساعة` : `${h}h`;
}

// ============================================================
// Action dispatcher (apply suggestion)
// ============================================================

import { setFocusNow } from './store.js';
import { activateMode } from './modes.js';
import { navigate } from './router.js';

export async function applySuggestion(s) {
  if (s.actionMode) {
    await activateMode(s.actionMode);
  }
  if (s.actionFocusTaskId) {
    await setFocusNow({ taskId: s.actionFocusTaskId, startedAt: Date.now() });
  }
  if (s.actionPath) {
    navigate(s.actionPath);
  }
}
