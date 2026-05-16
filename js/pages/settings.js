// Designer OS — Settings (v3): AI provider, Notion, Telegram, Prayer, Notifications, Pricing, Data
import { el, downloadJSON, pickFile, readFileAsText } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, setLang, fmtDate } from '../i18n.js';
import { getState, setSetting, refreshAll } from '../store.js';
import { db } from '../db.js';
import { input, field, select, toast, applyAccent, modal, confirmDialog } from '../ui.js';
import { seedSampleData } from '../seed.js';
import { AVAILABLE_MODELS, testConnection as testAi } from '../aiClient.js';
import { PRAYER_METHODS, autoDetectAndRefresh, setLocationByCity, refreshPrayerTimes } from '../prayerTimes.js';
import { permissionStatus, requestPermission, testNotification } from '../notifications.js';
import * as notion from '../integrations/notion.js';
import * as telegram from '../integrations/telegram.js';

const ACCENT_COLORS = [
  '#FF6B35', '#FF8A3D', '#F4A261', '#E76F51', '#FF4D6D',
  '#7B2CBF', '#3A86FF', '#06B6D4', '#10B981', '#F59E0B'
];

export async function renderSettings({ params } = {}) {
  const root = el('div', {});
  const ar = getLang() === 'ar';
  const state = getState();
  const requestedSection = params?.get?.('section');

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('settings'))
    )
  ));

  // Section anchors for deep-linking
  const grid = el('div', { class: 'col gap-20' });
  root.appendChild(grid);

  // Build each section as { id, render } — order matters for tab list
  const sections = [
    { id: 'ai',          render: aiSection },
    { id: 'notion',      render: notionSection },
    { id: 'telegram',    render: telegramSection },
    { id: 'prayer',      render: prayerSection },
    { id: 'notif',       render: notifSection },
    { id: 'pricing',     render: pricingSection },
    { id: 'language',    render: languageSection },
    { id: 'appearance',  render: appearanceSection },
    { id: 'productivity',render: productivitySection },
    { id: 'data',        render: dataSection },
    { id: 'about',       render: aboutSection }
  ];

  // Tab strip
  const tabs = el('div', { class: 'settings-tabs row gap-8 flex-wrap', style: { marginBottom: '14px' } });
  sections.forEach((s) => {
    const btn = el('button', {
      class: 'smart-filter',
      onClick: () => {
        document.getElementById('section-' + s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        tabs.querySelectorAll('.smart-filter').forEach((x) => x.classList.remove('active'));
        btn.classList.add('active');
      }
    }, sectionLabel(s.id));
    tabs.appendChild(btn);
  });
  root.insertBefore(tabs, grid);

  // Render all sections
  for (const s of sections) {
    const wrap = el('div', { id: 'section-' + s.id });
    wrap.appendChild(s.render(state));
    grid.appendChild(wrap);
  }

  // Auto-scroll to requested section
  if (requestedSection) {
    setTimeout(() => {
      const target = document.getElementById('section-' + requestedSection);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  return root;
}

function sectionLabel(id) {
  const map = {
    ai: { ar: 'الذكاء الاصطناعي', en: 'AI' },
    notion: { ar: 'Notion', en: 'Notion' },
    telegram: { ar: 'تليجرام', en: 'Telegram' },
    prayer: { ar: 'الصلاة', en: 'Prayer' },
    notif: { ar: 'التنبيهات', en: 'Notifications' },
    pricing: { ar: 'التسعير', en: 'Pricing' },
    language: { ar: 'اللغة', en: 'Language' },
    appearance: { ar: 'المظهر', en: 'Appearance' },
    productivity: { ar: 'الإنتاجية', en: 'Productivity' },
    data: { ar: 'البيانات', en: 'Data' },
    about: { ar: 'عن التطبيق', en: 'About' }
  };
  const lang = getLang();
  return map[id]?.[lang] || id;
}

function panelHead(iconName, title, subtitle) {
  const head = el('div', { class: 'panel__header', style: { marginBottom: '14px', alignItems: 'flex-start' } });
  const left = el('div', { class: 'col gap-4' });
  const titleRow = el('h3', { class: 'panel__title' });
  titleRow.innerHTML = icon(iconName) + ' ' + title;
  left.appendChild(titleRow);
  if (subtitle) left.appendChild(el('div', { class: 'text-sm text-muted' }, subtitle));
  head.appendChild(left);
  return head;
}

// ============================================================
// AI PROVIDER
// ============================================================
function aiSection(state) {
  const ar = getLang() === 'ar';
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('zap', t('ai_provider_title'), t('ai_provider_subtitle')));

  // Provider toggle
  const providerS = select([
    { value: 'gemini', label: t('ai_provider_gemini') },
    { value: 'openai', label: t('ai_provider_openai') }
  ], { value: state.aiProvider || 'gemini', onchange: async (e) => {
    await setSetting('aiProvider', e.target.value);
    rerender();
  }});

  const isGemini = (state.aiProvider || 'gemini') === 'gemini';
  const keyVal = isGemini ? state.geminiApiKey : state.openaiApiKey;
  const modelVal = isGemini ? (state.geminiModel || 'gemini-2.0-flash') : (state.openaiModel || 'gpt-4o-mini');

  const keyI = input({
    type: 'password',
    value: keyVal || '',
    placeholder: t('ai_api_key_placeholder'),
    onchange: async (e) => {
      const key = e.target.value.trim();
      if (isGemini) await setSetting('geminiApiKey', key);
      else await setSetting('openaiApiKey', key);
      toast(t('ai_key_saved'));
    }
  });

  const modelOptions = AVAILABLE_MODELS[isGemini ? 'gemini' : 'openai'];
  const modelS = select(modelOptions, { value: modelVal, onchange: async (e) => {
    if (isGemini) await setSetting('geminiModel', e.target.value);
    else await setSetting('openaiModel', e.target.value);
    toast(t('saved'));
  }});

  panel.appendChild(field(t('ai_provider'), providerS));
  panel.appendChild(field(t('ai_api_key'), keyI, t('ai_key_security_note')));

  // Get-key link
  const linkRow = el('div', { class: 'row', style: { marginTop: '-8px', marginBottom: '10px' } });
  const linkA = el('a', {
    href: isGemini ? 'https://aistudio.google.com/app/apikey' : 'https://platform.openai.com/api-keys',
    target: '_blank',
    class: 'text-sm text-accent',
    style: { textDecoration: 'underline' }
  }, isGemini ? t('ai_get_gemini_key') + ' →' : t('ai_get_openai_key') + ' →');
  linkRow.appendChild(linkA);
  panel.appendChild(linkRow);

  panel.appendChild(field(t('ai_model'), modelS));

  // Test button
  const testBtn = el('button', { class: 'btn', onClick: async () => {
    testBtn.disabled = true;
    testBtn.innerHTML = icon('refresh') + ' ' + t('ai_thinking');
    const result = await testAi();
    testBtn.disabled = false;
    if (result.ok) {
      testBtn.innerHTML = icon('check') + ' ' + t('ai_test_ok');
      toast(t('ai_test_ok'), 'success');
    } else {
      testBtn.innerHTML = icon('alert') + ' ' + t('ai_test_fail');
      toast(t('ai_test_fail') + ': ' + result.error, 'error', 5000);
    }
  }});
  testBtn.innerHTML = icon('zap') + ' ' + t('ai_test');
  panel.appendChild(testBtn);

  return panel;
}

// ============================================================
// NOTION
// ============================================================
function notionSection(state) {
  const ar = getLang() === 'ar';
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('database', t('notion_title'), t('notion_subtitle')));

  const tokenI = input({
    type: 'password',
    value: state.notionToken || '',
    placeholder: 'secret_...',
    onchange: async (e) => {
      await setSetting('notionToken', e.target.value.trim());
      toast(t('saved'));
    }
  });
  panel.appendChild(field(t('notion_token'), tokenI, t('notion_token_help')));

  const tasksI = input({
    value: state.notionTasksDbId || '',
    placeholder: 'abc123...',
    onchange: async (e) => { await setSetting('notionTasksDbId', e.target.value.trim()); toast(t('saved')); }
  });
  const projectsI = input({
    value: state.notionProjectsDbId || '',
    placeholder: 'abc123...',
    onchange: async (e) => { await setSetting('notionProjectsDbId', e.target.value.trim()); toast(t('saved')); }
  });
  const clientsI = input({
    value: state.notionClientsDbId || '',
    placeholder: 'abc123...',
    onchange: async (e) => { await setSetting('notionClientsDbId', e.target.value.trim()); toast(t('saved')); }
  });

  panel.appendChild(field(t('notion_tasks_db'), tasksI, t('notion_db_help')));
  panel.appendChild(field(t('notion_projects_db'), projectsI));
  panel.appendChild(field(t('notion_clients_db'), clientsI));

  // Auto-sync toggle
  const autoLabel = el('label', { class: 'checkbox', style: { marginBottom: '14px' } });
  const autoChk = el('input', { type: 'checkbox' });
  autoChk.checked = !!state.notionAutoSync;
  autoChk.onchange = async () => { await setSetting('notionAutoSync', autoChk.checked); toast(t('saved')); };
  autoLabel.appendChild(autoChk);
  autoLabel.appendChild(el('span', { class: 'checkbox__box' }));
  autoLabel.appendChild(el('span', {}, t('notion_auto_sync') + ' (' + (ar ? 'كل 15 دقيقة' : 'every 15 min') + ')'));
  panel.appendChild(autoLabel);

  // Action buttons
  const actions = el('div', { class: 'row gap-8 flex-wrap' });

  const testBtn = el('button', { class: 'btn', onClick: async () => {
    testBtn.disabled = true;
    const r = await notion.testConnection();
    testBtn.disabled = false;
    if (r.ok) toast(t('notion_synced') + ' — ' + r.name, 'success');
    else toast(r.error, 'error', 5000);
  }});
  testBtn.innerHTML = icon('zap') + ' ' + t('notion_test');
  actions.appendChild(testBtn);

  const syncBtn = el('button', { class: 'btn btn--primary', onClick: async () => {
    syncBtn.disabled = true;
    syncBtn.innerHTML = icon('refresh') + ' ' + t('notion_syncing');
    try {
      const log = await notion.syncAll();
      const summary = (log.pulled.tasks || 0) + ' tasks, ' + (log.pulled.projects || 0) + ' projects, ' + (log.pulled.clients || 0) + ' clients';
      toast(t('notion_synced') + ': ' + summary, 'success', 5000);
      if (log.errors.length) toast(log.errors[0], 'error', 5000);
    } catch (e) {
      toast(e.message, 'error', 5000);
    }
    syncBtn.disabled = false;
    syncBtn.innerHTML = icon('refresh') + ' ' + t('notion_sync_now');
    rerender();
  }});
  syncBtn.innerHTML = icon('refresh') + ' ' + t('notion_sync_now');
  actions.appendChild(syncBtn);

  panel.appendChild(actions);

  if (state.notionLastSync) {
    panel.appendChild(el('div', { class: 'text-sm text-muted', style: { marginTop: '10px' } },
      t('notion_last_sync') + ': ' + fmtDate(state.notionLastSync, { hour: '2-digit', minute: '2-digit' })
    ));
  }

  // Help block
  const help = el('div', { class: 'glass', style: { padding: '12px', marginTop: '14px', fontSize: '12.5px', lineHeight: 1.6 } });
  help.innerHTML = ar ? `
    <strong>طريقة الإعداد:</strong><br>
    1. اذهب إلى <a class="text-accent" href="https://www.notion.so/my-integrations" target="_blank">notion.so/my-integrations</a> وأنشئ Integration<br>
    2. انسخ الـ "Internal Integration Secret" والصقه في حقل Token أعلاه<br>
    3. افتح صفحة قاعدة بيانات المهام في Notion → Share → Connect إلى الـ integration<br>
    4. انسخ ID قاعدة البيانات من الرابط (الجزء قبل ?v=)<br>
    5. اضغط "اختبر الاتصال" ثم "زامن الآن"
  ` : `
    <strong>Setup:</strong><br>
    1. Visit <a class="text-accent" href="https://www.notion.so/my-integrations" target="_blank">notion.so/my-integrations</a> and create an Integration<br>
    2. Copy the "Internal Integration Secret" → paste in Token above<br>
    3. Open your Tasks DB → Share → Connect to the integration<br>
    4. Copy the DB ID from the URL (the part before ?v=)<br>
    5. Click "Test connection" then "Sync now"
  `;
  panel.appendChild(help);

  return panel;
}

// ============================================================
// TELEGRAM
// ============================================================
function telegramSection(state) {
  const ar = getLang() === 'ar';
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('send', t('telegram_title'), t('telegram_subtitle')));

  const tokenI = input({
    type: 'password',
    value: state.telegramToken || '',
    placeholder: '123456:ABC-DEF...',
    onchange: async (e) => { await setSetting('telegramToken', e.target.value.trim()); toast(t('saved')); }
  });
  panel.appendChild(field(t('telegram_token'), tokenI, t('telegram_token_help')));

  const chatIdI = input({
    value: state.telegramChatId || '',
    placeholder: '123456789',
    onchange: async (e) => { await setSetting('telegramChatId', e.target.value.trim()); toast(t('saved')); }
  });
  panel.appendChild(field(t('telegram_chat_id'), chatIdI, t('telegram_chat_id_help')));

  const actions = el('div', { class: 'row gap-8 flex-wrap' });

  const detectBtn = el('button', { class: 'btn', onClick: async () => {
    detectBtn.disabled = true;
    try {
      const id = await telegram.detectChatId();
      chatIdI.value = String(id);
      toast(t('telegram_detected'), 'success');
    } catch (e) {
      toast(e.message, 'error', 5000);
    }
    detectBtn.disabled = false;
  }});
  detectBtn.innerHTML = icon('search') + ' ' + t('telegram_detect_chat_id');
  actions.appendChild(detectBtn);

  const testBtn = el('button', { class: 'btn btn--primary', onClick: async () => {
    testBtn.disabled = true;
    try {
      await telegram.testSend();
      toast(t('telegram_test_sent'), 'success');
    } catch (e) {
      toast(e.message, 'error', 5000);
    }
    testBtn.disabled = false;
  }});
  testBtn.innerHTML = icon('send') + ' ' + t('telegram_test');
  actions.appendChild(testBtn);

  panel.appendChild(actions);

  // Features list
  const featList = el('div', { class: 'col gap-8', style: { marginTop: '14px' } });
  featList.appendChild(el('div', { class: 'text-sm', style: { fontWeight: 700, marginBottom: '4px' } }, t('telegram_features')));
  [
    t('telegram_feat_capture'),
    t('telegram_feat_voice'),
    t('telegram_feat_report'),
    t('telegram_feat_brief'),
    t('telegram_feat_notify')
  ].forEach((feat) => {
    const row = el('div', { class: 'row gap-8', style: { fontSize: '12.5px' } });
    row.innerHTML = '<span style="color:var(--accent-2)">•</span><span>' + feat + '</span>';
    featList.appendChild(row);
  });
  panel.appendChild(featList);

  // Setup steps
  const help = el('div', { class: 'glass', style: { padding: '12px', marginTop: '14px', fontSize: '12.5px', lineHeight: 1.6 } });
  help.innerHTML = ar ? `
    <strong>${t('telegram_setup_steps')}:</strong><br>
    1. افتح تليجرام → ابحث عن <code>@BotFather</code> → أرسل <code>/newbot</code><br>
    2. اختر اسم وuser-name → احصل على Token → الصقه أعلاه<br>
    3. ابحث عن البوت في تليجرام وأرسل له أي رسالة<br>
    4. اضغط "كشف Chat ID" → سيُملأ تلقائياً<br>
    5. اضغط "أرسل رسالة اختبار" — لازم تصلك في تليجرام
  ` : `
    <strong>Setup steps:</strong><br>
    1. Open Telegram → search <code>@BotFather</code> → send <code>/newbot</code><br>
    2. Pick a name and username → get Token → paste above<br>
    3. Find your new bot in Telegram and send it any message<br>
    4. Click "Detect Chat ID" → auto-fills<br>
    5. Click "Send test message" — you should receive it in Telegram
  `;
  panel.appendChild(help);

  return panel;
}

