// Designer OS — Multi-modal Quick Capture
// Bottom sheet on mobile, centered modal on desktop. Opens in <100ms.
// Captures: text, voice (Web Speech), image (file → IndexedDB blob), link.
// Everything lands in Knowledge/inbox as a single store with category='inbox'.

import { el } from './utils.js';
import { icon } from './icons.js';
import { t, getLang } from './i18n.js';
import { upsert } from './store.js';
import { toast, modal } from './ui.js';

let currentTab = 'text';

/**
 * Open the Quick Capture sheet. Returns a promise that resolves when closed.
 */
export function openCapture(initial = {}) {
  currentTab = initial.tab || 'text';
  const ar = getLang() === 'ar';

  // Tabs
  const tabs = el('div', { class: 'capture-tabs' });
  const tabDefs = [
    { id: 'text', label: t('capture_text'), iconName: 'edit' },
    { id: 'link', label: t('capture_link'), iconName: 'link' },
    { id: 'voice', label: t('capture_voice'), iconName: 'phone' },
    { id: 'image', label: t('capture_image'), iconName: 'folder' }
  ];
  const tabBtns = {};
  const renderTabs = () => {
    tabs.innerHTML = '';
    tabDefs.forEach((td) => {
      const btn = el('button', {
        class: 'capture-tab' + (currentTab === td.id ? ' active' : ''),
        onClick: () => { currentTab = td.id; renderBody(); renderTabs(); }
      });
      btn.innerHTML = icon(td.iconName, { size: 16 }) + ' ' + td.label;
      tabBtns[td.id] = btn;
      tabs.appendChild(btn);
    });
  };

  // Inputs
  const textArea = el('textarea', {
    class: 'capture-textarea',
    placeholder: t('capture_hint'),
    autofocus: true
  });
  const linkInput = el('input', {
    class: 'input',
    type: 'url',
    placeholder: 'https://...'
  });
  const linkTitle = el('input', {
    class: 'input',
    type: 'text',
    placeholder: ar ? 'العنوان (اختياري)' : 'Title (optional)'
  });
  const voiceStatus = el('div', { class: 'capture-voice-status' });
  const voiceTranscript = el('textarea', {
    class: 'capture-textarea',
    placeholder: ar ? 'النص المُتعرَّف عليه...' : 'Recognized text...'
  });
  const fileInput = el('input', {
    type: 'file',
    accept: 'image/*',
    style: { display: 'none' }
  });
  const filePreview = el('div', { class: 'capture-file-preview' });
  let imageBlob = null;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    imageBlob = f;
    filePreview.innerHTML = '';
    const url = URL.createObjectURL(f);
    const img = el('img', { src: url, style: { maxWidth: '100%', maxHeight: '240px', borderRadius: '12px' } });
    filePreview.appendChild(img);
    filePreview.appendChild(el('div', { class: 'text-sm text-muted', style: { marginTop: '6px' } }, f.name));
  });

  let recognition = null;
  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      voiceStatus.textContent = t('voice_unavailable');
      return;
    }
    recognition = new SR();
    recognition.lang = ar ? 'ar-SA' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    voiceStatus.innerHTML = '<span class="dot dot--success" style="animation:pulse 1s infinite"></span> ' + t('voice_listening');
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      voiceTranscript.value = transcript;
    };
    recognition.onerror = () => { voiceStatus.textContent = t('voice_unavailable'); };
    recognition.onend = () => { if (voiceStatus.textContent.includes(t('voice_listening'))) voiceStatus.textContent = ''; };
    try { recognition.start(); } catch (e) {}
  }
  function stopVoice() {
    if (recognition) { try { recognition.stop(); } catch (e) {} recognition = null; }
    voiceStatus.textContent = '';
  }

  // Body container — re-renders per tab
  const body = el('div', { class: 'capture-body' });
  function renderBody() {
    body.innerHTML = '';
    stopVoice();
    if (currentTab === 'text') {
      body.appendChild(textArea);
      setTimeout(() => textArea.focus(), 50);
    } else if (currentTab === 'link') {
      body.appendChild(linkInput);
      body.appendChild(el('div', { style: { height: '8px' } }));
      body.appendChild(linkTitle);
      setTimeout(() => linkInput.focus(), 50);
    } else if (currentTab === 'voice') {
      body.appendChild(voiceStatus);
      body.appendChild(voiceTranscript);
      const ctrl = el('div', { class: 'row gap-8', style: { marginTop: '10px' } });
      const startBtn = el('button', { class: 'btn btn--primary', onClick: startVoice });
      startBtn.innerHTML = icon('phone') + ' ' + (ar ? 'ابدأ التسجيل' : 'Start');
      const stopBtn = el('button', { class: 'btn', onClick: stopVoice });
      stopBtn.innerHTML = icon('stop') + ' ' + (ar ? 'إيقاف' : 'Stop');
      ctrl.appendChild(startBtn); ctrl.appendChild(stopBtn);
      body.appendChild(ctrl);
    } else if (currentTab === 'image') {
      const dropZone = el('div', {
        class: 'capture-drop',
        onClick: () => fileInput.click()
      });
      dropZone.innerHTML = `
        <div style="text-align:center; padding:24px;">
          ${icon('upload', { size: 32 })}
          <div style="margin-top:8px; font-weight:600;">${ar ? 'اسحب صورة هنا أو اضغط للاختيار' : 'Drop image here or click to pick'}</div>
          <div class="text-sm text-muted" style="margin-top:4px;">${ar ? 'PNG, JPG, WebP' : 'PNG, JPG, WebP'}</div>
        </div>
      `;
      body.appendChild(dropZone);
      body.appendChild(filePreview);
      body.appendChild(fileInput);
    }
  }

  // Save
  async function save() {
    let payload = null;
    if (currentTab === 'text') {
      const text = textArea.value.trim();
      if (!text) { toast(ar ? 'اكتب شيئاً أولاً' : 'Type something first', 'error'); return; }
      payload = { type: 'note', content: text };
    } else if (currentTab === 'link') {
      const url = linkInput.value.trim();
      if (!url) { toast(ar ? 'أدخل رابطاً' : 'Enter a URL', 'error'); return; }
      payload = { type: 'link', url, title: linkTitle.value.trim() || url };
    } else if (currentTab === 'voice') {
      const text = voiceTranscript.value.trim();
      if (!text) { toast(ar ? 'لا يوجد نص' : 'No text captured', 'error'); return; }
      payload = { type: 'voice', content: text };
    } else if (currentTab === 'image') {
      if (!imageBlob) { toast(ar ? 'اختر صورة' : 'Pick an image', 'error'); return; }
      // Convert to base64 for portable storage
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(imageBlob);
      });
      payload = { type: 'image', dataUrl, filename: imageBlob.name };
    }
    payload.category = 'inbox';
    payload.createdAt = Date.now();
    await upsert('knowledge', payload);
    // Also mirror text-like to inbox table for backward compat
    if (payload.type === 'note' || payload.type === 'voice') {
      await upsert('inbox', { content: payload.content, type: payload.type });
    }
    stopVoice();
    toast(t('saved'), 'success');
    m.close();
  }

  // Build modal
  const m = modal({
    title: t('capture'),
    body: el('div', { class: 'capture-sheet' }, tabs, body),
    onClose: stopVoice,
    footer: [
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: save }, icon('check') + ' ' + t('save'))
    ]
  });

  renderTabs();
  renderBody();

  // Keyboard: Cmd+Enter to save
  m.panel.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });

  return m;
}

/**
 * Setup global Cmd/Ctrl+K hotkey.
 */
export function bindCaptureHotkey() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      // Don't trigger when user is typing in an input
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      openCapture();
    }
  });
}
