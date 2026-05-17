// Designer OS — Reviews (Daily + Weekly reflection)
import { el, addDays, isSameDay, startOfDay } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtDate, getLang } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';

let activeTab = 'daily';

export async function renderReviews() {
  const state = getState();
  const root = el('div', { class: 'reveal' });

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('reviews')),
      el('div', { class: 'page-header__subtitle' }, t('reviews_subtitle'))
    )
  ));

  // Tabs
  const tabs = el('div', { class: 'tabs', style: { marginBottom: '14px' } });
  ['daily', 'weekly'].forEach((id) => {
    const btn = el('button', {
      class: 'tab' + (activeTab === id ? ' active' : ''),
      onClick: () => { activeTab = id; render(); tabs.querySelectorAll('.tab').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); }
    }, t(id + '_review'));
    tabs.appendChild(btn);
  });
  root.appendChild(tabs);

  const view = el('div', {});
  root.appendChild(view);

  function render() {
    view.innerHTML = '';
    if (activeTab === 'daily') renderDaily(view);
    else renderWeekly(view);
  }
  render();

  return root;
}

// ============================================================
// DAILY REVIEW
// ============================================================
function renderDaily(view) {
  const today = sel.todayReview();
  if (today) {
    view.appendChild(renderCompletedReview(today));
  } else {
    view.appendChild(renderDailyCTA());
  }
  // Recent reviews list
  const past = getState().reviews
    .filter((r) => r.type === 'daily' && !isSameDay(r.date, new Date()))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);
  if (past.length) {
    view.appendChild(el('div', { class: 'section-head' },
      el('h3', { class: 'section-head__title' }, getLang() === 'ar' ? 'مراجعات سابقة' : 'Recent reviews')
    ));
    past.forEach((r) => view.appendChild(renderReviewMini(r)));
  }
}

function renderDailyCTA() {
  const card = el('div', { class: 'review-card' });
  card.appendChild(el('div', { class: 'review-card__head' },
    (() => { const h = el('div', { class: 'review-card__title' });
      h.innerHTML = icon('bookmark') + ' ' + t('daily_review');
      return h;
    })(),
    el('span', { class: 'review-card__step' }, fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }))
  ));
  card.appendChild(el('p', { class: 'text-muted text-sm', style: { marginBottom: '14px' } },
    getLang() === 'ar'
      ? '5 خطوات. 3 دقائق. ينقل التعلّم إلى نمو حقيقي.'
      : '5 steps. 3 minutes. Turn learning into real growth.'
  ));
  const startBtn = el('button', { class: 'btn btn--primary', onClick: () => openDailyFlow() });
  startBtn.innerHTML = icon('play') + ' ' + t('start_review');
  card.appendChild(startBtn);
  return card;
}

