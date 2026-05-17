// Modes engine — disabled (kept as no-op shim for backward compat with imports).
// User feedback: modes were a distraction without a clear functional benefit.
// All exports are kept so layout.js / app.js / settings.js don't break.

import { t } from './i18n.js';

const STUB = {
  id: 'normal',
  nameKey: 'mode_normal',
  descKey: 'mode_normal',
  icon: 'home',
  accent: 'var(--accent)',
  accent2: 'var(--accent-2)',
  accent3: 'var(--accent-3)'
};

export const MODES = { normal: STUB };
export const MODE_LIST = [STUB];

export async function activateMode() { return STUB; }
export function initMode() {
  // Always normal — strip any persisted mode dataset on boot.
  document.documentElement.removeAttribute('data-mode');
}
export async function cycleMode() { return STUB; }
export function modeLabel() { return t('mode_normal'); }
export function currentMode() { return STUB; }
