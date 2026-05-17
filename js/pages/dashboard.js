// عبد سيف — Dashboard (clean redesign)
// Per user feedback: minimal, calm, 4 sections only.
//   1. Greeting + quote of the moment
//   2. Today's focus (one task — the most important right now)
//   3. Today's snapshot (income, tasks, focus minutes)
//   4. Monthly financial goal progress
import { el, fmtDuration } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, fmtCurrency, fmtNumber } from '../i18n.js';
import { getState, sel, upsert, setFocusNow } from '../store.js';
import { navigate } from '../router.js';
import { openCapture } from '../capture.js';

const ar = () => getLang() === 'ar';
const L = (a, e) => (ar() ? a : e);

export async function renderDashboard() {
  const root = el('div', { class: 'reveal dashboard-clean' });
  const state = getState();

  // 1) Greeting + quote
  root.appendChild(renderHero(state));

  // 2) Today's focus task (most important pending task)
  root.appendChild(renderTodayFocus(state));

  // 3) Snapshot stats (3 cards: tasks today, finance today, focus minutes)
  root.appendChild(renderSnapshot(state));

  // 4) Monthly goal progress
  root.appendChild(renderGoalProgress(state));

  return root;
}

// ============================================================
// 1) Hero — greeting + rotating quote
// ============================================================
function renderHero(state) {
  const hour = new Date().getHours();
  let greet;
  if (ar()) greet = hour < 5 ? 'ليلة هادئة' : hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء النور' : 'مساء الخير';
  else greet = hour < 5 ? 'Quiet night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const wrap = el('div', { class: 'glass panel hero-clean' });
  const quote = sel.randomQuote();

  wrap.innerHTML = `
    <div class="hero-clean__greet">${greet}</div>
    ${quote ? `
      <div class="hero-clean__quote">
        <div class="hero-clean__quote-mark">"</div>
        <div class="hero-clean__quote-text">${escapeHtml(quote.text)}</div>
        ${quote.author ? `<div class="hero-clean__quote-author">— ${escapeHtml(quote.author)}</div>` : ''}
      </div>
    ` : `
      <div class="hero-clean__cta-line text-sm text-muted">
        ${L('أضف عبارة تحبها لتظهر هنا كل مرة', 'Add a quote you love — it shows here every visit')}
      </div>
    `}
  `;
  if (!quote) {
    const b = el('button', { class: 'btn btn--sm', onClick: () => navigate('/quotes'), style: { marginTop: '10px' } });
    b.innerHTML = icon('plus', { size: 14 }) + ' ' + L('أضف عبارة', 'Add quote');
    wrap.appendChild(b);
  }
  return wrap;
}

// ============================================================
// 2) Today's focus — single most important task
// ============================================================
function renderTodayFocus(state) {
  const candidate = sel.focusCandidate();
  const wrap = el('div', { class: 'glass panel hero-focus-clean' });

  if (!candidate) {
    wrap.innerHTML = `
      <div class="hero-focus-clean__label">${L('تركيز اليوم', 'Focus now')}</div>
      <div class="hero-focus-clean__empty">
        <div style="font-size:32px; margin-bottom:6px;">🎯</div>
        <div style="font-weight:700; margin-bottom:4px;">${L('كل شي واضح', 'You are clear')}</div>
        <div class="text-sm text-muted">${L('لا مهام عاجلة. التقط فكرة جديدة.', 'No urgent tasks. Capture something new.')}</div>
      </div>
    `;
    const captureBtn = el('button', { class: 'btn btn--primary', style: { marginTop: '12px' }, onClick: () => openCapture() });
    captureBtn.innerHTML = icon('plus') + ' ' + L('التقاط سريع', 'Quick capture');
    wrap.appendChild(captureBtn);
    return wrap;
  }

  const project = candidate.projectId ? sel.projectById(candidate.projectId) : null;
  const estimate = candidate.estimatedMinutes || 25;

  wrap.innerHTML = `
    <div class="hero-focus-clean__label">
      ${icon('target', { size: 12 })}
      ${L('تركيز الآن', 'Focus now')}
    </div>
    <h2 class="hero-focus-clean__title">${escapeHtml(candidate.title)}</h2>
    <div class="hero-focus-clean__meta">
      ${project ? `<span class="task-chip">${icon('briefcase', { size: 12 })} ${escapeHtml(project.name)}</span>` : ''}
      <span class="task-chip">${icon('clock', { size: 12 })} ${estimate} ${t('minutes')}</span>
      ${candidate.priority === 'high' ? `<span class="task-chip" style="color:#fca5a5;background:rgba(239,68,68,.12);">${L('عالية', 'High')}</span>` : ''}
    </div>
  `;
  const row = el('div', { class: 'row gap-8 flex-wrap', style: { marginTop: '14px' } });
  const start = el('button', { class: 'btn btn--primary', onClick: async () => {
    await setFocusNow({ taskId: candidate.id, projectId: candidate.projectId, startedAt: Date.now(), plannedMinutes: estimate });
    navigate('/focus');
  }});
  start.innerHTML = icon('play', { size: 16 }) + ' ' + L('ابدأ الآن', 'Start now');
  const done = el('button', { class: 'btn btn--success', onClick: async () => {
    await upsert('tasks', { ...candidate, status: 'done', completedAt: Date.now() });
  }});
  done.innerHTML = icon('check', { size: 16 }) + ' ' + L('تم', 'Done');
  const skip = el('button', { class: 'btn btn--ghost', onClick: () => navigate('/tasks') });
  skip.innerHTML = L('اختر مهمة ثانية', 'Pick another');
  row.appendChild(start); row.appendChild(done); row.appendChild(skip);
  wrap.appendChild(row);
  return wrap;
}

