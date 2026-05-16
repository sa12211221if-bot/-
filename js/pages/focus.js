// Designer OS — Focus Mode (Pomodoro + project time tracker)
import { el, fmtClock, fmtDuration, isSameDay } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtNumber, getLang } from '../i18n.js';
import { getState, sel, upsert, setSetting } from '../store.js';
import { select, toast } from '../ui.js';
import { db, uid } from '../db.js';

let timerInterval = null;
let session = null;

export async function renderFocus({ params }) {
  const root = el('div', {});
  const state = getState();
  const projectFromUrl = params?.get && params.get('project');

  const focusMins = state.pomodoroFocus || 25;
  const breakMins = state.pomodoroBreak || 5;
  const longMins = state.pomodoroLong || 15;

  // Hidden gradient defs for SVG
  const defs = `
    <svg width="0" height="0" style="position:absolute">
      <defs>
        <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FF8A3D"/>
          <stop offset="100%" stop-color="#FF5722"/>
        </linearGradient>
      </defs>
    </svg>`;
  const defWrap = el('div', { html: defs });
  root.appendChild(defWrap);

  // Header
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('focus_mode')),
      el('div', { class: 'page-header__subtitle' }, t('pomodoro') + ' · ' + t('total_focus_time') + ': ' + fmtDuration(sel.focusMinutesToday()))
    )
  ));

  // Timer card
  const card = el('div', { class: 'glass panel focus-stage' });

  // Project select
  const projects = state.projects.filter((p) => p.status !== 'archived' && p.status !== 'cancelled');
  const projectS = select([
    { value: '', label: t('select_project_focus') },
    ...projects.map((p) => ({ value: p.id, label: p.name }))
  ], { value: projectFromUrl || '', style: { maxWidth: '320px' } });
  card.appendChild(el('div', { class: 'row gap-12 mb-0', style: { marginBottom: '12px' } },
    el('span', { html: icon('briefcase'), style: { color: 'var(--accent-2)' } }),
    projectS
  ));

  // Mode buttons
  let mode = 'focus';
  let totalSeconds = focusMins * 60;
  let remaining = totalSeconds;

  const modeBar = el('div', { class: 'tabs' });
  const modes = [
    { id: 'focus', label: t('focus_duration'), mins: focusMins },
    { id: 'short', label: t('short_break'), mins: breakMins },
    { id: 'long',  label: t('long_break'),  mins: longMins }
  ];
  const modeBtns = {};
  modes.forEach((mItem) => {
    const btn = el('button', {
      class: 'tab' + (mItem.id === mode ? ' active' : ''),
      onClick: () => {
        if (timerInterval) return;
        mode = mItem.id;
        totalSeconds = mItem.mins * 60;
        remaining = totalSeconds;
        Object.values(modeBtns).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderTimer();
      }
    }, mItem.label);
    modeBtns[mItem.id] = btn;
    modeBar.appendChild(btn);
  });
  card.appendChild(modeBar);

  // Timer ring
  const ring = el('div', { class: 'timer-ring' });
  card.appendChild(ring);

  function renderTimer() {
    ring.innerHTML = '';
    const r = 130;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - remaining / totalSeconds);

    const svg = `
      <svg viewBox="0 0 280 280">
        <circle class="timer-ring__bg" cx="140" cy="140" r="${r}"/>
        <circle class="timer-ring__fg" cx="140" cy="140" r="${r}"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
      </svg>
      <div class="timer-ring__inner">
        <div class="timer-ring__time">${fmtClock(remaining)}</div>
        <div class="timer-ring__label">${t(mode === 'focus' ? 'focus_duration' : mode === 'short' ? 'short_break' : 'long_break')}</div>
      </div>`;
    ring.innerHTML = svg;
  }
  renderTimer();

  // Controls
  const startBtn = el('button', { class: 'btn btn--primary btn--lg', onClick: toggleTimer, html: icon('play') + ' ' + t('start') });
  const stopBtn = el('button', { class: 'btn btn--danger btn--lg', onClick: stopTimer, html: icon('stop') + ' ' + t('stop'), style: { display: 'none' } });
  const resetBtn = el('button', { class: 'btn btn--lg', onClick: resetTimer, html: icon('refresh') + ' ' + t('reset') });
  card.appendChild(el('div', { class: 'focus-controls' }, startBtn, stopBtn, resetBtn));

  function toggleTimer() {
    if (timerInterval) {
      // pause
      clearInterval(timerInterval);
      timerInterval = null;
      startBtn.innerHTML = icon('play') + ' ' + t('resume');
      return;
    }
    if (!session) {
      session = {
        id: uid(),
        date: Date.now(),
        startedAt: Date.now(),
        projectId: projectS.value || null,
        mode,
        plannedMinutes: totalSeconds / 60
      };
    }
    startBtn.innerHTML = icon('pause') + ' ' + t('pause');
    stopBtn.style.display = 'inline-flex';
    timerInterval = setInterval(() => {
      remaining -= 1;
      renderTimer();
      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        completeSession();
      }
    }, 1000);
  }

  async function completeSession() {
    if (!session) return;
    const duration = Math.round((Date.now() - session.startedAt) / 60000);
    const completed = mode === 'focus';
    await upsert('focusSessions', {
      ...session,
      duration,
      completed,
      endedAt: Date.now()
    });
    if (session.projectId && mode === 'focus') {
      await upsert('timeLogs', {
        id: uid(),
        projectId: session.projectId,
        date: Date.now(),
        duration,
        source: 'pomodoro'
      });
    }
    toast(getLang() === 'ar' ? '🎉 تم إنجاز الجلسة!' : '🎉 Session completed!', 'success');
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    try {
      // Audio beep using Web Audio
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.1;
      o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 250);
    } catch (e) {}
    session = null;
    startBtn.innerHTML = icon('play') + ' ' + t('start');
    stopBtn.style.display = 'none';
    remaining = totalSeconds;
    renderTimer();
  }

  async function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    if (session) {
      const duration = Math.round((Date.now() - session.startedAt) / 60000);
      if (duration > 0) {
        await upsert('focusSessions', { ...session, duration, completed: false, endedAt: Date.now() });
        if (session.projectId && mode === 'focus') {
          await upsert('timeLogs', { id: uid(), projectId: session.projectId, date: Date.now(), duration, source: 'pomodoro' });
        }
      }
    }
    session = null;
    startBtn.innerHTML = icon('play') + ' ' + t('start');
    stopBtn.style.display = 'none';
    remaining = totalSeconds;
    renderTimer();
  }

  function resetTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    session = null;
    remaining = totalSeconds;
    startBtn.innerHTML = icon('play') + ' ' + t('start');
    stopBtn.style.display = 'none';
    renderTimer();
  }

  root.appendChild(card);

  // Stats below
  const stats = el('div', { class: 'stats-grid', style: { marginTop: '18px' } });
  const todaySessions = state.focusSessions.filter((s) => isSameDay(s.date, new Date()));
  const completedToday = todaySessions.filter((s) => s.completed).length;
  const minutesToday = todaySessions.reduce((s, x) => s + (x.duration || 0), 0);
  stats.appendChild(el('div', { class: 'glass stat' },
    el('div', { class: 'stat__icon', html: icon('flame') }),
    el('div', { class: 'stat__label' }, t('sessions_today')),
    el('div', { class: 'stat__value' }, completedToday)
  ));
  stats.appendChild(el('div', { class: 'glass stat' },
    el('div', { class: 'stat__icon', html: icon('clock') }),
    el('div', { class: 'stat__label' }, t('total_focus_time')),
    el('div', { class: 'stat__value' }, fmtDuration(minutesToday))
  ));
  stats.appendChild(el('div', { class: 'glass stat stat--accent' },
    el('div', { class: 'stat__icon', html: icon('trending') }),
    el('div', { class: 'stat__label' }, t('streak')),
    el('div', { class: 'stat__value' }, sel.streak() + ' ' + t('days'))
  ));
  root.appendChild(stats);

  return root;
}