// ============================================================
// PRAYER
// ============================================================
function prayerSection(state) {
  const ar = getLang() === 'ar';
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('star', t('prayer_settings'), t('prayer_location')));

  const cityI = input({
    value: state.prayerCity || '',
    placeholder: ar ? 'بغداد' : 'Baghdad',
    onchange: async (e) => { await setSetting('prayerCity', e.target.value.trim()); }
  });
  const countryI = input({
    value: state.prayerCountry || '',
    placeholder: ar ? 'العراق' : 'Iraq',
    onchange: async (e) => { await setSetting('prayerCountry', e.target.value.trim()); }
  });

  const cityRow = el('div', { class: 'detail-grid' });
  cityRow.appendChild(field(t('prayer_city'), cityI));
  cityRow.appendChild(field(t('prayer_country'), countryI));
  panel.appendChild(cityRow);

  // Method
  const methodOpts = PRAYER_METHODS.map((m) => ({ value: String(m.value), label: t(m.key) }));
  const methodS = select(methodOpts, {
    value: String(state.prayerMethod || 4),
    onchange: async (e) => {
      await setSetting('prayerMethod', parseInt(e.target.value, 10));
      await refreshPrayerTimes(true);
      rerender();
    }
  });
  panel.appendChild(field(t('prayer_method'), methodS));

  // Buttons
  const actions = el('div', { class: 'row gap-8 flex-wrap' });
  const autoBtn = el('button', { class: 'btn', onClick: async () => {
    autoBtn.disabled = true;
    autoBtn.innerHTML = icon('refresh') + ' ' + t('prayer_locating');
    try {
      const r = await autoDetectAndRefresh();
      if (r) toast(t('saved'), 'success');
      rerender();
    } catch (e) {
      toast(e.message, 'error', 5000);
    }
    autoBtn.disabled = false;
    autoBtn.innerHTML = icon('globe') + ' ' + t('prayer_auto_locate');
  }});
  autoBtn.innerHTML = icon('globe') + ' ' + t('prayer_auto_locate');
  actions.appendChild(autoBtn);

  const applyBtn = el('button', { class: 'btn btn--primary', onClick: async () => {
    if (!cityI.value.trim() || !countryI.value.trim()) { toast(t('required'), 'error'); return; }
    applyBtn.disabled = true;
    try {
      await setLocationByCity(cityI.value.trim(), countryI.value.trim());
      toast(t('saved'), 'success');
      rerender();
    } catch (e) {
      toast(e.message, 'error', 5000);
    }
    applyBtn.disabled = false;
  }});
  applyBtn.innerHTML = icon('check') + ' ' + t('save');
  actions.appendChild(applyBtn);

  panel.appendChild(actions);

  // Display today's times if cached
  if (state.prayerTimes) {
    const tt = state.prayerTimes;
    const grid = el('div', { class: 'row gap-12 flex-wrap', style: { marginTop: '14px' } });
    ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach((name) => {
      const cell = el('div', { class: 'glass', style: { padding: '10px 14px', minWidth: '88px', textAlign: 'center' } });
      cell.innerHTML = `<div class="text-sm text-muted">${t(name.toLowerCase())}</div><div class="text-lg font-mono">${tt[name] || '—'}</div>`;
      grid.appendChild(cell);
    });
    panel.appendChild(grid);
  }

  return panel;
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function notifSection(state) {
  const ar = getLang() === 'ar';
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('bell', t('notif_settings')));

  const status = permissionStatus();
  const statusEl = el('div', { class: 'row gap-8 items-center', style: { marginBottom: '14px' } });
  if (status === 'granted') {
    statusEl.innerHTML = '<span class="dot dot--success"></span><span class="text-sm text-success">' + t('notif_enabled') + '</span>';
  } else if (status === 'denied') {
    statusEl.innerHTML = '<span class="dot dot--danger"></span><span class="text-sm text-danger">' + t('notif_denied') + '</span>';
  } else {
    const requestBtn = el('button', { class: 'btn btn--primary btn--sm', onClick: async () => {
      const r = await requestPermission();
      if (r === 'granted') toast(t('notif_enabled'), 'success');
      rerender();
    }});
    requestBtn.innerHTML = icon('bell') + ' ' + t('notif_request');
    statusEl.appendChild(requestBtn);
  }
  panel.appendChild(statusEl);

  // Toggles
  const toggles = el('div', { class: 'col gap-12' });
  const tg = (key, label) => {
    const wrap = el('label', { class: 'row justify-between items-center', style: { padding: '8px 0' } });
    wrap.appendChild(el('span', { class: 'text-sm' }, label));
    const sw = el('label', { class: 'switch' });
    const cb = el('input', { type: 'checkbox' });
    cb.checked = state[key] !== false;
    cb.onchange = async () => { await setSetting(key, cb.checked); };
    sw.appendChild(cb);
    sw.appendChild(el('span', { class: 'switch__slider' }));
    wrap.appendChild(sw);
    return wrap;
  };
  toggles.appendChild(tg('notifOverdueTasks', t('notif_overdue')));
  toggles.appendChild(tg('notifPrayer', t('notif_prayer_label')));
  toggles.appendChild(tg('notifChallenges', t('notif_challenges_label')));
  panel.appendChild(toggles);

  // Habit reminder time
  const habitTime = input({
    type: 'time',
    value: state.notifHabitReminder || '20:00',
    onchange: async (e) => { await setSetting('notifHabitReminder', e.target.value); toast(t('saved')); }
  });
  panel.appendChild(field(t('notif_habit_time'), habitTime));

  // Test
  const testBtn = el('button', { class: 'btn', style: { marginTop: '8px' }, onClick: () => {
    if (status !== 'granted') {
      toast(t('notif_request'), 'error');
      return;
    }
    testNotification();
  }});
  testBtn.innerHTML = icon('zap') + ' ' + t('notif_test');
  panel.appendChild(testBtn);

  return panel;
}

