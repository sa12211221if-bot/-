// Designer OS — Projects (Kanban + List + Calendar views)
import { el, initials, colorFromString, daysBetween } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtCurrency, fmtDate, fmtRelative, getLang } from '../i18n.js';
import { getState, sel, upsert, remove } from '../store.js';
import { modal, toast, input, textarea, field, select, badge, emptyState, confirmDialog } from '../ui.js';
import { navigate } from '../router.js';

const STATUSES = ['idea', 'active', 'in_progress', 'review', 'done'];

let currentView = 'kanban';

/**
 * Compute project health.
 * Inputs: progress vs deadline, overdue tasks, days since last activity.
 * Returns: { level: 'good'|'warning'|'critical', score: 0-100, reasons: [] }
 */
function projectHealth(project) {
  const tasks = sel.tasksForProject(project.id);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const progress = total ? done / total : (project.progress || 0) / 100;

  const reasons = [];
  let score = 80;

  // Deadline pressure
  if (project.dueDate) {
    const daysToDue = (new Date(project.dueDate) - Date.now()) / 86400000;
    if (daysToDue < 0 && project.status !== 'done') {
      score -= 40;
      reasons.push(getLang() === 'ar' ? 'تجاوز الموعد النهائي' : 'Deadline passed');
    } else if (daysToDue < 3 && progress < 0.7) {
      score -= 25;
      reasons.push(getLang() === 'ar' ? 'الموعد قريب والتقدّم متأخر' : 'Deadline near, progress low');
    } else if (daysToDue < 7 && progress < 0.5) {
      score -= 10;
      reasons.push(getLang() === 'ar' ? 'يحتاج اهتمام' : 'Needs attention');
    }
  }

  // Overdue tasks
  if (overdue > 0) {
    score -= overdue * 8;
    reasons.push(getLang() === 'ar' ? `${overdue} مهام متأخرة` : `${overdue} overdue task${overdue > 1 ? 's' : ''}`);
  }

  // Stagnation: days since last activity (any task update or time log)
  const taskActivity = tasks.map((t) => t.updatedAt || 0).reduce((a, b) => Math.max(a, b), 0);
  const projectActivity = project.updatedAt || project.createdAt || 0;
  const lastActivity = Math.max(taskActivity, projectActivity);
  const daysSince = lastActivity ? Math.floor((Date.now() - lastActivity) / 86400000) : 0;
  if (daysSince > 14 && project.status !== 'done' && project.status !== 'archived') {
    score -= 15;
    reasons.push(getLang() === 'ar' ? `لا نشاط منذ ${daysSince} يوم` : `No activity for ${daysSince}d`);
  }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? 'good' : score >= 40 ? 'warning' : 'critical';
  return { level, score, reasons, daysSince, overdue, progress: Math.round(progress * 100) };
}

export async function renderProjects({ params }) {
  const root = el('div', {});
  const state = getState();
  const idFromUrl = params?.get && params.get('id');
  const newFlag = params?.get && params.get('new');

  // Header
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('projects')),
      el('div', { class: 'page-header__subtitle' }, `${state.projects.length} ${t('project')}`)
    ),
    el('div', { class: 'page-header__actions' },
      buildViewTabs(),
      el('button', { class: 'btn btn--primary', onClick: () => openProjectModal(), html: icon('plus') + ' ' + t('new_project') })
    )
  ));

  if (state.projects.length === 0) {
    root.appendChild(el('div', { class: 'glass panel' },
      emptyState({
        iconName: 'briefcase',
        title: t('nothing_here'),
        hint: t('create_first') + ' ' + t('project').toLowerCase(),
        action: el('button', { class: 'btn btn--primary', onClick: () => openProjectModal() }, icon('plus') + ' ' + t('new_project'))
      })
    ));
    return root;
  }

  const viewBox = el('div', {});
  root.appendChild(viewBox);
  renderView(viewBox);

  if (newFlag) setTimeout(() => openProjectModal(), 100);
  if (idFromUrl) {
    const p = sel.projectById(idFromUrl);
    if (p) setTimeout(() => openProjectDetails(p), 100);
  }

  function buildViewTabs() {
    const tabs = el('div', { class: 'tabs' });
    [
      { id: 'kanban',  label: t('view_kanban'),  iconName: 'layers' },
      { id: 'list',    label: t('view_list'),    iconName: 'list' },
      { id: 'calendar',label: t('view_calendar'),iconName: 'calendar' }
    ].forEach((v) => {
      const btn = el('button', {
        class: 'tab' + (currentView === v.id ? ' active' : ''),
        onClick: () => { currentView = v.id; tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active')); btn.classList.add('active'); renderView(viewBox); }
      }, [
        el('span', { html: icon(v.iconName, { size: 14 }) }),
        v.label
      ]);
      tabs.appendChild(btn);
    });
    return tabs;
  }

  return root;
}

