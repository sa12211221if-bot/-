// Designer OS — Invoices + Subscriptions
import { el, addDays } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtCurrency, fmtDate, fmtRelative, getLang } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';

let activeTab = 'invoices';

export async function renderInvoices({ params }) {
  const root = el('div', {});
  const state = getState();

  const totalUnpaid = state.invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalPaidThisMonth = sel.monthRevenue();

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('invoices')),
      el('div', { class: 'page-header__subtitle' },
        `${t('month_revenue')}: ${fmtCurrency(totalPaidThisMonth)} · ${t('overdue')}: ${fmtCurrency(totalUnpaid)}`)
    ),
    el('div', { class: 'page-header__actions' },
      el('button', { class: 'btn', onClick: () => openSubscriptionModal(), html: icon('plus') + ' ' + t('new_subscription') }),
      el('button', { class: 'btn btn--primary', onClick: () => openInvoiceModal(), html: icon('plus') + ' ' + t('new_invoice') })
    )
  ));

  // Tabs
  const tabs = el('div', { class: 'tabs', style: { marginBottom: '14px' } });
  ['invoices', 'subscriptions'].forEach((id) => {
    const btn = el('button', {
      class: 'tab' + (activeTab === id ? ' active' : ''),
      onClick: () => { activeTab = id; render(); tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active')); btn.classList.add('active'); }
    }, t(id));
    tabs.appendChild(btn);
  });
  root.appendChild(tabs);

  const view = el('div', {});
  root.appendChild(view);

  function render() {
    view.innerHTML = '';
    if (activeTab === 'invoices') renderInvoicesList(view);
    else renderSubscriptionsList(view);
  }
  render();

  return root;
}

function renderInvoicesList(view) {
  const invoices = getState().invoices.slice().sort((a, b) =>
    new Date(b.issueDate || b.createdAt) - new Date(a.issueDate || a.createdAt));

  if (invoices.length === 0) {
    view.appendChild(el('div', { class: 'glass panel' }, emptyState({
      iconName: 'receipt',
      title: t('nothing_here'),
      action: el('button', { class: 'btn btn--primary', onClick: () => openInvoiceModal() }, icon('plus') + ' ' + t('new_invoice'))
    })));
    return;
  }

  // Stats
  const stats = el('div', { class: 'stats-grid' });
  const paid = invoices.filter((i) => i.status === 'paid');
  const sent = invoices.filter((i) => i.status === 'sent');
  const overdue = invoices.filter((i) => i.status === 'overdue' || (i.status === 'sent' && i.dueDate && new Date(i.dueDate) < new Date()));
  stats.appendChild(statBox('check_circle', t('invoice_status_paid'), paid.length, fmtCurrency(paid.reduce((s,i)=>s+(+i.amount||0),0)), 'success'));
  stats.appendChild(statBox('send', t('invoice_status_sent'), sent.length, fmtCurrency(sent.reduce((s,i)=>s+(+i.amount||0),0)), 'info'));
  stats.appendChild(statBox('alert', t('invoice_status_overdue'), overdue.length, fmtCurrency(overdue.reduce((s,i)=>s+(+i.amount||0),0)), 'danger'));
  view.appendChild(stats);

  // List
  const list = el('div', { class: 'glass panel' });
  const inner = el('div', { class: 'list' });
  invoices.forEach((inv) => {
    const client = sel.clientById(inv.clientId);
    const isOverdue = inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date();
    const status = isOverdue ? 'overdue' : inv.status;
    const variant = ({ paid: 'success', sent: 'info', overdue: 'danger', cancelled: 'muted' })[status] || 'muted';
    inner.appendChild(el('div', { class: 'list__item', onClick: () => openInvoiceModal(inv) },
      el('div', { class: 'list__item-main' },
        el('div', { class: 'list__item-title' },
          (inv.invoiceNumber || '#' + inv.id.slice(-6)) + ' · ' + (client?.name || t('no_client'))),
        el('div', { class: 'list__item-sub' },
          fmtDate(inv.issueDate) + (inv.dueDate ? ' → ' + fmtDate(inv.dueDate) : ''))
      ),
      el('div', { class: 'row gap-8' },
        badge(t('invoice_status_' + status), variant),
        el('div', { style: { fontSize: '15px', fontWeight: 700, marginInlineStart: '6px' } }, fmtCurrency(inv.amount, inv.currency))
      )
    ));
  });
  list.appendChild(inner);
  view.appendChild(list);
}

