// Designer OS — Clients (CRM)
import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtCurrency, fmtDate } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';
import { initials, colorFromString } from '../utils.js';
import { navigate } from '../router.js';

export async function renderClients({ params }) {
  const root = el('div', {});
  const state = getState();
  const idFromUrl = params?.get && params.get('id');

  // Page header
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('clients')),
      el('div', { class: 'page-header__subtitle' }, `${state.clients.length} ${t('client')}`)
    ),
    el('div', { class: 'page-header__actions' },
      el('button', { class: 'btn btn--primary', onClick: () => openClientModal(), html: icon('plus') + ' ' + t('new_client') })
    )
  ));

  if (state.clients.length === 0) {
    root.appendChild(el('div', { class: 'glass panel' },
      emptyState({
        iconName: 'users',
        title: t('nothing_here'),
        hint: t('create_first') + ' ' + t('client').toLowerCase(),
        action: el('button', { class: 'btn btn--primary', onClick: () => openClientModal() }, icon('plus') + ' ' + t('new_client'))
      })
    ));
    return root;
  }

  // Search bar
  let searchTerm = '';
  const searchInput = input({
    placeholder: t('search') + '...',
    oninput: (e) => { searchTerm = e.target.value.toLowerCase(); render(); }
  });
  root.appendChild(el('div', { class: 'glass panel', style: { padding: '12px', marginBottom: '14px' } },
    el('div', { class: 'row', style: { gap: '10px' } },
      el('span', { html: icon('search'), style: { color: 'var(--text-3)' } }),
      searchInput
    )
  ));

  const grid = el('div', { class: 'stats-grid' });
  root.appendChild(grid);

  function render() {
    grid.innerHTML = '';
    const filtered = state.clients.filter((c) => {
      if (!searchTerm) return true;
      return (c.name + ' ' + (c.company || '') + ' ' + (c.email || '')).toLowerCase().includes(searchTerm);
    });
    filtered.forEach((c) => grid.appendChild(clientCard(c)));
  }
  render();

  if (idFromUrl) {
    const client = sel.clientById(idFromUrl);
    if (client) setTimeout(() => openClientDetails(client), 100);
  }

  return root;
}

function clientCard(client) {
  const projects = sel.projectsForClient(client.id);
  const invoices = sel.invoicesForClient(client.id);
  const totalRev = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const activeCount = projects.filter((p) => p.status !== 'done' && p.status !== 'archived').length;

  const card = el('div', { class: 'glass panel', style: { padding: '18px', cursor: 'pointer' }, onClick: () => openClientDetails(client) },
    el('div', { class: 'row', style: { gap: '12px', marginBottom: '14px' } },
      el('div', { class: 'avatar', style: { background: client.color || colorFromString(client.name) } }, initials(client.name)),
      el('div', { class: 'flex-1', style: { minWidth: 0 } },
        el('div', { class: 'text-lg truncate' }, client.name),
        el('div', { class: 'text-sm text-muted truncate' }, client.company || client.email || '')
      ),
      client.type ? badge(t('type_' + client.type), client.type === 'recurring' ? 'success' : 'muted') : null
    ),
    el('div', { class: 'row', style: { gap: '8px', justifyContent: 'space-between' } },
      el('div', { class: 'col gap-4' },
        el('div', { class: 'text-muted text-sm' }, t('total_projects')),
        el('div', { class: 'text-lg' }, projects.length + (activeCount > 0 ? ` (${activeCount} ${t('project_status_active')})` : ''))
      ),
      el('div', { class: 'col gap-4', style: { textAlign: 'end' } },
        el('div', { class: 'text-muted text-sm' }, t('total_revenue')),
        el('div', { class: 'text-lg text-accent' }, fmtCurrency(totalRev))
      )
    )
  );
  return card;
}

