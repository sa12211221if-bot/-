// Designer OS — Tasks (Daily Planner with smart scheduling + AI breakdown)
import { el, startOfDay, endOfDay, addDays, isSameDay } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtDate, fmtRelative, getLang } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';
import { navigate } from '../router.js';
import { breakdownTask } from '../ai.js';

let activeFilter = 'today'; // today | tomorrow | week | all | overdue | inbox | now | quick | deep

export async function renderTasks({ params }) {
  const root = el('div', {});
  const state = getState();
  const idFromUrl = params?.get && params.get('id');
  const newFlag = params?.get && params.get('new');
  const projectFilter = params?.get && params.get('project');

  // Header
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('daily_planner')),
      el('div', { class: 'page-header__subtitle' }, fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }))
    ),
    el('div', { class: 'page-header__actions' },
      el('button', { class: 'btn btn--primary', onClick: () => openTaskModal(null, projectFilter), html: icon('plus') + ' ' + t('new_task') })
    )
  ));

  // Smart filters (action-oriented chips)
  const v = sel.latestVitals();
  const smartBar = el('div', { class: 'row gap-8 flex-wrap', style: { marginBottom: '12px' } });
  [
    { id: 'now',   label: t('smart_filter_now'),   iconName: 'zap' },
    { id: 'quick', label: t('smart_filter_quick'), iconName: 'flame' },
    { id: 'deep',  label: t('smart_filter_deep'),  iconName: 'target' }
  ].forEach((f) => {
    const btn = el('button', {
      class: 'smart-filter' + (activeFilter === f.id ? ' active' : ''),
      onClick: () => { activeFilter = f.id; render(); refreshActive(); }
    });
    btn.innerHTML = icon(f.iconName, { size: 12 }) + ' ' + f.label;
    smartBar.appendChild(btn);
  });
  root.appendChild(smartBar);

  // Filter tabs
  const filterBar = el('div', { class: 'tabs', style: { marginBottom: '14px' } });
  const overdue = sel.overdueTasks().length;
  [
    { id: 'today',    label: t('today'),    badge: sel.todayTasks().length },
    { id: 'tomorrow', label: t('tomorrow'), badge: tasksForDate(addDays(new Date(), 1)).length },
    { id: 'week',     label: t('this_week'), badge: tasksThisWeek().length },
    { id: 'overdue',  label: t('overdue'),  badge: overdue, danger: true },
    { id: 'all',      label: t('all'),      badge: state.tasks.filter((t) => t.status !== 'done').length },
    { id: 'inbox',    label: t('inbox'),    badge: state.inbox.length }
  ].forEach((f) => {
    const btn = el('button', {
      class: 'tab' + (activeFilter === f.id ? ' active' : ''),
      onClick: () => { activeFilter = f.id; render(); refreshActive(); }
    }, f.label + (f.badge > 0 ? ` · ${f.badge}` : ''));
    filterBar.appendChild(btn);
  });
  root.appendChild(filterBar);

  function refreshActive() {
    smartBar.querySelectorAll('.smart-filter').forEach((b) => {
      const labelText = b.textContent.trim();
      b.classList.toggle('active',
        (activeFilter === 'now'   && labelText.includes(t('smart_filter_now'))) ||
        (activeFilter === 'quick' && labelText.includes(t('smart_filter_quick'))) ||
        (activeFilter === 'deep'  && labelText.includes(t('smart_filter_deep')))
      );
    });
    filterBar.querySelectorAll('.tab').forEach((b) => {
      const text = b.textContent;
      const map = { today: t('today'), tomorrow: t('tomorrow'), week: t('this_week'), overdue: t('overdue'), all: t('all'), inbox: t('inbox') };
      b.classList.toggle('active', text.startsWith(map[activeFilter] || ''));
    });
  }

  // Quick add
  const quickInput = input({ placeholder: t('quick_capture_hint'), style: { fontSize: '14px' } });
  quickInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && quickInput.value.trim()) {
      const dueDate = activeFilter === 'today' ? endOfDay() :
                       activeFilter === 'tomorrow' ? endOfDay(addDays(new Date(), 1)) : null;
      await upsert('tasks', {
        title: quickInput.value.trim(), status: 'todo',
        priority: 'medium', dueDate: dueDate ? dueDate.toISOString() : null,
        projectId: projectFilter || null
      });
      quickInput.value = '';
      toast(t('saved'), 'success');
    }
  });
  root.appendChild(el('div', { class: 'glass panel', style: { padding: '12px', marginBottom: '14px' } },
    el('div', { class: 'row', style: { gap: '10px', alignItems: 'center' } },
      el('span', { html: icon('plus'), style: { color: 'var(--accent-2)' } }),
      quickInput
    )
  ));

  const listBox = el('div', {});
  root.appendChild(listBox);

  function render() {
    listBox.innerHTML = '';
    let tasks = state.tasks;
    if (projectFilter) tasks = tasks.filter((x) => x.projectId === projectFilter);

    if (activeFilter === 'inbox') {
      // Show inbox items
      if (state.inbox.length === 0) {
        listBox.appendChild(el('div', { class: 'glass panel' }, emptyState({
          iconName: 'inbox', title: t('inbox_empty')
        })));
        return;
      }
      const list = el('div', { class: 'glass panel' });
      const inner = el('div', { class: 'list' });
      state.inbox.forEach((it) => {
        inner.appendChild(el('div', { class: 'list__item' },
          el('div', { class: 'list__item-main' },
            el('div', { class: 'list__item-title' }, it.content),
            el('div', { class: 'list__item-sub' }, fmtRelative(it.createdAt))
          ),
          el('div', { class: 'row gap-8' },
            el('button', { class: 'btn btn--sm btn--ghost', title: t('schedule_today'), html: icon('calendar'), onClick: async () => {
              await upsert('tasks', { title: it.content, status: 'todo', priority: 'medium', dueDate: endOfDay().toISOString() });
              await remove('inbox', it.id);
              toast(t('saved'));
            }}),
            el('button', { class: 'btn btn--sm btn--ghost', title: t('delete'), html: icon('x'), onClick: async () => {
              await remove('inbox', it.id);
            }})
          )
        ));
      });
      list.appendChild(inner);
      listBox.appendChild(list);
      return;
    }

    let filtered;
    const now = new Date();
    if (activeFilter === 'today') {
      filtered = tasks.filter((x) => x.dueDate && isSameDay(x.dueDate, now) && x.status !== 'done');
    } else if (activeFilter === 'tomorrow') {
      filtered = tasks.filter((x) => x.dueDate && isSameDay(x.dueDate, addDays(now, 1)) && x.status !== 'done');
    } else if (activeFilter === 'week') {
      const wEnd = endOfDay(addDays(now, 7));
      filtered = tasks.filter((x) => x.dueDate && new Date(x.dueDate) <= wEnd && x.status !== 'done');
    } else if (activeFilter === 'overdue') {
      filtered = sel.overdueTasks();
    } else if (activeFilter === 'now') {
      // Smart: pending tasks matching current energy + small enough to start
      const v = sel.latestVitals();
      const energyLevel = v ? (v.energy >= 4 ? 'high' : v.energy <= 2 ? 'low' : 'medium') : 'medium';
      filtered = tasks.filter((x) => {
        if (x.status === 'done') return false;
        // prefer matching energy or no energy set
        if (x.energy && x.energy !== energyLevel) return false;
        return true;
      }).slice(0, 10);
    } else if (activeFilter === 'quick') {
      filtered = tasks.filter((x) => x.status !== 'done' && (x.estimatedMinutes || 0) > 0 && x.estimatedMinutes <= 15);
    } else if (activeFilter === 'deep') {
      filtered = tasks.filter((x) => x.status !== 'done' && (x.estimatedMinutes || 0) >= 60);
    } else {
      filtered = tasks.filter((x) => x.status !== 'done');
    }

    // Group by date
    const groups = new Map();
    filtered.forEach((task) => {
      const key = task.dueDate ? new Date(task.dueDate).toDateString() : 'no_date';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    });

    if (filtered.length === 0) {
      listBox.appendChild(el('div', { class: 'glass panel' }, emptyState({
        iconName: 'check_circle',
        title: t('no_tasks_today'),
        action: el('button', { class: 'btn btn--primary btn--sm', onClick: () => openTaskModal(null, projectFilter) }, icon('plus') + ' ' + t('new_task'))
      })));
      return;
    }

    // Sort groups by date
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === 'no_date') return 1;
      if (b === 'no_date') return -1;
      return new Date(a) - new Date(b);
    });

    sortedKeys.forEach((key) => {
      const items = groups.get(key);
      // sort by priority then status
      items.sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority));
      const dateLabel = key === 'no_date' ? t('none') :
                        isSameDay(key, now) ? t('today') :
                        isSameDay(key, addDays(now, 1)) ? t('tomorrow') :
                        new Date(key) < startOfDay(now) ? t('overdue') + ' · ' + fmtDate(key) :
                        fmtDate(key, { weekday: 'short', day: '2-digit', month: 'short' });
      const sect = el('div', { class: 'glass panel', style: { marginBottom: '14px' } });
      sect.appendChild(el('div', { class: 'panel__header' },
        el('h3', { class: 'panel__title' },
          el('span', {}, dateLabel)
        ),
        el('span', { class: 'kanban__col-count' }, items.length)
      ));
      const list = el('div', { class: 'list' });
      items.forEach((task) => list.appendChild(taskRow(task)));
      sect.appendChild(list);
      listBox.appendChild(sect);
    });

    // Show completed today
    const completedToday = state.tasks.filter((t) => t.status === 'done' && t.completedAt && isSameDay(t.completedAt, now));
    if (completedToday.length > 0 && activeFilter === 'today') {
      const sect = el('div', { class: 'glass panel', style: { marginBottom: '14px', opacity: 0.7 } });
      sect.appendChild(el('div', { class: 'panel__header' },
        el('h3', { class: 'panel__title' }, [
          el('span', { html: icon('check_circle') }),
          el('span', {}, t('task_status_done'))
        ]),
        el('span', { class: 'kanban__col-count' }, completedToday.length)
      ));
      const list = el('div', { class: 'list' });
      completedToday.forEach((task) => list.appendChild(taskRow(task)));
      sect.appendChild(list);
      listBox.appendChild(sect);
    }
  }
  render();

  if (newFlag) setTimeout(() => openTaskModal(null, projectFilter), 100);
  if (idFromUrl) {
    const task = state.tasks.find((t) => t.id === idFromUrl);
    if (task) setTimeout(() => openTaskModal(task), 100);
  }

  return root;
}

