// Designer OS — Habits page (heatmap + streaks + categories)
import { el, addDays, isSameDay } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtDate, getLang } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';
import { uid } from '../db.js';

const CATEGORIES = ['health', 'mind', 'work', 'spirit', 'relationship'];
let activeCategory = 'all';

export async function renderHabits() {
  const state = getState();
  const root = el('div', { class: 'reveal' });

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('habits')),
      el('div', { class: 'page-header__subtitle' }, t('habits_subtitle'))
    ),
    el('div', { class: 'page-header__actions' },
      (() => {
        const b = el('button', { class: 'btn btn--primary', onClick: () => openHabitModal() });
        b.innerHTML = icon('plus') + ' ' + t('new_habit');
        return b;
      })()
    )
  ));

  // Overview strip
  const habitsTotal = state.habits.length;
  if (habitsTotal === 0) {
    root.appendChild(el('div', { class: 'glass panel' }, emptyState({
      iconName: 'flame',
      title: t('nothing_here'),
      hint: getLang() === 'ar'
        ? 'ابدأ بعادة واحدة فقط — مثل: "5 دقائق قراءة يومياً"'
        : 'Start with just one habit — e.g. "Read 5 minutes daily"',
      action: (() => {
        const b = el('button', { class: 'btn btn--primary', onClick: () => openHabitModal() });
        b.innerHTML = icon('plus') + ' ' + t('new_habit');
        return b;
      })()
    })));
    return root;
  }

  // Stats summary
  const doneToday = sel.habitsDoneToday();
  const streaks = state.habits.map((h) => sel.habitStreak(h.id));
  const longestStreak = streaks.reduce((a, b) => Math.max(a, b), 0);

  const stats = el('div', { class: 'stats-grid', style: { marginBottom: '14px' } });
  stats.appendChild(statCard('flame', t('habit_today'), `${doneToday}/${habitsTotal}`, true));
  stats.appendChild(statCard('trending', t('habit_streak'), longestStreak + ' ' + t('days')));
  stats.appendChild(statCard('check_circle', t('habits'), habitsTotal));
  root.appendChild(stats);

  // Category filter
  const tabs = el('div', { class: 'tabs', style: { marginBottom: '14px', flexWrap: 'wrap' } });
  ['all', ...CATEGORIES].forEach((c) => {
    const btn = el('button', {
      class: 'tab' + (activeCategory === c ? ' active' : ''),
      onClick: () => { activeCategory = c; render(); tabs.querySelectorAll('.tab').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); }
    }, c === 'all' ? t('all') : t('cat_' + c));
    tabs.appendChild(btn);
  });
  root.appendChild(tabs);

  // List wrapper
  const list = el('div', {});
  root.appendChild(list);

  function render() {
    list.innerHTML = '';
    const filtered = activeCategory === 'all'
      ? state.habits
      : state.habits.filter((h) => (h.category || 'work') === activeCategory);
    if (filtered.length === 0) {
      list.appendChild(el('p', { class: 'text-muted text-sm', style: { padding: '20px', textAlign: 'center' } }, t('nothing_here')));
      return;
    }
    filtered.forEach((h) => list.appendChild(habitRow(h)));
  }
  render();

  return root;
}

function statCard(iconName, label, value, accent) {
  const card = el('div', { class: 'glass stat ' + (accent ? 'stat--accent' : '') });
  card.appendChild((() => { const s = el('div', { class: 'stat__icon' }); s.innerHTML = icon(iconName, { size: 18 }); return s; })());
  card.appendChild(el('div', { class: 'stat__label' }, label));
  card.appendChild(el('div', { class: 'stat__value' }, String(value)));
  return card;
}