// ============================================================
// PRICING (per task — no hourly)
// ============================================================
function pricingSection(state) {
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('dollar', t('pricing'), t('pricing_subtitle')));

  panel.appendChild(el('div', { class: 'text-sm text-muted', style: { marginBottom: '14px' } }, t('pricing_note_no_hourly')));

  const taskI = input({
    type: 'number',
    value: state.defaultTaskPrice || 50000,
    onchange: async (e) => { await setSetting('defaultTaskPrice', parseFloat(e.target.value) || 0); toast(t('saved')); }
  });
  const revI = input({
    type: 'number',
    value: state.defaultRevisionPrice || 15000,
    onchange: async (e) => { await setSetting('defaultRevisionPrice', parseFloat(e.target.value) || 0); toast(t('saved')); }
  });
  const grid = el('div', { class: 'detail-grid' });
  grid.appendChild(field(t('default_task_price') + ' (' + state.currency + ')', taskI, t('pricing_per_task')));
  grid.appendChild(field(t('default_revision_price') + ' (' + state.currency + ')', revI, t('pricing_per_revision')));
  panel.appendChild(grid);

  return panel;
}

// ============================================================
// LANGUAGE
// ============================================================
function languageSection(state) {
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('globe', t('language')));
  const buttons = el('div', { class: 'row gap-8 flex-wrap' });
  ['ar', 'en'].forEach((lang) => {
    const active = getLang() === lang;
    buttons.appendChild(el('button', {
      class: 'btn ' + (active ? 'btn--primary' : ''),
      onClick: () => { setLang(lang); setTimeout(() => location.reload(), 100); }
    }, lang === 'ar' ? 'العربية' : 'English'));
  });
  panel.appendChild(buttons);
  return panel;
}

