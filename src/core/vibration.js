// ─────────────────────────  CORE / VIBRATION  ─────────────────────────
// Tiny wrapper around navigator.vibrate with global mute & named patterns.

let enabled = true;

const PATTERNS = {
  tap:   [12],
  hit:   [30],
  win:   [40, 50, 80],
  lose:  [120, 60, 120],
  pop:   [10],
};

function supported() { return typeof navigator !== "undefined" && typeof navigator.vibrate === "function"; }

export function setEnabled(v) { enabled = !!v; }
export function isEnabled()    { return enabled && supported(); }

export function vibrate(pattern) {
  if (!isEnabled()) return false;
  const p = typeof pattern === "string" ? PATTERNS[pattern] : pattern;
  if (!p) return false;
  try { return navigator.vibrate(p); } catch { return false; }
}
