// Designer OS — Command Center Shell (v3)
// Adds: tips nav, prayer countdown widget in topbar, notifications panel

import { el } from './utils.js';
import { icon } from './icons.js';
import { t, getLang, setLang, isRTL, fmtDate } from './i18n.js';
import { navigate, onRouteChange } from './router.js';
import { getState, sel, subscribe } from './store.js';
import { applyAccent } from './ui.js';
import { openCapture, bindCaptureHotkey } from './capture.js';
import { nextPrayer, fmtCountdown } from './prayerTimes.js';

// Navigation: clean lineup. Removed habits/reviews/tips from sidebar to reduce noise;
// they remain reachable via routes for users who used them. Added /finance and /quotes.
const NAV_ITEMS = [
  { path: '/',          key: 'command_center', icon: 'dashboard' },
  { path: '/tasks',     key: 'nav_tasks',      icon: 'check_circle' },
  { path: '/projects',  key: 'nav_projects',   icon: 'briefcase' },
  { path: '/calendar',  key: 'nav_calendar',   icon: 'calendar' },
  { path: '/finance',   key: 'nav_finance',    icon: 'chart' },
  { path: '/quotes',    key: 'nav_quotes',     icon: 'bulb' },
  { path: '/knowledge', key: 'nav_knowledge',  icon: 'database' },
  { path: '/assistant', key: 'nav_assistant',  icon: 'zap', accent: true },
  { path: '/settings',  key: 'nav_settings',   icon: 'settings' }
];

const MOBILE_NAV = [
  { path: '/',          key: 'command_center', icon: 'dashboard' },
  { path: '/tasks',     key: 'nav_tasks',      icon: 'check_circle' },
  { capture: true,                              icon: 'plus' },
  { path: '/assistant', key: 'nav_assistant',  icon: 'zap' },
  { path: '/settings',  key: 'nav_settings',   icon: 'settings' }
];

let clockTimer = null;
let prayerTimer = null;

export function buildShell() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.className = 'app-shell';

  const scrim = el('div', { class: 'scrim' });
  const sidebar = buildSidebar(scrim);
  const main = el('main', { class: 'main' });
  const topbar = buildTopbar(sidebar, scrim);
  const outlet = el('div', { class: 'content', id: 'content' });
  main.appendChild(topbar);
  main.appendChild(outlet);

  const bottomNav = buildBottomNav();

  if (isRTL()) {
    app.appendChild(main);
    app.appendChild(sidebar);
  } else {
    app.appendChild(sidebar);
    app.appendChild(main);
  }
  app.appendChild(scrim);
  app.appendChild(bottomNav);

  // Route change → highlight nav, update title
  onRouteChange(({ path }) => {
    const item = NAV_ITEMS.find((x) => x.path === path) || NAV_ITEMS[0];
    const titleEl = topbar.querySelector('.topbar__title');
    if (titleEl) titleEl.textContent = t(item.key);
    sidebar.querySelectorAll('.nav-link').forEach((a) => {
      a.classList.toggle('active', a.dataset.path === path);
    });
    bottomNav.querySelectorAll('.bottom-nav__item').forEach((a) => {
      a.classList.toggle('active', a.dataset.path === path);
    });
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
  });

  subscribe(() => {
    updateBadges(sidebar);
    refreshPrayerWidget(topbar);
  });
  updateBadges(sidebar);

  bindCaptureHotkey();

  startClock(topbar);
  startPrayerWidget(topbar);

  return { app, outlet, sidebar, topbar };
}

function buildSidebar(scrim) {
  const aside = el('aside', { class: 'sidebar' });

  aside.appendChild(el('div', { class: 'sidebar__brand' },
    el('div', { class: 'sidebar__brand-logo' }, 'ع'),
    el('div', { class: 'sidebar__brand-text' },
      el('span', { class: 'sidebar__brand-name' }, t('appName')),
      el('span', { class: 'sidebar__brand-tag' }, t('command_center'))
    )
  ));

  const nav = el('nav', { class: 'sidebar__nav' });
  NAV_ITEMS.forEach((it) => {
    const link = el('a', {
      class: 'nav-link' + (it.accent ? ' nav-link--accent' : ''),
      href: '#' + it.path,
      dataset: { path: it.path },
      onClick: (e) => {
        e.preventDefault();
        navigate(it.path);
        aside.classList.remove('open');
        scrim.classList.remove('show');
      }
    });
    link.innerHTML = `<span class="nav-link__icon">${icon(it.icon)}</span><span class="nav-link__label">${t(it.key)}</span>`;
    nav.appendChild(link);
  });
  aside.appendChild(nav);

  const footer = el('div', { class: 'sidebar__footer' });
  const captureBtn = el('button', { class: 'btn btn--block sidebar__capture-btn', onClick: () => openCapture() });
  captureBtn.innerHTML = icon('plus') + ' ' + t('capture') + ' <kbd>⌘K</kbd>';
  footer.appendChild(captureBtn);

  const langBtn = el('button', {
    class: 'btn btn--block sidebar__lang-btn',
    onClick: toggleLang
  });
  langBtn.innerHTML = icon('globe') + ' ' + (getLang() === 'ar' ? 'English' : 'العربية');
  footer.appendChild(langBtn);

  aside.appendChild(footer);
  return aside;
}

