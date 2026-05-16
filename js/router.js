// Designer OS — Hash router (no deps)
import { parseHash } from './utils.js';

const routes = new Map();
let outlet = null;
let onChange = null;

export function registerRoute(path, render) {
  routes.set(path, render);
}

export function setOutlet(node) { outlet = node; }
export function onRouteChange(cb) { onChange = cb; }

export function navigate(path, params) {
  let hash = '#' + (path.startsWith('/') ? path : '/' + path);
  if (params) {
    const q = new URLSearchParams(params).toString();
    if (q) hash += '?' + q;
  }
  if (location.hash === hash) {
    handle();
  } else {
    location.hash = hash;
  }
}

export function currentRoute() {
  return parseHash();
}

async function handle() {
  if (!outlet) return;
  const { path, params } = parseHash();
  let key = path;
  let render = routes.get(key);
  if (!render) {
    // try parent
    const parts = path.split('/').filter(Boolean);
    while (parts.length && !render) {
      parts.pop();
      key = '/' + parts.join('/');
      render = routes.get(key || '/');
    }
  }
  outlet.scrollTo?.(0, 0);
  outlet.innerHTML = '';
  if (render) {
    try {
      const result = await render({ params, path });
      if (result instanceof Node) outlet.appendChild(result);
      else if (typeof result === 'string') outlet.innerHTML = result;
    } catch (e) {
      console.error(e);
      outlet.innerHTML = `<div class="glass panel"><h3 class="panel__title">Error</h3><pre>${e.message}</pre></div>`;
    }
  } else {
    outlet.innerHTML = `<div class="glass panel"><h3 class="panel__title">404</h3><p class="text-muted">Page not found.</p></div>`;
  }
  onChange && onChange({ path, params });
}

export function start() {
  window.addEventListener('hashchange', handle);
  handle();
}
