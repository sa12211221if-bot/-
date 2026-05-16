// Designer OS — Tips & Features Tour
// Browseable catalog of every feature with cross-links to relevant pages/settings.

import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang } from '../i18n.js';
import { getState, setSetting, sel } from '../store.js';
import { navigate } from '../router.js';
import { openCapture } from '../capture.js';
import { cycleMode } from '../modes.js';

export async function renderTips() {
  const root = el('div', { class: 'reveal' });
  const ar = getLang() === 'ar';
  const state = getState();

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('tips')),
      el('div', { class: 'page-header__subtitle' }, t('tips_subtitle'))
    )
  ));

  const tips = buildTipsCatalog();
  const dismissed = state.tipsDismissed || [];
  const remaining = tips.filter((tp) => !dismissed.includes(tp.id) && (!tp.hideWhen || !tp.hideWhen(state)));

  // Filter buttons
  let filter = 'all'; // all | undone
  const filterBar = el('div', { class: 'tabs', style: { marginBottom: '14px' } });
  ['all', 'undone'].forEach((f) => {
    const labelMap = { all: ar ? 'الكل' : 'All', undone: ar ? 'لم تجرّب' : 'Untried' };
    const btn = el('button', {
      class: 'tab' + (filter === f ? ' active' : ''),
      onClick: () => { filter = f; render(); filterBar.querySelectorAll('.tab').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); }
    }, labelMap[f] + ' · ' + (f === 'all' ? tips.length : remaining.length));
    filterBar.appendChild(btn);
  });
  root.appendChild(filterBar);

  // Reset button
  if (dismissed.length > 0) {
    const resetBtn = el('button', { class: 'btn btn--sm', style: { marginBottom: '14px' }, onClick: async () => {
      await setSetting('tipsDismissed', []);
      const ev = new HashChangeEvent('hashchange');
      window.dispatchEvent(ev);
    }});
    resetBtn.innerHTML = icon('refresh') + ' ' + (ar ? 'إعادة تعيين كل النصائح' : 'Reset all tips');
    root.appendChild(resetBtn);
  }

  const grid = el('div', { class: 'tips-grid' });
  root.appendChild(grid);

  // Categories
  const sections = [
    { key: ar ? 'الأساسيات' : 'Essentials',  ids: ['capture', 'modes', 'focus', 'install'] },
    { key: ar ? 'الذكاء الاصطناعي' : 'AI',     ids: ['chat', 'commands', 'breakdown'] },
    { key: ar ? 'التكاملات' : 'Integrations', ids: ['notion', 'telegram'] },
    { key: ar ? 'الالتزام والروحانيات' : 'Spirit & Discipline', ids: ['prayer', 'review', 'challenges', 'habits'] },
    { key: ar ? 'الإنتاجية' : 'Productivity', ids: ['vitals', 'para', 'pricing', 'reports'] }
  ];

  function render() {
    grid.innerHTML = '';
    sections.forEach((sec) => {
      const items = sec.ids
        .map((id) => tips.find((t) => t.id === id))
        .filter(Boolean)
        .filter((tp) => filter === 'all' || (!dismissed.includes(tp.id) && (!tp.hideWhen || !tp.hideWhen(state))));
      if (items.length === 0) return;
      const sectionEl = el('div', { class: 'tips-section' });
      sectionEl.appendChild(el('h3', { class: 'tips-section__title' }, sec.key));
      const cards = el('div', { class: 'tips-grid__cards' });
      items.forEach((tp) => cards.appendChild(buildTipCard(tp, dismissed)));
      sectionEl.appendChild(cards);
      grid.appendChild(sectionEl);
    });

    if (grid.children.length === 0) {
      grid.appendChild(el('div', { class: 'glass panel', style: { padding: '40px', textAlign: 'center' } },
        el('div', { class: 'text-muted', style: { fontSize: '15px' } }, t('tips_completed'))
      ));
    }
  }
  render();

  return root;
}

