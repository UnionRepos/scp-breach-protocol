const CACHE_NAME = 'breach-protocol-v1';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest',
  './style.css?v=336674f8c0eb', './audio.js?v=29d7cee8ad7f', './game.js?v=813e0fd681fc', './pwa.js',
  './icon.svg', './icons/icon-192.svg', './icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response.ok && new URL(request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => cached || caches.match('./index.html'));
    return cached || network;
  }));
});