function renderView(viewBox) {
  viewBox.innerHTML = '';
  const projects = getState().projects.filter((p) => p.status !== 'archived' && p.status !== 'cancelled');
  if (currentView === 'kanban') viewBox.appendChild(renderKanban(projects));
  else if (currentView === 'list') viewBox.appendChild(renderList(projects));
  else viewBox.appendChild(renderTimeline(projects));
}

function renderKanban(projects) {
  const wrap = el('div', { class: 'kanban' });
  STATUSES.forEach((status) => {
    const col = el('div', { class: 'kanban__col glass' });
    const items = projects.filter((p) => p.status === status);
    col.appendChild(el('div', { class: 'kanban__col-header' },
      el('div', { class: 'kanban__col-title' },
        el('span', { class: 'dot ' + statusDotClass(status) }),
        el('span', {}, t('project_status_' + status))
      ),
      el('span', { class: 'kanban__col-count' }, items.length)
    ));
    const cards = el('div', { class: 'kanban__cards' });
    items.forEach((p) => cards.appendChild(kanbanCard(p)));
    col.appendChild(cards);

    // Drag and drop targets
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const project = sel.projectById(id);
      if (project && project.status !== status) {
        await upsert('projects', { ...project, status });
        toast(t('saved'), 'success');
      }
    });

    wrap.appendChild(col);
  });
  return wrap;
}

function kanbanCard(project) {
  const client = sel.clientById(project.clientId);
  const tasks = sel.tasksForProject(project.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : (project.progress || 0);
  const dueClass = project.dueDate && new Date(project.dueDate) < new Date() ? 'badge--danger' :
                   project.dueDate && daysBetween(new Date(), project.dueDate) <= 3 ? 'badge--warning' : '';
  const health = projectHealth(project);

  const card = el('div', {
    class: 'kanban__card',
    draggable: true,
    onClick: () => openProjectDetails(project),
    ondragstart: (e) => { e.dataTransfer.setData('text/plain', project.id); card.classList.add('dragging'); },
    ondragend: () => card.classList.remove('dragging')
  });

  const healthPill = el('span', { class: 'health-pill health-pill--' + health.level, title: health.reasons.join(', ') });
  healthPill.innerHTML = `<span class="dot dot--${health.level === 'good' ? 'success' : health.level === 'warning' ? 'warning' : 'danger'}"></span>${t('health_' + health.level)}`;

  const titleRow = el('div', { class: 'row justify-between items-center', style: { marginBottom: '6px', gap: '8px' } });
  titleRow.appendChild(el('div', { style: { fontWeight: 600, flex: 1, minWidth: 0 }, class: 'truncate' }, project.name));
  titleRow.appendChild(healthPill);
  card.appendChild(titleRow);

  if (client) card.appendChild(el('div', { class: 'text-sm text-muted', style: { marginBottom: '8px' } }, client.name));

  if (progress > 0 || tasks.length) {
    card.appendChild(el('div', { style: { marginBottom: '8px' } },
      el('div', { class: 'progress' },
        el('div', { class: 'progress__fill', style: { width: progress + '%' } })
      ),
      el('div', { class: 'text-sm text-muted', style: { marginTop: '4px' } }, `${done}/${tasks.length} · ${progress}%`)
    ));
  }

  card.appendChild(el('div', { class: 'row gap-8 flex-wrap' },
    project.dueDate ? badge(fmtRelative(project.dueDate), dueClass.replace('badge--', '')) : null,
    project.budget ? badge(fmtCurrency(project.budget), 'accent') : null,
    project.priority ? badge(t(project.priority), project.priority === 'high' ? 'danger' : 'muted') : null
  ));
  return card;
}

function renderList(projects) {
  if (projects.length === 0) return emptyState({ title: t('nothing_here') });
  const list = el('div', { class: 'glass panel', style: { padding: '8px' } });
  const inner = el('div', { class: 'list' });
  projects.sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return da - db;
  });
  projects.forEach((p) => {
    const client = sel.clientById(p.clientId);
    const tasks = sel.tasksForProject(p.id);
    const done = tasks.filter((t) => t.status === 'done').length;
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : (p.progress || 0);
    inner.appendChild(el('div', { class: 'list__item', onClick: () => openProjectDetails(p) },
      el('div', { class: 'avatar avatar--sm', style: { background: p.color || colorFromString(p.name) } }, initials(p.name)),
      el('div', { class: 'list__item-main' },
        el('div', { class: 'list__item-title' }, p.name),
        el('div', { class: 'list__item-sub' }, [client?.name || t('no_client'), t('project_status_' + (p.status || 'active'))].join(' · '))
      ),
      el('div', { style: { width: '120px' } },
        el('div', { class: 'progress' }, el('div', { class: 'progress__fill', style: { width: progress + '%' } })),
        el('div', { class: 'text-sm text-muted text-end' }, progress + '%')
      ),
      el('div', { class: 'list__item-trail' }, p.dueDate ? fmtDate(p.dueDate) : '—')
    ));
  });
  list.appendChild(inner);
  return list;
}