function openDailyFlow() {
  const ar = getLang() === 'ar';
  const state = getState();
  let step = 0;
  const TOTAL = 5;

  // Pre-populate from state
  const data = {
    type: 'daily',
    date: new Date().toISOString(),
    wins: ['', '', ''],
    friction: '',
    energyScore: sel.latestVitals()?.energy || 3,
    energyNote: '',
    unfinished: sel.todayTasks().concat(sel.overdueTasks()).slice(0, 10).map((t) => ({ id: t.id, title: t.title, action: 'reschedule' })),
    tomorrowPriority: '',
    completedAt: Date.now()
  };

  // Inputs
  const winInputs = [
    input({ value: data.wins[0], placeholder: ar ? 'إنجاز #1' : 'Win #1' }),
    input({ value: data.wins[1], placeholder: ar ? 'إنجاز #2' : 'Win #2' }),
    input({ value: data.wins[2], placeholder: ar ? 'إنجاز #3' : 'Win #3' })
  ];
  const frictionInput = textarea({ placeholder: ar ? 'ما الذي عرقل تقدمك؟' : 'What slowed you down?' });
  const energySlider = el('input', { type: 'range', min: '1', max: '5', value: data.energyScore, style: { width: '100%' } });
  const energyValue = el('span', { class: 'text-accent' }, data.energyScore + '/5');
  energySlider.oninput = () => { data.energyScore = parseInt(energySlider.value); energyValue.textContent = data.energyScore + '/5'; };
  const energyNoteInput = input({ placeholder: ar ? 'ملاحظة سريعة عن طاقتك...' : 'Quick energy note...' });
  const tomorrowInput = input({ placeholder: ar ? 'الأهم غداً (شيء واحد فقط)' : 'Most important thing tomorrow' });

  const stepBox = el('div', {});
  const progressFill = el('div', { class: 'review-card__progress-fill', style: { width: '20%' } });

  function renderStep() {
    stepBox.innerHTML = '';
    progressFill.style.width = (((step + 1) / TOTAL) * 100) + '%';
    const headers = [
      { num: 1, title: t('todays_wins') },
      { num: 2, title: t('todays_friction') },
      { num: 3, title: t('energy_reflection') },
      { num: 4, title: t('unfinished_tasks') },
      { num: 5, title: t('tomorrow_priority') }
    ];
    const h = headers[step];
    const head = el('div', { style: { fontSize: '15px', fontWeight: 700, marginBottom: '14px' } });
    head.innerHTML = `<span class="num">${h.num}</span>${h.title}`;
    stepBox.appendChild(head);

    if (step === 0) {
      stepBox.appendChild(el('p', { class: 'text-muted text-sm', style: { marginBottom: '12px' } },
        ar ? 'حتى لو صغيرة. كل إنجاز نقطة وقود.' : 'Even tiny ones. Each win is fuel.'));
      const wrap = el('div', { class: 'col gap-8' });
      winInputs.forEach((i) => wrap.appendChild(i));
      stepBox.appendChild(wrap);
    } else if (step === 1) {
      stepBox.appendChild(el('p', { class: 'text-muted text-sm', style: { marginBottom: '12px' } },
        ar ? 'ليس لتعنيف نفسك — بل لمعرفة النمط.' : 'Not for self-blame. For pattern awareness.'));
      stepBox.appendChild(frictionInput);
    } else if (step === 2) {
      stepBox.appendChild(el('p', { class: 'text-muted text-sm', style: { marginBottom: '12px' } },
        ar ? 'كيف كانت طاقتك اليوم؟' : 'How was your energy today?'));
      const row = el('div', { class: 'row justify-between', style: { marginBottom: '10px' } },
        el('span', { class: 'text-sm' }, t('vital_energy')),
        energyValue
      );
      stepBox.appendChild(row);
      stepBox.appendChild(energySlider);
      stepBox.appendChild(el('div', { style: { height: '12px' } }));
      stepBox.appendChild(energyNoteInput);
    } else if (step === 3) {
      stepBox.appendChild(el('p', { class: 'text-muted text-sm', style: { marginBottom: '12px' } },
        ar ? 'أعد جدولتها أو أفلتها — لا تتركها معلّقة.' : 'Reschedule or release. Do not leave them hanging.'));
      if (data.unfinished.length === 0) {
        stepBox.appendChild(el('p', { class: 'text-success text-sm' }, ar ? '🎯 لا مهام عالقة' : '🎯 Nothing left hanging'));
      } else {
        const list = el('div', { class: 'col gap-8' });
        data.unfinished.forEach((u, i) => {
          const item = el('div', { class: 'list__item' });
          item.appendChild(el('div', { class: 'list__item-main' },
            el('div', { class: 'list__item-title' }, u.title)
          ));
          const sel = select([
            { value: 'reschedule', label: ar ? 'أعد جدولتها لغد' : 'Move to tomorrow' },
            { value: 'keep',       label: ar ? 'أبقِها كما هي' : 'Keep as is' },
            { value: 'drop',       label: ar ? 'أفلتها' : 'Drop' }
          ], { value: u.action });
          sel.onchange = () => { data.unfinished[i].action = sel.value; };
          sel.style.maxWidth = '180px';
          item.appendChild(sel);
          list.appendChild(item);
        });
        stepBox.appendChild(list);
      }
    } else if (step === 4) {
      stepBox.appendChild(el('p', { class: 'text-muted text-sm', style: { marginBottom: '12px' } },
        ar ? 'شيء واحد. الأهم. ابدأ به غداً.' : 'One thing. The most important. Start with it tomorrow.'));
      stepBox.appendChild(tomorrowInput);
    }
  }

  const card = el('div', { class: 'review-card' });
  card.appendChild(el('div', { class: 'review-card__head' },
    (() => { const h = el('div', { class: 'review-card__title' });
      h.innerHTML = icon('bookmark') + ' ' + t('daily_review');
      return h;
    })(),
    el('span', { class: 'review-card__step' }, fmtDate(new Date(), { weekday: 'short' }))
  ));
  card.appendChild((() => { const p = el('div', { class: 'review-card__progress' }); p.appendChild(progressFill); return p; })());
  card.appendChild(stepBox);
  const nav = el('div', { class: 'row justify-between', style: { marginTop: '16px' } });
  const back = el('button', { class: 'btn', onClick: () => { if (step > 0) { step--; renderStep(); refreshNav(); } } });
  back.innerHTML = icon('chevron_right') + ' ' + (ar ? 'السابق' : 'Back');
  const next = el('button', { class: 'btn btn--primary' });
  function refreshNav() {
    back.style.visibility = step === 0 ? 'hidden' : 'visible';
    next.innerHTML = step === TOTAL - 1
      ? icon('check') + ' ' + (ar ? 'إنهاء المراجعة' : 'Finish')
      : (ar ? 'التالي' : 'Next') + ' ' + icon('chevron_left');
  }
  next.onclick = async () => {
    if (step < TOTAL - 1) {
      // capture current step
      if (step === 0) data.wins = winInputs.map((i) => i.value.trim()).filter(Boolean);
      if (step === 1) data.friction = frictionInput.value.trim();
      if (step === 2) data.energyNote = energyNoteInput.value.trim();
      step++;
      renderStep();
      refreshNav();
    } else {
      data.tomorrowPriority = tomorrowInput.value.trim();
      // Apply unfinished actions
      for (const u of data.unfinished) {
        const task = getState().tasks.find((t) => t.id === u.id);
        if (!task) continue;
        if (u.action === 'reschedule') {
          await upsert('tasks', { ...task, dueDate: addDays(new Date(), 1).toISOString() });
        } else if (u.action === 'drop') {
          await upsert('tasks', { ...task, status: 'done', completedAt: Date.now() });
        }
      }
      // Create tomorrow priority task if specified
      if (data.tomorrowPriority) {
        await upsert('tasks', {
          title: data.tomorrowPriority,
          status: 'todo',
          priority: 'high',
          dueDate: addDays(new Date(), 1).toISOString()
        });
      }
      await upsert('reviews', data);
      toast(t('review_complete'), 'success');
      const root = document.getElementById('content');
      // Re-render the page
      const ev = new HashChangeEvent('hashchange');
      window.dispatchEvent(ev);
    }
  };
  nav.appendChild(back);
  nav.appendChild(next);
  card.appendChild(nav);

  // Replace the content
  const view = document.querySelector('#content');
  if (view) {
    view.innerHTML = '';
    view.appendChild(card);
    renderStep();
    refreshNav();
  }
}

