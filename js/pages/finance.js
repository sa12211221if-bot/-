// عبد سيف — Finance Page
// Tracks income, expenses, monthly + yearly goals.
// Single source of truth for all money flowing through the user's life.
import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, fmtCurrency, fmtDate, fmtNumber } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { input, field, select, modal, toast, confirmDialog } from '../ui.js';

const ar = () => getLang() === 'ar';
const L = (a, e) => (ar() ? a : e);

const EXPENSE_CATEGORIES = [
  { id: 'food',      ar: 'طعام',          en: 'Food' },
  { id: 'transport', ar: 'مواصلات',       en: 'Transport' },
  { id: 'bills',     ar: 'فواتير',        en: 'Bills' },
  { id: 'shopping',  ar: 'تسوّق',          en: 'Shopping' },
  { id: 'health',    ar: 'صحة',            en: 'Health' },
  { id: 'family',    ar: 'عائلة',          en: 'Family' },
  { id: 'tools',     ar: 'أدوات وعمل',     en: 'Tools / work' },
  { id: 'savings',   ar: 'ادخار',          en: 'Savings' },
  { id: 'other',     ar: 'أخرى',           en: 'Other' }
];
const INCOME_CATEGORIES = [
  { id: 'salary',    ar: 'راتب',           en: 'Salary' },
  { id: 'project',   ar: 'مشروع',          en: 'Project' },
  { id: 'gift',      ar: 'هدية',           en: 'Gift' },
  { id: 'other',     ar: 'أخرى',           en: 'Other' }
];

function catLabel(id, type) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const c = list.find((x) => x.id === id);
  return c ? (ar() ? c.ar : c.en) : id;
}