function renderTimeline(projects) {
  const wrap = el('div', { class: 'glass panel' });
  wrap.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '16px' } }, t('view_calendar') + ' / Timeline'));
  if (projects.length === 0) {
    wrap.appendChild(emptyState({ title: t('nothing_here') }));
    return wrap;
  }
  const sorted = [...projects].filter((p) => p.dueDate).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  const noDate = projects.filter((p) => !p.dueDate);
  const list = el('div', { class: 'col gap-12' });
  sorted.forEach((p) => list.appendChild(timelineRow(p)));
  if (noDate.length) {
    list.appendChild(el('div', { class: 'text-muted text-sm', style: { marginTop: '14px' } }, t('none')));
    noDate.forEach((p) => list.appendChild(timelineRow(p)));
  }
  wrap.appendChild(list);
  return wrap;
}

function timelineRow(p) {
  const client = sel.clientById(p.clientId);
  const days = p.dueDate ? daysBetween(new Date(), p.dueDate) : null;
  const danger = days !== null && days < 0;
  const warn = days !== null && days >= 0 && days <= 3;
  return el('div', { class: 'list__item', onClick: () => openProjectDetails(p) },
    el('div', { style: { width: '60px', textAlign: 'center' } },
      el('div', { style: { fontSize: '20px', fontWeight: 700, color: danger ? 'var(--danger)' : warn ? 'var(--warning)' : 'var(--accent-2)' } },
        days === null ? '—' : (Math.abs(days) + (getLang() === 'ar' ? 'ي' : 'd'))
      ),
      el('div', { class: 'text-sm text-muted' }, p.dueDate ? fmtDate(p.dueDate, { day: '2-digit', month: 'short' }) : '')
    ),
    el('div', { class: 'list__item-main' },
      el('div', { class: 'list__item-title' }, p.name),
      el('div', { class: 'list__item-sub' }, (client?.name || t('no_client')) + ' · ' + t('project_status_' + (p.status || 'active')))
    ),
    p.budget ? badge(fmtCurrency(p.budget), 'accent') : null
  );
}

function statusDotClass(s) {
  return ({
    idea: 'dot--muted', active: 'dot--info', in_progress: '', review: 'dot--warning', done: 'dot--success'
  })[s] || 'dot--muted';
}

