// Designer OS — Calendar (month view aggregating tasks, projects deadlines, invoices)
import { el, isSameDay, startOfDay, addDays } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtDate, getLang } from '../i18n.js';
import { getState, sel } from '../store.js';
import { modal, badge } from '../ui.js';
import { navigate } from '../router.js';

let viewDate = new Date();

export async function renderCalendar() {
  const root = el('div', {});
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('calendar')),
      el('div', { class: 'page-header__subtitle' },
        getLang() === 'ar' ? 'كل المواعيد والمهام في مكان واحد' : 'All your deadlines in one place')
    ),
    el('div', { class: 'page-header__actions' },
      el('button', { class: 'btn', onClick: () => { viewDate = new Date(); rebuild(); } }, t('today'))
    )
  ));

  const cal = el('div', { class: 'glass panel' });
  root.appendChild(cal);

  function rebuild() {
    cal.innerHTML = '';
    cal.appendChild(buildHeader());
    cal.appendChild(buildGrid());
    cal.appendChild(buildLegend());
  }

  function buildHeader() {
    const monthName = fmtDate(viewDate, { month: 'long', year: 'numeric' });
    const head = el('div', { class: 'panel__header', style: { marginBottom: '12px' } },
      el('div', { class: 'row gap-8' },
        el('button', { class: 'btn btn--icon btn--ghost', html: icon('chevron_right'), onClick: () => { viewDate.setMonth(viewDate.getMonth() - 1); rebuild(); } }),
        el('h3', { class: 'panel__title', style: { margin: 0 } }, monthName),
        el('button', { class: 'btn btn--icon btn--ghost', html: icon('chevron_left'), onClick: () => { viewDate.setMonth(viewDate.getMonth() + 1); rebuild(); } })
      )
    );
    return head;
  }

  function buildGrid() {
    const wrap = el('div', {});

    // Weekdays
    const weekStart = getState().weekStart || 6; // 0=Sunday, 6=Saturday
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const ordered = [];
    for (let i = 0; i < 7; i++) ordered.push(weekdays[(weekStart + i) % 7]);

    const head = el('div', { class: 'calendar-grid', style: { marginBottom: '6px' } });
    ordered.forEach((d) => head.appendChild(el('div', { class: 'cal-weekday' }, t(d))));
    wrap.appendChild(head);

    // Build 6-week grid
    const grid = el('div', { class: 'calendar-grid' });
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const offset = (firstDay.getDay() - weekStart + 7) % 7;
    const start = new Date(firstDay); start.setDate(1 - offset);

    const today = new Date();
    const tasks = getState().tasks;
    const projects = getState().projects;
    const invoices = getState().invoices;
    const subs = getState().subscriptions;

    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const otherMonth = d.getMonth() !== viewDate.getMonth();
      const isToday = isSameDay(d, today);
      const events = [];

      tasks.forEach((task) => {
        if (task.dueDate && isSameDay(task.dueDate, d) && task.status !== 'done') {
          events.push({ type: 'task', label: task.title, item: task });
        }
      });
      projects.forEach((p) => {
        if (p.dueDate && isSameDay(p.dueDate, d)) {
          events.push({ type: 'project', label: '🎯 ' + p.name, item: p });
        }
      });
      invoices.forEach((inv) => {
        if (inv.dueDate && isSameDay(inv.dueDate, d)) {
          events.push({ type: 'invoice', label: '💰 ' + (inv.invoiceNumber || inv.title || 'Invoice'), item: inv });
        }
      });
      subs.forEach((s) => {
        if (s.nextBillingDate && isSameDay(s.nextBillingDate, d)) {
          events.push({ type: 'invoice', label: '🔁 ' + s.name, item: s });
        }
      });

      const cell = el('div', {
        class: 'cal-cell ' + (otherMonth ? 'other ' : '') + (isToday ? 'today' : ''),
        onClick: () => openDayDetails(d, events)
      },
        el('div', { class: 'cal-cell__day' }, d.getDate()),
        el('div', { class: 'cal-cell__events' },
          ...events.slice(0, 3).map((ev) => el('div', { class: 'cal-event cal-event--' + ev.type }, ev.label)),
          events.length > 3 ? el('div', { class: 'cal-event', style: { background: 'transparent', color: 'var(--text-3)' } }, '+' + (events.length - 3)) : null
        )
      );
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function buildLegend() {
    return el('div', { class: 'row gap-12 flex-wrap', style: { marginTop: '14px', justifyContent: 'center' } },
      el('span', { class: 'badge badge--info' }, t('tasks')),
      el('span', { class: 'badge badge--accent' }, '🎯 ' + t('projects')),
      el('span', { class: 'badge badge--success' }, '💰 ' + t('invoices'))
    );
  }

  rebuild();
  return root;
}

function openDayDetails(date, events) {
  const body = el('div', {});
  if (events.length === 0) {
    body.appendChild(el('p', { class: 'text-muted' },
      getLang() === 'ar' ? 'لا توجد أحداث في هذا اليوم' : 'No events on this day'));
  } else {
    const list = el('div', { class: 'list' });
    events.forEach((ev) => {
      list.appendChild(el('div', { class: 'list__item', onClick: () => {
        m.close();
        if (ev.type === 'task') navigate('/tasks', { id: ev.item.id });
        else if (ev.type === 'project') navigate('/projects', { id: ev.item.id });
        else navigate('/invoices', { id: ev.item.id });
      }},
        el('span', { class: 'dot dot--' + (ev.type === 'task' ? 'info' : ev.type === 'project' ? 'warning' : 'success') }),
        el('div', { class: 'list__item-main' },
          el('div', { class: 'list__item-title' }, ev.label.replace(/^[🎯💰🔁]\s*/, '')),
          el('div', { class: 'list__item-sub' }, t(ev.type))
        )
      ));
    });
    body.appendChild(list);
  }
  const m = modal({ title: fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), body });
}
