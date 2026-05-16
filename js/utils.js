// Designer OS — Utility helpers

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    if (c instanceof Node) {
      e.appendChild(c);
    } else if (typeof c === 'string' && c.trimStart().startsWith('<')) {
      // Allow HTML fragments (e.g. icon SVG strings) as positional children
      const tpl = document.createElement('template');
      tpl.innerHTML = c;
      e.appendChild(tpl.content);
    } else {
      e.appendChild(document.createTextNode(String(c)));
    }
  }
  return e;
}

export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFromString(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return `hsl(${Math.abs(h) % 360}, 70%, 60%)`;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
export function endOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(23,59,59,999); return x;
}
export function addDays(d, n) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
export function isSameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}
export function daysBetween(a, b) {
  const ms = endOfDay(b) - startOfDay(a);
  return Math.round(ms / 86400000);
}
export function pad2(n) { return String(n).padStart(2, '0'); }
export function fmtClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${pad2(m)}:${pad2(s)}`;
}
export function fmtDuration(minutes) {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept = 'application/json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files[0]);
    input.click();
  });
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

export function priorityOrder(p) {
  return { high: 0, medium: 1, low: 2 }[p] ?? 3;
}

export function statusOrder(s) {
  return { todo: 0, doing: 1, blocked: 2, done: 3 }[s] ?? 4;
}

// Read URL hash route + query (e.g. #/projects?id=abc)
export function parseHash(hash = location.hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const params = new URLSearchParams(qs || '');
  return { path: path || '/', params };
}
