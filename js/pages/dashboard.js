// Designer OS — Command Center (Dashboard redesigned)
// One screen, one decision: "what should I do right now?"

import { el, fmtDuration } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtDate, fmtRelative, getLang } from '../i18n.js';
import { getState, sel, upsert, setFocusNow } from '../store.js';
import { navigate } from '../router.js';
import { generateSuggestions, generateDailySummary, applySuggestion } from '../ai.js';
import { activateMode } from '../modes.js';
import { openCapture } from '../capture.js';

export async function renderDashboard() {
  const state = getState();
  const root = el('div', { class: 'reveal' });

  // ============================================================
  // HERO FOCUS — the single most important thing right now
  // ============================================================
  root.appendChild(renderHero(state));

  // ============================================================
  // TWO COLUMN: Left = Pulse + Today, Right = AI + Vitals
  // ============================================================
  const grid = el('div', { class: 'cc-grid' });

  // LEFT COLUMN
  const left = el('div', {});

  // Top 3 tasks (Pulse)
  left.appendChild(renderPulse());

  // Today's vitals strip
  left.appendChild(renderVitals());

  grid.appendChild(left);

  // RIGHT COLUMN
  const right = el('div', {});

  // AI assistant card (top suggestions)
  right.appendChild(renderAssistant());

  // Daily summary
  right.appendChild(renderSummary());

  grid.appendChild(right);

  root.appendChild(grid);

  return root;
}

// ============================================================
// HERO FOCUS
// ============================================================
function renderHero(state) {
  const candidate = sel.focusCandidate();
  const ar = getLang() === 'ar';
  const greeting = greetingForHour(new Date().getHours());

  if (!candidate) {
    // Empty state — no pending tasks. Encourage capture.
    const empty = el('div', { class: 'hero-focus hero-focus--empty' });
    empty.innerHTML = `
      <div class="hero-focus__label">${greeting} ✨</div>
      <h2 class="hero-focus__title">${ar ? 'كل شيء واضح' : 'You are clear'}</h2>
      <div class="hero-focus__sub">${ar ? 'لا توجد مهام عاجلة. التقط فكرة، أو ابدأ مشروعاً جديداً.' : 'No pending tasks. Capture an idea or start something new.'}</div>
    `;
    const captureBtn = el('button', { class: 'hero-focus__cta', onClick: () => openCapture() });
    captureBtn.innerHTML = icon('plus') + ' ' + t('capture');
    empty.appendChild(captureBtn);
    return empty;
  }

  const project = candidate.projectId ? sel.projectById(candidate.projectId) : null;
  const estimate = candidate.estimatedMinutes || candidate.estimateMin || 25;
  const sessionLabel = estimate >= 60 ? t('deep_work_session') : t('quick_session');

  const hero = el('div', { class: 'hero-focus' });
  const left = el('div', {});
  left.innerHTML = `
    <div class="hero-focus__label">
      ${icon('target', { size: 12 })}
      ${t('focus_now')}
    </div>
    <h2 class="hero-focus__title">${escapeHtml(candidate.title)}</h2>
    <div class="hero-focus__meta">
      ${project ? `<span class="hero-focus__meta-item">${icon('briefcase', { size: 14 })} ${escapeHtml(project.name)}</span>` : ''}
      <span class="hero-focus__meta-item">${icon('clock', { size: 14 })} ${estimate} ${t('minutes')}</span>
      <span class="hero-focus__meta-item">${icon('flame', { size: 14 })} ${sessionLabel}</span>
      ${candidate.priority === 'high' ? `<span class="hero-focus__meta-item" style="color: #fca5a5">${icon('alert', { size: 14 })} ${t('high')}</span>` : ''}
    </div>
  `;
  hero.appendChild(left);

  const action = el('div', { class: 'hero-focus__action' });
  const cta = el('button', {
    class: 'hero-focus__cta',
    onClick: async () => {
      await setFocusNow({ taskId: candidate.id, projectId: candidate.projectId, startedAt: Date.now(), plannedMinutes: estimate });
      await activateMode('deep');
      navigate('/focus');
    }
  });
  cta.innerHTML = icon('play', { size: 18 }) + ' ' + t('start_focus');
  action.appendChild(cta);
  const alt = el('button', { class: 'hero-focus__alt', onClick: () => navigate('/tasks') });
  alt.textContent = t('pick_focus');
  action.appendChild(alt);
  hero.appendChild(action);

  return hero;
}

