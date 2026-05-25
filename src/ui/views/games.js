// ─────────────────────────  UI / VIEW · GAMES  ─────────────────────────
// Catalog + filters + game host. Game module is lazy-loaded per click.
// Mode picker (Hot-seat / AI / Online) appears only for games that support them.

import { el } from "../../core/dom.js";
import { toast } from "../../core/toast.js";
import { confettiBurst } from "../../core/confetti.js";
import { play } from "../../core/audio.js";
import { vibrate } from "../../core/vibration.js";
import { CATALOG, FILTERS, MODE_LABELS } from "../../data/catalog.js";
import { recordMatch, recordHighScore, addQuizScore } from "../../storage/store.js";
import { emit, EVT } from "../../core/events.js";
import { go } from "../router.js";
import { tileFor } from "./_tile.js";
import { openLobby } from "../lobby.js";
import { getCurrentRoom } from "../../network/room.js";

let cleanup = null;

export function renderGames(state, params) {
  cleanupActiveGame();
  const root = el("div");
  const slug = params[0]; // #/games/<id>
  const modeRequested = params[1]; // optional: hotseat | ai | online

  root.append(el("div", { class: "section-header" },
    el("div", {}, el("h2", { class: "display" }, "Игры"),
                  el("p", {}, `${Object.keys(CATALOG).length} штук. Хот-сит, AI или online — без серверов.`)),
    slug
      ? el("button", { class: "cta-btn ghost", onclick: () => go("games") }, "↻ Закрыть игру")
      : null,
  ));

  // ── filter chips ─────────────────────────────────────
  const currentFilter = sessionStorage.getItem("gameFilter") || "all";
  const filterRow = el("div", { class: "filter-row" });
  for (const [k, v] of Object.entries(FILTERS)) {
    filterRow.append(el("button", {
      class: "filter-chip" + (currentFilter === k ? " active" : ""),
      onclick: () => { sessionStorage.setItem("gameFilter", k); go("games"); },
    }, v));
  }
  root.append(filterRow);

  // ── grid ─────────────────────────────────────────────
  const grid = el("div", { class: "games-grid" });
  for (const [id, g] of Object.entries(CATALOG)) {
    if (currentFilter !== "all" && g.tag !== currentFilter) continue;
    grid.append(tileFor(id, g));
  }
  root.append(grid);

  // ── game host (if a slug is in URL) ──────────────────
  if (slug && CATALOG[slug]) {
    const g = CATALOG[slug];
    const wrap = el("div", { class: "game-host-wrap" });
    const card = el("div", { class: "card" });

    const head = el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, g.title), el("p", {}, g.sub)),
      el("button", { class: "cta-btn secondary", onclick: () => { cleanupActiveGame(); go("games"); } }, "← Закрыть"),
    );

    const modePicker = renderModePicker(slug, g, modeRequested);
    const scoreboard = el("div", { class: "scoreboard" });
    const host       = el("div", { class: "game-host" });

    card.append(head, modePicker, scoreboard, host);
    wrap.append(card);
    root.append(wrap);

    queueMicrotask(() => launchGame(slug, host, scoreboard, state, modeRequested || g.modes[0] || "hotseat"));
    setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }

  return root;
}

function renderModePicker(slug, g, current) {
  if (!g.modes || g.modes.length <= 1) return el("div");
  const row = el("div", { class: "mode-picker" });
  for (const m of g.modes) {
    row.append(el("button", {
      class: "mode-chip" + ((current || g.modes[0]) === m ? " active" : ""),
      onclick: () => {
        if (m === "online") openLobby(slug);
        else go(`games/${slug}/${m}`);
      },
    }, MODE_LABELS[m] || m));
  }
  return row;
}

async function launchGame(slug, host, scoreboardEl, state, mode) {
  cleanupActiveGame();
  const g = CATALOG[slug];
  if (!g) { host.append(el("p", {}, "Игра не найдена.")); return; }
  host.innerHTML = "Загружаю…";
  let mod;
  try { mod = await g.loader(); }
  catch (e) {
    console.error("[load]", e);
    host.innerHTML = "";
    host.append(el("p", { class: "muted" }, "Не удалось загрузить игру."));
    return;
  }
  host.innerHTML = "";
  scoreboardEl.innerHTML = "";

  emit(EVT.GameStarted, { gameId: slug, mode, profile: state.profile });

  // Online mode hookup (if any room exists)
  const room = mode === "online" ? getCurrentRoom() : null;
  const localPlayer = room?.role === "host" ? 1 : (room?.role === "guest" ? 2 : 1);

  const ctx = {
    profile: state.profile,
    partner: state.profile === "Алина" ? "Артур" : "Алина",
    state,
    mode,
    localPlayer,
    room,
    scoreboardEl,
    recordResult: (gameId, winner, loser, isDraw = false) => {
      recordMatch(state, gameId, winner, loser, isDraw);
      play(isDraw ? "pop" : (state.profile === winner ? "win" : "lose"));
      vibrate(isDraw ? "pop" : (state.profile === winner ? "win" : "lose"));
      emit(EVT.GameEnded, { gameId, winner, loser, draw: isDraw, mode });
    },
    recordHighScore: (profile, gameId, value, lowerBetter = false) => {
      const improved = recordHighScore(state, profile, gameId, value, lowerBetter);
      if (improved) emit(EVT.HighScore, { gameId, profile, value });
      return improved;
    },
    addQuizScore: (profile, score, total) => {
      addQuizScore(state, profile, score, total);
      emit(EVT.QuizScore, { profile, score, total });
    },
    toast,
    confettiBurst,
    sound: play,
    vibrate,
    registerCleanup: (fn) => { cleanup = fn; },
  };

  try { mod.default(host, ctx); }
  catch (e) {
    console.error("[mount]", e);
    host.append(el("p", { class: "muted" }, "Ошибка при запуске игры. См. консоль."));
  }
}

export function cleanupActiveGame() {
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
}