// ============================================================
// APPEARANCE
// ============================================================
function appearanceSection(state) {
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('star', t('appearance')));
  panel.appendChild(el('div', { class: 'field__label', style: { marginBottom: '8px' } }, t('accent_color')));
  const row = el('div', { class: 'row gap-8 flex-wrap' });
  ACCENT_COLORS.forEach((c) => {
    const active = state.accent === c || (!state.accent && c === '#FF6B35');
    row.appendChild(el('button', {
      style: {
        width: '36px', height: '36px', borderRadius: '50%', background: c,
        border: active ? '3px solid white' : '2px solid var(--border)',
        cursor: 'pointer', boxShadow: active ? `0 0 0 3px ${c}66` : 'none'
      },
      onClick: async () => {
        await setSetting('accent', c);
        applyAccent(c);
        rerender();
      }
    }));
  });
  panel.appendChild(row);
  return panel;
}

// ============================================================
// PRODUCTIVITY (Pomodoro + week start + currency)
// ============================================================
function productivitySection(state) {
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('target', t('productivity_settings')));

  const focusI = input({ type: 'number', value: state.pomodoroFocus || 25, onchange: async (e) => { await setSetting('pomodoroFocus', parseInt(e.target.value) || 25); toast(t('saved')); } });
  const breakI = input({ type: 'number', value: state.pomodoroBreak || 5, onchange: async (e) => { await setSetting('pomodoroBreak', parseInt(e.target.value) || 5); toast(t('saved')); } });
  const longI = input({ type: 'number', value: state.pomodoroLong || 15, onchange: async (e) => { await setSetting('pomodoroLong', parseInt(e.target.value) || 15); toast(t('saved')); } });
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

  panel.appendChild(el('div', { class: 'detail-grid' },
    field(t('focus_duration') + ' (' + t('minutes') + ')', focusI),
    field(t('short_break') + ' (' + t('minutes') + ')', breakI),
    field(t('long_break') + ' (' + t('minutes') + ')', longI),
    field(t('currency'), curS),
    field(t('week_start'), weekS),
  ));
  return panel;
}

