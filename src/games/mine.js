// ─────────────────────────  GAME · MINESWEEPER  ─────────────────────────

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";

const W = 9, H = 9, MINES = 10;

export default function mount(host, ctx) {
  let board, opened, flagged;
  let gameOver = false, won = false;

  function reset() {
    gameOver = false; won = false;
    board   = Array.from({ length: H }, () => Array(W).fill(0));
    opened  = Array.from({ length: H }, () => Array(W).fill(false));
    flagged = Array.from({ length: H }, () => Array(W).fill(false));
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * H), c = Math.floor(Math.random() * W);
      if (board[r][c] === -1) continue;
      board[r][c] = -1; placed++;
    }
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (board[r][c] === -1) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
        if (board[nr][nc] === -1) n++;
      }
      board[r][c] = n;
    }
  }

  function openCell(r, c) {
    if (r < 0 || c < 0 || r >= H || c >= W) return;
    if (opened[r][c] || flagged[r][c]) return;
    opened[r][c] = true;
    if (board[r][c] === -1) { gameOver = true; return; }
    if (board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        openCell(r + dr, c + dc);
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (board[r][c] !== -1 && !opened[r][c]) return false;
    }
    return true;
  }

  function renderScore() {
    let flags = 0;
    for (const row of flagged) for (const f of row) if (f) flags++;
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip("Флаги", `${flags} / ${MINES}`),
      scoreChip("Статус", gameOver ? "Бум 💥" : won ? "Победа!" : "Идём"),
    );
  }

  const grid = el("div", { class: "mine-grid", style: `grid-template-columns: repeat(${W}, 1fr)` });
  function render() {
    grid.innerHTML = "";
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const isOpen = opened[r][c];
      const isFlag = flagged[r][c];
      const v = board[r][c];
      const cls = "mine-cell"
        + (isOpen ? " opened" : "")
        + (isFlag && !isOpen ? " flag" : "")
        + (isOpen && v === -1 ? " boom" : "");
      const txt = isOpen ? (v === -1 ? "💣" : (v > 0 ? String(v) : "")) : "";
      grid.append(el("div", {
        class: cls,
        dataset: isOpen && v > 0 ? { n: String(v) } : {},
        onclick: () => {
          if (gameOver || won) return;
          if (isFlag) return;
          openCell(r, c);
          if (gameOver) {
            for (let rr = 0; rr < H; rr++) for (let cc = 0; cc < W; cc++) {
              if (board[rr][cc] === -1) opened[rr][cc] = true;
            }
            ctx.toast("Бум! Попробуй ещё.");
          } else if (checkWin()) {
            won = true;
            ctx.confettiBurst({ count: 80 });
            ctx.toast("Очищено! 💎");
          }
          render(); renderScore();
        },
        oncontextmenu: (e) => {
          e.preventDefault();
          if (gameOver || won || opened[r][c]) return;
          flagged[r][c] = !flagged[r][c];
          render(); renderScore();
        },
      }, txt));
    }
  }
  reset(); render();

  host.append(grid,
    el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" },
      "Левый клик — открыть. Правый — флаг. На телефоне — долгое нажатие."),
    el("div", { class: "row-center", style: "margin-top:14px" },
      el("button", { class: "cta-btn", onclick: () => { reset(); render(); renderScore(); } }, "Новое поле"),
    ),
  );
  renderScore();
}