// ============================================================
// 3) Snapshot — 3 cards
// ============================================================
function renderSnapshot(state) {
  const grid = el('div', { class: 'stats-grid', style: { marginTop: '20px' } });

  const todayCount = sel.todayTasks().length;
  const overdue = sel.overdueTasks().length;
  const fin = sel.financeMonth();
  const focusMin = sel.focusMinutesToday();
  const streak = sel.streak();

  // Tasks today
  grid.appendChild(buildStat({
    iconName: 'check_circle',
    label: L('مهام اليوم', 'Tasks today'),
    value: String(todayCount),
    sub: overdue > 0 ? L(`+ ${overdue} متأخرة`, `+ ${overdue} overdue`) : L('كل شي تمام', 'All caught up'),
    onClick: () => navigate('/tasks'),
    color: overdue > 0 ? 'warn' : null
  }));

  // Net this month
  grid.appendChild(buildStat({
    iconName: 'chart',
    label: L('صافي الشهر', 'Net this month'),
    value: fmtCurrency(fin.net),
    sub: L(`دخل ${fmtCurrency(fin.income)}`, `Income ${fmtCurrency(fin.income)}`),
    onClick: () => navigate('/finance'),
    color: fin.net >= 0 ? 'good' : 'bad'
  }));

  // Focus + streak
  grid.appendChild(buildStat({
    iconName: 'flame',
    label: L('تركيز اليوم', 'Focus today'),
    value: fmtDuration(focusMin),
    sub: streak > 0 ? `🔥 ${streak} ${L('أيام متتالية', 'day streak')}` : L('ابدأ سلسلة جديدة', 'Start a streak'),
    onClick: () => navigate('/focus')
  }));

  return grid;
}

function buildStat({ iconName, label, value, sub, onClick, color }) {
  const card = el('div', { class: 'stat glass', onClick });
  card.style.cursor = 'pointer';
  let valueColor = '';
  if (color === 'good') valueColor = 'color:var(--success);';
  else if (color === 'bad') valueColor = 'color:var(--danger);';
  else if (color === 'warn') valueColor = 'color:var(--warning);';
  card.innerHTML = `
    <div class="stat__icon">${icon(iconName)}</div>
    <div class="stat__label">${label}</div>
    <div class="stat__value" style="${valueColor}">${value}</div>
    <div class="stat__delta text-muted" style="color:var(--text-3);">${sub}</div>
  `;
  return card;
}

// ============================================================
// 4) Goal progress — monthly
// ============================================================
function renderGoalProgress(state) {
  const monthly = sel.currentMonthlyGoal();
  const fin = sel.financeMonth();
  const wrap = el('div', { class: 'glass panel', style: { marginTop: '20px' } });

  if (!monthly) {
    wrap.innerHTML = `
      <div class="row justify-between" style="gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${L('حدّد هدفك المالي للشهر', "Set this month's goal")}</div>
          <div class="text-sm text-muted">${L('يساعدك تتابع تقدّمك بشكل واضح', 'See your progress at a glance')}</div>
        </div>
      </div>
    `;
    const b = el('button', { class: 'btn btn--primary', style: { marginTop: '10px' }, onClick: () => navigate('/finance') });
    b.innerHTML = icon('flag') + ' ' + L('هدف الشهر', 'Set monthly goal');
    wrap.appendChild(b);
    return wrap;
  }

  const target = Number(monthly.target) || 1;
  const pct = Math.min(100, (fin.income / target) * 100);
  const remaining = Math.max(0, target - fin.income);
  wrap.innerHTML = `
    <div class="row justify-between items-center" style="margin-bottom:10px;">
      <div class="row gap-8">
        <span style="color:var(--accent-2)">${icon('flag')}</span>
        <span style="font-weight:700; font-size:14px;">${L('هدف الشهر', 'Monthly goal')}</span>
      </div>
      <span class="badge badge--accent">${Math.round(pct)}%</span>
    </div>
    <div style="font-size:22px; font-weight:700; letter-spacing:-0.5px;">
      ${fmtCurrency(fin.income)} <span class="text-muted text-sm" style="font-weight:500;">/ ${fmtCurrency(target)}</span>
    </div>
    <div class="progress" style="margin:10px 0; height:8px;"><div class="progress__fill" style="width:${pct}%"></div></div>
    <div class="row justify-between text-sm text-muted">
      <span>${L('الباقي للوصول', 'Remaining')}: <span class="font-mono" style="color:var(--text);">${fmtCurrency(remaining)}</span></span>
      <span class="text-accent" style="cursor:pointer;" data-link>${L('التفاصيل', 'Details')} →</span>
    </div>
  `;
  wrap.querySelector('[data-link]').onclick = () => navigate('/finance');
  return wrap;
}

// ============================================================
// helpers
// ============================================================
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