function renderCompletedReview(review) {
  const ar = getLang() === 'ar';
  const card = el('div', { class: 'review-card' });
  card.appendChild(el('div', { class: 'review-card__head' },
    (() => { const h = el('div', { class: 'review-card__title' });
      h.innerHTML = icon('check_circle') + ' ' + t('review_complete');
      return h;
    })(),
    el('span', { class: 'text-sm text-muted' }, fmtDate(review.date, { weekday: 'long', day: 'numeric', month: 'long' }))
  ));

  const grid = el('div', { class: 'col gap-12' });
  if (review.wins?.length) {
    grid.appendChild(reviewSection(t('todays_wins'), review.wins.map((w) => '✓ ' + w).join('\n')));
  }
  if (review.friction) grid.appendChild(reviewSection(t('todays_friction'), review.friction));
  if (review.energyScore) grid.appendChild(reviewSection(t('vital_energy'), review.energyScore + '/5' + (review.energyNote ? ' — ' + review.energyNote : '')));
  if (review.tomorrowPriority) grid.appendChild(reviewSection(t('tomorrow_priority'), '⭐ ' + review.tomorrowPriority));
  card.appendChild(grid);
  return card;
}

function reviewSection(label, value) {
  const wrap = el('div', { style: { padding: '12px 14px', borderRadius: '10px', background: 'var(--surface)' } });
  wrap.appendChild(el('div', { class: 'text-muted text-sm', style: { marginBottom: '4px' } }, label));
  wrap.appendChild(el('div', { style: { fontSize: '13.5px', whiteSpace: 'pre-wrap', lineHeight: 1.5 } }, value));
  return wrap;
}

