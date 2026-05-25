// ─────────────────────────  SERVICE WORKER  ─────────────────────────
// JS modules: network-first (always fresh). CSS/images: stale-while-revalidate.

const BUILD = "20260525-v3";
const VERSION = `alina-artur-${BUILD}`;
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  `./src/main.js?v=${BUILD}`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function isScript(url) {
  return url.pathname.endsWith(".js") || url.pathname.endsWith(".mjs");
}

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res?.ok) await cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return r;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (isScript(url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res?.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
