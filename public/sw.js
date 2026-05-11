/* Mikroplay PWA Service Worker
 * Strategy:
 * - API (/api/*) & auth pages: network-only (selalu fresh, ga di-cache)
 * - Static asset (Next.js _next/static, icons): cache-first
 * - Halaman lain: network-first, fallback ke /offline.html kalau offline
 */
const VERSION = "v1";
const STATIC_CACHE = `mikroplay-static-${VERSION}`;
const RUNTIME_CACHE = `mikroplay-runtime-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon-180.png",
  "/favicon-32.png",
  "/mikroplay-logo.png",
  "/mikroplay-logo-text.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // Skip API, auth, dan EventStream (SSE)
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/masuk") ||
    url.pathname.startsWith("/daftar") ||
    url.pathname.startsWith("/admin") ||
    req.headers.get("accept")?.includes("text/event-stream")
  ) {
    return; // biarkan network handle
  }

  // Static asset: cache-first
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      }),
    );
    return;
  }

  // Halaman: network-first, fallback offline
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL)),
        ),
    );
  }
});

// Allow client to trigger update
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
