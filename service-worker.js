// Designer OS — Service Worker (offline-first, network-falling-back-to-cache)
const VERSION = 'abd-saif-v1.1.0';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/db.js',
  './js/store.js',
  './js/cloud.js',
  './js/auth.js',
  './js/i18n.js',
  './js/ui.js',
  './js/utils.js',
  './js/icons.js',
  './js/layout.js',
  './js/pages/dashboard.js',
  './js/pages/clients.js',
  './js/pages/projects.js',
  './js/pages/tasks.js',
  './js/pages/calendar.js',
  './js/pages/invoices.js',
  './js/pages/focus.js',
  './js/pages/goals.js',
  './js/pages/reports.js',
  './js/pages/ideas.js',
  './js/pages/calculator.js',
  './js/pages/settings.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
