const CACHE_NAME = 'wind-training-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './icons/web-app-manifest-192x192.png',
  './icons/web-app-manifest-512x512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(clients.claim());
});

self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then(hit => hit || fetch(evt.request).then(resp => {
      return caches.open(CACHE_NAME).then(cache => { cache.put(evt.request, resp.clone()); return resp; });
    }))
  );
});
