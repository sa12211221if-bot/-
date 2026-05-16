// Designer OS — Command Center Shell
// New IA: 9 primary destinations + persistent topbar (clock, date, mode, search, avatar)
// Mobile gets a bottom nav with 5 essential items.

import { el } from './utils.js';
import { icon } from './icons.js';
import { t, getLang, setLang, isRTL, fmtDate } from './i18n.js';
import { navigate, onRouteChange } from './router.js';
import { getState, sel, subscribe } from './store.js';
import { applyAccent } from './ui.js';
import { MODES, MODE_LIST, activateMode, currentMode, cycleMode } from './modes.js';
import { openCapture, bindCaptureHotkey } from './capture.js';

// New navigation: 9 grouped items
const NAV_ITEMS = [
  { path: '/',          key: 'command_center', icon: 'dashboard' },
  { path: '/tasks',     key: 'nav_tasks',      icon: 'check_circle' },
  { path: '/projects',  key: 'nav_projects',   icon: 'briefcase' },
  { path: '/calendar',  key: 'nav_calendar',   icon: 'calendar' },
  { path: '/knowledge', key: 'nav_knowledge',  icon: 'database' },
  { path: '/habits',    key: 'nav_habits',     icon: 'flame' },
  { path: '/reviews',   key: 'nav_reviews',    icon: 'bookmark' },
  { path: '/assistant', key: 'nav_assistant',  icon: 'zap', accent: true },
  { path: '/settings',  key: 'nav_settings',   icon: 'settings' }
];

// Bottom-nav (mobile) — 5 essentials with Capture in middle as accent
const MOBILE_NAV = [
  { path: '/',          key: 'command_center', icon: 'dashboard' },
  { path: '/tasks',     key: 'nav_tasks',      icon: 'check_circle' },
  { capture: true,                              icon: 'plus' },
  { path: '/knowledge', key: 'nav_knowledge',  icon: 'database' },
  { path: '/assistant', key: 'nav_assistant',  icon: 'zap' }
];

let clockTimer = null;

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

  // Reactive badges + mode-pill
  subscribe(() => {
    updateBadges(sidebar);
    const pill = topbar.querySelector('.mode-pill');
    if (pill) refreshModePill(pill);
  });
  updateBadges(sidebar);

  // Cmd/Ctrl+K → capture
  bindCaptureHotkey();
  // M → cycle mode
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      cycleMode();
    }
  });

  // Boot clock
  startClock(topbar);

  return { app, outlet, sidebar, topbar };
}

function buildSidebar(scrim) {
  const aside = el('aside', { class: 'sidebar' });

  aside.appendChild(el('div', { class: 'sidebar__brand' },
    el('div', { class: 'sidebar__brand-logo' }, 'D'),
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

  // Footer: capture button + lang
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

  // Mobile menu
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

  // Title (page title)
  bar.appendChild(el('h1', { class: 'topbar__title' }, t('command_center')));

  // Clock + date (centered area)
  const clockBox = el('div', { class: 'topbar__clock' });
  clockBox.innerHTML = `
    <span class="topbar__clock-time" id="clock-time">--:--</span>
    <span class="topbar__clock-date" id="clock-date"></span>
  `;
  bar.appendChild(clockBox);

  bar.appendChild(el('div', { class: 'topbar__spacer' }));

  // Mode pill
  const pill = buildModePill();
  bar.appendChild(pill);

  // Quick capture button
  const captureBtn = el('button', { class: 'btn btn--primary topbar__capture', onClick: () => openCapture() });
  captureBtn.innerHTML = icon('plus') + ' <span class="topbar__capture-label">' + t('capture') + '</span>';
  bar.appendChild(captureBtn);

  // Notifications
  const overdue = sel.overdueTasks().length;
  const notifBtn = el('button', { class: 'btn btn--icon btn--ghost', title: t('insights'), onClick: () => navigate('/assistant') });
  notifBtn.innerHTML = icon('bell');
  if (overdue > 0) {
    notifBtn.style.position = 'relative';
    notifBtn.appendChild(el('span', { class: 'notif-dot' }));
  }
  bar.appendChild(notifBtn);

  return bar;
}

function buildModePill() {
  const pill = el('button', { class: 'mode-pill', onClick: openModeMenu });
  refreshModePill(pill);
  return pill;
}

function refreshModePill(pill) {
  const m = currentMode();
  pill.dataset.mode = m.id;
  pill.innerHTML = `
    <span class="mode-pill__dot"></span>
    <span class="mode-pill__icon">${icon(m.icon, { size: 14 })}</span>
    <span class="mode-pill__label">${t(m.nameKey)}</span>
    <span class="mode-pill__chev">${icon('chevron_down', { size: 14 })}</span>
  `;
}

function openModeMenu() {
  // Close existing menu if any
  const existing = document.querySelector('.mode-menu');
  if (existing) { existing.remove(); return; }
  const menu = el('div', { class: 'mode-menu glass' });
  MODE_LIST.forEach((m) => {
    const isActive = currentMode().id === m.id;
    const item = el('button', {
      class: 'mode-menu__item' + (isActive ? ' active' : ''),
      onClick: async () => { await activateMode(m.id); menu.remove(); }
    });
    item.innerHTML = `
      <span class="mode-menu__icon" style="color:${m.accent2}">${icon(m.icon, { size: 18 })}</span>
      <div class="mode-menu__text">
        <div class="mode-menu__name">${t(m.nameKey)}</div>
        <div class="mode-menu__desc">${t(m.descKey)}</div>
      </div>
      ${isActive ? `<span class="mode-menu__check">${icon('check', { size: 16 })}</span>` : ''}
    `;
    menu.appendChild(item);
  });
  // Position near the pill
  const pill = document.querySelector('.mode-pill');
  if (!pill) return;
  document.body.appendChild(menu);
  const r = pill.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = (r.bottom + 8) + 'px';
  if (isRTL()) menu.style.right = (window.innerWidth - r.right) + 'px';
  else menu.style.left = r.left + 'px';
  menu.style.zIndex = 200;
  // Click-away
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!menu.contains(e.target) && !pill.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 50);
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

function toggleLang() {
  const next = getLang() === 'ar' ? 'en' : 'ar';
  setLang(next);
  setTimeout(() => location.reload(), 50);
}

// Legacy quick capture API (some pages may still call it)
export function openQuickCapture() { openCapture(); }
export function applyTheme() {
  const accent = getState().accent;
  if (accent) applyAccent(accent);
}
