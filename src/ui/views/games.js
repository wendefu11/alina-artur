// ─────────────────────────  UI / VIEW · GAMES  ─────────────────────────

import { el } from "../../core/dom.js";
import { toast } from "../../core/toast.js";
import { confettiBurst } from "../../core/confetti.js";
import { play } from "../../core/audio.js";
import { vibrate } from "../../core/vibration.js";
import { CATALOG, FILTERS, MODE_LABELS, playableModes } from "../../data/catalog.js";
import { recordMatch, recordHighScore, addQuizScore } from "../../storage/store.js";
import { emit, EVT } from "../../core/events.js";
import { go } from "../router.js";
import { tileFor } from "./_tile.js";
import { getCurrentRoom, isRoomReady } from "../../network/room.js";
import { renderOnlineGate } from "../online-gate.js";

let cleanup = null;

export function renderGames(state, params) {
  cleanupActiveGame();
  const root = el("div");
  const slug = params[0];
  const modeRequested = params[1];

  root.append(el("div", { class: "section-header" },
    el("div", {}, el("h2", { class: "display" }, "Игры"),
                  el("p", {}, `${Object.keys(CATALOG).length} штук. Вдвоём — online, соло — на одном телефоне.`)),
    slug
      ? el("button", { class: "cta-btn ghost", onclick: () => go("games") }, "↻ Закрыть игру")
      : null,
  ));

  const currentFilter = sessionStorage.getItem("gameFilter") || "all";
  const filterRow = el("div", { class: "filter-row" });
  for (const [k, v] of Object.entries(FILTERS)) {
    filterRow.append(el("button", {
      class: "filter-chip" + (currentFilter === k ? " active" : ""),
      onclick: () => { sessionStorage.setItem("gameFilter", k); go("games"); },
    }, v));
  }
  root.append(filterRow);

  const grid = el("div", { class: "games-grid" });
  for (const [id, g] of Object.entries(CATALOG)) {
    if (currentFilter !== "all" && g.tag !== currentFilter) continue;
    grid.append(tileFor(id, g));
  }
  root.append(grid);

  if (slug && CATALOG[slug]) {
    const g = CATALOG[slug];
    const modes = playableModes(g);
    const mode = modeRequested || (modes.length === 1 ? modes[0] : null);
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

    if (mode) {
      queueMicrotask(() => launchGame(slug, host, scoreboard, state, mode));
    } else if (!modes.length) {
      host.append(el("p", { class: "muted" }, "Выбери режим."));
    }
    setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }

  return root;
}

function renderModePicker(slug, g, current) {
  const modes = playableModes(g);
  if (modes.length <= 1) return el("div");
  const row = el("div", { class: "mode-picker" });
  for (const m of modes) {
    row.append(el("button", {
      class: "mode-chip" + ((current || modes[0]) === m ? " active" : ""),
      onclick: () => {
        if (m === "online") go(`games/${slug}/online`);
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

  if (mode === "online" && !isRoomReady()) {
    host.innerHTML = "";
    host.append(renderOnlineGate(slug, state.profile, {
      title: g.title,
      onConnected: () => launchGame(slug, host, scoreboardEl, state, mode),
    }));
    return;
  }

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

  const localPlayer = state.profile === "Алина" ? 1 : 2;
  const room = mode === "online" ? getCurrentRoom() : null;

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