// ============================================================
// Page
// ============================================================
export async function renderFinance() {
  const root = el('div', {});
  const state = getState();
  const month = state.financeMonth ?? new Date().getMonth();
  const year  = state.financeYear  ?? new Date().getFullYear();

  // Header
  const header = el('div', { class: 'page-header' });
  const left = el('div', {});
  left.appendChild(el('h2', { class: 'page-header__title' }, L('الإدارة المالية', 'Finance')));
  left.appendChild(el('div', { class: 'page-header__subtitle' }, L('دخلك، مصروفك، وأهدافك المالية', 'Income, expenses, and goals')));
  header.appendChild(left);
  const actions = el('div', { class: 'page-header__actions' });
  const newIncomeBtn = el('button', { class: 'btn btn--success', onClick: () => openTxnModal('income') });
  newIncomeBtn.innerHTML = icon('plus') + ' ' + L('دخل', 'Income');
  const newExpenseBtn = el('button', { class: 'btn btn--danger', onClick: () => openTxnModal('expense') });
  newExpenseBtn.innerHTML = icon('plus') + ' ' + L('مصروف', 'Expense');
  const goalBtn = el('button', { class: 'btn btn--primary', onClick: openGoalModal });
  goalBtn.innerHTML = icon('flag') + ' ' + L('هدف مالي', 'Set goal');
  actions.appendChild(newIncomeBtn);
  actions.appendChild(newExpenseBtn);
  actions.appendChild(goalBtn);
  header.appendChild(actions);
  root.appendChild(header);

  // ============ This-month KPIs ============
  const m = sel.financeMonth(month, year);
  const y = sel.financeYear(year);
  const goal = sel.currentMonthlyGoal();
  const yGoal = sel.currentYearlyGoal();

  const stats = el('div', { class: 'stats-grid' });
  stats.appendChild(buildStat('arrow_up', L('دخل الشهر', 'Month income'), fmtCurrency(m.income), 'success'));
  stats.appendChild(buildStat('arrow_down', L('مصروف الشهر', 'Month expenses'), fmtCurrency(m.expense), 'danger'));
  stats.appendChild(buildStat('chart', L('صافي الشهر', 'Net this month'), fmtCurrency(m.net), m.net >= 0 ? 'success' : 'danger'));
  stats.appendChild(buildStat('flag', L('صافي السنة', 'Net this year'), fmtCurrency(y.net), y.net >= 0 ? 'success' : 'muted'));
  root.appendChild(stats);

  // ============ Goals progress ============
  if (goal || yGoal) {
    const goalGrid = el('div', { class: 'grid-2', style: { marginBottom: '22px' } });
    if (goal) goalGrid.appendChild(buildGoalCard(goal, m.income, 'monthly'));
    if (yGoal) goalGrid.appendChild(buildGoalCard(yGoal, y.income, 'yearly'));
    root.appendChild(goalGrid);
  } else {
    const cta = el('div', { class: 'glass panel', style: { marginBottom: '22px', textAlign: 'center', padding: '28px 20px' } });
    cta.innerHTML = `
      <div style="font-size:34px; margin-bottom:8px;">🎯</div>
      <div style="font-weight:700; font-size:15px; margin-bottom:4px;">${L('ابدأ بهدف مالي', 'Set your first goal')}</div>
      <div class="text-sm text-muted" style="margin-bottom:12px;">${L('حدّد هدف شهري أو سنوي وتتبّع تقدّمك', 'Pick a monthly or yearly target and watch progress')}</div>
    `;
    const b = el('button', { class: 'btn btn--primary', onClick: openGoalModal });
    b.innerHTML = icon('flag') + ' ' + L('أضف هدف', 'Add goal');
    cta.appendChild(b);
    root.appendChild(cta);
  }

  // ============ Breakdown + recent ============
  const grid = el('div', { class: 'grid-2' });

  // Recent transactions
  const recent = el('div', { class: 'glass panel' });
  recent.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title', html: icon('list') + ' ' + L('آخر العمليات', 'Recent transactions') }),
    el('span', { class: 'panel__action text-sm text-muted' }, fmtDate(new Date(year, month, 1), { month: 'long', year: 'numeric' }))
  ));
  const rows = (state.finance || [])
    .filter((f) => { const d = new Date(f.date); return d.getMonth() === month && d.getFullYear() === year; })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);
  if (rows.length === 0) {
    recent.appendChild(el('div', { class: 'empty', style: { padding: '28px 0' } },
      el('div', { class: 'empty__icon', html: icon('receipt') }),
      el('div', { class: 'empty__title' }, L('لا عمليات هذا الشهر', 'No transactions this month')),
      el('div', { class: 'empty__hint' }, L('أضف دخل أو مصروف من الأعلى', 'Add income or an expense from above'))
    ));
  } else {
    const list = el('div', { class: 'list' });
    rows.forEach((r) => list.appendChild(buildTxnRow(r)));
    recent.appendChild(list);
  }
  grid.appendChild(recent);

  // Category breakdown (expenses)
  const breakdown = el('div', { class: 'glass panel' });
  breakdown.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title', html: icon('chart') + ' ' + L('توزيع المصاريف', 'Expense breakdown') })
  ));
  const byCat = sel.financeByCategory(month, year);
  const total = Object.values(byCat).reduce((s, n) => s + n, 0);
  if (total === 0) {
    breakdown.appendChild(el('div', { class: 'text-sm text-muted', style: { padding: '20px 0' } },
      L('لا مصاريف هذا الشهر بعد.', 'No expenses logged this month yet.')));
  } else {
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([cat, amt]) => {
      const pct = (amt / total) * 100;
      const bar = el('div', { style: { marginBottom: '12px' } });
      bar.innerHTML = `
        <div class="row justify-between" style="margin-bottom:4px; font-size:12.5px;">
          <span>${catLabel(cat, 'expense')}</span>
          <span class="font-mono text-muted">${fmtCurrency(amt)} · ${Math.round(pct)}%</span>
        </div>
        <div class="progress"><div class="progress__fill" style="width:${pct}%"></div></div>
      `;
      breakdown.appendChild(bar);
    });
  }
  grid.appendChild(breakdown);

  root.appendChild(grid);
  return root;
}

