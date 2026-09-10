const SHELL_CACHE = 'asoul-diary-v3-shell-__ASOUL_BUILD_VERSION__';
const WALLPAPER_CACHE = 'asoul-diary-v3-wallpapers';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest?v=4',
  '/icon-192.png?v=4',
  '/icon-512.png?v=4',
];
// Filled from the built JS/CSS files; personal data and photos are never cached here.
const BUILD_ASSETS = /* __ASOUL_BUILD_ASSETS__ */ [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([...APP_SHELL, ...BUILD_ASSETS])),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('asoul-diary-v3-shell-') && key !== SHELL_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (!response.ok) return (await caches.match('/')) ?? response;
          if (url.pathname === '/' && !response.redirected) {
            const copy = response.clone();
            event.waitUntil(
              caches
                .open(SHELL_CACHE)
                .then((cache) => cache.put('/', copy))
                .catch(() => {}),
            );
          }
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Wallpaper URLs carry their own artwork version. Cache each version once,
  // and discard an older version of the same friendly filename on replacement.
  if (url.pathname.startsWith('/wallpapers/')) {
    event.respondWith(
      caches.open(WALLPAPER_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) {
          const cachedRequests = await cache.keys();
          await Promise.all(
            cachedRequests
              .filter((cachedRequest) => {
                const cachedUrl = new URL(cachedRequest.url);
                return (
                  cachedUrl.pathname === url.pathname &&
                  cachedRequest.url !== request.url
                );
              })
              .map((cachedRequest) => cache.delete(cachedRequest)),
          );
          await cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches
              .open(SHELL_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {}),
          );
        }
        return response;
      });
    }),
  );
});
