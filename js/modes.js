// Designer OS — Modes Engine
// A "mode" is a contextual UI state the system adapts to.
// Modes change accent color, sidebar density, and surface different content.
//
// Implementation: a single `data-mode` attribute on <html>.
// CSS rules in styles.css reshape the UI based on this attribute.

import { setMode, getState } from './store.js';
import { t } from './i18n.js';
import { toast } from './ui.js';

export const MODES = {
  normal: {
    id: 'normal',
    nameKey: 'mode_normal',
    descKey: 'mode_normal',
    accent: '#FF6B35',
    accent2: '#FF8A3D',
    accent3: '#FF5722',
    icon: 'home',
    sidebar: 'expanded'
  },
  deep: {
    id: 'deep',
    nameKey: 'mode_deep',
    descKey: 'mode_deep_desc',
    accent: '#FF6B35',
    accent2: '#FF8A3D',
    accent3: '#FF5722',
    icon: 'target',
    sidebar: 'collapsed',
    surfaces: { hideStats: true, hideClient: false }
  },
  creative: {
    id: 'creative',
    nameKey: 'mode_creative',
    descKey: 'mode_creative_desc',
    accent: '#A855F7',
    accent2: '#C084FC',
    accent3: '#9333EA',
    icon: 'bulb',
    sidebar: 'expanded',
    surfaces: { showResources: true }
  },
  islamic: {
    id: 'islamic',
    nameKey: 'mode_islamic',
    descKey: 'mode_islamic_desc',
    accent: '#0D9488',
    accent2: '#14B8A6',
    accent3: '#0F766E',
    icon: 'star',
    sidebar: 'expanded',
    surfaces: { showSpiritual: true }
  },
  recovery: {
    id: 'recovery',
    nameKey: 'mode_recovery',
    descKey: 'mode_recovery_desc',
    accent: '#10B981',
    accent2: '#34D399',
    accent3: '#059669',
    icon: 'battery',
    sidebar: 'expanded',
    surfaces: { dimUI: true, hideUrgent: true }
  }
};

export const MODE_LIST = Object.values(MODES);

/**
 * Apply mode to DOM and persist.
 */
export async function activateMode(modeId) {
  const m = MODES[modeId] || MODES.normal;
  document.documentElement.dataset.mode = m.id;
  // Apply accent variables from mode
  const root = document.documentElement;
  root.style.setProperty('--accent', m.accent);
  root.style.setProperty('--accent-2', m.accent2);
  root.style.setProperty('--accent-3', m.accent3);
  // soft + glow
  const r = parseInt(m.accent.slice(1, 3), 16);
  const g = parseInt(m.accent.slice(3, 5), 16);
  const b = parseInt(m.accent.slice(5, 7), 16);
  root.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.18)`);
  root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.45)`);
  await setMode(m.id);
  return m;
}

/**
 * Initialize mode from persisted state on app boot.
 * Called once after loadAll().
 */
export function initMode() {
  const cur = getState().mode || 'normal';
  // Don't await — fire and forget; styles apply synchronously
  activateMode(cur);
}

/**
 * Cycle to the next mode (used by keyboard shortcut M).
 */
export async function cycleMode() {
  const ids = MODE_LIST.map((m) => m.id);
  const cur = getState().mode || 'normal';
  const next = ids[(ids.indexOf(cur) + 1) % ids.length];
  const m = await activateMode(next);
  toast(t(m.nameKey), 'success', 1500);
  return m;
}

/**
 * Get the human label for a mode.
 */
export function modeLabel(modeId) {
  const m = MODES[modeId] || MODES.normal;
  return t(m.nameKey);
}

/**
 * Get current mode object.
 */
export function currentMode() {
  return MODES[getState().mode] || MODES.normal;
}
