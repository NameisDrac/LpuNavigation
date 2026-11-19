const VERSION = '84cc453489';
const STATIC = 'lpu-static-' + VERSION;
const RUNTIME = 'lpu-runtime-v1'; // Leaflet library files only
const SHELL = ['./', 'index.html', 'offline.html', '404.html', 'css/styles.css', 'js/app.js', 'js/studio.js', 'js/offline.js', 'data/places.js', 'manifest.webmanifest',
'assets/campus-header-photo.webp', 'assets/campus-header-photo-sm.webp', 'assets/lpu-sunburst-mark-84.webp', 'assets/lpu-sunburst-mark-120.webp',
'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const CDN = ['https://unpkg.com/leaflet@1.9.4/'];
self.addEventListener('install', (e) => {
e.waitUntil(caches.open(STATIC).then((c) => c.addAll(SHELL)));
});
self.addEventListener('activate', (e) => {
e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('lpu-static-') && k !== STATIC).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
const req = e.request;
if (req.method !== 'GET') return;
const url = new URL(req.url);
if (url.origin !== location.origin && !CDN.some((p) => req.url.startsWith(p))) return;
if (req.mode === 'navigate') {
e.respondWith(fetch(req).then((res) => {
if (res.ok && url.origin === location.origin) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put('index.html', copy)).catch(() => {}); }
return res;
}).catch(() => caches.match(req).then((r) => r || caches.match('index.html')).then((r) => r || caches.match('offline.html'))));
return;
}
if (CDN.some((p) => req.url.startsWith(p))) {
e.respondWith(caches.open(RUNTIME).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
return;
}
e.respondWith(caches.open(STATIC).then((c) => c.match(req).then((hit) => {
const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
return hit || net;
})));
});