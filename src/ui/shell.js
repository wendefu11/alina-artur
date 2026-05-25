// ─────────────────────────  UI / SHELL  ─────────────────────────
// App chrome: login overlay, top/bottom navbars, settings drawer, brand strip.
// Pure side-effecty setup — call setupShell() once on boot.

import { $, $$, el, plural, copyToClipboard } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { save, exportJSON, importJSON, resetAll, setPref } from "../storage/store.js";
import { emit, EVT } from "../core/events.js";
import { LOVE_LINES } from "../data/content.js";
import { setEnabled as setAudio, isEnabled as audioEnabled } from "../core/audio.js";
import { setEnabled as setVibe, isEnabled as vibeEnabled } from "../core/vibration.js";
import { go } from "./router.js";
import { CATALOG } from "../data/catalog.js";

let state = null;

export function setupShell(_state) {
  state = _state;
  applyTheme(state.theme);
  applyPrefs(state.prefs);

  initLoginOverlay();
  initDrawer();
  initBrand();
  initLoveTypewriter();
  initQuickGame();

  // Reactive: when profile changes, refresh badge.
  // (We call this manually after profile mutations.)
}

export function showLoginIfNeeded() {
  const overlay = $("#loginOverlay");
  const app     = $("#app");
  if (!state.profile) { overlay.classList.remove("hidden"); app.classList.add("hidden"); }
  else                { overlay.classList.add("hidden");    app.classList.remove("hidden"); refreshBrandDay(); refreshBadge(); }
}

// ─── theme ───────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.dataset.theme = t || "aurora";
  emit(EVT.ThemeChanged, { theme: t });
}

function applyPrefs(prefs) {
  setAudio(!!prefs?.sound);
  setVibe (!!prefs?.vibration);
}

// ─── login overlay ───────────────────────────────────────
function initLoginOverlay() {
  $$("[data-login]").forEach(btn => btn.addEventListener("click", () => {
    state.profile = btn.dataset.login;
    save(state);
    showLoginIfNeeded();
    emit(EVT.ProfileChanged, { profile: state.profile });
    toast(`Привет, ${state.profile}!`);
    if (!location.hash) location.hash = "#/home";
  }));
}

// ─── drawer ───────────────────────────────────────────────
function initDrawer() {
  const drawer = $("#settingsDrawer");
  const openDrawer  = () => { drawer.classList.remove("hidden"); $("#startDateInput").value = state.startDate || ""; refreshDrawerActive(); };
  const closeDrawer = () => { drawer.classList.add("hidden"); };

  $("#settingsBtn").addEventListener("click", openDrawer);
  $("#profileBadge").addEventListener("click", openDrawer);
  $$("[data-close-drawer]").forEach(el => el.addEventListener("click", closeDrawer));

  $$("[data-switch]").forEach(btn => btn.addEventListener("click", () => {
    state.profile = btn.dataset.switch; save(state);
    refreshBadge(); refreshDrawerActive();
    emit(EVT.ProfileChanged, { profile: state.profile });
    toast(`Кабинет ${state.profile}`);
    closeDrawer();
  }));

  $$("[data-theme]").forEach(btn => btn.addEventListener("click", () => {
    state.theme = btn.dataset.theme; save(state); applyTheme(state.theme); refreshDrawerActive();
    toast(`Тема: ${state.theme}`);
  }));

  $("#startDateInput").addEventListener("change", (e) => {
    state.startDate = e.target.value || state.startDate; save(state); refreshBrandDay(); toast("Дата сохранена");
  });

  $("#exportBtn").addEventListener("click", () => {
    const data = exportJSON(state);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `alina-artur-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast("Файл сохранён");
  });

  $("#importInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    if (importJSON(text)) { toast("Импорт ок. Перезагружаю..."); setTimeout(() => location.reload(), 600); }
    else toast("Не получилось :(");
  });

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Стереть все данные?")) { resetAll(); location.reload(); }
  });

  $("#logoutBtn").addEventListener("click", () => {
    state.profile = ""; save(state); closeDrawer(); showLoginIfNeeded();
  });

  // Sound / vibration toggles (added in index.html below).
  const soundChk = $("#soundChk");
  const vibeChk  = $("#vibeChk");
  if (soundChk) {
    soundChk.checked = audioEnabled();
    soundChk.addEventListener("change", () => { setAudio(soundChk.checked); setPref(state, "sound", soundChk.checked); });
  }
  if (vibeChk) {
    vibeChk.checked = vibeEnabled();
    vibeChk.addEventListener("change", () => { setVibe(vibeChk.checked); setPref(state, "vibration", vibeChk.checked); });
  }

  // Share link
  const shareBtn = $("#shareBtn");
  if (shareBtn) shareBtn.addEventListener("click", async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Алина & Артур", url: location.href });
      else { await copyToClipboard(location.href); toast("Ссылка скопирована"); }
    } catch {}
  });
}

function refreshDrawerActive() {
  $$("[data-switch]").forEach(b => b.classList.toggle("active", b.dataset.switch === state.profile));
  $$("[data-theme]").forEach(b => b.classList.toggle("active", b.dataset.theme === state.theme));
}

// ─── brand / badge ───────────────────────────────────────
function initBrand() {
  refreshBrandDay();
  refreshBadge();
  setInterval(refreshBrandDay, 3600 * 1000);
}

function refreshBrandDay() {
  const start = new Date(state.startDate || "2024-02-14");
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  const node = $("#brandDay"); if (node) node.textContent = `Вместе ${days} ${plural(days, "день", "дня", "дней")}`;
}

export function refreshBadge() {
  const p = state.profile || "Гость";
  const av = $("#badgeAvatar"); if (av) av.textContent = p ? p[0] : "?";
  const nm = $("#badgeName");   if (nm) nm.textContent = p;
  const bd = $("#profileBadge"); if (bd) bd.dataset.profile = p;
}

// ─── nav highlight ─────────────────────────────────────
export function setActiveRoute(name) {
  $$("[data-route]").forEach(a => a.classList.toggle("active", a.dataset.route === name));
}

// ─── love-line typewriter in footer ────────────────────
function initLoveTypewriter() {
  const out = $("#loveLine"); if (!out) return;
  let idx = Math.floor(Math.random() * LOVE_LINES.length);
  let p = 0, dir = 1, line = LOVE_LINES[idx];
  const tick = () => {
    p += dir; out.textContent = line.slice(0, p);
    if (dir === 1 && p >= line.length) { dir = -1; setTimeout(tick, 1800); return; }
    if (dir === -1 && p <= 0) { idx = (idx + 1) % LOVE_LINES.length; line = LOVE_LINES[idx]; dir = 1; setTimeout(tick, 250); return; }
    setTimeout(tick, dir === 1 ? 38 : 18);
  };
  tick();
}

// ─── quick game ─────────────────────────────────────────
function initQuickGame() {
  const btn = $("#quickGameBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const ids = Object.keys(CATALOG);
    const pick = ids[Math.floor(Math.random() * ids.length)];
    go(`games/${pick}`);
  });
}
