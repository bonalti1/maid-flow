// Pauleza service worker — offline app shell for cheap Android phones used
// inside clients' homes with no signal.
//   • HTML/navigations → network-FIRST, so a new deploy is picked up immediately
//     (cache-first here froze users on an old app shell + old JS hash).
//   • Vite hashed assets (/assets/*, images) → cache-first (immutable, safe).
//   • /api and /w → network-only. Offline navigation falls back to "/".
// Bump CACHE on any caching-logic change so old shells are purged on activate.
const CACHE = "pauleza-v4";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Web push — the "lead buzz". Show the notification and focus/open the app.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Pauleza", {
    body: d.body || "", icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => {
    for (const c of cs) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // let dynamic/cross-origin pass
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/w/")) return;

  // HTML / navigations. ONLY the PWA shell ("/") is ever cached — every other
  // server-rendered HTML page (/admin, /cs, /closer, /onboarding, /invite/*,
  // /q/*, /site/*, tenant sites) is network-only, so authenticated pages, staff
  // keys embedded in markup, and proposal PII are never stored in the cache and
  // can't be read offline or by a same-origin script after logout/expiry.
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHTML) {
    if (url.pathname !== "/") return; // network-only for all non-shell HTML
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const resp = await fetch(req);
        if (resp && resp.ok) cache.put("/", resp.clone());
        return resp;
      } catch {
        return (await cache.match("/")) || Response.error();
      }
    })());
    return;
  }

  // Everything else (Vite content-hashed assets, images) → cache-first.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (resp && resp.ok && resp.type === "basic") cache.put(req, resp.clone());
      return resp;
    } catch {
      return (await cache.match("/")) || Response.error();
    }
  })());
});
