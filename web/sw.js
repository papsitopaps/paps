// Offline cache for Prozimi.
const CACHE = 'prozimi-v2';
const FILES = [
  './', 'index.html', 'styles.css', 'app.js', 'engine.js', 'glossary.js', 'leopard.js', 'bakelog.js', 'planner.js', 'recipes.js', 'presets.js', 'i18n.js', 'importer.js', 'locales/el.js', 'locales/es.js', 'locales/ja.js', 'manifest.webmanifest',
  'favicon.ico', 'apple-touch-icon.png', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first, so a new version shows up on the next load; the cache is the offline fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    try {
      const res = await fetch(e.request, { cache: 'no-cache' });
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch {
      return (await cache.match(e.request, { ignoreSearch: true })) || Response.error();
    }
  }));
});
