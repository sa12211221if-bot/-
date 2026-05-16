// Designer OS — AI Assistant page
// Central hub for AI-powered insights: suggestions, daily summary, patterns, chat (placeholder).

import { el, addDays, isSameDay, fmtDuration } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, fmtDate } from '../i18n.js';
import { getState, sel } from '../store.js';
import { generateSuggestions, generateDailySummary, applySuggestion, breakdownTask } from '../ai.js';
import { input, toast } from '../ui.js';

export async function renderAssistant() {
  const root = el('div', { class: 'reveal' });
  const ar = getLang() === 'ar';

  // Header
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('assistant')),
      el('div', { class: 'page-header__subtitle' },
        ar ? 'مساعدك الشخصي — يفهم سياقك ويقترح الخطوة التالية'
           : 'Your personal assistant — understands context, suggests next moves')
    )
  ));

  // ============================================================
  // 1. DAILY SUMMARY
  // ============================================================
  const summary = generateDailySummary();
  const summaryCard = el('div', { class: 'glass panel', style: { padding: '22px', marginBottom: '18px' } });
  summaryCard.innerHTML = `
    <div class="row gap-12 items-center" style="margin-bottom:14px;">
      <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg, var(--accent-2), var(--accent-3));display:grid;place-items:center;color:white;flex-shrink:0;">
        ${icon('bot', { size: 20 })}
      </div>
      <div>
        <div style="font-size:15px;font-weight:700;">${t('ai_summary_title')}</div>
        <div class="text-sm text-muted">${fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>
    </div>
    <p style="font-size:14.5px;line-height:1.7;color:var(--text);margin:0;">${escapeHtml(summary)}</p>
  `;
  root.appendChild(summaryCard);

  // Quick numbers strip
  const focusMin = sel.focusMinutesToday();
  const tasksDoneToday = getState().tasks.filter((t) => t.status === 'done' && t.completedAt && isSameDay(t.completedAt, new Date())).length;
  const habitsDone = sel.habitsDoneToday();
  const habitsTotal = getState().habits.length;
  const stats = el('div', { class: 'stats-grid', style: { marginBottom: '18px' } });
  stats.appendChild(metricCard('flame', t('streak'), sel.streak() + ' ' + t('days'), true));
  stats.appendChild(metricCard('clock', t('focus_today'), fmtDuration(focusMin)));
  stats.appendChild(metricCard('check_circle', t('completed_tasks'), tasksDoneToday));
  stats.appendChild(metricCard('check', t('habits'), habitsDone + '/' + habitsTotal));
  root.appendChild(stats);

  // ============================================================
  // 2. SMART SUGGESTIONS (full list)
  // ============================================================
  root.appendChild(el('div', { class: 'section-head' },
    (() => { const h = el('h3', { class: 'section-head__title' }); h.textContent = t('ai_suggestions'); return h; })()
  ));

  const suggestions = generateSuggestions();
  if (suggestions.length === 0) {
    root.appendChild(el('div', { class: 'glass panel', style: { padding: '20px', textAlign: 'center' } },
      el('div', { class: 'text-muted text-sm' }, t('ai_no_suggestions'))
    ));
  } else {
    const list = el('div', { class: 'col gap-12', style: { marginBottom: '18px' } });
    suggestions.forEach((s) => list.appendChild(buildFullSuggestion(s)));
    root.appendChild(list);
  }

  // ============================================================
  // 3. PATTERN INSIGHTS
  // ============================================================
  root.appendChild(el('div', { class: 'section-head' },
    (() => { const h = el('h3', { class: 'section-head__title' }); h.textContent = t('ai_pattern') + ' · ' + t('insights'); return h; })()
  ));
  root.appendChild(buildPatternsPanel());

  // ============================================================
  // 4. AI ACTIONS (breakdown, ask anything)
  // ============================================================
  root.appendChild(el('div', { class: 'section-head' },
    (() => { const h = el('h3', { class: 'section-head__title' }); h.textContent = ar ? 'أدوات الذكاء' : 'AI tools'; return h; })()
  ));

  const tools = el('div', { class: 'glass panel', style: { padding: '20px', marginBottom: '18px' } });
  tools.appendChild(el('div', { class: 'text-sm text-muted', style: { marginBottom: '10px' } },
    ar ? 'اكتب فكرة أو مهمة كبيرة، وسأقسّمها إلى خطوات قابلة للتنفيذ.'
       : 'Type a big idea or task and I will break it into actionable steps.'
  ));
  const breakdownInput = input({
    placeholder: ar ? 'مثلاً: تصميم هوية بصرية لمطعم...' : 'e.g. Design a brand identity for a restaurant...',
    style: { fontSize: '14px', marginBottom: '12px' }
  });
  const breakdownBtn = el('button', { class: 'btn btn--primary', onClick: () => {
    const text = breakdownInput.value.trim();
    if (!text) { toast(t('required'), 'error'); return; }
    const steps = breakdownTask(text);
    out.innerHTML = '';
    out.appendChild(el('div', { class: 'text-muted text-sm', style: { marginBottom: '10px' } },
      ar ? '✨ خطوات مقترحة:' : '✨ Suggested steps:'
    ));
    steps.forEach((step, i) => {
      const row = el('div', { class: 'pulse-card', style: { marginBottom: '6px' } });
      row.innerHTML = `
        <div class="pulse-card__num">${i + 1}</div>
        <div class="pulse-card__main">
          <div class="pulse-card__title">${escapeHtml(step)}</div>
        </div>
      `;
      out.appendChild(row);
    });
  }});
  breakdownBtn.innerHTML = icon('zap') + ' ' + t('ai_breakdown');
  tools.appendChild(breakdownInput);
  tools.appendChild(breakdownBtn);
  const out = el('div', { style: { marginTop: '16px' } });
  tools.appendChild(out);
  root.appendChild(tools);

  // ============================================================
  // 5. CHAT PLACEHOLDER (future OpenAI integration)
  // ============================================================
  const chatHint = el('div', { class: 'glass panel', style: { padding: '18px', opacity: 0.75 } });
  chatHint.innerHTML = `
    <div class="row gap-8 items-center" style="margin-bottom:6px;">
      ${icon('bot', { size: 16 })}
      <span style="font-weight:600;">${ar ? 'محادثة AI (قريباً)' : 'AI Chat (coming soon)'}</span>
    </div>
    <div class="text-sm text-muted">${ar
      ? 'سيتم تفعيل المحادثة المباشرة عند ربط مفتاح OpenAI من الإعدادات. كل المحركات الحالية تعمل محلياً بدون إنترنت.'
      : 'Live chat unlocks once you add an OpenAI key in Settings. All current intelligence runs locally and works offline.'}</div>
  `;
  root.appendChild(chatHint);

  return root;
}

