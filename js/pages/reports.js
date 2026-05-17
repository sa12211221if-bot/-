// Designer OS — Reports with custom SVG charts
import { el, addDays, isSameDay } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtCurrency, fmtNumber, fmtDate, getLang } from '../i18n.js';
import { getState, sel } from '../store.js';

let range = '30';

export async function renderReports() {
  const root = el('div', {});
  const state = getState();

  // Hidden defs for SVG gradients
  const defs = `
    <svg width="0" height="0" style="position:absolute">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9B8DFF"/>
          <stop offset="100%" stop-color="#6E5BF5" stop-opacity="0.6"/>
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#9B8DFF"/>
          <stop offset="100%" stop-color="#6E5BF5"/>
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9B8DFF" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#6E5BF5" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
    </svg>`;
  root.appendChild(el('div', { html: defs }));

  // Header
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('reports')),
      el('div', { class: 'page-header__subtitle' },
        getLang() === 'ar' ? 'تتبّع إنتاجيتك ومدخولك' : 'Track your productivity and income')
    ),
    el('div', { class: 'page-header__actions' },
      buildRangeTabs()
    )
  ));

  // Stats
  const days = parseInt(range);
  const since = addDays(new Date(), -days);
  const invs = state.invoices.filter((i) => i.status === 'paid' && new Date(i.paidDate || i.issueDate) >= since);
  const totalRev = invs.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalExp = state.expenses.filter((e) => new Date(e.date) >= since).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const completedTasks = state.tasks.filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= since).length;
  const completedProjects = state.projects.filter((p) => p.status === 'done' && p.updatedAt && new Date(p.updatedAt) >= since).length;
  const focusMin = state.focusSessions.filter((s) => new Date(s.date) >= since).reduce((sum, s) => sum + (s.duration || 0), 0);

  const stats = el('div', { class: 'stats-grid' });
  stats.appendChild(statCard('dollar', t('revenue'), fmtCurrency(totalRev), 'accent'));
  stats.appendChild(statCard('receipt', t('expenses'), fmtCurrency(totalExp)));
  stats.appendChild(statCard('trending', t('net_profit'), fmtCurrency(totalRev - totalExp)));
  stats.appendChild(statCard('check_circle', t('completed_tasks'), completedTasks));
  stats.appendChild(statCard('briefcase', t('completed_projects'), completedProjects));
  stats.appendChild(statCard('clock', t('total_focus_time'), `${(focusMin/60).toFixed(1)}h`));
  root.appendChild(stats);

  // Charts grid
  const grid = el('div', { class: 'grid-2', style: { marginTop: '18px' } });

  // Revenue by day
  const revPanel = el('div', { class: 'glass panel' });
  revPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('trending') }),
    el('span', {}, t('revenue_by_month'))
  ]));
  revPanel.appendChild(buildBarChart(getRevenuePerDay(days)));
  grid.appendChild(revPanel);

  // Productivity (tasks done per day)
  const prodPanel = el('div', { class: 'glass panel' });
  prodPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('check_circle') }),
    el('span', {}, t('productivity_by_day'))
  ]));
  prodPanel.appendChild(buildBarChart(getProductivityPerDay(days), 'tasks'));
  grid.appendChild(prodPanel);

  // Revenue by client (top 5)
  const clientPanel = el('div', { class: 'glass panel' });
  clientPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('users') }),
    el('span', {}, t('revenue_by_client'))
  ]));
  clientPanel.appendChild(buildClientBars(invs));
  grid.appendChild(clientPanel);

  // Focus minutes per day
  const focusPanel = el('div', { class: 'glass panel' });
  focusPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('target') }),
    el('span', {}, t('total_focus_time'))
  ]));
  focusPanel.appendChild(buildBarChart(getFocusPerDay(days), 'min'));
  grid.appendChild(focusPanel);

  root.appendChild(grid);

  function buildRangeTabs() {
    const wrap = el('div', { class: 'tabs' });
    [{ id: '7', label: t('last_7_days') }, { id: '30', label: t('last_30_days') }, { id: '365', label: t('last_year') }].forEach((r) => {
      const btn = el('button', {
        class: 'tab' + (r.id === range ? ' active' : ''),
        onClick: () => { range = r.id; renderReports().then((n) => {
          const c = document.getElementById('content');
          c.innerHTML = ''; c.appendChild(n);
        }); }
      }, r.label);
      wrap.appendChild(btn);
    });
    return wrap;
  }

  return root;
}

