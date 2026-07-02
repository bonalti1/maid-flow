// Maid Flow service worker — offline app shell for cheap Android phones used
// inside clients' homes with no signal. Cache-first for same-origin static
// assets (hashed by Vite), network-only for /api and /w, offline fallback to "/".
const CACHE = "maidflow-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // let dynamic/cross-origin pass
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/w/")) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (resp && resp.ok && resp.type === "basic") cache.put(req, resp.clone());
      return resp;
    } catch {
      // Offline and uncached — fall back to the app shell so the SPA still boots.
      return (await cache.match("/")) || Response.error();
    }
  })());
});