function metricCard(iconName, label, value, accent) {
  const card = el('div', { class: 'glass stat ' + (accent ? 'stat--accent' : '') });
  const ic = el('div', { class: 'stat__icon' });
  ic.innerHTML = icon(iconName, { size: 18 });
  card.appendChild(ic);
  card.appendChild(el('div', { class: 'stat__label' }, label));
  card.appendChild(el('div', { class: 'stat__value', style: { fontSize: '20px' } }, String(value)));
  return card;
}

function buildFullSuggestion(s) {
  const card = el('div', { class: 'ai-card' });
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

function buildPatternsPanel() {
  const ar = getLang() === 'ar';
  const state = getState();

  // Compute patterns from data
  const sessions = state.focusSessions.filter((s) => s.completed);
  const insights = [];

  // Best hour
  if (sessions.length >= 6) {
    const buckets = new Array(24).fill(0);
    sessions.forEach((s) => { buckets[new Date(s.startedAt || s.date).getHours()]++; });
    let peakH = 0, peakC = 0;
    buckets.forEach((c, h) => { if (c > peakC) { peakC = c; peakH = h; } });
    insights.push({
      icon: 'trending',
      title: ar ? `أفضل ساعة للتركيز: ${peakH}:00` : `Best focus hour: ${peakH}:00`,
      desc: ar
        ? `${peakC} من ${sessions.length} جلسة كانت في هذا الوقت تقريباً`
        : `${peakC} of ${sessions.length} sessions cluster around this hour`
    });
  }

  // Best day of week
  if (sessions.length >= 7) {
    const dow = new Array(7).fill(0);
    const names = ar
      ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    sessions.forEach((s) => { dow[new Date(s.date).getDay()]++; });
    let peakD = 0, peakC = 0;
    dow.forEach((c, d) => { if (c > peakC) { peakC = c; peakD = d; } });
    insights.push({
      icon: 'calendar',
      title: ar ? `يومك الذهبي: ${names[peakD]}` : `Most productive day: ${names[peakD]}`,
      desc: ar ? 'احجز عملك العميق في هذا اليوم' : 'Block your deepest work for this day'
    });
  }

  // Average session length
  if (sessions.length >= 3) {
    const avg = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    insights.push({
      icon: 'clock',
      title: ar ? `متوسط جلسة التركيز: ${Math.round(avg)} دقيقة` : `Average focus session: ${Math.round(avg)} min`,
      desc: ar ? 'استخدم هذا الرقم لتقدير المهام بشكل أدق' : 'Use this baseline for sharper task estimates'
    });
  }

  // Habit consistency
  const habits = state.habits;
  if (habits.length > 0) {
    const consistencies = habits.map((h) => {
      const last30 = state.habitLogs.filter((l) =>
        l.habitId === h.id && l.status === 'done' &&
        new Date(l.date) >= addDays(new Date(), -30)
      ).length;
      return { name: h.name, percent: Math.round((last30 / 30) * 100) };
    });
    const top = consistencies.reduce((a, b) => (b.percent > (a?.percent || 0) ? b : a), null);
    if (top && top.percent > 0) {
      insights.push({
        icon: 'flame',
        title: ar ? `الأكثر اتساقاً: ${top.name}` : `Most consistent: ${top.name}`,
        desc: ar ? `${top.percent}% من آخر 30 يوم` : `${top.percent}% of last 30 days`
      });
    }
  }

  // Energy correlation
  const vitals = state.vitals;
  if (vitals.length >= 5) {
    const avgEnergy = vitals.reduce((s, v) => s + (v.energy || 0), 0) / vitals.length;
    insights.push({
      icon: 'battery',
      title: ar ? `متوسط طاقتك: ${avgEnergy.toFixed(1)}/5` : `Average energy: ${avgEnergy.toFixed(1)}/5`,
      desc: avgEnergy >= 3.5
        ? (ar ? 'مستويات صحية — استمر' : 'Healthy levels — keep going')
        : (ar ? 'فكّر في النوم والترطيب والمشي اليومي' : 'Consider sleep, hydration, and daily walks')
    });
  }

  if (insights.length === 0) {
    const empty = el('div', { class: 'glass panel', style: { padding: '20px', textAlign: 'center' } });
    empty.innerHTML = `<div class="text-muted text-sm">${ar
      ? 'استخدم النظام أكثر — وستبدأ الأنماط بالظهور هنا'
      : 'Keep using the system — patterns will appear here'}</div>`;
    return empty;
  }

  const grid = el('div', { class: 'col gap-8', style: { marginBottom: '18px' } });
  insights.forEach((i) => {
    const tile = el('div', { class: 'glass panel', style: { padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' } });
    const ic = el('div', { style: { width: '32px', height: '32px', borderRadius: '9px', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent-2)', flexShrink: 0 } });
    ic.innerHTML = icon(i.icon, { size: 16 });
    tile.appendChild(ic);
    const body = el('div', {});
    body.appendChild(el('div', { style: { fontSize: '13.5px', fontWeight: 600 } }, i.title));
    body.appendChild(el('div', { class: 'text-sm text-muted', style: { marginTop: '2px' } }, i.desc));
    tile.appendChild(body);
    grid.appendChild(tile);
  });
  return grid;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