// ============================================================
// PULSE — top 3 tasks
// ============================================================
function renderPulse() {
  const ar = getLang() === 'ar';
  const wrap = el('div', {});
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<h3 class="section-head__title">${t('pulse')} · ${t('today_tasks')}</h3>`;
  const allBtn = el('button', { class: 'section-head__action', onClick: () => navigate('/tasks') });
  allBtn.textContent = t('all') + ' →';
  head.appendChild(allBtn);
  wrap.appendChild(head);

  const today = sel.todayTasks();
  const overdue = sel.overdueTasks();
  const top3 = [...overdue.slice(0, 2), ...today].slice(0, 3);

  if (top3.length === 0) {
    wrap.appendChild(el('div', { class: 'glass panel', style: { padding: '24px', textAlign: 'center' } },
      el('div', { class: 'text-muted text-sm' }, t('no_tasks_today'))
    ));
    return wrap;
  }

  top3.forEach((task, idx) => {
    const project = sel.projectById(task.projectId);
    const card = el('div', {
      class: 'pulse-card',
      onClick: () => navigate('/tasks', { id: task.id })
    });
    const energyChip = task.energy ? `<span class="task-chip task-chip--energy-${task.energy}">${icon('flame', { size: 10 })} ${t(task.energy)}</span>` : '';
    const ctxChip = task.context ? `<span class="task-chip">${t('ctx_' + task.context)}</span>` : '';
    const estChip = task.estimatedMinutes ? `<span class="task-chip">${task.estimatedMinutes}${t('minutes_short')}</span>` : '';
    card.innerHTML = `
      <div class="pulse-card__num">${idx + 1}</div>
      <div class="pulse-card__main">
        <div class="pulse-card__title">${escapeHtml(task.title)}</div>
        <div class="pulse-card__meta">
          ${project ? `<span class="pulse-card__meta-item">${icon('briefcase', { size: 11 })} ${escapeHtml(project.name)}</span>` : ''}
          ${energyChip}
          ${ctxChip}
          ${estChip}
        </div>
      </div>
    `;
    // Mark done button (stop propagation)
    const done = el('button', {
      class: 'btn btn--icon btn--ghost',
      title: t('mark_done'),
      onClick: async (e) => {
        e.stopPropagation();
        await upsert('tasks', { ...task, status: 'done', completedAt: Date.now() });
      }
    });
    done.innerHTML = icon('check', { size: 16 });
    card.appendChild(done);
    card.style.marginBottom = '8px';
    wrap.appendChild(card);
  });

  return wrap;
}

// ============================================================
// VITALS — mental state strip
// ============================================================
function renderVitals() {
  const wrap = el('div', { style: { marginTop: '20px' } });
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<h3 class="section-head__title">${t('mental_state')}</h3>`;
  const logBtn = el('button', { class: 'section-head__action', onClick: openVitalsModal });
  logBtn.textContent = '+ ' + t('log_state');
  head.appendChild(logBtn);
  wrap.appendChild(head);

  const v = sel.latestVitals() || {};
  const strip = el('div', { class: 'vitals-strip' });
  const fields = [
    { id: 'focus', key: 'vital_focus' },
    { id: 'mood', key: 'vital_mood' },
    { id: 'energy', key: 'vital_energy' },
    { id: 'stress', key: 'vital_stress' },
    { id: 'sleep', key: 'vital_sleep' },
    { id: 'caffeine', key: 'vital_caffeine' }
  ];
  fields.forEach((f) => {
    const val = v[f.id] || 0;
    const segs = [1,2,3,4,5].map((i) =>
      `<span class="vital__bar-segment ${i <= val ? 'filled' : ''}"></span>`
    ).join('');
    const cell = el('div', { class: 'vital', onClick: openVitalsModal });
    cell.innerHTML = `
      <div class="vital__label">${t(f.key)}</div>
      <div class="vital__value">${val ? val + '/5' : '—'}</div>
      <div class="vital__bar">${segs}</div>
    `;
    strip.appendChild(cell);
  });
  wrap.appendChild(strip);
  return wrap;
}

function openVitalsModal() {
  // Minimal inline modal implementation
  import('../ui.js').then(({ modal, toast }) => {
    const v = sel.latestVitals() || {};
    const fields = ['focus','mood','energy','stress','sleep','caffeine'];
    const inputs = {};
    const body = el('div', { class: 'col gap-12' });
    fields.forEach((f) => {
      const wrap = el('div', {});
      wrap.innerHTML = `<div class="field__label" style="margin-bottom:6px">${t('vital_' + f)} — <span class="text-accent" id="val-${f}">${v[f] || 0}</span>/5</div>`;
      const input = el('input', { type: 'range', min: '0', max: '5', step: '1', value: v[f] || 0, style: { width: '100%' } });
      input.oninput = () => { wrap.querySelector('#val-' + f).textContent = input.value; };
      inputs[f] = input;
      wrap.appendChild(input);
      body.appendChild(wrap);
    });
    const m = modal({
      title: t('log_state'),
      body,
      footer: [
        el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
        (() => {
          const b = el('button', { class: 'btn btn--primary', onClick: async () => {
            const payload = { date: new Date().toISOString() };
            fields.forEach((f) => { payload[f] = parseInt(inputs[f].value) || 0; });
            await upsert('vitals', payload);
            toast(t('state_logged'), 'success');
            m.close();
          }});
          b.textContent = t('save');
          return b;
        })()
      ]
    });
  });
}

