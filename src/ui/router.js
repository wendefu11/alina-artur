// ─────────────────────────  UI / ROUTER  ─────────────────────────
// Hash-based router. Supports nested segments: #/games/ttt/online
// Subscribers get { name, params } on change.

const handlers = new Set();
const ALIAS = { "": "home", "/": "home" };

export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const segments = raw.split("/").filter(Boolean);
  const name = ALIAS[segments[0] || ""] || segments[0] || "home";
  return { name, segments, params: segments.slice(1) };
}

export function go(path) {
  if (!path.startsWith("#")) path = "#/" + path.replace(/^\/?/, "");
  if (location.hash === path) { fire(); return; }
  location.hash = path;
}

export function subscribe(handler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

function fire() {
  const r = parseHash();
  handlers.forEach(h => { try { h(r); } catch (e) { console.error(e); } });
}

export function start() {
  addEventListener("hashchange", fire);
  // first frame
  queueMicrotask(fire);
}