function renderReviewMini(r) {
  const card = el('div', { class: 'list__item', style: { marginBottom: '8px' } });
  card.appendChild(el('div', { class: 'list__item-main' },
    el('div', { class: 'list__item-title' }, fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'short' })),
    el('div', { class: 'list__item-sub' },
      (r.wins?.filter(Boolean).length || 0) + ' ' + (getLang() === 'ar' ? 'إنجاز' : 'wins') +
      (r.tomorrowPriority ? ' · ⭐ ' + r.tomorrowPriority : '')
    )
  ));
  return card;
}

// ============================================================
// WEEKLY REVIEW
// ============================================================
function renderWeekly(view) {
  const existing = sel.thisWeekReview();
  if (existing) {
    view.appendChild(renderCompletedWeekly(existing));
  } else {
    view.appendChild(renderWeeklyCTA());
  }
  // Insights from this week's data
  view.appendChild(renderWeeklyInsights());
}

function renderWeeklyCTA() {
  const card = el('div', { class: 'review-card' });
  card.appendChild(el('div', { class: 'review-card__head' },
    (() => { const h = el('div', { class: 'review-card__title' });
      h.innerHTML = icon('trending') + ' ' + t('weekly_review');
      return h;
    })()
  ));
  card.appendChild(el('p', { class: 'text-muted text-sm', style: { marginBottom: '14px' } },
    getLang() === 'ar'
      ? '10 دقائق. مرة واحدة في الأسبوع. تحوّل التعلّم إلى استراتيجية.'
      : '10 minutes. Once a week. Turn learning into strategy.'
  ));
  const startBtn = el('button', { class: 'btn btn--primary', onClick: () => openWeeklyFlow() });
  startBtn.innerHTML = icon('play') + ' ' + t('start_review');
  card.appendChild(startBtn);
  return card;
}

function openWeeklyFlow() {
  const ar = getLang() === 'ar';
  const themeI = input({ placeholder: ar ? 'موضوع الأسبوع القادم بكلمة...' : 'Next week theme in one word...' });
  const winsI = textarea({ placeholder: ar ? 'أهم 3 إنجازات هذا الأسبوع' : 'Top 3 wins this week' });
  const learnedI = textarea({ placeholder: ar ? 'ما الذي تعلّمته؟' : 'What did you learn?' });
  const struggleI = textarea({ placeholder: ar ? 'ما الذي شكّل عقبة متكررة؟' : 'What pattern slowed you down?' });

  const m = modal({
    title: t('weekly_review'),
    body: el('div', {},
      field(t('todays_wins'), winsI),
      field(getLang() === 'ar' ? 'الدروس' : 'Lessons', learnedI),
      field(t('todays_friction'), struggleI),
      field(t('week_theme'), themeI)
    ),
    footer: [
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      (() => {
        const b = el('button', { class: 'btn btn--primary', onClick: async () => {
          await upsert('reviews', {
            type: 'weekly',
            date: new Date().toISOString(),
            wins: winsI.value.trim(),
            learned: learnedI.value.trim(),
            struggle: struggleI.value.trim(),
            theme: themeI.value.trim(),
            completedAt: Date.now()
          });
          toast(t('review_complete'), 'success');
          m.close();
        }});
        b.textContent = t('save');
        return b;
      })()
    ]
  });
}

