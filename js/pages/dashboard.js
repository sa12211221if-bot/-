// Designer OS — Dashboard
import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtCurrency, fmtNumber, fmtRelative, fmtDate, getLang } from '../i18n.js';
import { getState, sel, upsert, setSetting } from '../store.js';
import { navigate } from '../router.js';
import { initials } from '../utils.js';

export async function renderDashboard() {
  const state = getState();
  const todayTasks = sel.todayTasks();
  const overdue = sel.overdueTasks();
  const upcoming = sel.upcomingTasks(5);
  const activeProjects = sel.activeProjects();
  const revenue = sel.monthRevenue();
  const expenses = sel.monthExpenses();
  const focusMins = sel.focusMinutesToday();
  const streak = sel.streak();

  const hour = new Date().getHours();
  const greeting = hour < 5 ? t('good_evening') : hour < 12 ? t('good_morning') : hour < 18 ? t('good_afternoon') : t('good_evening');

  const root = el('div', {});

  // Hero greeting
  root.appendChild(el('div', { class: 'glass panel reveal', style: { marginBottom: '18px', padding: '24px' } },
    el('div', { class: 'row justify-between flex-wrap', style: { gap: '14px' } },
      el('div', {},
        el('div', { class: 'text-muted text-sm' }, greeting),
        el('h2', { style: { margin: '4px 0 0', fontSize: '24px', fontWeight: 700 } }, t('welcome') + ' 👋'),
        el('p', { class: 'text-muted text-sm', style: { margin: '6px 0 0' } },
          fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        )
      ),
      el('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } },
        el('button', { class: 'btn', onClick: () => navigate('/focus'), html: icon('target') + ' ' + t('focus_mode') }),
        el('button', { class: 'btn btn--primary', onClick: () => navigate('/tasks?new=1'), html: icon('plus') + ' ' + t('new_task') })
      )
    )
  ));

  // Stats grid
  const stats = el('div', { class: 'stats-grid' });

  stats.appendChild(statCard({
    iconName: 'check_circle',
    label: t('today_tasks'),
    value: todayTasks.length,
    delta: overdue.length > 0 ? `${overdue.length} ${t('overdue')}` : null,
    deltaDown: overdue.length > 0,
    onClick: () => navigate('/tasks'),
    accent: false
  }));
  stats.appendChild(statCard({
    iconName: 'briefcase',
    label: t('active_projects'),
    value: activeProjects.length,
    onClick: () => navigate('/projects'),
    accent: false
  }));
  stats.appendChild(statCard({
    iconName: 'dollar',
    label: t('month_revenue'),
    value: fmtCurrency(revenue),
    delta: expenses ? `${t('net_profit')}: ${fmtCurrency(revenue - expenses)}` : null,
    onClick: () => navigate('/reports'),
    accent: true
  }));
  stats.appendChild(statCard({
    iconName: 'clock',
    label: t('focus_today'),
    value: `${fmtNumber(focusMins)} ${t('minutes_short')}`,
    delta: streak > 0 ? `🔥 ${streak} ${t('days')}` : null,
    onClick: () => navigate('/focus')
  }));
  root.appendChild(stats);

  // Two-column area
  const grid = el('div', { class: 'grid-2' });

  // Left column: Today's tasks + Active projects
  const left = el('div', { class: 'col', style: { gap: '18px' } });

  // Today's tasks
  const todayPanel = el('div', { class: 'glass panel' });
  todayPanel.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title' }, [
      el('span', { html: icon('check_circle') }),
      el('span', {}, t('today_tasks'))
    ]),
    el('button', { class: 'btn btn--sm btn--ghost', onClick: () => navigate('/tasks') }, t('all') + ' →')
  ));

  if (todayTasks.length === 0 && overdue.length === 0) {
    todayPanel.appendChild(el('div', { class: 'empty', style: { padding: '24px' } },
      el('div', { class: 'empty__icon', html: icon('check_circle', { size: 28 }) }),
      el('div', { class: 'empty__title' }, t('no_tasks_today')),
    ));
  } else {
    const list = el('div', { class: 'list' });
    [...overdue, ...todayTasks].slice(0, 6).forEach((task) => {
      list.appendChild(taskRow(task));
    });
    todayPanel.appendChild(list);
  }
  left.appendChild(todayPanel);

  // Active projects
  const projectsPanel = el('div', { class: 'glass panel' });
  projectsPanel.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title' }, [
      el('span', { html: icon('briefcase') }),
      el('span', {}, t('active_projects'))
    ]),
    el('button', { class: 'btn btn--sm btn--ghost', onClick: () => navigate('/projects') }, t('all') + ' →')
  ));
  if (activeProjects.length === 0) {
    projectsPanel.appendChild(el('div', { class: 'empty', style: { padding: '20px' } },
      el('div', { class: 'empty__title' }, t('nothing_here')),
      el('button', { class: 'btn btn--primary btn--sm', onClick: () => navigate('/projects?new=1') },
        t('add') + ' ' + t('project'))
    ));
  } else {
    const grid3 = el('div', { class: 'col', style: { gap: '8px' } });
    activeProjects.slice(0, 4).forEach((p) => {
      const client = sel.clientById(p.clientId);
      const tasks = sel.tasksForProject(p.id);
      const doneCount = tasks.filter((t) => t.status === 'done').length;
      const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : (p.progress || 0);
      grid3.appendChild(el('div', { class: 'list__item', onClick: () => navigate('/projects', { id: p.id }) },
        el('div', { class: 'avatar avatar--sm', style: { background: p.color || 'linear-gradient(135deg,var(--accent-2),var(--accent-3))' } }, initials(p.name)),
        el('div', { class: 'list__item-main' },
          el('div', { class: 'list__item-title' }, p.name),
          el('div', { class: 'list__item-sub' }, [
            client ? client.name : t('no_client'),
            p.dueDate ? ' · ' + fmtRelative(p.dueDate) : ''
          ].join(''))
        ),
        el('div', { style: { width: '90px' } },
          el('div', { class: 'progress' },
            el('div', { class: 'progress__fill', style: { width: progress + '%' } })
          ),
          el('div', { class: 'text-sm text-muted text-end', style: { marginTop: '4px' } }, progress + '%')
        )
      ));
    });
    projectsPanel.appendChild(grid3);
  }
  left.appendChild(projectsPanel);

  grid.appendChild(left);

  // Right column: Energy + Smart suggestions + Upcoming
  const right = el('div', { class: 'col', style: { gap: '18px' } });

  // Energy tracker
  const energyPanel = el('div', { class: 'glass panel' });
  energyPanel.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title' }, [
      el('span', { html: icon('battery') }),
      el('span', {}, t('energy_level'))
    ])
  ));
  const todayEnergy = state.energyToday || null;
  const ebtns = el('div', { class: 'energy-buttons' });
  ['low', 'med', 'high'].forEach((lvl) => {
    const b = el('button', {
      class: 'energy-btn' + (todayEnergy === lvl ? ' active' : ''),
      onClick: async () => {
        await setSetting('energyToday', lvl);
        await setSetting('energyTodayDate', new Date().toDateString());
        renderDashboard().then((n) => { document.getElementById('content').innerHTML = ''; document.getElementById('content').appendChild(n); });
      }
    }, t('energy_' + lvl));
    ebtns.appendChild(b);
  });
  energyPanel.appendChild(ebtns);
  energyPanel.appendChild(el('p', { class: 'text-sm text-muted', style: { marginTop: '12px', marginBottom: 0 } },
    todayEnergy === 'high'
      ? '✨ ' + (getLang() === 'ar' ? 'وقت ممتاز للمهام الإبداعية والتصميم العميق' : 'Great time for deep creative work')
      : todayEnergy === 'low'
      ? (getLang() === 'ar' ? '🌱 ركّز على المهام البسيطة مثل الردود والتنظيم' : 'Focus on light tasks like email and organizing')
      : todayEnergy === 'med'
      ? (getLang() === 'ar' ? '⚡ مناسب للمهام المتوسطة والمراجعات' : 'Good for medium tasks and reviews')
      : (getLang() === 'ar' ? 'سجّل مستوى طاقتك للحصول على اقتراحات ذكية' : 'Log your energy to get smart suggestions')
  ));
  right.appendChild(energyPanel);

  // Smart suggestions
  const sugg = el('div', { class: 'glass panel glass-accent' });
  sugg.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title' }, [
      el('span', { html: icon('zap') }),
      el('span', {}, t('smart_suggestions'))
    ])
  ));
  const suggestions = generateSuggestions(state, todayTasks, overdue, activeProjects, todayEnergy);
  if (suggestions.length === 0) {
    sugg.appendChild(el('p', { class: 'text-muted text-sm' },
      getLang() === 'ar' ? 'كل شي تمام! 🎯' : 'All good! 🎯'));
  } else {
    suggestions.slice(0, 4).forEach((s) => {
      sugg.appendChild(el('div', { style: {
        padding: '10px 12px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.04)',
        marginBottom: '6px',
        fontSize: '13px',
        cursor: s.action ? 'pointer' : 'default',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start'
      }, onClick: s.action }, [
        el('span', { html: icon(s.icon || 'zap', { size: 16 }), style: { color: 'var(--accent-2)', flexShrink: 0, marginTop: '2px' } }),
        el('span', {}, s.text)
      ]));
    });
  }
  right.appendChild(sugg);

  // Upcoming
  const upcomingPanel = el('div', { class: 'glass panel' });
  upcomingPanel.appendChild(el('div', { class: 'panel__header' },
    el('h3', { class: 'panel__title' }, [
      el('span', { html: icon('calendar') }),
      el('span', {}, t('upcoming'))
    ])
  ));
  if (upcoming.length === 0) {
    upcomingPanel.appendChild(el('p', { class: 'text-muted text-sm' }, t('nothing_here')));
  } else {
    const list = el('div', { class: 'list' });
    upcoming.forEach((task) => list.appendChild(taskRow(task, true)));
    upcomingPanel.appendChild(list);
  }
  right.appendChild(upcomingPanel);

  grid.appendChild(right);
  root.appendChild(grid);
  return root;
}