function openProjectModal(existing) {
  const data = existing ? { ...existing } : {
    name: '', clientId: '', type: '', status: 'active', priority: 'medium',
    brief: '', budget: '', estimatedHours: '', dueDate: '', startDate: ''
  };
  const clients = getState().clients;
  const nameI = input({ value: data.name, placeholder: t('project_name') });
  const clientS = select([
    { value: '', label: t('no_client') },
    ...clients.map((c) => ({ value: c.id, label: c.name }))
  ], { value: data.clientId || '' });
  const typeI = input({ value: data.type || '', placeholder: 'Logo / Branding / Social...' });
  const statusS = select(STATUSES.map((s) => ({ value: s, label: t('project_status_' + s) })), { value: data.status });
  const priorityS = select([
    { value: 'high', label: t('high') },
    { value: 'medium', label: t('medium') },
    { value: 'low', label: t('low') }
  ], { value: data.priority || 'medium' });
  const briefT = textarea({ value: data.brief || '', placeholder: t('project_brief') });
  const budgetI = input({ value: data.budget || '', type: 'number', placeholder: '0' });
  const hoursI = input({ value: data.estimatedHours || '', type: 'number', placeholder: '0' });
  const startI = input({ value: data.startDate ? data.startDate.slice(0,10) : '', type: 'date' });
  const dueI = input({ value: data.dueDate ? data.dueDate.slice(0,10) : '', type: 'date' });

  const m = modal({
    title: existing ? t('edit') + ' ' + t('project') : t('new_project'),
    wide: true,
    body: el('div', {},
      field(t('project_name'), nameI),
      el('div', { class: 'detail-grid' },
        field(t('client'), clientS),
        field(t('project_type'), typeI),
      ),
      el('div', { class: 'detail-grid' },
        field(t('status'), statusS),
        field(t('priority'), priorityS),
      ),
      el('div', { class: 'detail-grid' },
        field(t('start_date'), startI),
        field(t('deadline'), dueI),
      ),
      el('div', { class: 'detail-grid' },
        field(t('budget') + ' (' + (getState().currency) + ')', budgetI),
        field(t('estimated_hours'), hoursI),
      ),
      field(t('project_brief'), briefT)
    ),
    footer: [
      existing ? el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('projects', existing.id); toast(t('deleted')); m.close(); }
      } }, t('delete')) : null,
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        if (!nameI.value.trim()) { toast(t('required'), 'error'); return; }
        const payload = {
          ...data,
          name: nameI.value.trim(),
          clientId: clientS.value || null,
          type: typeI.value.trim(),
          status: statusS.value,
          priority: priorityS.value,
          brief: briefT.value,
          budget: parseFloat(budgetI.value) || 0,
          estimatedHours: parseFloat(hoursI.value) || 0,
          startDate: startI.value || null,
          dueDate: dueI.value || null
        };
        await upsert('projects', payload);
        toast(t('saved'), 'success');
        m.close();
      } }, t('save'))
    ].filter(Boolean)
  });
}