// ============================================================
// DATA
// ============================================================
function dataSection(state) {
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('database', t('data')));

  // Stats
  const statsRow = el('div', { class: 'row gap-12 flex-wrap', style: { marginBottom: '14px' } });
  db.stats().then((stats) => {
    Object.entries(stats).forEach(([k, v]) => {
      if (v > 0) statsRow.appendChild(el('span', { class: 'badge' }, `${k}: ${v}`));
    });
  });
  panel.appendChild(statsRow);

  // Actions
  const actions = el('div', { class: 'row gap-8 flex-wrap' });

  const exportBtn = el('button', { class: 'btn', onClick: async () => {
    const data = await db.exportAll();
    downloadJSON(data, `designer-os-backup-${new Date().toISOString().slice(0,10)}.json`);
    toast(t('saved'));
  }});
  exportBtn.innerHTML = icon('download') + ' ' + t('export_data');
  actions.appendChild(exportBtn);

  const importBtn = el('button', { class: 'btn', onClick: async () => {
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
  }});
  importBtn.innerHTML = icon('upload') + ' ' + t('import_data');
  actions.appendChild(importBtn);

  const sampleBtn = el('button', { class: 'btn btn--success', onClick: async () => {
    const ok = await confirmDialog(getLang() === 'ar' ? 'إضافة بيانات تجريبية للاستكشاف؟' : 'Add sample data?');
    if (!ok) return;
    await seedSampleData();
    await refreshAll();
    toast(t('saved'));
  }});
  sampleBtn.innerHTML = icon('zap') + ' ' + t('load_sample');
  actions.appendChild(sampleBtn);

  const clearBtn = el('button', { class: 'btn btn--danger', onClick: async () => {
    const ok = await confirmDialog(getLang() === 'ar' ? 'حذف كل البيانات نهائياً؟ لا يمكن التراجع.' : 'Delete ALL data permanently?');
    if (!ok) return;
    await db.clearAll();
    await refreshAll();
    toast(t('deleted'));
  }});
  clearBtn.innerHTML = icon('trash') + ' ' + t('clear_data');
  actions.appendChild(clearBtn);

  panel.appendChild(actions);
  return panel;
}

// ============================================================
// ABOUT
// ============================================================
function aboutSection(state) {
  const panel = el('div', { class: 'glass panel' });
  panel.appendChild(panelHead('info', t('about')));
  panel.appendChild(el('div', { class: 'col gap-8' },
    el('div', { class: 'row justify-between' }, el('span', { class: 'text-muted' }, t('appName')), el('span', {}, 'Designer OS')),
    el('div', { class: 'row justify-between' }, el('span', { class: 'text-muted' }, t('version')), el('span', { class: 'font-mono text-sm' }, '3.0.0')),
    el('div', { class: 'text-sm text-muted', style: { marginTop: '8px' } },
      getLang() === 'ar'
        ? 'تطبيق محلي بالكامل + AI + مزامنة Notion + بوت تليجرام. مفاتيح الـ API محفوظة في جهازك فقط.'
        : 'Fully local app + AI + Notion sync + Telegram bot. API keys stored only on your device.')
  ));
  return panel;
}

// ============================================================
// Re-render helper
// ============================================================
function rerender() {
  // Trigger router to re-render the same page
  const ev = new HashChangeEvent('hashchange');
  window.dispatchEvent(ev);
}
