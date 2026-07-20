// Service worker — cache offline do app shell + dados + assets.
// Estratégia: network-first (online busca a versão nova e atualiza o cache; offline usa o cache).
// Ver docs/02-technical-spec.md §10. Incremente CACHE_VERSION ao mudar o precache.

const CACHE_VERSION = 'gymapp-v4';

// Caminhos relativos ao escopo do SW (funciona em subpath do GitHub Pages).
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './js/app.js',
  './js/config.js',
  './js/data.js',
  './js/schedule.js',
  './js/state.js',
  './js/storage.js',
  './js/timer.js',
  './js/pwa.js',
  './js/ui/dom.js',
  './js/ui/render.js',
  './js/ui/exercise-card.js',
  './js/ui/focus-mode.js',
  './data/workouts.json',
  './assets/icons/icon.svg',
  './assets/icons/icon-maskable.svg',
  './assets/exercises/_placeholder.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' })))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Só tratamos requisições do mesmo host (ignora imagens externas por URL).
  if (url.origin !== self.location.origin) return;

  // network-first: quando online, sempre pega a versão mais nova e atualiza o cache;
  // offline, cai para o cache. Evita servir CSS/JS desatualizados.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
