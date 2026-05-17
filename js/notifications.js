// Designer OS — Notifications layer
// Browser Notification API + scheduling.
// Triggers:
//  - Prayer reminders (X minutes before each prayer)
//  - Overdue task daily summary (10am if there are overdue tasks)
//  - Daily habit reminder (user-configured time)
//  - Active challenge nudge (mid-day if challenge accepted)

import { getState, setSetting, sel } from './store.js';
import { t, getLang } from './i18n.js';
import { nextPrayer, refreshPrayerTimes } from './prayerTimes.js';
import { db, uid } from './db.js';

const ICON_URL = './assets/icon-192.png';
const BADGE_URL = './assets/icon-192.png';

let scheduleTimer = null;
const firedToday = new Set(); // keys like 'prayer:Asr:2025-05-16' to prevent re-firing

// ============================================================
// Permission
// ============================================================

export function permissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    await setSetting('notifEnabled', true);
  }
  return result;
}

// ============================================================
// Show notification
// ============================================================

/**
 * Fire a browser notification (or fallback to in-app toast if blocked).
 */
export function show({ title, body, tag, data = {}, requireInteraction = false }) {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  // Try service-worker route first (better for PWA, works when tab is closed)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg && reg.showNotification) {
        reg.showNotification(title, {
          body,
          icon: ICON_URL,
          badge: BADGE_URL,
          tag,
          data,
          requireInteraction,
          dir: getLang() === 'ar' ? 'rtl' : 'ltr',
          lang: getLang()
        }).catch(() => directShow());
        return;
      }
      directShow();
    }).catch(() => directShow());
  } else {
    directShow();
  }

  function directShow() {
    try {
      const n = new Notification(title, {
        body,
        icon: ICON_URL,
        tag,
        data,
        requireInteraction,
        lang: getLang(),
        dir: getLang() === 'ar' ? 'rtl' : 'ltr'
      });
      n.onclick = () => {
        window.focus();
        if (data.url) location.hash = data.url;
        n.close();
      };
    } catch (e) { /* ignore */ }
  }
}

/**
 * Convenience for testing.
 */
export function testNotification() {
  show({
    title: 'Designer OS',
    body: getLang() === 'ar' ? 'هذا تنبيه اختبار 👋' : 'This is a test notification 👋',
    tag: 'test'
  });
}

// ============================================================
// Schedulers
// ============================================================

function todayKey() { return new Date().toDateString(); }
function fireOnceKey(prefix, id) { return `${prefix}:${id}:${todayKey()}`; }

function checkPrayer() {
  const s = getState();
  if (!s.notifPrayer || !s.notifEnabled) return;
  const np = nextPrayer();
  if (!np || np.passed || !np.at) return;
  const minutesBefore = parseInt(s.minutesBeforePrayer ?? 10, 10);
  const targetMs = np.at.getTime() - minutesBefore * 60 * 1000;
  const now = Date.now();
  if (now >= targetMs && now < np.at.getTime()) {
    const key = fireOnceKey('prayer', np.name);
    if (firedToday.has(key)) return;
    firedToday.add(key);
    const minutesLeft = Math.max(1, Math.round((np.at.getTime() - now) / 60000));
    show({
      title: '🕌 ' + t(np.name.toLowerCase()),
      body: getLang() === 'ar'
        ? `${minutesLeft} دقيقة على ${t(np.name.toLowerCase())} (${np.time})`
        : `${minutesLeft} min until ${t(np.name.toLowerCase())} (${np.time})`,
      tag: 'prayer-' + np.name,
      data: { url: '#/' }
    });
  }
}

function checkOverdueDigest() {
  const s = getState();
  if (!s.notifOverdueTasks || !s.notifEnabled) return;
  const now = new Date();
  // Fire once per day at 10:00 (window 10:00 - 10:05)
  if (now.getHours() !== 10 || now.getMinutes() > 5) return;
  const key = fireOnceKey('overdue-digest', 'daily');
  if (firedToday.has(key)) return;
  const overdue = sel.overdueTasks();
  if (overdue.length === 0) return;
  firedToday.add(key);
  show({
    title: getLang() === 'ar' ? '⚠️ مهام متأخرة' : '⚠️ Overdue tasks',
    body: getLang() === 'ar'
      ? `لديك ${overdue.length} مهام متأخرة. ${overdue[0].title}${overdue.length > 1 ? '...' : ''}`
      : `You have ${overdue.length} overdue tasks. ${overdue[0].title}${overdue.length > 1 ? '...' : ''}`,
    tag: 'overdue-digest',
    data: { url: '#/tasks' }
  });
}

