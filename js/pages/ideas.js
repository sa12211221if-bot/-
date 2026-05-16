// Designer OS — Idea Bank
import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtRelative, getLang } from '../i18n.js';
import { getState, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';

const CATEGORIES = ['logo', 'branding', 'social', 'print', 'web', 'other'];
let activeFilter = 'all';

export async function renderIdeas() {
  const root = el('div', {});
  const state = getState();

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('idea_bank')),
      el('div', { class: 'page-header__subtitle' },
        getLang() === 'ar' ? 'أفكار وملاحظات سريعة لمشاريعك القادمة' : 'Quick ideas for future projects')
    ),
    el('div', { class: 'page-header__actions' },
      el('button', { class: 'btn btn--primary', onClick: () => openIdeaModal(), html: icon('plus') + ' ' + t('new_idea') })
    )
  ));

  const tabs = el('div', { class: 'tabs', style: { marginBottom: '14px' } });
  ['all', ...CATEGORIES].forEach((id) => {
    const btn = el('button', {
      class: 'tab' + (id === activeFilter ? ' active' : ''),
      onClick: () => { activeFilter = id; render(); tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active')); btn.classList.add('active'); }
    }, id === 'all' ? t('all') : t('cat_' + id));
    tabs.appendChild(btn);
  });
  root.appendChild(tabs);

  const view = el('div', {});
  root.appendChild(view);

  function render() {
    view.innerHTML = '';
    const ideas = state.ideas
      .filter((i) => activeFilter === 'all' || i.category === activeFilter)
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.createdAt - a.createdAt));

    if (ideas.length === 0) {
      view.appendChild(el('div', { class: 'glass panel' }, emptyState({
        iconName: 'bulb',
        title: t('nothing_here'),
        action: el('button', { class: 'btn btn--primary', onClick: () => openIdeaModal() }, icon('plus') + ' ' + t('new_idea'))
      })));
      return;
    }

    const grid = el('div', { class: 'stats-grid' });
    ideas.forEach((idea) => {
      const card = el('div', { class: 'glass panel', style: { padding: '16px', cursor: 'pointer' }, onClick: () => openIdeaModal(idea) },
        el('div', { class: 'row justify-between items-center', style: { marginBottom: '8px' } },
          el('div', { class: 'row gap-8 items-center flex-wrap' },
            idea.category ? badge(t('cat_' + idea.category), 'accent') : null,
            idea.pinned ? el('span', { html: icon('pin', { size: 14 }), style: { color: 'var(--accent-2)' } }) : null
          ),
          el('span', { class: 'text-sm text-muted' }, fmtRelative(idea.createdAt))
        ),
        el('div', { style: { fontWeight: 600, fontSize: '14px', marginBottom: '6px' } }, idea.title),
        idea.description ? el('div', { class: 'text-sm text-muted', style: { whiteSpace: 'pre-wrap' } }, idea.description) : null
      );
      grid.appendChild(card);
    });
    view.appendChild(grid);
  }
  render();

  return root;
}

function openIdeaModal(existing) {
  const data = existing ? { ...existing } : { title: '', description: '', category: 'other', pinned: false };
  const titleI = input({ value: data.title, placeholder: t('idea_title') });
  const descI = textarea({ value: data.description || '' });
  const catS = select(CATEGORIES.map((c) => ({ value: c, label: t('cat_' + c) })), { value: data.category });
  const pinChk = el('input', { type: 'checkbox', checked: !!data.pinned });

  const m = modal({
    title: existing ? t('edit') + ' ' + t('new_idea') : t('new_idea'),
    body: el('div', {},
      field(t('idea_title'), titleI),
      field(t('description'), descI),
      el('div', { class: 'detail-grid' },
        field(t('idea_category'), catS),
        field('Pin', el('label', { class: 'checkbox' }, pinChk, el('span', { class: 'checkbox__box' }), el('span', { class: 'text-sm' }, getLang() === 'ar' ? 'تثبيت' : 'Pin')))
      )
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('ideas', existing.id); toast(t('deleted')); m.close(); }
      } }, t('delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        if (!titleI.value.trim()) { toast(t('required'), 'error'); return; }
        await upsert('ideas', {
          ...data,
          title: titleI.value.trim(),
          description: descI.value,
          category: catS.value,
          pinned: pinChk.checked
        });
        toast(t('saved'));
        m.close();
      } }, t('save'))
    ].filter(Boolean)
  });
}