function openProjectDetails(project) {
  const client = sel.clientById(project.clientId);
  const tasks = sel.tasksForProject(project.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : (project.progress || 0);
  const timeLogs = getState().timeLogs.filter((l) => l.projectId === project.id);
  const totalMinutes = timeLogs.reduce((s, l) => s + (l.duration || 0), 0);
  const health = projectHealth(project);

  const healthCard = el('div', {
    class: 'glass',
    style: {
      padding: '14px',
      marginBottom: '14px',
      borderColor: health.level === 'critical' ? 'rgba(239,68,68,0.3)' : health.level === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'
    }
  });
  healthCard.innerHTML = `
    <div class="row justify-between items-center" style="margin-bottom:8px;">
      <div class="row gap-8 items-center">
        <span class="dot dot--${health.level === 'good' ? 'success' : health.level === 'warning' ? 'warning' : 'danger'}"></span>
        <span style="font-weight:700;font-size:14px;">${t('project_health')}: ${t('health_' + health.level)}</span>
      </div>
      <span class="text-sm text-accent" style="font-variant-numeric:tabular-nums;">${health.score}/100</span>
    </div>
    ${health.reasons.length ? `<div class="text-sm text-muted">${health.reasons.join(' · ')}</div>` : `<div class="text-sm text-muted">${getLang() === 'ar' ? 'كل المؤشرات سليمة' : 'All indicators healthy'}</div>`}
    ${health.daysSince > 0 ? `<div class="text-sm text-muted" style="margin-top:6px;">${t('last_activity')}: ${health.daysSince} ${getLang() === 'ar' ? 'يوم' : 'd'} ${t('days_since')}</div>` : ''}
  `;

  const body = el('div', {},
    el('div', { class: 'row', style: { gap: '14px', marginBottom: '14px' } },
      el('div', { class: 'avatar avatar--lg', style: { background: project.color || colorFromString(project.name) } }, initials(project.name)),
      el('div', { class: 'flex-1' },
        el('div', { class: 'text-xl' }, project.name),
        el('div', { class: 'text-muted text-sm', style: { marginBottom: '6px' } },
          (client ? client.name : t('no_client')) + (project.type ? ' · ' + project.type : '')),
        el('div', { class: 'row gap-8 flex-wrap' },
          badge(t('project_status_' + project.status), project.status === 'done' ? 'success' : project.status === 'review' ? 'warning' : 'accent'),
          project.priority && project.priority !== 'medium' ? badge(t(project.priority), project.priority === 'high' ? 'danger' : 'muted') : null,
          project.dueDate ? badge(fmtDate(project.dueDate)) : null
        )
      )
    ),
    healthCard,
    el('div', { class: 'detail-grid', style: { marginBottom: '14px' } },
      el('div', { class: 'glass', style: { padding: '14px' } },
        el('div', { class: 'text-muted text-sm' }, t('progress')),
        el('div', { class: 'progress', style: { marginTop: '8px', marginBottom: '6px' } },
          el('div', { class: 'progress__fill', style: { width: progress + '%' } })
        ),
        el('div', { class: 'text-sm' }, `${done}/${tasks.length} ${t('tasks')} · ${progress}%`)
      ),
      el('div', { class: 'glass', style: { padding: '14px' } },
        el('div', { class: 'text-muted text-sm' }, t('budget') + ' · ' + t('estimated_hours')),
        el('div', { class: 'text-lg', style: { marginTop: '6px' } },
          (project.budget ? fmtCurrency(project.budget) : '—') + ' · ' + (project.estimatedHours || 0) + 'h'),
        el('div', { class: 'text-sm text-muted' }, `${t('spent_hours')}: ${(totalMinutes/60).toFixed(1)}h`)
      )
    ),
    project.brief ? el('div', { class: 'glass', style: { padding: '14px', marginBottom: '14px' } },
      el('div', { class: 'text-muted text-sm', style: { marginBottom: '6px' } }, t('project_brief')),
      el('div', { style: { whiteSpace: 'pre-wrap' } }, project.brief)
    ) : null,
    el('div', { class: 'panel__header' },
      el('h4', { class: 'panel__title' }, t('tasks') + ` (${tasks.length})`),
      el('button', { class: 'btn btn--sm', onClick: () => { m.close(); navigate('/tasks', { project: project.id, new: 1 }); } },
        icon('plus') + ' ' + t('add'))
    ),
    tasks.length === 0
      ? el('p', { class: 'text-muted text-sm' }, t('nothing_here'))
      : el('div', { class: 'list' },
        ...tasks.slice(0, 8).map((task) => el('div', { class: 'list__item' },
          el('label', { class: 'checkbox', onClick: async (e) => {
            e.stopPropagation();
            const newStatus = task.status === 'done' ? 'todo' : 'done';
            await upsert('tasks', { ...task, status: newStatus, completedAt: newStatus === 'done' ? Date.now() : null });
          }},
            el('input', { type: 'checkbox', checked: task.status === 'done' }),
            el('span', { class: 'checkbox__box' })
          ),
          el('div', { class: 'list__item-main' },
            el('div', { class: 'list__item-title', style: task.status === 'done' ? { textDecoration: 'line-through', opacity: 0.6 } : {} }, task.title)
          ),
          task.dueDate ? el('div', { class: 'list__item-trail' }, fmtRelative(task.dueDate)) : null
        ))
      )
  );

  const m = modal({
    title: project.name,
    body, wide: true,
    footer: [
      el('button', { class: 'btn', onClick: () => { m.close(); navigate('/focus', { project: project.id }); } }, icon('target') + ' ' + t('focus_mode')),
      el('button', { class: 'btn btn--danger', onClick: async () => {
        const ok = await confirmDialog(t('confirm_delete'));
        if (ok) { await remove('projects', project.id); toast(t('deleted')); m.close(); }
      } }, icon('trash') + ' ' + t('delete')),
      el('button', { class: 'btn btn--primary', onClick: () => { m.close(); openProjectModal(project); } }, icon('edit') + ' ' + t('edit'))
    ]
  });
}
