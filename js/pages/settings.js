// Designer OS — Settings (language, theme, data)
import { el, downloadJSON, pickFile, readFileAsText } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, setLang, fmtNumber } from '../i18n.js';
import { getState, setSetting, refreshAll } from '../store.js';
import { db } from '../db.js';
import { input, field, select, toast, applyAccent, modal, confirmDialog } from '../ui.js';
import { seedSampleData } from '../seed.js';

const ACCENT_COLORS = [
  '#FF6B35', '#FF8A3D', '#F4A261', '#E76F51', '#FF4D6D',
  '#7B2CBF', '#3A86FF', '#06B6D4', '#10B981', '#F59E0B'
];

export async function renderSettings() {
  const root = el('div', {});
  const state = getState();

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('settings'))
    )
  ));

  const grid = el('div', { class: 'col gap-20' });

  // Language
  const langPanel = el('div', { class: 'glass panel' });
  langPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('globe') }),
    el('span', {}, t('language'))
  ]));
  const langButtons = el('div', { class: 'row gap-8 flex-wrap' });
  ['ar', 'en'].forEach((lang) => {
    const active = getLang() === lang;
    langButtons.appendChild(el('button', {
      class: 'btn ' + (active ? 'btn--primary' : ''),
      onClick: () => { setLang(lang); setTimeout(() => location.reload(), 100); }
    }, lang === 'ar' ? 'العربية' : 'English'));
  });
  langPanel.appendChild(langButtons);
  grid.appendChild(langPanel);

  // Appearance
  const appPanel = el('div', { class: 'glass panel' });
  appPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('star') }),
    el('span', {}, t('appearance'))
  ]));
  appPanel.appendChild(el('div', { class: 'field__label', style: { marginBottom: '8px' } }, t('accent_color')));
  const colorRow = el('div', { class: 'row gap-8 flex-wrap' });
  ACCENT_COLORS.forEach((c) => {
    const active = state.accent === c || (!state.accent && c === '#FF6B35');
    colorRow.appendChild(el('button', {
      style: {
        width: '36px', height: '36px',
        borderRadius: '50%',
        background: c,
        border: active ? '3px solid white' : '2px solid var(--border)',
        cursor: 'pointer',
        boxShadow: active ? `0 0 0 3px ${c}66` : 'none'
      },
      onClick: async () => {
        await setSetting('accent', c);
        applyAccent(c);
        renderSettings().then((n) => {
          const ct = document.getElementById('content');
          ct.innerHTML = ''; ct.appendChild(n);
        });
      }
    }));
  });
  appPanel.appendChild(colorRow);
  grid.appendChild(appPanel);

  // Productivity
  const prodPanel = el('div', { class: 'glass panel' });
  prodPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('target') }),
    el('span', {}, t('productivity_settings'))
  ]));
  const focusI = input({ type: 'number', value: state.pomodoroFocus || 25, onchange: async (e) => { await setSetting('pomodoroFocus', parseInt(e.target.value) || 25); toast(t('saved')); } });
  const breakI = input({ type: 'number', value: state.pomodoroBreak || 5, onchange: async (e) => { await setSetting('pomodoroBreak', parseInt(e.target.value) || 5); toast(t('saved')); } });
  const longI = input({ type: 'number', value: state.pomodoroLong || 15, onchange: async (e) => { await setSetting('pomodoroLong', parseInt(e.target.value) || 15); toast(t('saved')); } });
  const rateI = input({ type: 'number', value: state.hourlyRate || 25000, onchange: async (e) => { await setSetting('hourlyRate', parseFloat(e.target.value) || 0); toast(t('saved')); } });
  const curS = select([
    { value: 'IQD', label: 'IQD - دينار عراقي' },
    { value: 'USD', label: 'USD - Dollar' },
    { value: 'SAR', label: 'SAR - ريال' },
    { value: 'EUR', label: 'EUR - Euro' }
  ], { value: state.currency || 'IQD', onchange: async (e) => { await setSetting('currency', e.target.value); toast(t('saved')); } });
  const weekS = select([
    { value: 6, label: t('saturday') },
    { value: 0, label: t('sunday') },
    { value: 1, label: t('monday') }
  ], { value: state.weekStart ?? 6, onchange: async (e) => { await setSetting('weekStart', parseInt(e.target.value)); toast(t('saved')); } });

  prodPanel.appendChild(el('div', { class: 'detail-grid' },
    field(t('focus_duration') + ' (' + t('minutes') + ')', focusI),
    field(t('short_break') + ' (' + t('minutes') + ')', breakI),
    field(t('long_break') + ' (' + t('minutes') + ')', longI),
    field(t('hourly_rate'), rateI),
    field(t('currency'), curS),
    field(t('week_start'), weekS),
  ));
  grid.appendChild(prodPanel);

  // Data
  const dataPanel = el('div', { class: 'glass panel' });
  dataPanel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('database') }),
    el('span', {}, t('data'))
  ]));
  const stats = await db.stats();
  const statsRow = el('div', { class: 'row gap-12 flex-wrap', style: { marginBottom: '14px' } });
  ['clients', 'projects', 'tasks', 'invoices', 'subscriptions', 'ideas', 'goals', 'focusSessions'].forEach((s) => {
    statsRow.appendChild(el('span', { class: 'badge' }, `${t('nav_' + (s === 'subscriptions' ? 'invoices' : s === 'focusSessions' ? 'focus' : s)) || s}: ${stats[s] || 0}`));
  });
  dataPanel.appendChild(statsRow);

  const dataActions = el('div', { class: 'row gap-8 flex-wrap' });
  dataActions.appendChild(el('button', { class: 'btn', onClick: async () => {
    const data = await db.exportAll();
    downloadJSON(data, `designer-os-backup-${new Date().toISOString().slice(0,10)}.json`);
    toast(t('saved'));
  }}, icon('download') + ' ' + t('export_data')));
  dataActions.appendChild(el('button', { class: 'btn', onClick: async () => {
    const file = await pickFile('application/json');
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const payload = JSON.parse(text);
      const ok = await confirmDialog(getLang() === 'ar' ? 'استيراد البيانات سيستبدل الحالية. متابعة؟' : 'Import will replace current data. Continue?');
      if (!ok) return;
      await db.importAll(payload);
      await refreshAll();
      toast(t('saved'));
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      toast(e.message, 'error');
    }
  }}, icon('upload') + ' ' + t('import_data')));
  dataActions.appendChild(el('button', { class: 'btn btn--success', onClick: async () => {
    const ok = await confirmDialog(getLang() === 'ar' ? 'إضافة بيانات تجريبية للاستكشاف؟' : 'Add sample data for exploration?');
    if (!ok) return;
    await seedSampleData();
    await refreshAll();
    toast(t('saved'));
  }}, icon('zap') + ' ' + t('load_sample')));
  dataActions.appendChild(el('button', { class: 'btn btn--danger', onClick: async () => {
    const ok = await confirmDialog(getLang() === 'ar' ? 'حذف كل البيانات نهائياً؟ لا يمكن التراجع.' : 'Delete ALL data permanently? This cannot be undone.');
    if (!ok) return;
    const stores = ['clients', 'projects', 'tasks', 'invoices', 'subscriptions', 'timeLogs', 'goals', 'ideas', 'focusSessions', 'inbox', 'expenses'];
    for (const s of stores) await db.clear(s);
    await refreshAll();
    toast(t('deleted'));
  }}, icon('trash') + ' ' + t('clear_data')));
  dataPanel.appendChild(dataActions);
  grid.appendChild(dataPanel);

  // About
  const about = el('div', { class: 'glass panel' });
  about.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('info') }),
    el('span', {}, t('about'))
  ]));
  about.appendChild(el('div', { class: 'col gap-8' },
    el('div', { class: 'row justify-between' },
      el('span', { class: 'text-muted' }, t('appName')),
      el('span', {}, 'Designer OS')
    ),
    el('div', { class: 'row justify-between' },
      el('span', { class: 'text-muted' }, t('version')),
      el('span', { class: 'font-mono text-sm' }, '1.0.0')
    ),
    el('div', { class: 'text-sm text-muted', style: { marginTop: '8px' } },
      getLang() === 'ar'
        ? 'تطبيق مفتوح المصدر يعمل بشكل كامل على جهازك. بياناتك محفوظة محلياً وتعمل بدون اتصال بالإنترنت. يمكن تصدير البيانات كملف JSON واستيرادها على أي جهاز آخر.'
        : 'Open-source PWA running entirely on your device. Data is stored locally and works offline. Export to JSON to sync between devices.')
  ));
  grid.appendChild(about);

  root.appendChild(grid);
  return root;
}