function statCard(iconName, label, value, accent) {
  return el('div', { class: 'glass stat ' + (accent ? 'stat--accent' : '') },
    el('div', { class: 'stat__icon', html: icon(iconName, { size: 18 }) }),
    el('div', { class: 'stat__label' }, label),
    el('div', { class: 'stat__value', style: { fontSize: '22px' } }, value)
  );
}

function getRevenuePerDay(days) {
  const today = new Date();
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const value = getState().invoices
      .filter((inv) => inv.status === 'paid' && isSameDay(inv.paidDate || inv.issueDate, d))
      .reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
    data.push({ label: fmtDate(d, { day: '2-digit', month: 'short' }), value });
  }
  return data;
}

function getProductivityPerDay(days) {
  const today = new Date();
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const value = getState().tasks.filter((t) => t.status === 'done' && t.completedAt && isSameDay(t.completedAt, d)).length;
    data.push({ label: fmtDate(d, { day: '2-digit', month: 'short' }), value });
  }
  return data;
}

function getFocusPerDay(days) {
  const today = new Date();
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const value = getState().focusSessions.filter((s) => isSameDay(s.date, d)).reduce((s, x) => s + (x.duration || 0), 0);
    data.push({ label: fmtDate(d, { day: '2-digit', month: 'short' }), value });
  }
  return data;
}

function buildBarChart(data, suffix) {
  const W = 600, H = 220, P = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (W - P * 2) / Math.max(1, data.length);
  const groups = data.length;
  // Simplify x-axis labels: show every Nth
  const stride = Math.ceil(groups / 7);

  let bars = '';
  let labels = '';
  data.forEach((d, i) => {
    const h = (d.value / max) * (H - P * 2);
    const x = P + i * barW + 2;
    const y = H - P - h;
    bars += `<rect class="chart-bar" x="${x}" y="${y}" width="${barW - 4}" height="${h}" rx="3"/>`;
    if (i % stride === 0) {
      labels += `<text x="${x + (barW-4)/2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#8a8a95">${d.label}</text>`;
    }
  });

  // Y axis ticks (3)
  let yticks = '';
  for (let k = 0; k <= 3; k++) {
    const v = (max * k / 3);
    const y = H - P - (k / 3) * (H - P * 2);
    yticks += `<line x1="${P}" x2="${W - 5}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,0.05)"/>`;
    yticks += `<text x="${P - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#5a5a65">${formatVal(v, suffix)}</text>`;
  }

  const wrap = el('div', { class: 'chart' });
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${yticks}
    ${bars}
    ${labels}
  </svg>`;
  return wrap;
}

function buildClientBars(invs) {
  const map = new Map();
  invs.forEach((inv) => {
    const id = inv.clientId || 'other';
    map.set(id, (map.get(id) || 0) + (Number(inv.amount) || 0));
  });
  const items = [...map.entries()]
    .map(([id, value]) => {
      const c = sel.clientById(id);
      return { name: c?.name || (getLang() === 'ar' ? 'بدون عميل' : 'No client'), value };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  if (items.length === 0) {
    return el('div', { class: 'empty', style: { padding: '20px' } },
      el('div', { class: 'empty__title' }, t('nothing_here')));
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  const wrap = el('div', { class: 'col gap-12' });
  items.forEach((it) => {
    const pct = (it.value / max) * 100;
    wrap.appendChild(el('div', {},
      el('div', { class: 'row justify-between', style: { marginBottom: '4px' } },
        el('span', { class: 'text-sm' }, it.name),
        el('span', { class: 'text-sm text-accent' }, fmtCurrency(it.value))
      ),
      el('div', { class: 'progress' },
        el('div', { class: 'progress__fill', style: { width: pct + '%' } })
      )
    ));
  });
  return wrap;
}

function formatVal(v, suffix) {
  if (suffix === 'min') return Math.round(v) + 'm';
  if (suffix === 'tasks') return Math.round(v);
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
  return Math.round(v);
}