function openClientModal(existing) {
  const data = existing ? { ...existing } : {
    name: '', company: '', email: '', phone: '',
    type: 'occasional', notes: '', rating: 0
  };
  const nameI = input({ value: data.name, placeholder: t('client_name') });
  const companyI = input({ value: data.company || '', placeholder: t('company') });
  const emailI = input({ value: data.email || '', type: 'email', placeholder: t('email') });
  const phoneI = input({ value: data.phone || '', placeholder: t('phone') });
  const typeS = select([
    { value: 'recurring',  label: t('type_recurring') },
    { value: 'occasional', label: t('type_occasional') },
    { value: 'onetime',    label: t('type_onetime') }
  ], { value: data.type });
  const notesT = textarea({ value: data.notes || '', placeholder: t('notes') });

  const m = modal({
    title: existing ? t('edit') + ' ' + t('client') : t('new_client'),
    body: el('div', {},
      field(t('client_name'), nameI),
      field(t('company') + ' (' + t('optional') + ')', companyI),
      el('div', { class: 'detail-grid' },
        field(t('email'), emailI),
        field(t('phone'), phoneI),
      ),
      field(t('client_type'), typeS),
      field(t('notes'), notesT)
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) {
          await remove('clients', existing.id);
          toast(t('deleted'), 'success');
          m.close();
        }
      } }, t('delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        if (!nameI.value.trim()) { toast(t('required') + ': ' + t('name'), 'error'); return; }
        const payload = {
          ...data,
          name: nameI.value.trim(),
          company: companyI.value.trim(),
          email: emailI.value.trim(),
          phone: phoneI.value.trim(),
          type: typeS.value,
          notes: notesT.value
        };
        await upsert('clients', payload);
        toast(t('saved'), 'success');
        m.close();
      } }, t('save'))
    ].filter(Boolean)
  });
}

function openClientDetails(client) {
  const projects = sel.projectsForClient(client.id);
  const invoices = sel.invoicesForClient(client.id);
  const totalRev = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const body = el('div', {},
    el('div', { class: 'row', style: { gap: '14px', marginBottom: '18px' } },
      el('div', { class: 'avatar avatar--lg', style: { background: client.color || colorFromString(client.name) } }, initials(client.name)),
      el('div', { class: 'flex-1' },
        el('div', { class: 'text-xl' }, client.name),
        el('div', { class: 'text-sm text-muted' }, client.company || ''),
        el('div', { class: 'row gap-8 mt-8 flex-wrap' },
          client.email ? el('a', { class: 'badge', href: 'mailto:' + client.email }, client.email) : null,
          client.phone ? el('a', { class: 'badge', href: 'tel:' + client.phone }, client.phone) : null,
          client.type ? badge(t('type_' + client.type), 'accent') : null
        )
      )
    ),
    el('div', { class: 'detail-grid', style: { marginBottom: '18px' } },
      el('div', { class: 'glass', style: { padding: '14px' } },
        el('div', { class: 'text-muted text-sm' }, t('total_projects')),
        el('div', { class: 'text-2xl' }, projects.length)
      ),
      el('div', { class: 'glass', style: { padding: '14px' } },
        el('div', { class: 'text-muted text-sm' }, t('total_revenue')),
        el('div', { class: 'text-2xl text-accent' }, fmtCurrency(totalRev))
      )
    ),
    client.notes ? el('div', { class: 'glass', style: { padding: '14px', marginBottom: '14px' } },
      el('div', { class: 'text-muted text-sm', style: { marginBottom: '6px' } }, t('notes')),
      el('div', { style: { whiteSpace: 'pre-wrap' } }, client.notes)
    ) : null,
    el('div', { class: 'panel__header' },
      el('h4', { class: 'panel__title' }, t('projects'))
    ),
    projects.length === 0
      ? el('p', { class: 'text-muted text-sm' }, t('nothing_here'))
      : el('div', { class: 'list' },
        ...projects.map((p) => el('div', { class: 'list__item', onClick: () => { m.close(); navigate('/projects', { id: p.id }); } },
          el('div', { class: 'list__item-main' },
            el('div', { class: 'list__item-title' }, p.name),
            el('div', { class: 'list__item-sub' }, t('project_status_' + (p.status || 'active')))
          ),
          p.dueDate ? el('div', { class: 'list__item-trail' }, fmtDate(p.dueDate)) : null
        ))
      )
  );

  const m = modal({
    title: client.name,
    body,
    wide: true,
    footer: [
      el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) {
          await remove('clients', client.id);
          toast(t('deleted'));
          m.close();
        }
      } }, icon('trash') + ' ' + t('delete')),
      el('button', { class: 'btn', onClick: () => { m.close(); openClientModal(client); } }, icon('edit') + ' ' + t('edit'))
    ]
  });
}
