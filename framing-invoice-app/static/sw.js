/* Minimal service worker — enables "Add to Home Screen" / installable PWA.
   Network-first; falls back to cached shell when offline. */
const CACHE = "stb-invoice-v16";
const SHELL = ["/", "/theme.css", "/snap.css", "/snap.js", "/logo.svg",
               "/logo-portero.png", "/goalie.mp4",
               "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  // Never cache API calls — always hit the network.
  if (e.request.url.includes("/api/")) return;

  // Video is big and unchanging — cache-first so it downloads once, then loads
  // instantly (and offline) on every future visit. Keeps the front light.
  if (e.request.url.endsWith(".mp4")) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        }))
    );
    return;
  }

  // Everything else: network-first, fall back to cache when offline.
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
