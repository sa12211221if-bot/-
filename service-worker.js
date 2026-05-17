// Designer OS — Service Worker v1.2.0
// Strategy: Cache First for assets, Network First for navigation
const VERSION = 'abd-saif-v2.0.0';

const PRECACHE = [
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
  './js/seed.js',
  './js/modes.js',
  './js/ai.js',
  './js/capture.js',
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
  './js/pages/habits.js',
  './js/pages/reviews.js',
  './js/pages/knowledge.js',
  './js/pages/assistant.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Install: precache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.log('SW precache partial fail:', err);
        self.skipWaiting();
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Cache First for known assets, Network First for navigation
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  // Only handle same-origin
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navigation requests (HTML pages) — Network First with cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // All other assets — Cache First with network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // For JS/CSS files, try the index as last resort
        if (req.url.endsWith('.html')) {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