// ============================================================
// Tips catalog
// ============================================================
function buildTipsCatalog() {
  return [
    // Essentials
    {
      id: 'capture',
      title: t('tip_capture_title'),
      desc: t('tip_capture_desc'),
      iconName: 'plus',
      action: () => openCapture(),
      kbd: '⌘K / Ctrl+K'
    },
    {
      id: 'modes',
      title: t('tip_modes_title'),
      desc: t('tip_modes_desc'),
      iconName: 'layers',
      action: () => cycleMode(),
      kbd: 'M'
    },
    {
      id: 'focus',
      title: t('tip_focus_title'),
      desc: t('tip_focus_desc'),
      iconName: 'target',
      route: '/focus'
    },
    {
      id: 'install',
      title: t('tip_install_title'),
      desc: t('tip_install_desc'),
      iconName: 'download',
      hideWhen: () => window.matchMedia && window.matchMedia('(display-mode: standalone)').matches,
      hint: getLang() === 'ar'
        ? 'في Chrome: شريط العنوان → أيقونة التثبيت. في Safari: مشاركة → أضف إلى الشاشة الرئيسية'
        : 'Chrome: address bar → install icon. Safari: Share → Add to Home Screen'
    },
    // AI
    {
      id: 'chat',
      title: t('tip_chat_title'),
      desc: t('tip_chat_desc'),
      iconName: 'bot',
      route: '/assistant'
    },
    {
      id: 'commands',
      title: getLang() === 'ar' ? 'الأوامر السريعة (/)' : 'Slash commands (/)',
      desc: getLang() === 'ar'
        ? '/report تقرير · /brief كتابة بريف · /analyze تحليل مشروع · /price تسعير'
        : '/report · /brief · /analyze · /price · /challenge',
      iconName: 'zap',
      route: '/assistant'
    },
    {
      id: 'breakdown',
      title: getLang() === 'ar' ? 'تقسيم المهام بالـ AI' : 'AI task breakdown',
      desc: getLang() === 'ar'
        ? 'في صفحة المهام، اكتب مهمة كبيرة ثم اطلب من الـ AI تقسيمها لخطوات قابلة للتنفيذ'
        : 'On any task, ask the AI to break it into actionable subtasks',
      iconName: 'list',
      route: '/tasks'
    },
    // Integrations
    {
      id: 'notion',
      title: t('tip_notion_title'),
      desc: t('tip_notion_desc'),
      iconName: 'database',
      route: '/settings',
      params: { section: 'notion' }
    },
    {
      id: 'telegram',
      title: t('tip_telegram_title'),
      desc: t('tip_telegram_desc'),
      iconName: 'send',
      route: '/settings',
      params: { section: 'telegram' }
    },
    // Spirit & Discipline
    {
      id: 'prayer',
      title: t('tip_prayer_title'),
      desc: t('tip_prayer_desc'),
      iconName: 'star',
      route: '/settings',
      params: { section: 'prayer' }
    },
    {
      id: 'review',
      title: t('tip_review_title'),
      desc: t('tip_review_desc'),
      iconName: 'bookmark',
      route: '/reviews'
    },
    {
      id: 'challenges',
      title: t('tip_challenges_title'),
      desc: t('tip_challenges_desc'),
      iconName: 'flame',
      route: '/'
    },
    {
      id: 'habits',
      title: getLang() === 'ar' ? 'تتبع العادات' : 'Habit tracking',
      desc: getLang() === 'ar'
        ? 'سلسلة (streaks) لكل عادة + ربطها بالـ AI لتقييم التزامك'
        : 'Streaks for every habit + AI evaluates your consistency',
      iconName: 'check_circle',
      route: '/habits'
    },
    // Productivity
    {
      id: 'vitals',
      title: t('tip_vitals_title'),
      desc: t('tip_vitals_desc'),
      iconName: 'battery',
      route: '/'
    },
    {
      id: 'para',
      title: t('tip_para_title'),
      desc: t('tip_para_desc'),
      iconName: 'archive',
      route: '/knowledge'
    },
    {
      id: 'pricing',
      title: getLang() === 'ar' ? 'تسعير على المهمة' : 'Per-task pricing',
      desc: getLang() === 'ar'
        ? 'لا تسعير على الساعة — اضبط سعر المهمة وسعر المراجعة، واستخدم AI لاقتراحات أذكى'
        : 'No hourly billing — set task and revision prices, ask AI for smart quotes',
      iconName: 'dollar',
      route: '/settings',
      params: { section: 'pricing' }
    },
    {
      id: 'reports',
      title: getLang() === 'ar' ? 'تقارير ذكية' : 'Smart reports',
      desc: getLang() === 'ar'
        ? 'اطلب تقريراً يومياً، أسبوعياً أو شهرياً من المساعد بـ /report'
        : 'Ask the assistant for daily, weekly, or monthly reports with /report',
      iconName: 'bar_chart',
      route: '/assistant'
    }
  ];
}

// ============================================================
// Tip card
// ============================================================
function buildTipCard(tp, dismissed) {
  const ar = getLang() === 'ar';
  const card = el('div', { class: 'tip-card glass tip-card--full' });
  const isDismissed = dismissed.includes(tp.id);
  if (isDismissed) card.classList.add('tip-card--done');

  card.innerHTML = `
    <div class="tip-card__icon">${icon(tp.iconName, { size: 18 })}</div>
    <div class="tip-card__body">
      <div class="tip-card__title">${escapeHtml(tp.title)}</div>
      <div class="tip-card__desc text-sm text-muted">${escapeHtml(tp.desc)}</div>
      ${tp.kbd ? `<div class="tip-card__kbd"><kbd>${tp.kbd}</kbd></div>` : ''}
      ${tp.hint ? `<div class="tip-card__hint text-sm" style="margin-top:6px;color:var(--accent-2);">💡 ${escapeHtml(tp.hint)}</div>` : ''}
    </div>
  `;
  const actions = el('div', { class: 'tip-card__actions row gap-8' });

  const goBtn = el('button', { class: 'btn btn--sm btn--primary', onClick: () => {
    if (tp.action) tp.action();
    else if (tp.route) navigate(tp.route, tp.params);
  }});
  goBtn.textContent = t('tip_explore');
  actions.appendChild(goBtn);

  const dismissBtn = el('button', { class: 'btn btn--sm btn--ghost', onClick: async () => {
    const cur = getState().tipsDismissed || [];
    let next;
    if (isDismissed) {
      next = cur.filter((id) => id !== tp.id);
    } else {
      next = [...cur, tp.id];
    }
    await setSetting('tipsDismissed', next);
    const ev = new HashChangeEvent('hashchange');
    window.dispatchEvent(ev);
  }});
  dismissBtn.innerHTML = isDismissed
    ? icon('refresh', { size: 12 }) + ' ' + (ar ? 'استعادة' : 'Undo')
    : icon('check', { size: 12 }) + ' ' + t('tip_dismiss');
  actions.appendChild(dismissBtn);

  card.appendChild(actions);
  return card;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