function habitRow(habit) {
  const streak = sel.habitStreak(habit.id);
  const doneToday = sel.habitDoneToday(habit.id);
  const row = el('div', { class: 'habit-row' });

  // Head
  const head = el('div', { class: 'habit-row__head' });
  const titleBox = el('div', { class: 'col gap-4' });
  titleBox.appendChild(el('div', { class: 'habit-row__title' }, habit.name));
  titleBox.appendChild(el('div', { class: 'habit-row__cat' }, t('cat_' + (habit.category || 'work'))));
  head.appendChild(titleBox);

  const meta = el('div', { class: 'row gap-12 items-center' });
  if (streak > 0) {
    const streakEl = el('span', { class: 'habit-row__streak' });
    streakEl.innerHTML = '🔥 ' + streak + ' ' + t('days');
    meta.appendChild(streakEl);
  }
  const editBtn = el('button', { class: 'btn btn--icon btn--ghost', title: t('edit'), onClick: () => openHabitModal(habit) });
  editBtn.innerHTML = icon('edit', { size: 14 });
  meta.appendChild(editBtn);
  head.appendChild(meta);
  row.appendChild(head);

  // Heatmap (last 30 days)
  const grid = el('div', { class: 'habit-grid' });
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const day = addDays(today, -i);
    const log = getState().habitLogs.find((l) => l.habitId === habit.id && isSameDay(l.date, day) && l.status === 'done');
    const cell = el('div', {
      class: 'habit-cell' + (log ? ' filled' : '') + (i === 0 ? ' today' : ''),
      title: fmtDate(day, { day: '2-digit', month: 'short' }) + (log ? ' ✓' : ''),
      onClick: async () => { await toggleHabitDay(habit, day); }
    });
    grid.appendChild(cell);
  }
  row.appendChild(grid);

  // Actions
  const actions = el('div', { class: 'habit-row__actions' });
  const doneBtn = el('button', {
    class: 'btn btn--sm ' + (doneToday ? 'btn--success' : 'btn--primary'),
    onClick: async () => { await toggleHabitDay(habit, today); }
  });
  doneBtn.innerHTML = (doneToday ? icon('check', { size: 14 }) : icon('plus', { size: 14 })) + ' ' + (doneToday ? t('habit_done') : t('habit_today'));
  actions.appendChild(doneBtn);

  const skipBtn = el('button', {
    class: 'btn btn--sm btn--ghost',
    onClick: async () => {
      const existing = getState().habitLogs.find((l) => l.habitId === habit.id && isSameDay(l.date, today));
      if (existing) await remove('habitLogs', existing.id);
      await upsert('habitLogs', { id: uid(), habitId: habit.id, date: today.toISOString(), status: 'skipped' });
      toast(t('saved'), 'success');
    }
  });
  skipBtn.innerHTML = icon('x', { size: 14 }) + ' ' + t('habit_skip');
  actions.appendChild(skipBtn);

  row.appendChild(actions);
  return row;
}

async function toggleHabitDay(habit, day) {
  const existing = getState().habitLogs.find((l) => l.habitId === habit.id && isSameDay(l.date, day));
  if (existing && existing.status === 'done') {
    await remove('habitLogs', existing.id);
  } else {
    if (existing) await remove('habitLogs', existing.id);
    await upsert('habitLogs', { id: uid(), habitId: habit.id, date: day.toISOString(), status: 'done' });
    toast(t('saved'), 'success', 1200);
  }
}

function openHabitModal(existing) {
  const data = existing ? { ...existing } : {
    name: '',
    category: 'health',
    frequency: 'daily',
    description: ''
  };
  const nameI = input({ value: data.name, placeholder: t('habit_name') });
  const catS = select(CATEGORIES.map((c) => ({ value: c, label: t('cat_' + c) })), { value: data.category });
  const freqS = select([
    { value: 'daily',  label: t('freq_daily') },
    { value: 'weekly', label: t('freq_weekly') }
  ], { value: data.frequency });
  const descI = textarea({ value: data.description || '', placeholder: getLang() === 'ar' ? 'لماذا هذه العادة مهمة؟' : 'Why does this habit matter?' });

  const m = modal({
    title: existing ? t('edit') + ' ' + t('habits') : t('new_habit'),
    body: el('div', {},
      field(t('habit_name'), nameI),
      el('div', { class: 'detail-grid' },
        field(t('habit_category'), catS),
        field(t('habit_frequency'), freqS)
      ),
      field(t('description') + ' (' + t('optional') + ')', descI)
    ),
    footer: [
      existing ? (() => {
        const b = el('button', { class: 'btn btn--danger', onClick: async () => {
          const ok = await confirmDialog(t('confirm_delete'));
          if (ok) {
            await remove('habits', existing.id);
            // also remove its logs
            for (const log of getState().habitLogs.filter((l) => l.habitId === existing.id)) {
              await remove('habitLogs', log.id);
            }
            toast(t('deleted'));
            m.close();
          }
        }});
        b.textContent = t('delete');
        return b;
      })() : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      (() => {
        const b = el('button', { class: 'btn btn--primary', onClick: async () => {
          if (!nameI.value.trim()) { toast(t('required'), 'error'); return; }
          await upsert('habits', {
            ...data,
            name: nameI.value.trim(),
            category: catS.value,
            frequency: freqS.value,
            description: descI.value
          });
          toast(t('saved'));
          m.close();
        }});
        b.textContent = t('save');
        return b;
      })()
    ].filter(Boolean)
  });
}