function buildTopbar(sidebar, scrim) {
  const bar = el('header', { class: 'topbar' });

  const menuBtn = el('button', {
    class: 'btn btn--icon btn--ghost menu-btn',
    onClick: () => { sidebar.classList.add('open'); scrim.classList.add('show'); }
  });
  menuBtn.innerHTML = icon('menu');
  scrim.addEventListener('click', () => {
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
  });
  const closeBtn = el('button', {
    class: 'btn btn--icon btn--ghost sidebar__close',
    onClick: () => { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
  });
  closeBtn.innerHTML = icon('x');
  sidebar.querySelector('.sidebar__brand').appendChild(closeBtn);
  bar.appendChild(menuBtn);

  bar.appendChild(el('h1', { class: 'topbar__title' }, t('command_center')));

  // Prayer countdown widget (only when prayer times configured)
  const prayerWidget = el('button', {
    class: 'topbar__prayer hidden',
    onClick: () => navigate('/settings', { section: 'prayer' }),
    title: t('prayer_times')
  });
  bar.appendChild(prayerWidget);

  // Clock
  const clockBox = el('div', { class: 'topbar__clock' });
  clockBox.innerHTML = `
    <span class="topbar__clock-time" id="clock-time">--:--</span>
    <span class="topbar__clock-date" id="clock-date"></span>
  `;
  bar.appendChild(clockBox);

  bar.appendChild(el('div', { class: 'topbar__spacer' }));

  // Capture button
  const captureBtn = el('button', { class: 'btn btn--primary topbar__capture', onClick: () => openCapture() });
  captureBtn.innerHTML = icon('plus') + ' <span class="topbar__capture-label">' + t('capture') + '</span>';
  bar.appendChild(captureBtn);

  // Notifications
  const notifBtn = el('button', { class: 'btn btn--icon btn--ghost', title: t('notifications'), onClick: () => navigate('/assistant') });
  notifBtn.innerHTML = icon('bell');
  const overdue = sel.overdueTasks().length;
  if (overdue > 0) {
    notifBtn.style.position = 'relative';
    notifBtn.appendChild(el('span', { class: 'notif-dot' }));
  }
  bar.appendChild(notifBtn);

  return bar;
}

function buildBottomNav() {
  const nav = el('nav', { class: 'bottom-nav' });
  MOBILE_NAV.forEach((it) => {
    if (it.capture) {
      const btn = el('button', { class: 'bottom-nav__item bottom-nav__item--accent', onClick: () => openCapture() });
      btn.innerHTML = icon('plus', { size: 22 });
      nav.appendChild(btn);
    } else {
      const link = el('a', {
        class: 'bottom-nav__item',
        href: '#' + it.path,
        dataset: { path: it.path },
        onClick: (e) => { e.preventDefault(); navigate(it.path); }
      });
      link.innerHTML = `<span class="bottom-nav__icon">${icon(it.icon, { size: 18 })}</span><span class="bottom-nav__label">${t(it.key)}</span>`;
      nav.appendChild(link);
    }
  });
  return nav;
}

function updateBadges(sidebar) {
  const overdue = sel.overdueTasks().length;
  const today = sel.todayTasks().length;
  const inboxCount = (getState().knowledge || []).filter((k) => (k.category || 'inbox') === 'inbox').length;
  const suggestions = sel.activeSuggestions().length;
  const pendingChallenges = (getState().challenges || []).filter((c) => c.status === 'pending' || c.status === 'active').length;
  sidebar.querySelectorAll('.nav-link').forEach((link) => {
    const key = link.dataset.path;
    let count = 0;
    if (key === '/tasks') count = overdue + today;
    else if (key === '/knowledge') count = inboxCount;
    else if (key === '/assistant') count = suggestions;
    const existing = link.querySelector('.nav-link__badge');
    if (existing) existing.remove();
    if (count > 0) {
      link.appendChild(el('span', { class: 'nav-link__badge' }, count));
    }
  });
}

function startClock(topbar) {
  if (clockTimer) clearInterval(clockTimer);
  const tick = () => {
    const now = new Date();
    const time = topbar.querySelector('#clock-time');
    const date = topbar.querySelector('#clock-date');
    if (time) {
      time.textContent = new Intl.DateTimeFormat(getLang() === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(now);
    }
    if (date) {
      date.textContent = fmtDate(now, { weekday: 'short', day: '2-digit', month: 'short' });
    }
  };
  tick();
  clockTimer = setInterval(tick, 30 * 1000);
}

// ============================================================
// Prayer countdown widget in topbar
// ============================================================
function refreshPrayerWidget(topbar) {
  const widget = topbar.querySelector('.topbar__prayer');
  if (!widget) return;
  const np = nextPrayer();
  const state = getState();
  // Show when prayer is configured (Islamic mode highlights it more)
  const configured = state.prayerCity || state.prayerLat;
  if (!configured || !np) {
    widget.classList.add('hidden');
    return;
  }
  widget.classList.remove('hidden');
  if (np.passed) {
    widget.innerHTML = `<span class="topbar__prayer-icon">🕌</span><span class="topbar__prayer-name">${t(np.name.toLowerCase())}</span><span class="topbar__prayer-time text-sm text-muted">${np.time}</span>`;
  } else {
    widget.innerHTML = `<span class="topbar__prayer-icon">🕌</span><span class="topbar__prayer-name">${t(np.name.toLowerCase())}</span><span class="topbar__prayer-countdown font-mono">${fmtCountdown(np.msUntil)}</span>`;
  }
}

function startPrayerWidget(topbar) {
  if (prayerTimer) clearInterval(prayerTimer);
  refreshPrayerWidget(topbar);
  // Update every second for smooth countdown
  prayerTimer = setInterval(() => refreshPrayerWidget(topbar), 1000);
}

function toggleLang() {
  const next = getLang() === 'ar' ? 'en' : 'ar';
  setLang(next);
  setTimeout(() => location.reload(), 50);
}

export function openQuickCapture() { openCapture(); }
export function applyTheme() {
  const accent = getState().accent;
  if (accent) applyAccent(accent);
}
