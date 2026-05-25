// ─────────────────────────  CORE / TOAST  ─────────────────────────
// Single-instance toast notification. The container <div id="toast"> lives
// in index.html. We just toggle .show.

const ROOT_ID = "toast";
let timer = null;

export function toast(msg, ms = 2200) {
  const t = document.getElementById(ROOT_ID);
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove("show"), ms);
}
