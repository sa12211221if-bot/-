// Designer OS — App shell layout
import { el, clear } from './utils.js';
import { icon } from './icons.js';
import { t, getLang, setLang, isRTL } from './i18n.js';
import { navigate, currentRoute, onRouteChange } from './router.js';
import { getState, sel, subscribe, upsert } from './store.js';
import { modal, toast, input, textarea, field, select, applyAccent } from './ui.js';
import { db } from './db.js';

const NAV_ITEMS = [
  { path: '/',           key: 'nav_dashboard', icon: 'dashboard' },
  { path: '/tasks',      key: 'nav_tasks',     icon: 'check_circle' },
  { path: '/projects',   key: 'nav_projects',  icon: 'briefcase' },
  { path: '/clients',    key: 'nav_clients',   icon: 'users' },
  { path: '/calendar',   key: 'nav_calendar',  icon: 'calendar' },
  { path: '/focus',      key: 'nav_focus',     icon: 'target' },
  { path: '/invoices',   key: 'nav_invoices',  icon: 'receipt' },
  { path: '/goals',      key: 'nav_goals',     icon: 'flag' },
  { path: '/reports',    key: 'nav_reports',   icon: 'bar_chart' },
  { path: '/ideas',      key: 'nav_ideas',     icon: 'bulb' },
  { path: '/calculator', key: 'nav_calculator',icon: 'calculator' },
  { path: '/settings',   key: 'nav_settings',  icon: 'settings' },
];

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

  const fab = el('button', { class: 'fab', title: t('quick_capture'), html: icon('plus', { size: 24 }), onClick: openQuickCapture });

  // RTL puts sidebar on the right via grid-template-columns; for visual order keep main first
  if (isRTL()) {
    app.appendChild(main);
    app.appendChild(sidebar);
  } else {
    app.appendChild(sidebar);
    app.appendChild(main);
  }
  app.appendChild(scrim);
  app.appendChild(fab);

  // Update topbar title on route change
  onRouteChange(({ path }) => {
    const item = NAV_ITEMS.find((x) => x.path === path) || NAV_ITEMS[0];
    const titleEl = topbar.querySelector('.topbar__title');
    if (titleEl) titleEl.textContent = t(item.key);
    // Highlight nav
    sidebar.querySelectorAll('.nav-link').forEach((a) => {
      a.classList.toggle('active', a.dataset.path === path);
    });
    // Close mobile sidebar
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
  });

  subscribe(() => updateBadges(sidebar));
  updateBadges(sidebar);

  return { app, outlet, sidebar, topbar };
}

function buildSidebar(scrim) {
  const aside = el('aside', { class: 'sidebar' });

  aside.appendChild(el('div', { class: 'sidebar__brand' },
    el('div', { class: 'sidebar__brand-logo' }, 'D'),
    el('div', { class: 'sidebar__brand-text' },
      el('span', { class: 'sidebar__brand-name' }, t('appName')),
      el('span', { class: 'sidebar__brand-tag' }, t('tagline'))
    )
  ));

  const nav = el('nav', { class: 'sidebar__nav' });
  NAV_ITEMS.forEach((it) => {
    const link = el('a', {
      class: 'nav-link',
      href: '#' + it.path,
      dataset: { path: it.path, badge: it.key },
      onClick: (e) => { e.preventDefault(); navigate(it.path); aside.classList.remove('open'); scrim.classList.remove('show'); }
    },
      el('span', { class: 'nav-link__icon', html: icon(it.icon) }),
      el('span', {}, t(it.key))
    );
    nav.appendChild(link);
  });
  aside.appendChild(nav);

  // footer (lang switch)
  const footer = el('div', { class: 'sidebar__footer' });
  const langBtn = el('button', { class: 'btn btn--block', onClick: toggleLang, html: icon('globe') });
  langBtn.append(' ' + (getLang() === 'ar' ? 'English' : 'العربية'));
  footer.appendChild(langBtn);
  aside.appendChild(footer);

  return aside;
}

