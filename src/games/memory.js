// ─────────────────────────  GAME · MEMORY  ─────────────────────────
// Online. Host = колода и ходы.

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { MSG } from "../network/protocol.js";
import { MEMORY_ICONS } from "../data/content.js";

const P1 = "Алина", P2 = "Артур";

function freshState() {
  const deck = [...MEMORY_ICONS.slice(0, 8), ...MEMORY_ICONS.slice(0, 8)].sort(() => Math.random() - 0.5);
  return { deck, flipped: [], matched: [], turn: 1, scores: { 1: 0, 2: 0 }, lock: false, recorded: false };
}

export default function mount(host, ctx) {
  const room = ctx.room;
  const isHost = room?.role === "host";
  const mySlot = ctx.profile === P1 ? 1 : 2;
  let state = isHost ? freshState() : null;
  let ready = isHost;
  const unsub = [];

  function broadcast() {
    if (isHost && state) room.send(MSG.State, state);
  }

  function ingest(s) {
    state = s;
    ready = true;
    render();
    renderScore();
  }

  function doFlip(i) {
    if (!state || state.lock) return "Подожди…";
    if (state.turn !== mySlot && !isHost) return "Не твой ход";
    if (state.flipped.includes(i) || state.matched.includes(i)) return null;
    if (state.flipped.length >= 2) return null;

    state.flipped.push(i);
    if (state.flipped.length === 2) {
      state.lock = true;
      const [a, b] = state.flipped;
      if (state.deck[a] === state.deck[b]) {
        state.matched.push(a, b);
        state.scores[state.turn] += 1;
        state.flipped = [];
        state.lock = false;
        if (state.matched.length === state.deck.length && !state.recorded) {
          state.recorded = true;
          if (isHost) finishGame();
        }
      } else {
        setTimeout(() => {
          if (!state) return;
          state.turn = state.turn === 1 ? 2 : 1;
          state.flipped = [];
          state.lock = false;
          broadcast();
          render();
        }, 700);
        return "pending";
      }
    }
    return null;
  }

  function finishGame() {
    if (state.scores[1] === state.scores[2]) ctx.recordResult("memory", P1, P2, true);
    else {
      const w = state.scores[1] > state.scores[2] ? 1 : 2;
      ctx.recordResult("memory", w === 1 ? P1 : P2, w === 1 ? P2 : P1);
      ctx.confettiBurst();
    }
  }

  function onFlip(i) {
    if (!state || state.lock) return;
    if (state.turn !== mySlot) { ctx.toast("Сейчас не твой ход"); return; }
    if (!isHost) {
      room.send(MSG.Move, { flip: i, from: mySlot });
      return;
    }
    const r = doFlip(i);
    if (r && r !== "pending") { ctx.toast(r); return; }
    render(); renderScore();
    if (r !== "pending") broadcast();
  }

  function renderScore() {
    if (!state) return;
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(P1, state.scores[1]), scoreChip(P2, state.scores[2]));
  }

  function render() {
    host.innerHTML = "";
    if (!ready || !state) {
      host.append(el("p", { class: "muted" }, "Синхронизация…"));
      return;
    }
    const done = state.matched.length === state.deck.length;
    host.append(el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot" }),
      el("span", {}, done
        ? `Игра окончена! ${state.scores[1] === state.scores[2] ? "Ничья" : state.scores[1] > state.scores[2] ? P1 : P2}`
        : state.turn === mySlot ? "Твой ход" : `Ход ${state.turn === 1 ? P1 : P2}`),
    ));
    const grid = el("div", { class: "memory-grid", style: "grid-template-columns: repeat(4, 1fr)" });
    state.deck.forEach((sym, i) => {
      const open = state.flipped.includes(i) || state.matched.includes(i);
      grid.append(el("div", {
        class: "memory-card" + (open ? " flipped" : "") + (state.matched.includes(i) ? " matched" : ""),
        onclick: () => onFlip(i),
      },
        el("div", { class: "memory-card-inner" },
          el("div", { class: "memory-card-face memory-card-front" }),
          el("div", { class: "memory-card-face memory-card-back" }, sym),
        ),
      ));
    });
    host.append(grid);
    if (isHost) {
      host.append(el("button", {
        class: "cta-btn row-center",
        style: "margin-top:14px",
        onclick: () => { state = freshState(); broadcast(); render(); renderScore(); },
      }, "Новая партия"));
    }
  }

  if (isHost) {
    unsub.push(room.on(MSG.Move, ({ flip, from }) => {
      if (from !== mySlot && state?.turn === from) {
        doFlip(flip);
        render(); renderScore();
        broadcast();
      }
    }));
    unsub.push(room.on("sync", broadcast));
    unsub.push(room.on(MSG.Hello, broadcast));
    broadcast();
  } else {
    unsub.push(room.on(MSG.State, ingest));
    room.send("sync", {});
  }

  render(); renderScore();
  ctx.registerCleanup(() => unsub.forEach((f) => f?.()));
}