function statCard({ iconName, label, value, delta, deltaDown, onClick, accent }) {
  return el('div', { class: 'glass stat ' + (accent ? 'stat--accent' : ''), onClick, style: { cursor: onClick ? 'pointer' : 'default' } },
    el('div', { class: 'stat__icon', html: icon(iconName, { size: 18 }) }),
    el('div', { class: 'stat__label' }, label),
    el('div', { class: 'stat__value' }, value),
    delta ? el('div', { class: 'stat__delta ' + (deltaDown ? 'stat__delta--down' : '') }, delta) : null
  );
}

function taskRow(task, withDate) {
  const project = sel.projectById(task.projectId);
  const overdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());
  return el('div', { class: 'list__item', onClick: () => navigate('/tasks', { id: task.id }) },
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
      el('div', { class: 'list__item-sub' },
        (project ? project.name : '') +
        (task.priority && task.priority !== 'medium' ? ' · ' + t(task.priority) : '')
      )
    ),
    task.dueDate ? el('div', { class: 'list__item-trail', style: { color: overdue ? 'var(--danger)' : '' } },
      withDate ? fmtDate(task.dueDate) : fmtRelative(task.dueDate)) : null
  );
}

function generateSuggestions(state, todayTasks, overdue, activeProjects, energy) {
  const out = [];
  const lang = getLang();

  if (overdue.length > 0) {
    out.push({
      icon: 'alert',
      text: lang === 'ar'
        ? `لديك ${overdue.length} مهام متأخرة — أعد جدولتها أو أنجزها أولاً`
        : `You have ${overdue.length} overdue tasks — reschedule or finish them first`,
      action: () => navigate('/tasks')
    });
  }

  if (todayTasks.length === 0 && activeProjects.length > 0) {
    out.push({
      icon: 'calendar',
      text: lang === 'ar'
        ? 'لا توجد مهام لليوم — جدوِل بعض المهام من مشاريعك النشطة'
        : 'No tasks today — schedule some from your active projects',
      action: () => navigate('/projects')
    });
  }

  // Subscriptions due soon
  const soonSubs = (state.subscriptions || []).filter((s) => {
    if (!s.nextBillingDate) return false;
    const days = (new Date(s.nextBillingDate) - Date.now()) / 86400000;
    return days >= 0 && days <= 7;
  });
  if (soonSubs.length > 0) {
    out.push({
      icon: 'receipt',
      text: lang === 'ar'
        ? `${soonSubs.length} اشتراك قادم خلال أسبوع`
        : `${soonSubs.length} subscription(s) due in a week`,
      action: () => navigate('/invoices')
    });
  }

  // Unpaid invoices
  const unpaid = (state.invoices || []).filter((i) => i.status === 'sent' || i.status === 'overdue').length;
  if (unpaid > 0) {
    out.push({
      icon: 'dollar',
      text: lang === 'ar'
        ? `${unpaid} فاتورة غير مدفوعة — تابع مع العملاء`
        : `${unpaid} unpaid invoice(s) — follow up with clients`,
      action: () => navigate('/invoices')
    });
  }

  // Energy-based
  if (energy === 'high' && activeProjects.length > 0) {
    out.push({
      icon: 'flame',
      text: lang === 'ar'
        ? 'طاقتك عالية — ابدأ جلسة تركيز عميق على مشروعك الأهم'
        : 'High energy — start a deep focus session on your top project',
      action: () => navigate('/focus')
    });
  }
  if (energy === 'low') {
    out.push({
      icon: 'inbox',
      text: lang === 'ar'
        ? 'طاقة منخفضة — راجع صندوق الالتقاط أو رتّب الفواتير'
        : 'Low energy — review inbox or organize invoices'
    });
  }

  // Inbox has items
  if ((state.inbox || []).length > 0) {
    out.push({
      icon: 'inbox',
      text: lang === 'ar'
        ? `${state.inbox.length} عنصر في صندوق الالتقاط بانتظار التصنيف`
        : `${state.inbox.length} item(s) in inbox awaiting triage`
    });
  }

  return out;
}