function taskRow(task) {
  const project = sel.projectById(task.projectId);
  const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < startOfDay();
  const subItems = [];
  if (project) subItems.push(el('span', {}, project.name));
  if (task.priority === 'high') subItems.push(badge(t('high'), 'danger'));
  if (task.priority === 'low')  subItems.push(badge(t('low'), 'muted'));
  if (task.energy) {
    const sp = el('span', { class: 'task-chip task-chip--energy-' + task.energy });
    sp.innerHTML = icon('flame', { size: 10 }) + ' ' + t(task.energy);
    subItems.push(sp);
  }
  if (task.context) {
    const sp = el('span', { class: 'task-chip' });
    sp.textContent = t('ctx_' + task.context);
    subItems.push(sp);
  }
  if (task.estimatedMinutes) {
    subItems.push(el('span', { class: 'task-chip' }, `${task.estimatedMinutes}${t('minutes_short')}`));
  }
  return el('div', { class: 'list__item', onClick: (e) => { if (e.target.closest('.checkbox')) return; openTaskModal(task); } },
    el('label', { class: 'checkbox', onClick: async (e) => {
      e.stopPropagation();
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await upsert('tasks', { ...task, status: newStatus, completedAt: newStatus === 'done' ? Date.now() : null });
    }},
      el('input', { type: 'checkbox', checked: task.status === 'done' }),
      el('span', { class: 'checkbox__box' })
    ),
    el('div', { class: 'list__item-main' },
      el('div', { class: 'list__item-title', style: task.status === 'done' ? { textDecoration: 'line-through', opacity: 0.6 } : {} }, task.title),
      el('div', { class: 'list__item-sub', style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
        ...subItems
      )
    ),
    task.dueDate ? el('div', { class: 'list__item-trail', style: { color: overdue ? 'var(--danger)' : '' } }, fmtRelative(task.dueDate)) : null
  );
}

function priorityOrder(p) { return { high: 0, medium: 1, low: 2 }[p] ?? 3; }

function tasksForDate(date) {
  return getState().tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, date) && t.status !== 'done');
}
function tasksThisWeek() {
  const end = endOfDay(addDays(new Date(), 7));
  return getState().tasks.filter((t) => t.dueDate && new Date(t.dueDate) <= end && t.status !== 'done');
}