function renderSubscriptionsList(view) {
  const subs = getState().subscriptions.slice().sort((a, b) =>
    new Date(a.nextBillingDate || 0) - new Date(b.nextBillingDate || 0));

  if (subs.length === 0) {
    view.appendChild(el('div', { class: 'glass panel' }, emptyState({
      iconName: 'refresh',
      title: t('nothing_here'),
      hint: getLang() === 'ar' ? 'تتبّع اشتراكاتك المتكررة (Adobe، Figma، استضافة...)' : 'Track your recurring subscriptions (Adobe, Figma, hosting...)',
      action: el('button', { class: 'btn btn--primary', onClick: () => openSubscriptionModal() }, icon('plus') + ' ' + t('new_subscription'))
    })));
    return;
  }

  const totalMonthly = subs.reduce((s, sub) => {
    const factor = sub.cycle === 'yearly' ? 1/12 : sub.cycle === 'weekly' ? 4 : 1;
    return s + (Number(sub.amount) || 0) * factor;
  }, 0);

  view.appendChild(el('div', { class: 'glass panel glass-accent', style: { marginBottom: '14px', padding: '16px' } },
    el('div', { class: 'row justify-between items-center' },
      el('div', {},
        el('div', { class: 'text-muted text-sm' },
          getLang() === 'ar' ? 'إجمالي تقديري للاشتراكات شهرياً' : 'Estimated monthly subscriptions'),
        el('div', { class: 'text-2xl' }, fmtCurrency(totalMonthly))
      ),
      el('span', { html: icon('refresh', { size: 28 }), style: { color: 'var(--accent-2)' } })
    )
  ));

  const list = el('div', { class: 'glass panel' });
  const inner = el('div', { class: 'list' });
  subs.forEach((sub) => {
    const days = sub.nextBillingDate ? Math.ceil((new Date(sub.nextBillingDate) - new Date()) / 86400000) : null;
    const variant = days !== null && days <= 3 ? 'danger' : days !== null && days <= 7 ? 'warning' : 'muted';
    inner.appendChild(el('div', { class: 'list__item', onClick: () => openSubscriptionModal(sub) },
      el('div', { class: 'avatar avatar--sm', style: { background: sub.color || 'linear-gradient(135deg,var(--accent-2),var(--accent-3))' } },
        (sub.name || 'S')[0].toUpperCase()),
      el('div', { class: 'list__item-main' },
        el('div', { class: 'list__item-title' }, sub.name),
        el('div', { class: 'list__item-sub' }, t(sub.cycle === 'weekly' ? 'weekly_freq' : sub.cycle === 'yearly' ? 'yearly' : 'monthly'))
      ),
      el('div', { class: 'col gap-4', style: { textAlign: 'end' } },
        el('div', { style: { fontWeight: 700 } }, fmtCurrency(sub.amount, sub.currency)),
        sub.nextBillingDate ? badge(fmtRelative(sub.nextBillingDate), variant) : null
      )
    ));
  });
  list.appendChild(inner);
  view.appendChild(list);
}

function statBox(iconName, label, count, total, variant) {
  return el('div', { class: 'glass stat' },
    el('div', { class: 'stat__icon stat__icon--' + variant, html: icon(iconName, { size: 18 }) }),
    el('div', { class: 'stat__label' }, label + ` · ${count}`),
    el('div', { class: 'stat__value', style: { fontSize: '20px' } }, total)
  );
}

