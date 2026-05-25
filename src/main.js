// ─────────────────────────  MAIN ENTRY  ─────────────────────────
// Boots the SPA. Loads state, sets up shell, wires router, starts achievement
// tracker. Each view module is lazy via dynamic import in the router.

import { $, $$ } from "./core/dom.js";
import { load } from "./storage/store.js";
import { setupShell, showLoginIfNeeded, setActiveRoute, refreshBadge } from "./ui/shell.js";
import { start as startRouter, subscribe, parseHash } from "./ui/router.js";
import { cleanupActiveGame } from "./ui/views/games.js";
import { startTracker } from "./achievements/tracker.js";
import { on, EVT } from "./core/events.js";

// ── boot ────────────────────────────────────────────────────────
const state = load();
window.__state = state; // for lobby and debugging

setupShell(state);
showLoginIfNeeded();
startTracker(state);

// keep shell badge in sync with profile changes
on(EVT.ProfileChanged, () => refreshBadge());

// ── router → view ──────────────────────────────────────────────
const view = $("#view");
let lastRoute = null;

subscribe(async ({ name, params }) => {
  if (!state.profile) { showLoginIfNeeded(); return; }
  cleanupActiveGame();
  setActiveRoute(name);
  view.innerHTML = "";
  lastRoute = name;
  try {
    const mod = await routeModule(name);
    if (lastRoute !== name) return; // user navigated away while loading
    const node = mod(state, params);
    view.append(node);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    console.error("[route]", name, e);
    view.append(error(name, e));
  }
});

function routeModule(name) {
  switch (name) {
    case "home":         return import("./ui/views/home.js").then(m => m.renderHome);
    case "games":        return import("./ui/views/games.js").then(m => m.renderGames);
    case "diary":        return import("./ui/views/diary.js").then(m => m.renderDiary);
    case "stats":        return import("./ui/views/stats.js").then(m => m.renderStats);
    case "achievements": return import("./ui/views/achievements.js").then(m => m.renderAchievements);
    default:             return import("./ui/views/home.js").then(m => m.renderHome);
  }
}

function error(name, e) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `<h2>Ошибка раздела «${name}»</h2><p class="muted">${String(e?.message || e)}</p>`;
  return div;
}

startRouter();

// ── service worker (PWA / offline) ─────────────────────────────
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