// ============================================================
// Components
// ============================================================
function buildStat(iconName, label, value, color) {
  const card = el('div', { class: 'stat glass' });
  card.appendChild(el('div', { class: 'stat__icon', html: icon(iconName) }));
  card.appendChild(el('div', { class: 'stat__label' }, label));
  const valueEl = el('div', { class: 'stat__value' }, value);
  if (color === 'success') valueEl.style.color = 'var(--success)';
  else if (color === 'danger') valueEl.style.color = 'var(--danger)';
  card.appendChild(valueEl);
  return card;
}

function buildGoalCard(goal, achieved, period) {
  const target = Number(goal.target) || 0;
  const pct = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
  const remaining = Math.max(0, target - achieved);
  const card = el('div', { class: 'glass panel' });
  const periodLabel = period === 'yearly'
    ? L('هدف السنة', 'Yearly goal')
    : L('هدف الشهر', 'Monthly goal');
  card.innerHTML = `
    <div class="row justify-between" style="margin-bottom:12px;">
      <div class="row gap-8">
        <span style="color:var(--accent-2)">${icon('flag')}</span>
        <span style="font-weight:700; font-size:14px;">${periodLabel}</span>
      </div>
      <span class="badge badge--accent">${Math.round(pct)}%</span>
    </div>
    <div style="font-size:24px; font-weight:700; letter-spacing:-0.5px; margin-bottom:6px;">
      ${fmtCurrency(achieved)} <span class="text-muted text-sm" style="font-weight:500;">/ ${fmtCurrency(target)}</span>
    </div>
    <div class="progress" style="margin-bottom:10px; height:8px;"><div class="progress__fill" style="width:${pct}%"></div></div>
    <div class="row justify-between text-sm text-muted">
      <span>${L('الباقي', 'Remaining')}: <span class="font-mono">${fmtCurrency(remaining)}</span></span>
      <button class="btn btn--ghost btn--sm" data-edit-goal="${goal.id}">${icon('edit', { size: 14 })} ${L('تعديل', 'Edit')}</button>
    </div>
  `;
  card.querySelector('[data-edit-goal]').addEventListener('click', () => openGoalModal(goal));
  return card;
}

function buildTxnRow(r) {
  const isIncome = r.type === 'income';
  const row = el('div', { class: 'list__item' });
  const sign = isIncome ? '+' : '−';
  const color = isIncome ? 'var(--success)' : 'var(--danger)';
  row.innerHTML = `
    <div style="width:36px; height:36px; border-radius:10px; display:grid; place-items:center;
      background:${isIncome ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)'}; color:${color}; flex-shrink:0;">
      ${icon(isIncome ? 'arrow_up' : 'arrow_down', { size: 16 })}
    </div>
    <div class="list__item-main">
      <div class="list__item-title">${r.note || catLabel(r.category, r.type)}</div>
      <div class="list__item-sub">${catLabel(r.category, r.type)} · ${fmtDate(r.date)}</div>
    </div>
    <div class="list__item-trail font-mono" style="color:${color}; font-weight:700;">
      ${sign} ${fmtCurrency(r.amount)}
    </div>
  `;
  row.addEventListener('click', () => openTxnModal(r.type, r));
  return row;
}