function openInvoiceModal(existing) {
  const data = existing ? { ...existing } : {
    invoiceNumber: '', clientId: '', amount: '', currency: getState().currency,
    issueDate: new Date().toISOString().slice(0,10), dueDate: '', status: 'draft',
    description: '', items: []
  };
  const numI = input({ value: data.invoiceNumber, placeholder: 'INV-001' });
  const clients = getState().clients;
  const clientS = select([
    { value: '', label: t('select_client') },
    ...clients.map((c) => ({ value: c.id, label: c.name }))
  ], { value: data.clientId || '' });
  const amountI = input({ value: data.amount || '', type: 'number', placeholder: '0' });
  const curS = select([
    { value: 'IQD', label: 'IQD' },
    { value: 'USD', label: 'USD' },
    { value: 'SAR', label: 'SAR' },
    { value: 'EUR', label: 'EUR' }
  ], { value: data.currency || 'IQD' });
  const issueI = input({ value: (data.issueDate || '').slice(0,10), type: 'date' });
  const dueI = input({ value: (data.dueDate || '').slice(0,10), type: 'date' });
  const statusS = select([
    { value: 'draft', label: t('invoice_status_draft') },
    { value: 'sent', label: t('invoice_status_sent') },
    { value: 'paid', label: t('invoice_status_paid') },
    { value: 'overdue', label: t('invoice_status_overdue') },
    { value: 'cancelled', label: t('invoice_status_cancelled') }
  ], { value: data.status || 'draft' });
  const descT = textarea({ value: data.description || '', placeholder: t('description') });

  const m = modal({
    title: existing ? t('edit') + ' ' + t('invoice') : t('new_invoice'),
    body: el('div', {},
      el('div', { class: 'detail-grid' },
        field(t('invoice_number'), numI),
        field(t('client'), clientS)
      ),
      el('div', { class: 'detail-grid' },
        field(t('amount'), amountI),
        field(t('currency'), curS)
      ),
      el('div', { class: 'detail-grid' },
        field(t('issue_date'), issueI),
        field(t('due_date'), dueI)
      ),
      field(t('status'), statusS),
      field(t('description'), descT)
    ),
    footer: [
      existing && existing.status !== 'paid' ? el('button', { class: 'btn btn--success', onClick: async () => {
        await upsert('invoices', { ...existing, status: 'paid', paidDate: new Date().toISOString() });
        toast(t('saved')); m.close();
      }}, icon('check') + ' ' + t('mark_paid')) : null,
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('invoices', existing.id); toast(t('deleted')); m.close(); }
      } }, t('delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        const status = statusS.value;
        const payload = {
          ...data,
          invoiceNumber: numI.value.trim(),
          clientId: clientS.value || null,
          amount: parseFloat(amountI.value) || 0,
          currency: curS.value,
          issueDate: issueI.value,
          dueDate: dueI.value || null,
          status,
          paidDate: status === 'paid' ? (data.paidDate || new Date().toISOString()) : null,
          description: descT.value
        };
        await upsert('invoices', payload);
        toast(t('saved'));
        m.close();
      } }, t('save'))
    ].filter(Boolean)
  });
}

function openSubscriptionModal(existing) {
  const data = existing ? { ...existing } : {
    name: '', cycle: 'monthly', amount: '', currency: getState().currency,
    nextBillingDate: addDays(new Date(), 30).toISOString().slice(0,10),
    notes: ''
  };
  const nameI = input({ value: data.name, placeholder: 'Adobe / Figma / Hosting...' });
  const cycleS = select([
    { value: 'monthly', label: t('monthly') },
    { value: 'yearly', label: t('yearly') },
    { value: 'weekly', label: t('weekly_freq') }
  ], { value: data.cycle });
  const amountI = input({ value: data.amount || '', type: 'number' });
  const curS = select([
    { value: 'IQD', label: 'IQD' },
    { value: 'USD', label: 'USD' },
    { value: 'SAR', label: 'SAR' },
    { value: 'EUR', label: 'EUR' }
  ], { value: data.currency || 'IQD' });
  const dateI = input({ value: (data.nextBillingDate || '').slice(0,10), type: 'date' });
  const notesT = textarea({ value: data.notes || '' });

  const m = modal({
    title: existing ? t('edit') + ' ' + t('subscriptions') : t('new_subscription'),
    body: el('div', {},
      field(t('name'), nameI),
      el('div', { class: 'detail-grid' },
        field(t('billing_cycle'), cycleS),
        field(t('next_billing'), dateI)
      ),
      el('div', { class: 'detail-grid' },
        field(t('amount'), amountI),
        field(t('currency'), curS)
      ),
      field(t('notes'), notesT)
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('subscriptions', existing.id); toast(t('deleted')); m.close(); }
      } }, t('delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        if (!nameI.value.trim()) { toast(t('required'), 'error'); return; }
        await upsert('subscriptions', {
          ...data,
          name: nameI.value.trim(),
          cycle: cycleS.value,
          amount: parseFloat(amountI.value) || 0,
          currency: curS.value,
          nextBillingDate: dateI.value || null,
          notes: notesT.value
        });
        toast(t('saved'));
        m.close();
      } }, t('save'))
    ].filter(Boolean)
  });
}
