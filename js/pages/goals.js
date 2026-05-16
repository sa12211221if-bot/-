// Designer OS — Goals (daily / weekly / monthly / yearly + streaks)
import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtDate, getLang } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';

let activePeriod = 'daily';

export async function renderGoals() {
  const root = el('div', {});
  const state = getState();

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('goals')),
      el('div', { class: 'page-header__subtitle' },
        getLang() === 'ar' ? `سلسلة الإنجاز: ${sel.streak()} ${t('days')} 🔥` : `Streak: ${sel.streak()} ${t('days')} 🔥`)
    ),
    el('div', { class: 'page-header__actions' },
      el('button', { class: 'btn btn--primary', onClick: () => openGoalModal(activePeriod), html: icon('plus') + ' ' + t('new_goal') })
    )
  ));

  // Streak / habit visualization
  const streakCard = el('div', { class: 'glass panel glass-accent', style: { marginBottom: '14px' } });
  streakCard.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title' }, [
      el('span', { html: icon('flame') }),
      el('span', {}, t('streak'))
    ])
  ));
  streakCard.appendChild(buildStreakViz());
  root.appendChild(streakCard);

  // Period tabs
  const tabs = el('div', { class: 'tabs', style: { marginBottom: '14px' } });
  ['daily', 'weekly', 'monthly', 'yearly'].forEach((p) => {
    const btn = el('button', {
      class: 'tab' + (p === activePeriod ? ' active' : ''),
      onClick: () => { activePeriod = p; render(); tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active')); btn.classList.add('active'); }
    }, t('goal_' + p));
    tabs.appendChild(btn);
  });
  root.appendChild(tabs);

  const view = el('div', {});
  root.appendChild(view);

  function render() {
    view.innerHTML = '';
    const goals = state.goals.filter((g) => g.period === activePeriod);
    if (goals.length === 0) {
      view.appendChild(el('div', { class: 'glass panel' }, emptyState({
        iconName: 'flag',
        title: t('nothing_here'),
        action: el('button', { class: 'btn btn--primary', onClick: () => openGoalModal(activePeriod) }, icon('plus') + ' ' + t('new_goal'))
      })));
      return;
    }
    const list = el('div', { class: 'col gap-12' });
    goals.forEach((g) => list.appendChild(goalCard(g)));
    view.appendChild(list);
  }
  render();

  return root;
}

function goalCard(goal) {
  const current = goal.current || 0;
  const target = goal.target || 1;
  const percent = Math.min(100, Math.round((current / target) * 100));
  const reached = percent >= 100;

  return el('div', { class: 'glass panel', style: { padding: '18px' } },
    el('div', { class: 'row justify-between items-center', style: { marginBottom: '10px' } },
      el('div', { class: 'flex-1' },
        el('div', { class: 'text-lg' }, goal.title),
        goal.description ? el('div', { class: 'text-sm text-muted', style: { marginTop: '2px' } }, goal.description) : null
      ),
      reached ? badge(t('check_circle') ? '✓' : '✓', 'success') : null,
      el('button', { class: 'btn btn--icon btn--ghost', html: icon('edit'), onClick: () => openGoalModal(goal.period, goal) })
    ),
    el('div', { class: 'progress', style: { marginBottom: '8px' } },
      el('div', { class: 'progress__fill', style: { width: percent + '%' } })
    ),
    el('div', { class: 'row justify-between text-sm' },
      el('span', { class: 'text-muted' }, `${current} / ${target} ${goal.unit || ''}`),
      el('span', { class: 'text-accent' }, percent + '%')
    ),
    el('div', { class: 'row gap-8 mt-12' },
      el('button', { class: 'btn btn--sm', onClick: async () => {
        await upsert('goals', { ...goal, current: Math.max(0, current - 1) });
      }}, '−1'),
      el('button', { class: 'btn btn--sm btn--primary', onClick: async () => {
        await upsert('goals', { ...goal, current: current + 1 });
      }}, '+1'),
      el('input', { class: 'input', type: 'number', value: current, style: { maxWidth: '90px' }, onchange: async (e) => {
        await upsert('goals', { ...goal, current: parseFloat(e.target.value) || 0 });
      }})
    )
  );
}

function buildStreakViz() {
  const cells = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i); d.setHours(0,0,0,0);
    const hasActivity =
      getState().focusSessions.some((s) => s.completed && new Date(s.date).toDateString() === d.toDateString()) ||
      getState().tasks.some((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt).toDateString() === d.toDateString());
    const isToday = d.toDateString() === today.toDateString();
    cells.push(el('div', {
      title: fmtDate(d),
      style: {
        width: '100%', aspectRatio: '1/1', borderRadius: '6px',
        background: hasActivity ? 'linear-gradient(135deg, var(--accent-2), var(--accent-3))' : 'var(--surface-strong)',
        opacity: hasActivity ? 1 : 0.4,
        boxShadow: isToday ? '0 0 0 2px var(--accent-2)' : 'none'
      }
    }));
  }
  return el('div', { style: {
    display: 'grid',
    gridTemplateColumns: 'repeat(30, 1fr)',
    gap: '4px',
    padding: '8px 0'
  } }, ...cells);
}

function openGoalModal(period, existing) {
  const data = existing ? { ...existing } : {
    title: '', description: '', period, target: 1, current: 0, unit: '', status: 'active'
  };
  const titleI = input({ value: data.title, placeholder: t('title') });
  const descI = textarea({ value: data.description || '' });
  const targetI = input({ value: data.target, type: 'number' });
  const currentI = input({ value: data.current, type: 'number' });
  const unitI = input({ value: data.unit || '', placeholder: getLang() === 'ar' ? 'مهمة، ساعة، مشروع...' : 'tasks, hours, projects...' });

  const m = modal({
    title: existing ? t('edit') + ' ' + t('goals') : t('new_goal'),
    body: el('div', {},
      field(t('title'), titleI),
      field(t('description') + ' (' + t('optional') + ')', descI),
      el('div', { class: 'detail-grid' },
        field(t('target'), targetI),
        field(t('current'), currentI),
      ),
      field(getLang() === 'ar' ? 'الوحدة' : 'Unit', unitI)
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('goals', existing.id); toast(t('deleted')); m.close(); }
      } }, t('delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        if (!titleI.value.trim()) { toast(t('required'), 'error'); return; }
        await upsert('goals', {
          ...data,
          title: titleI.value.trim(),
          description: descI.value,
          target: parseFloat(targetI.value) || 1,
          current: parseFloat(currentI.value) || 0,
          unit: unitI.value
        });
        toast(t('saved'));
        m.close();
      } }, t('save'))
    ].filter(Boolean)
  });
}
