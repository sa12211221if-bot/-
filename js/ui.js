// Designer OS — UI primitives: modal, toast, confirm, prompt, drawer
import { el, clear, escapeHTML } from './utils.js';
import { icon } from './icons.js';
import { t } from './i18n.js';

let modalRoot, toastRoot;

function ensureRoots() {
  modalRoot = modalRoot || document.getElementById('modal-root');
  toastRoot = toastRoot || document.getElementById('toast-root');
}

export function toast(message, type = 'success', ms = 3000) {
  ensureRoots();
  const node = el('div', { class: `toast toast--${type}` },
    el('span', { html: icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info', { size: 16 }) }),
    el('span', {}, message)
  );
  toastRoot.appendChild(node);
  setTimeout(() => node.remove(), ms + 200);
}

export function modal({ title, body, footer, onClose, wide }) {
  ensureRoots();
  const close = () => {
    overlay.style.animation = 'fadeIn 200ms ease reverse';
    setTimeout(() => { overlay.remove(); onClose && onClose(); }, 180);
  };
  const overlay = el('div', { class: 'modal', onClick: (e) => { if (e.target === overlay) close(); } },
    el('div', { class: 'modal__panel', style: wide ? { maxWidth: '760px' } : {} })
  );
  const panel = overlay.querySelector('.modal__panel');
  panel.appendChild(el('div', { class: 'modal__header' },
    el('h3', { class: 'modal__title' }, title),
    el('button', { class: 'btn btn--icon btn--ghost', onClick: close, html: icon('x') })
  ));
  const bodyEl = el('div', { class: 'modal__body' });
  panel.appendChild(bodyEl);
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);

  if (footer) {
    const footerEl = el('div', { class: 'modal__footer' });
    if (Array.isArray(footer)) footer.forEach((f) => footerEl.appendChild(f));
    else footerEl.appendChild(footer);
    panel.appendChild(footerEl);
  }

  modalRoot.appendChild(overlay);
  // ESC to close
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  return { close, overlay, panel };
}

export function confirmDialog(message, onConfirm) {
  return new Promise((resolve) => {
    const m = modal({
      title: t('confirm'),
      body: el('p', { class: 'text-muted' }, message || t('confirm_delete')),
      footer: [
        el('button', { class: 'btn', onClick: () => { m.close(); resolve(false); } }, t('cancel')),
        el('button', { class: 'btn btn--danger', onClick: () => { m.close(); onConfirm && onConfirm(); resolve(true); } }, t('confirm'))
      ]
    });
  });
}

export function field(labelText, inputEl, hint) {
  return el('div', { class: 'field' },
    el('label', { class: 'field__label' }, labelText),
    inputEl,
    hint ? el('div', { class: 'field__hint' }, hint) : null
  );
}

export function input(props = {}) {
  return el('input', { class: 'input', ...props });
}
export function textarea(props = {}) {
  return el('textarea', { class: 'textarea', ...props });
}
export function select(options, props = {}) {
  const sel = el('select', { class: 'select', ...props });
  options.forEach((o) => {
    const opt = el('option', { value: o.value }, o.label);
    if (props.value === o.value) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

export function badge(text, variant = '') {
  return el('span', { class: `badge ${variant ? 'badge--' + variant : ''}` }, text);
}

export function emptyState({ iconName = 'inbox', title, hint, action }) {
  return el('div', { class: 'empty' },
    el('div', { class: 'empty__icon', html: icon(iconName, { size: 28 }) }),
    el('div', { class: 'empty__title' }, title || t('nothing_here')),
    hint ? el('div', { class: 'empty__hint' }, hint) : null,
    action ? action : null
  );
}

// Apply accent color from settings
export function applyAccent(hex) {
  if (!hex) return;
  document.documentElement.style.setProperty('--accent', hex);
  // simple variants via hsl-ish: we use rgba derived from hex
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  document.documentElement.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.18)`);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.45)`);
}