// ============================================================
// Modals
// ============================================================
function openTxnModal(type, existing) {
  const isIncome = type === 'income';
  const cats = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const amountI = input({
    type: 'number',
    placeholder: '0',
    value: existing?.amount || '',
    style: { fontSize: '20px', textAlign: 'center', fontWeight: '700' }
  });
  const noteI = input({ placeholder: L('وصف (اختياري)', 'Description (optional)'), value: existing?.note || '' });
  const catS = select(cats.map((c) => ({ value: c.id, label: ar() ? c.ar : c.en })),
    { value: existing?.category || cats[0].id });
  const dateI = input({
    type: 'date',
    value: (existing?.date || new Date().toISOString()).slice(0, 10)
  });

  const m = modal({
    title: el('span', {}, (isIncome ? '💰 ' : '💸 ') + (existing ? L('تعديل', 'Edit') : (isIncome ? L('دخل جديد', 'New income') : L('مصروف جديد', 'New expense')))),
    body: el('div', { class: 'col gap-12' },
      field(L('المبلغ', 'Amount'), amountI),
      field(L('التصنيف', 'Category'), catS),
      field(L('التاريخ', 'Date'), dateI),
      field(L('وصف', 'Note'), noteI)
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        if (!await confirmDialog(L('حذف هذه العملية؟', 'Delete this transaction?'))) return;
        await remove('finance', existing.id);
        toast(L('تم الحذف', 'Deleted'), 'success');
        m.close();
        rerender();
      }}, icon('trash') + ' ' + L('حذف', 'Delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, L('إلغاء', 'Cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        const amount = parseFloat(amountI.value);
        if (!amount || amount <= 0) { toast(L('أدخل مبلغ صحيح', 'Enter a valid amount'), 'error'); return; }
        const payload = {
          ...(existing || {}),
          type,
          amount,
          category: catS.value,
          date: new Date(dateI.value).toISOString(),
          note: noteI.value.trim()
        };
        await upsert('finance', payload);
        toast(L('تم الحفظ', 'Saved'), 'success');
        m.close();
        rerender();
      }}, icon('check') + ' ' + L('حفظ', 'Save'))
    ].filter(Boolean)
  });
  setTimeout(() => amountI.focus(), 80);
}

function openGoalModal(existing) {
  const periodS = select([
    { value: 'monthly', label: L('شهري', 'Monthly') },
    { value: 'yearly',  label: L('سنوي',  'Yearly') }
  ], { value: existing?.period || 'monthly' });
  const targetI = input({
    type: 'number',
    placeholder: '1500000',
    value: existing?.target || '',
    style: { fontSize: '20px', textAlign: 'center', fontWeight: '700' }
  });
  const noteI = input({ placeholder: L('ملاحظة (اختياري)', 'Note (optional)'), value: existing?.note || '' });

  const m = modal({
    title: '🎯 ' + (existing ? L('تعديل الهدف', 'Edit goal') : L('هدف مالي جديد', 'New financial goal')),
    body: el('div', { class: 'col gap-12' },
      field(L('المدة', 'Period'), periodS),
      field(L('المبلغ المستهدف', 'Target amount'), targetI),
      field(L('ملاحظة', 'Note'), noteI)
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        if (!await confirmDialog(L('حذف الهدف؟', 'Delete goal?'))) return;
        await remove('financeGoals', existing.id);
        toast(L('تم الحذف', 'Deleted'), 'success');
        m.close();
        rerender();
      }}, icon('trash') + ' ' + L('حذف', 'Delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, L('إلغاء', 'Cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        const target = parseFloat(targetI.value);
        if (!target || target <= 0) { toast(L('أدخل مبلغ صحيح', 'Enter a valid amount'), 'error'); return; }
        const now = new Date();
        const payload = {
          ...(existing || {}),
          period: periodS.value,
          target,
          note: noteI.value.trim(),
          year: now.getFullYear(),
          month: periodS.value === 'monthly' ? now.getMonth() : null
        };
        await upsert('financeGoals', payload);
        toast(L('تم حفظ الهدف', 'Goal saved'), 'success');
        m.close();
        rerender();
      }}, icon('check') + ' ' + L('حفظ', 'Save'))
    ].filter(Boolean)
  });
  setTimeout(() => targetI.focus(), 80);
}

function rerender() {
  const ev = new HashChangeEvent('hashchange');
  window.dispatchEvent(ev);
}
