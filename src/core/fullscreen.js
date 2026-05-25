// ─────────────────────────  CORE / FULLSCREEN  ─────────────────────────
// Browser/iOS fullscreen wrapper. Falls back gracefully when API unavailable.

export function supported() {
  const d = document.documentElement;
  return !!(d.requestFullscreen || d.webkitRequestFullscreen || d.mozRequestFullScreen || d.msRequestFullscreen);
}

export function isFullscreen() {
  return !!(document.fullscreenElement
    || document.webkitFullscreenElement
    || document.mozFullScreenElement
    || document.msFullscreenElement);
}

export async function enter(elem = document.documentElement) {
  const fn = elem.requestFullscreen
    || elem.webkitRequestFullscreen
    || elem.mozRequestFullScreen
    || elem.msRequestFullscreen;
  if (!fn) return false;
  try { await fn.call(elem); return true; } catch { return false; }
}

export async function exit() {
  const fn = document.exitFullscreen
    || document.webkitExitFullscreen
    || document.mozCancelFullScreen
    || document.msExitFullscreen;
  if (!fn) return false;
  try { await fn.call(document); return true; } catch { return false; }
}

export async function toggle(elem) {
  return isFullscreen() ? exit() : enter(elem);
}
