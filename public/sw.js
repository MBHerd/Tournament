const CACHE_NAME = 'himsog-foundation-v1';
const CACHE_URLS = ['/', '/manifest.webmanifest', '/icons/himsog-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_URLS)));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'QUEUE_SCORE_SUBMISSION') {
    // Future mobile referee screen can persist submissions here during short outages.
  }
});