function openTaskModal(existing, defaultProjectId) {
  const data = existing ? { ...existing } : {
    title: '', description: '', status: 'todo', priority: 'medium',
    projectId: defaultProjectId || '', dueDate: '', estimatedMinutes: '',
    energy: 'medium', context: 'computer'
  };
  const projects = getState().projects;
  const titleI = input({ value: data.title, placeholder: t('task_title') });
  const descI = textarea({ value: data.description || '', placeholder: t('description') });
  const projectS = select([
    { value: '', label: t('no_client') },
    ...projects.map((p) => ({ value: p.id, label: p.name }))
  ], { value: data.projectId || '' });
  const priorityS = select([
    { value: 'high', label: t('high') },
    { value: 'medium', label: t('medium') },
    { value: 'low', label: t('low') }
  ], { value: data.priority || 'medium' });
  const energyS = select([
    { value: 'high', label: t('high') },
    { value: 'medium', label: t('medium') },
    { value: 'low', label: t('low') }
  ], { value: data.energy || 'medium' });
  const contextS = select([
    { value: 'computer', label: t('ctx_computer') },
    { value: 'phone',    label: t('ctx_phone') },
    { value: 'anywhere', label: t('ctx_anywhere') },
    { value: 'errands',  label: t('ctx_errands') }
  ], { value: data.context || 'computer' });
  const statusS = select([
    { value: 'todo', label: t('task_status_todo') },
    { value: 'doing', label: t('task_status_doing') },
    { value: 'blocked', label: t('task_status_blocked') },
    { value: 'done', label: t('task_status_done') }
  ], { value: data.status || 'todo' });
  const dueI = input({ value: data.dueDate ? data.dueDate.slice(0,10) : '', type: 'date' });
  const estI = input({ value: data.estimatedMinutes || '', type: 'number', placeholder: '0' });

  // Optional subtasks list
  const subtasksWrap = el('div', { class: 'col gap-8', style: { marginTop: '8px' } });
  if (data.subtasks && data.subtasks.length) {
    data.subtasks.forEach((s) => {
      subtasksWrap.appendChild(el('div', { class: 'task-chip', style: { padding: '6px 10px' } }, '• ' + s));
    });
  }

  const breakdownBtn = el('button', {
    class: 'btn',
    onClick: () => {
      if (!titleI.value.trim()) { toast(t('required'), 'error'); return; }
      const steps = breakdownTask(titleI.value);
      data.subtasks = steps;
      subtasksWrap.innerHTML = '';
      steps.forEach((s) => {
        subtasksWrap.appendChild(el('div', { class: 'task-chip', style: { padding: '6px 10px' } }, '• ' + s));
      });
      toast(t('saved'), 'success');
    }
  });
  breakdownBtn.innerHTML = icon('zap') + ' ' + t('ai_breakdown');

  const m = modal({
    title: existing ? t('edit') + ' ' + t('task') : t('new_task'),
    body: el('div', {},
      field(t('task_title'), titleI),
      field(t('description') + ' (' + t('optional') + ')', descI),
      el('div', { class: 'detail-grid' },
        field(t('project'), projectS),
        field(t('priority'), priorityS),
      ),
      el('div', { class: 'detail-grid' },
        field(t('energy_required'), energyS),
        field(t('context_label'), contextS),
      ),
      el('div', { class: 'detail-grid' },
        field(t('status'), statusS),
        field(t('due_date'), dueI),
      ),
      field(t('estimate_time') + ' (' + t('minutes') + ')', estI),
      el('div', { style: { marginTop: '4px' } }, breakdownBtn),
      subtasksWrap
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('tasks', existing.id); toast(t('deleted')); m.close(); }
      } }, t('delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        if (!titleI.value.trim()) { toast(t('required'), 'error'); return; }
        const status = statusS.value;
        const payload = {
          ...data,
          title: titleI.value.trim(),
          description: descI.value,
          projectId: projectS.value || null,
          priority: priorityS.value,
          energy: energyS.value,
          context: contextS.value,
          status,
          dueDate: dueI.value || null,
          estimatedMinutes: parseInt(estI.value) || null,
          completedAt: status === 'done' ? (data.completedAt || Date.now()) : null
        };
        await upsert('tasks', payload);
        toast(t('saved'), 'success');
        m.close();
      } }, t('save'))
    ].filter(Boolean)
  });
}