function renderCompletedWeekly(review) {
  const card = el('div', { class: 'review-card' });
  card.appendChild(el('div', { class: 'review-card__head' },
    (() => { const h = el('div', { class: 'review-card__title' });
      h.innerHTML = icon('check_circle') + ' ' + t('weekly_review');
      return h;
    })(),
    el('span', { class: 'text-sm text-muted' }, fmtDate(review.date))
  ));
  if (review.theme) {
    card.appendChild(el('div', { class: 'glass-accent', style: { padding: '14px', borderRadius: '12px', marginBottom: '12px' } },
      el('div', { class: 'text-muted text-sm' }, t('week_theme')),
      el('div', { class: 'text-xl', style: { marginTop: '4px' } }, '🎯 ' + review.theme)
    ));
  }
  if (review.wins) card.appendChild(reviewSection(t('todays_wins'), review.wins));
  if (review.learned) card.appendChild(reviewSection(getLang() === 'ar' ? 'الدروس' : 'Lessons', review.learned));
  if (review.struggle) card.appendChild(reviewSection(t('todays_friction'), review.struggle));
  return card;
}

function renderWeeklyInsights() {
  const state = getState();
  const today = startOfDay();
  const weekAgo = addDays(today, -7);
  const ar = getLang() === 'ar';

  // Compute auto insights
  const focusMin = state.focusSessions
    .filter((s) => new Date(s.date) >= weekAgo)
    .reduce((a, b) => a + (b.duration || 0), 0);
  const tasksDone = state.tasks
    .filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekAgo).length;
  const habitDays = new Set();
  state.habitLogs
    .filter((l) => new Date(l.date) >= weekAgo && l.status === 'done')
    .forEach((l) => habitDays.add(new Date(l.date).toDateString()));

  // Daily reviews trend
  const dailyReviews = state.reviews
    .filter((r) => r.type === 'daily' && new Date(r.date) >= weekAgo);

  const wrap = el('div', { class: 'glass panel', style: { marginTop: '14px', padding: '20px' } });
  wrap.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    (() => { const s = el('span'); s.innerHTML = icon('zap'); return s; })(),
    (() => { const s = el('span'); s.textContent = t('week_progress'); return s; })()
  ]));
  const grid = el('div', { class: 'detail-grid', style: { gap: '12px' } });
  grid.appendChild(insightCell(ar ? '⏱ تركيز' : '⏱ Focus', `${(focusMin / 60).toFixed(1)}h`));
  grid.appendChild(insightCell(ar ? '✓ مهام منجزة' : '✓ Tasks done', tasksDone));
  grid.appendChild(insightCell(ar ? '🔥 أيام عادات' : '🔥 Habit days', habitDays.size + '/7'));
  grid.appendChild(insightCell(ar ? '📝 مراجعات يومية' : '📝 Daily reviews', dailyReviews.length + '/7'));
  wrap.appendChild(grid);

  // Energy trend mini line
  const energyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const dayLogs = state.vitals.filter((v) => isSameDay(v.date, d));
    if (dayLogs.length) {
      const avg = dayLogs.reduce((s, v) => s + (v.energy || 0), 0) / dayLogs.length;
      energyData.push({ date: d, avg });
    } else {
      energyData.push({ date: d, avg: 0 });
    }
  }
  if (energyData.some((d) => d.avg > 0)) {
    wrap.appendChild(el('div', { class: 'section-head' },
      (() => { const h = el('h3', { class: 'section-head__title' }); h.textContent = t('emotional_trend'); return h; })()
    ));
    wrap.appendChild(buildSparkline(energyData));
  }

  return wrap;
}

function insightCell(label, value) {
  const c = el('div', { class: 'glass', style: { padding: '14px' } });
  c.appendChild(el('div', { class: 'text-muted text-sm' }, label));
  c.appendChild(el('div', { class: 'text-2xl', style: { marginTop: '4px' } }, String(value)));
  return c;
}

function buildSparkline(data) {
  const W = 600, H = 80, P = 16;
  const max = 5;
  const dx = (W - P * 2) / Math.max(1, data.length - 1);
  let path = '';
  data.forEach((d, i) => {
    const x = P + i * dx;
    const y = H - P - (d.avg / max) * (H - P * 2);
    path += (i === 0 ? 'M' : 'L') + x + ',' + y + ' ';
  });
  const wrap = el('div', { class: 'chart' });
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <path d="${path}" fill="none" stroke="url(#lineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <defs>
      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#9B8DFF"/>
        <stop offset="100%" stop-color="#6E5BF5"/>
      </linearGradient>
    </defs>
  </svg>`;
  return wrap;
}
