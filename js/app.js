// Designer OS — Main entry point
import { loadAll, getState, subscribe } from './store.js';
import { applyLang } from './i18n.js';
import { applyAccent } from './ui.js';
import { buildShell, applyTheme } from './layout.js';
import { registerRoute, setOutlet, start, navigate } from './router.js';
import { initMode } from './modes.js';

// Primary pages (new IA)
import { renderDashboard } from './pages/dashboard.js';
import { renderTasks } from './pages/tasks.js';
import { renderProjects } from './pages/projects.js';
import { renderCalendar } from './pages/calendar.js';
import { renderKnowledge } from './pages/knowledge.js';
import { renderHabits } from './pages/habits.js';
import { renderReviews } from './pages/reviews.js';
import { renderAssistant } from './pages/assistant.js';
import { renderSettings } from './pages/settings.js';

// Legacy pages (still reachable from Knowledge / Settings)
import { renderClients } from './pages/clients.js';
import { renderInvoices } from './pages/invoices.js';
import { renderFocus } from './pages/focus.js';
import { renderGoals } from './pages/goals.js';
import { renderReports } from './pages/reports.js';
import { renderIdeas } from './pages/ideas.js';
import { renderCalculator } from './pages/calculator.js';

async function main() {
  await loadAll();

  applyLang();
  if (getState().accent) applyAccent(getState().accent);
  initMode();

  const { outlet } = buildShell();
  setOutlet(outlet);

  // Primary IA
  registerRoute('/',           (ctx) => renderDashboard(ctx));
  registerRoute('/dashboard',  (ctx) => renderDashboard(ctx));
  registerRoute('/tasks',      (ctx) => renderTasks(ctx));
  registerRoute('/projects',   (ctx) => renderProjects(ctx));
  registerRoute('/calendar',   (ctx) => renderCalendar(ctx));
  registerRoute('/knowledge',  (ctx) => renderKnowledge(ctx));
  registerRoute('/habits',     (ctx) => renderHabits(ctx));
  registerRoute('/reviews',    (ctx) => renderReviews(ctx));
  registerRoute('/assistant',  (ctx) => renderAssistant(ctx));
  registerRoute('/settings',   (ctx) => renderSettings(ctx));

  // Legacy / sub-pages reachable directly
  registerRoute('/clients',    (ctx) => renderClients(ctx));
  registerRoute('/invoices',   (ctx) => renderInvoices(ctx));
  registerRoute('/focus',      (ctx) => renderFocus(ctx));
  registerRoute('/goals',      (ctx) => renderGoals(ctx));
  registerRoute('/reports',    (ctx) => renderReports(ctx));
  registerRoute('/ideas',      (ctx) => renderIdeas(ctx));
  registerRoute('/calculator', (ctx) => renderCalculator(ctx));

  start();

  // Auto-rerender current page on store changes (debounced).
  // Skip when a modal is open or input is focused so we don't break form inputs.
  let rerenderTimer;
  subscribe(() => {
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => {
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot && modalRoot.querySelector('.modal')) return;
      const focused = document.activeElement;
      if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.tagName === 'SELECT')) return;
      const ev = new HashChangeEvent('hashchange');
      window.dispatchEvent(ev);
    }, 120);
  });
}

main().catch((err) => {
  console.error(err);
  document.getElementById('app').innerHTML =
    `<div style="padding: 40px; color: white; font-family: sans-serif;">
       <h1>Failed to load Designer OS</h1>
       <pre>${err.message}\n${err.stack || ''}</pre>
     </div>`;
});
