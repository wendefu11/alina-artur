// ─────────────────────────  SERVICE WORKER  ─────────────────────────
// Stale-while-revalidate for same-origin static assets; network-first for index.html.
// Games are lazy-imported and cached on first visit, so subsequent loads work offline.

const VERSION = "alina-artur-v4-1";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./src/main.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Don't intercept cross-origin (fonts, peerjs broker, etc.)
  if (url.origin !== self.location.origin) return;

  // Navigations → network-first to always get latest index.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return r;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets → stale-while-revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
