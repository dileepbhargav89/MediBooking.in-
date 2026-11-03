/**
 * MediBooking Clinic Desk Service Worker (PWA Offline Layer)
 * Document ID: MB-SPEC-15 (Phase 53)
 */

const CACHE_NAME = 'medibooking-frontdesk-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/receptionist',
  '/manifest.json',
  '/favicon.ico',
];

// Install: Cache critical static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Soft fail if some static route is SSR
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for dynamic API routes, Stale-while-revalidate for pages and assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Don't intercept non-GET or cross-origin requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // API calls: Network first with graceful offline json fallback
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, message: 'MediBooking Offline Cache Active' }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      })
    );
    return;
  }

  // Pages & Static: Network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match('/receptionist');
        });
      })
  );
});

