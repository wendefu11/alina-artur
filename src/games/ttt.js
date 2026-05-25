// ─────────────────────────  GAME · TIC TAC TOE  ─────────────────────────
// Hot-seat, AI, or online. Mode is read from ctx.mode (default "hotseat").
// AI uses Minimax (perfect play) from engine/ai/ttt.js.
// Online uses ctx.room.send(move, payload) and ctx.room.on(move, handler).

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { bestMove } from "../engine/ai/ttt.js";

const P1 = "Алина", P2 = "Артур";
const SYM = { 1: "✕", 2: "◯" };
const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board) {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: "draw", line: [] };
  return { winner: null, line: [] };
}

export default function mount(host, ctx) {
  const mode = ctx.mode || "ai";       // "hotseat" | "ai" | "online"
  const localPlayer = ctx.localPlayer || 1; // for online: which side is "me"

  let board = Array(9).fill(0); // 0 empty, 1 = P1, 2 = P2
  let turn = 1;
  let winner = null;
  let line = [];
  let scores = { 1: 0, 2: 0 };
  let recorded = false;

  function nameOf(n) {
    if (mode === "ai" && n === 2) return "AI";
    return n === 1 ? P1 : P2;
  }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(`${nameOf(1)} (✕)`, scores[1]),
      scoreChip(`${nameOf(2)} (◯)`, scores[2]),
    );
  }

  function applyMove(idx, who) {
    if (winner || board[idx]) return false;
    board[idx] = who;
    const r = checkWinner(board);
    winner = r.winner; line = r.line;
    if (winner && !recorded) {
      recorded = true;
      if (winner === "draw") {
        ctx.recordResult("ttt", nameOf(1), nameOf(2), true);
      } else {
        scores[winner] += 1;
        ctx.recordResult("ttt", nameOf(winner), nameOf(winner === 1 ? 2 : 1));
        ctx.confettiBurst();
      }
    } else {
      turn = turn === 1 ? 2 : 1;
    }
    return true;
  }

  function clickCell(i) {
    if (winner || board[i]) return;
    if (mode === "online" && turn !== localPlayer) { ctx.toast?.("Сейчас не твой ход"); return; }
    const me = mode === "online" ? localPlayer : turn;
    applyMove(i, me);
    if (mode === "online") ctx.room?.send("move", { i, who: me });
    render(); renderScore();
    if (mode === "ai" && !winner && turn === 2) setTimeout(aiTurn, 280);
  }

  function aiTurn() {
    if (winner) return;
    const move = bestMove(board, 2);
    if (move == null) return;
    applyMove(move, 2);
    render(); renderScore();
  }

  function statusText() {
    if (winner === "draw") return "Ничья — нажми «Заново»";
    if (winner)             return `Победил ${nameOf(winner)} 🌟`;
    if (mode === "online" && turn !== localPlayer) return `Ход соперника (${nameOf(turn)})`;
    return `Ходит ${nameOf(turn)} (${SYM[turn]})`;
  }

  function render() {
    host.innerHTML = "";
    const ind = el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot" }),
      el("span", {}, statusText()),
    );
    const grid = el("div", { class: "ttt-board" });
    board.forEach((cell, i) => {
      const c = el("button", {
        class: "ttt-cell"
          + (cell ? " taken " + (cell === 1 ? "x" : "o") : "")
          + (line.includes(i) ? " win" : ""),
        onclick: () => clickCell(i),
      }, cell === 1 ? "✕" : cell === 2 ? "◯" : "");
      grid.append(c);
    });
    const btnRow = el("div", { class: "row-center" },
      el("button", { class: "cta-btn", onclick: reset }, "Заново"),
      el("button", { class: "cta-btn secondary", onclick: hardReset }, "Сбросить счёт"),
    );
    host.append(ind, grid, btnRow);
  }

  function reset() {
    board = Array(9).fill(0); turn = 1; winner = null; line = []; recorded = false;
    render(); renderScore();
    if (mode === "ai" && localPlayer === 2) setTimeout(aiTurn, 350);
  }
  function hardReset() {
    scores = { 1: 0, 2: 0 };
    reset();
  }

  // online wiring: receive opponent moves & reset events
  if (mode === "online" && ctx.room) {
    ctx.room.on("move", ({ i, who }) => {
      if (who === localPlayer) return; // echo guard
      applyMove(i, who); render(); renderScore();
    });
    ctx.room.on("reset", () => { reset(); });
  }

  render(); renderScore();
  ctx.registerCleanup?.(() => {});
}
