/**
 * Service Worker for Room 203 PWA
 *
 * Strategy:
 *   - Static assets (JS, CSS, fonts, images): cache-first
 *   - HTML pages: network-first with cache fallback
 *   - API routes: network-only (no caching for chat/translate)
 */

const CACHE_NAME = "room203-v2";

const PRECACHE_URLS = ["/"];

// Install: precache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: route-specific caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip caching entirely on localhost (dev server)
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return;

  // Skip API routes — always network
  if (url.pathname.startsWith("/api/")) return;

  // Next.js chunks (/_next/): network-first so deployments propagate immediately
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Other static assets (fonts, images): cache-first
  if (
    url.pathname.match(
      /\.(woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/,
    )
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // HTML pages: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
