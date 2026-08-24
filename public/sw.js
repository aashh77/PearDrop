// PearDrop service worker.
//
// Kept intentionally minimal: it only exists to make the app installable
// as a PWA and to let the static app shell load a touch faster on repeat
// visits. It never touches API routes (signaling, health, etc.) so it can
// never interfere with the live SSE connection or WebRTC signaling that
// the app depends on.
const CACHE_NAME = "peardrop-shell-v1";
const SHELL_ASSETS = ["/", "/logo.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        // Best-effort only; a failed precache should never block install.
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle simple same-origin GETs for the static shell. Never
  // intercept API calls, POSTs, or the signaling EventSource stream.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