function buildTopbar(sidebar, scrim) {
  const bar = el('header', { class: 'topbar' });
  const menuBtn = el('button', { class: 'btn btn--icon btn--ghost menu-btn', html: icon('menu'), onClick: () => {
    sidebar.classList.add('open');
    scrim.classList.add('show');
  }});
  scrim.addEventListener('click', () => { sidebar.classList.remove('open'); scrim.classList.remove('show'); });

  const closeBtn = el('button', { class: 'btn btn--icon btn--ghost sidebar__close', html: icon('x'), onClick: () => {
    sidebar.classList.remove('open'); scrim.classList.remove('show');
  }});
  sidebar.querySelector('.sidebar__brand').appendChild(closeBtn);

  bar.appendChild(menuBtn);
  bar.appendChild(el('h1', { class: 'topbar__title' }, t('nav_dashboard')));
  bar.appendChild(el('div', { class: 'topbar__spacer' }));

  const actions = el('div', { class: 'topbar__actions' });
  // Notifications indicator
  const overdue = sel.overdueTasks().length;
  const todayCount = sel.todayTasks().length;
  const notifBtn = el('button', { class: 'btn btn--icon btn--ghost', html: icon('bell'), title: t('notification_overdue'),
    onClick: () => navigate('/tasks') });
  if (overdue > 0) {
    const dot = el('span', { style: {
      position: 'absolute', top: '6px', insetInlineEnd: '6px',
      width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)'
    }});
    notifBtn.style.position = 'relative';
    notifBtn.appendChild(dot);
  }
  actions.appendChild(notifBtn);

  const captureBtn = el('button', { class: 'btn btn--primary', onClick: openQuickCapture },
    el('span', { html: icon('plus', { size: 16 }) }),
    document.createTextNode(' ' + t('quick_capture'))
  );
  actions.appendChild(captureBtn);

  bar.appendChild(actions);
  return bar;
}

function updateBadges(sidebar) {
  const overdue = sel.overdueTasks().length;
  const today = sel.todayTasks().length;
  const inboxCount = getState().inbox.length;
  sidebar.querySelectorAll('.nav-link').forEach((link) => {
    const key = link.dataset.path;
    let count = 0;
    if (key === '/tasks') count = overdue + today;
    else if (key === '/') count = overdue;
    else if (key === '/inbox') count = inboxCount;
    const existing = link.querySelector('.nav-link__badge');
    if (existing) existing.remove();
    if (count > 0) {
      link.appendChild(el('span', { class: 'nav-link__badge' }, count));
    }
  });
}

function toggleLang() {
  const next = getLang() === 'ar' ? 'en' : 'ar';
  setLang(next);
  // Rebuild shell to reorder sidebar/main for RTL/LTR
  setTimeout(() => location.reload(), 50);
}

export function openQuickCapture() {
  const inputEl = el('input', {
    class: 'quick-capture-input',
    placeholder: t('quick_capture_hint'),
    autofocus: true
  });
  const typeSelect = select([
    { value: 'task', label: t('task') },
    { value: 'idea', label: t('idea_title') },
    { value: 'note', label: t('notes') }
  ], { value: 'task' });

  const m = modal({
    title: t('quick_capture'),
    body: el('div', {},
      el('div', { class: 'card glass', style: { padding: '14px 18px', marginBottom: '14px' } },
        inputEl
      ),
      el('div', { class: 'row', style: { gap: '8px' } },
        el('span', { class: 'text-sm text-muted' }, t('type') + ':'),
        typeSelect
      )
    ),
    footer: [
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        const text = inputEl.value.trim();
        if (!text) return;
        const type = typeSelect.value;
        if (type === 'task') {
          await upsert('tasks', {
            title: text, status: 'todo', priority: 'medium',
            dueDate: null, projectId: null, source: 'quick'
          });
        } else if (type === 'idea') {
          await upsert('ideas', { title: text, category: 'other' });
        } else {
          await upsert('inbox', { content: text, type: 'note' });
        }
        toast(t('saved'), 'success');
        m.close();
      } }, t('save'))
    ]
  });

  setTimeout(() => inputEl.focus(), 100);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      m.panel.querySelector('.btn--primary').click();
    }
  });
}

export function applyTheme() {
  const accent = getState().accent;
  if (accent) applyAccent(accent);
}
