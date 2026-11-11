/* Service worker: opens instantly from the cache and updates in the background.
   A change to an existing file arrives on its own at the next launch.
   Only change VERSION when you add or rename a file in the list. */
const VERSION = 'afterglow-v1';
const FILES = [
  './', 'index.html', 'legal.html', 'style.css', 'suncalc.js', 'manifest.webmanifest',
  'fonts/instrument-serif.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'favicon.ico',
  'js/main.js', 'js/config.js', 'js/time.js', 'js/astro.js', 'js/score.js', 'js/horizon.js', 'js/store.js',
  'js/weather.js', 'js/model.js', 'js/journal.js', 'js/spots.js', 'js/calendar.js', 'js/events.js', 'js/compass.js', 'js/share.js', 'js/sound.js',
  'js/ui/dom.js', 'js/ui/icons.js', 'js/ui/scene.js', 'js/ui/today.js', 'js/ui/week.js', 'js/ui/sky.js', 'js/ui/notebook.js'
];

self.addEventListener('install', e => {
  /* 'reload': don't fill the cache with an old copy kept by the browser */
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // the weather has its own cache
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    /* 'no-cache': always ask the server whether the file has changed */
    const update = fetch(req.url, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    if (hit) {
      e.waitUntil(update.catch(() => {}));
      return hit;
    }
    try {
      return await update;
    } catch (err) {
      if (req.mode === 'navigate') {
        const page = await cache.match('index.html');
        if (page) return page;
      }
      throw err;
    }
  })());
});