function checkHabitReminder() {
  const s = getState();
  if (!s.notifEnabled || !s.habits.length) return;
  const reminderTime = s.notifHabitReminder || '20:00';
  const [rh, rm] = reminderTime.split(':').map(Number);
  const now = new Date();
  if (now.getHours() !== rh) return;
  if (Math.abs(now.getMinutes() - rm) > 5) return;
  const key = fireOnceKey('habit-reminder', 'daily');
  if (firedToday.has(key)) return;
  firedToday.add(key);
  const done = sel.habitsDoneToday();
  const total = s.habits.filter((h) => (h.frequency || 'daily') === 'daily').length;
  if (done >= total) return;
  show({
    title: getLang() === 'ar' ? '🔥 العادات اليومية' : '🔥 Daily habits',
    body: getLang() === 'ar'
      ? `أنجزت ${done}/${total} عادات. أكمل قبل النهاية!`
      : `${done}/${total} done. Finish before bedtime!`,
    tag: 'habit-reminder',
    data: { url: '#/habits' }
  });
}

function checkChallenge() {
  const s = getState();
  if (!s.notifChallenges || !s.notifEnabled) return;
  const active = sel.activeChallenge();
  if (!active) return;
  const now = new Date();
  // Fire once around 14:00 if challenge is active and not completed
  if (now.getHours() !== 14 || now.getMinutes() > 5) return;
  const key = fireOnceKey('challenge-nudge', active.id);
  if (firedToday.has(key)) return;
  firedToday.add(key);
  show({
    title: '🎯 ' + t('challenge'),
    body: active.title + (active.reward ? ' — ' + (getLang() === 'ar' ? 'المكافأة: ' : 'Reward: ') + active.reward : ''),
    tag: 'challenge-' + active.id,
    data: { url: '#/challenges' }
  });
}

// ============================================================
// Loop
// ============================================================

function checkQuote() {
  const s = getState();
  if (!s.notifEnabled) return;
  if (s.notifQuotes === false) return; // default ON
  const list = (s.quotes || []);
  if (list.length === 0) return;
  const now = new Date();
  // Fire at 09:00, 13:00, 18:00
  const targetHours = [9, 13, 18];
  if (!targetHours.includes(now.getHours())) return;
  if (now.getMinutes() > 5) return;
  const key = fireOnceKey('quote', String(now.getHours()));
  if (firedToday.has(key)) return;
  firedToday.add(key);
  const q = list[Math.floor(Math.random() * list.length)];
  show({
    title: '💎 ' + (getLang() === 'ar' ? 'تذكير' : 'Reminder'),
    body: q.text + (q.author ? '\n— ' + q.author : ''),
    tag: 'quote',
    data: { url: '#/quotes' }
  });
}

function tick() {
  // Reset firedToday at midnight
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() < 2) {
    firedToday.clear();
  }
  try { checkPrayer(); } catch (e) { console.error(e); }
  try { checkOverdueDigest(); } catch (e) { console.error(e); }
  try { checkHabitReminder(); } catch (e) { console.error(e); }
  try { checkChallenge(); } catch (e) { console.error(e); }
  try { checkQuote(); } catch (e) { console.error(e); }
}

/**
 * Start the scheduler loop. Runs every 30 seconds.
 */
export function startScheduler() {
  if (scheduleTimer) clearInterval(scheduleTimer);
  // Refresh prayer times once on boot
  refreshPrayerTimes().catch(() => {});
  // First tick after 5s, then every 30s
  setTimeout(tick, 5000);
  scheduleTimer = setInterval(tick, 30 * 1000);
}

export function stopScheduler() {
  if (scheduleTimer) clearInterval(scheduleTimer);
  scheduleTimer = null;
}

// ============================================================
// In-app log of past notifications (for the bell menu)
// ============================================================

export async function logNotification({ title, body, type, url }) {
  await db.put('notifications', {
    id: uid(),
    title, body, type, url,
    scheduledAt: Date.now(),
    delivered: true,
    seen: false
  });
}

export async function markAllSeen() {
  const all = await db.getAll('notifications');
  for (const n of all) {
    if (!n.seen) await db.put('notifications', { ...n, seen: true });
  }
}
