const CACHE = 'busgrammar-static-v3';
const FILES = ['./', './index.html', './styles.css', './app.js', './lessons.js', './theory.js', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './manifest.webmanifest', './grammar-source.pdf'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('busgrammar-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()).then(async () => {
    for (const client of await self.clients.matchAll()) client.postMessage('OFFLINE_READY');
  }));
});
self.addEventListener('message', event => {
  if (event.data === 'CHECK_CACHE') event.waitUntil(caches.open(CACHE).then(cache => cache.match('./grammar-source.pdf')).then(file => { if (file) event.source?.postMessage('OFFLINE_READY'); }));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request);
    // PDF viewers request byte ranges. Return a valid partial response offline too.
    if (cached && event.request.headers.has('range')) {
      const bytes = await cached.arrayBuffer(), range = /^bytes=(\d*)-(\d*)$/.exec(event.request.headers.get('range'));
      if (!range) return cached;
      const start = range[1] ? Number(range[1]) : Math.max(0, bytes.byteLength - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), bytes.byteLength - 1) : bytes.byteLength - 1;
      if (start > end || start >= bytes.byteLength) return new Response(null, {status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
      return new Response(bytes.slice(start,end+1), {status:206,headers:{'Content-Type':'application/pdf','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Accept-Ranges':'bytes'}});
    }
    return cached || fetch(event.request);
  }));
});
