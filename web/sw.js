const CACHE = 'busgrammar-static-ielts-v2';
const FILES = ['./grammar.html', './ielts.css', './ielts-data.js', './ielts-core.js', './ielts.js', './', './index.html', './styles.css', './app.js', './lessons.js', './theory.js', './b1-lessons.js', './b1-theory.js', './b2-lessons.js', './b2-theory.js', './c1-lessons.js', './c1-theory.js', './vocabulary.js', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('busgrammar-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()).then(async () => {
    for (const client of await self.clients.matchAll()) client.postMessage('OFFLINE_READY');
  }));
});
self.addEventListener('message', event => {
  if (event.data === 'CHECK_CACHE') event.waitUntil(caches.open(CACHE).then(cache => cache.match('./index.html')).then(file => { if (file) event.source?.postMessage('OFFLINE_READY'); }));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    return cached || fetch(event.request);
  }));
});