// ============================================================
// ASSISTANT card — top AI suggestion
// ============================================================
function renderAssistant() {
  const wrap = el('div', {});
  const head = el('div', { class: 'section-head', style: { marginTop: 0 } });
  head.innerHTML = `<h3 class="section-head__title">${t('ai_suggestions')}</h3>`;
  const moreBtn = el('button', { class: 'section-head__action', onClick: () => navigate('/assistant') });
  moreBtn.textContent = t('all') + ' →';
  head.appendChild(moreBtn);
  wrap.appendChild(head);

  const suggestions = generateSuggestions().slice(0, 2);
  if (suggestions.length === 0) {
    wrap.appendChild(el('div', { class: 'glass panel', style: { padding: '20px', textAlign: 'center' } },
      el('div', { class: 'text-muted text-sm' }, t('ai_no_suggestions'))
    ));
    return wrap;
  }
  suggestions.forEach((s) => wrap.appendChild(buildSuggestionCard(s)));
  wrap.lastChild.style.marginBottom = '0';
  return wrap;
}

function buildSuggestionCard(s) {
  const card = el('div', { class: 'ai-card', style: { marginBottom: '10px' } });
  card.innerHTML = `
    <div class="ai-card__icon">${icon(s.icon || 'zap', { size: 18 })}</div>
    <div class="ai-card__body">
      <div class="ai-card__title">${escapeHtml(s.title)}</div>
      <div class="ai-card__reason">${escapeHtml(s.reason || '')}</div>
    </div>
  `;
  const body = card.querySelector('.ai-card__body');
  const actions = el('div', { class: 'ai-card__actions' });
  const apply = el('button', { class: 'ai-card__btn ai-card__btn--primary', onClick: () => applySuggestion(s) });
  apply.textContent = s.actionLabel || t('ai_apply');
  actions.appendChild(apply);
  const dismiss = el('button', { class: 'ai-card__btn', onClick: () => { card.style.display = 'none'; } });
  dismiss.textContent = t('ai_dismiss');
  actions.appendChild(dismiss);
  body.appendChild(actions);
  return card;
}

// ============================================================
// DAILY SUMMARY card
// ============================================================
function renderSummary() {
  const wrap = el('div', { style: { marginTop: '20px' } });
  const head = el('div', { class: 'section-head' });
  head.innerHTML = `<h3 class="section-head__title">${t('ai_summary_title')}</h3>`;
  wrap.appendChild(head);

  const summary = generateDailySummary();
  const card = el('div', { class: 'glass panel', style: { padding: '18px' } });
  card.innerHTML = `
    <div style="display:flex; gap:12px; align-items:flex-start;">
      <div style="width:36px;height:36px;border-radius:10px;background:var(--surface-strong);display:grid;place-items:center;color:var(--accent-2);flex-shrink:0;">
        ${icon('bot', { size: 18 })}
      </div>
      <div style="flex:1;font-size:13.5px;line-height:1.65;color:var(--text-2);">${escapeHtml(summary)}</div>
    </div>
  `;
  wrap.appendChild(card);

  // Quick streak strip
  const streakStrip = el('div', { class: 'row gap-12 flex-wrap', style: { marginTop: '12px', justifyContent: 'space-between' } });
  const streak = sel.streak();
  const focusMin = sel.focusMinutesToday();
  const habitsDone = sel.habitsDoneToday();
  const habitsTotal = getState().habits.length;
  streakStrip.innerHTML = `
    <span class="badge badge--accent">🔥 ${streak} ${t('days')}</span>
    <span class="badge">⏱ ${fmtDuration(focusMin)}</span>
    ${habitsTotal > 0 ? `<span class="badge">✓ ${habitsDone}/${habitsTotal} ${t('habits')}</span>` : ''}
  `;
  wrap.appendChild(streakStrip);

  return wrap;
}

// ============================================================
// helpers
// ============================================================
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function greetingForHour(h) {
  const lang = getLang();
  if (lang === 'ar') {
    if (h < 5) return 'ليلة هادئة';
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء النور';
    return 'مساء الخير';
  }
  if (h < 5) return 'Quiet night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
