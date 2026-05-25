// ─────────────────────────  GAME · CONNECT 4  ─────────────────────────
// Hot-seat, AI (alpha-beta), or online via room channel.

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { bestColumn } from "../engine/ai/c4.js";

const COLS = 7, ROWS = 6;
const P1 = "Алина", P2 = "Артур";
const DIRS = [[0,1],[1,0],[1,1],[1,-1]];

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function checkWinner(board) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = board[r][c]; if (!v) continue;
    for (const [dr, dc] of DIRS) {
      let n = 0;
      for (let k = 0; k < 4; k++) {
        const nr = r + dr*k, nc = c + dc*k;
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) break;
        if (board[nr][nc] !== v) break;
        n++;
      }
      if (n === 4) return v;
    }
  }
  if (board.every(row => row.every(v => v))) return "draw";
  return null;
}

export default function mount(host, ctx) {
  const mode = ctx.mode || "hotseat";
  const localPlayer = ctx.localPlayer || 1;

  let board = emptyBoard();
  let turn = 1, winner = null, recorded = false;
  let scores = { 1: 0, 2: 0 };

  function nameOf(n) { return mode === "ai" && n === 2 ? "AI" : (n === 1 ? P1 : P2); }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(`${nameOf(1)} (◉)`, scores[1]),
      scoreChip(`${nameOf(2)} (◉)`, scores[2]),
    );
  }

  function applyDrop(col, who) {
    if (winner) return false;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) { board[r][col] = who; break; }
      if (r === 0) return false;
    }
    const w = checkWinner(board);
    if (w) {
      winner = w;
      if (!recorded) {
        recorded = true;
        if (w === "draw") ctx.recordResult("connect4", nameOf(1), nameOf(2), true);
        else {
          scores[w] += 1;
          ctx.recordResult("connect4", nameOf(w), nameOf(w === 1 ? 2 : 1));
          ctx.confettiBurst();
        }
      }
    } else {
      turn = turn === 1 ? 2 : 1;
    }
    return true;
  }

  function clickCol(c) {
    if (winner) return;
    if (mode === "online" && turn !== localPlayer) { ctx.toast?.("Не твой ход"); return; }
    const me = mode === "online" ? localPlayer : turn;
    if (!applyDrop(c, me)) return;
    if (mode === "online") ctx.room?.send("move", { c, who: me });
    render(); renderScore();
    if (mode === "ai" && !winner && turn === 2) setTimeout(aiTurn, 320);
  }

  function aiTurn() {
    if (winner) return;
    const col = bestColumn(board, 2, 5);
    if (col == null) return;
    applyDrop(col, 2);
    render(); renderScore();
  }

  function statusText() {
    if (winner === "draw") return "Ничья — переигрываем";
    if (winner)             return `Победил ${nameOf(winner)} 🏆`;
    if (mode === "online" && turn !== localPlayer) return `Ход соперника`;
    return `Ходит ${nameOf(turn)}`;
  }

  function render() {
    host.innerHTML = "";
    const ind = el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot", style: turn === 2 ? "background:var(--gold);box-shadow:0 0 10px var(--gold)" : "" }),
      el("span", {}, statusText()),
    );
    const wrap = el("div", { class: "c4-board" });
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cellEl = el("div", {
          class: "c4-cell" + (board[r][c] === 1 ? " p1" : board[r][c] === 2 ? " p2" : ""),
          onclick: () => clickCol(c),
        });
        wrap.append(cellEl);
      }
    }
    const btnRow = el("div", { class: "row-center" },
      el("button", { class: "cta-btn", onclick: reset }, "Заново"),
      el("button", { class: "cta-btn secondary", onclick: hardReset }, "Сбросить счёт"),
    );
    host.append(ind, wrap, btnRow);
  }
  function reset() {
    board = emptyBoard(); turn = 1; winner = null; recorded = false;
    render(); renderScore();
    if (mode === "ai" && localPlayer === 2) setTimeout(aiTurn, 350);
  }
  function hardReset() { scores = {1:0,2:0}; reset(); }

  if (mode === "online" && ctx.room) {
    ctx.room.on("move", ({ c, who }) => {
      if (who === localPlayer) return;
      applyDrop(c, who); render(); renderScore();
    });
    ctx.room.on("reset", () => reset());
  }

  render(); renderScore();
  ctx.registerCleanup?.(() => {});
}
