// Designer OS — Knowledge (PARA hub)
// Inbox · Projects · Areas · Resources · Archive
// Drag-drop categorization. Single store with `category` field.

import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, fmtRelative } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';
import { openCapture } from '../capture.js';

const CATEGORIES = ['inbox', 'projects', 'areas', 'resources', 'archive'];

export async function renderKnowledge() {
  const root = el('div', { class: 'reveal' });

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('knowledge')),
      el('div', { class: 'page-header__subtitle' }, t('knowledge_subtitle'))
    ),
    el('div', { class: 'page-header__actions' },
      (() => { const b = el('button', { class: 'btn btn--primary', onClick: () => openCapture() });
        b.innerHTML = icon('plus') + ' ' + t('capture');
        return b;
      })()
    )
  ));

  // Search
  let searchTerm = '';
  const searchInput = input({
    placeholder: t('search') + '...',
    oninput: (e) => { searchTerm = e.target.value.toLowerCase(); render(); }
  });
  root.appendChild(el('div', { class: 'glass panel', style: { padding: '12px', marginBottom: '14px' } },
    el('div', { class: 'row', style: { gap: '10px', alignItems: 'center' } },
      (() => { const s = el('span', { style: { color: 'var(--text-3)' } }); s.innerHTML = icon('search'); return s; })(),
      searchInput
    )
  ));

  // PARA grid
  const grid = el('div', { class: 'para-grid' });
  root.appendChild(grid);

  function render() {
    grid.innerHTML = '';
    CATEGORIES.forEach((cat) => {
      grid.appendChild(buildColumn(cat, searchTerm));
    });
  }
  render();

  return root;
}

function buildColumn(cat, searchTerm) {
  const all = getState().knowledge.filter((k) => (k.category || 'inbox') === cat);
  const items = searchTerm
    ? all.filter((k) => itemSearchText(k).toLowerCase().includes(searchTerm))
    : all;

  const col = el('div', { class: 'para-col' });

  // Drag-drop targets
  col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
  col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
  col.addEventListener('drop', async (e) => {
    e.preventDefault();
    col.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const item = getState().knowledge.find((k) => k.id === id);
    if (item && (item.category || 'inbox') !== cat) {
      await upsert('knowledge', { ...item, category: cat });
      toast(`${t('move_to')} ${t('para_' + cat)}`, 'success', 1200);
    }
  });

  // Header
  const head = el('div', { class: 'para-col__head' });
  head.innerHTML = `
    <span class="row gap-8 items-center">
      ${icon(catIcon(cat), { size: 14 })}
      <span>${t('para_' + cat)}</span>
    </span>
    <span class="para-col__count">${items.length}</span>
  `;
  col.appendChild(head);

  // Empty
  if (items.length === 0) {
    col.appendChild(el('div', { class: 'text-muted text-sm', style: { textAlign: 'center', padding: '20px 8px' } },
      cat === 'inbox' ? t('inbox_empty') : t('nothing_here')
    ));
    return col;
  }

  // Items
  items
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .forEach((item) => col.appendChild(buildTile(item)));
  return col;
}

function buildTile(item) {
  const tile = el('div', {
    class: 'para-tile',
    draggable: true,
    onClick: () => openItemModal(item)
  });

  tile.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', item.id);
    tile.classList.add('dragging');
  });
  tile.addEventListener('dragend', () => tile.classList.remove('dragging'));

  // Icon by type
  const ic = el('span', { class: 'para-tile__icon' });
  const iconName = ({ note: 'edit', voice: 'phone', link: 'link', image: 'folder' })[item.type] || 'inbox';
  ic.innerHTML = icon(iconName, { size: 14 });
  tile.appendChild(ic);

  const main = el('div', { class: 'para-tile__main' });

  if (item.type === 'image') {
    if (item.dataUrl) {
      main.appendChild(el('img', { src: item.dataUrl, style: { maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', display: 'block', marginBottom: '4px' } }));
    }
    main.appendChild(el('div', { class: 'para-tile__title' }, item.filename || (getLang() === 'ar' ? 'صورة' : 'Image')));
  } else if (item.type === 'link') {
    main.appendChild(el('div', { class: 'para-tile__title' }, item.title || item.url));
    main.appendChild(el('div', { class: 'para-tile__sub' }, truncate(item.url, 60)));
  } else {
    main.appendChild(el('div', { class: 'para-tile__title' }, truncate(item.content || item.title || '', 200)));
  }

  if (item.createdAt) {
    main.appendChild(el('div', { class: 'para-tile__sub' }, fmtRelative(item.createdAt)));
  }

  tile.appendChild(main);
  return tile;
}

function openItemModal(item) {
  const ar = getLang() === 'ar';
  const titleI = input({ value: item.title || item.filename || '', placeholder: t('title') });
  const contentT = textarea({ value: item.content || item.url || '', placeholder: t('description') });
  const catS = select(CATEGORIES.map((c) => ({ value: c, label: t('para_' + c) })), { value: item.category || 'inbox' });

  const body = el('div', {});

  if (item.type === 'image' && item.dataUrl) {
    body.appendChild(el('img', { src: item.dataUrl, style: { maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', marginBottom: '14px', display: 'block' } }));
  }
  body.appendChild(field(t('title'), titleI));
  if (item.type !== 'image') body.appendChild(field(item.type === 'link' ? 'URL' : t('description'), contentT));
  body.appendChild(field(t('move_to'), catS));

  const triageRow = el('div', { class: 'row gap-8 flex-wrap', style: { marginTop: '4px' } });
  ['inbox', 'projects', 'areas', 'resources', 'archive'].forEach((c) => {
    const b = el('button', { class: 'btn btn--sm', onClick: () => { catS.value = c; } });
    b.innerHTML = icon(catIcon(c), { size: 12 }) + ' ' + t('para_' + c);
    triageRow.appendChild(b);
  });
  body.appendChild(field(ar ? 'فرز سريع' : 'Quick triage', triageRow));

  const m = modal({
    title: t('triage'),
    body,
    footer: [
      (() => { const b = el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('knowledge', item.id); toast(t('deleted')); m.close(); }
      }}); b.textContent = t('delete'); return b; })(),
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      (() => { const b = el('button', { class: 'btn btn--primary', onClick: async () => {
        const payload = { ...item, category: catS.value };
        if (item.type === 'link') {
          payload.title = titleI.value.trim();
          payload.url = contentT.value.trim();
        } else if (item.type === 'image') {
          payload.title = titleI.value.trim();
        } else {
          payload.title = titleI.value.trim() || null;
          payload.content = contentT.value;
        }
        await upsert('knowledge', payload);
        toast(t('saved'));
        m.close();
      }}); b.textContent = t('save'); return b; })()
    ]
  });
}

function catIcon(cat) {
  return ({
    inbox: 'inbox',
    projects: 'briefcase',
    areas: 'target',
    resources: 'bookmark',
    archive: 'archive'
  })[cat] || 'inbox';
}

function itemSearchText(item) {
  return [item.title, item.content, item.url, item.filename].filter(Boolean).join(' ');
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}
