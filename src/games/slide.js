// ─────────────────────────  GAME · 15-PUZZLE  ─────────────────────────

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { SLIDE_SIZE } from "../data/content.js";

export default function mount(host, ctx) {
  const N = SLIDE_SIZE;
  let board = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N));
  let moves = 0;
  let best = ctx.state.highScores[ctx.profile]?.slide || 9999;
  let won = false;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip("Ходы", moves),
      scoreChip("Лучшее", best === 9999 ? "—" : best),
    );
  }

  function shuffle() {
    moves = 0; won = false;
    let emptyIdx = N * N - 1;
    for (let i = 0; i < 200; i++) {
      const r = Math.floor(emptyIdx / N), c = emptyIdx % N;
      const ns = [];
      if (r > 0)     ns.push(emptyIdx - N);
      if (r < N - 1) ns.push(emptyIdx + N);
      if (c > 0)     ns.push(emptyIdx - 1);
      if (c < N - 1) ns.push(emptyIdx + 1);
      const m = ns[Math.floor(Math.random() * ns.length)];
      [board[emptyIdx], board[m]] = [board[m], board[emptyIdx]];
      emptyIdx = m;
    }
  }

  function move(i) {
    if (won) return;
    const emptyIdx = board.indexOf(0);
    const r1 = Math.floor(i / N), c1 = i % N;
    const r2 = Math.floor(emptyIdx / N), c2 = emptyIdx % N;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    [board[i], board[emptyIdx]] = [board[emptyIdx], board[i]];
    moves++;
    render();
    if (board.every((v, idx) => v === (idx + 1) % (N * N))) {
      won = true;
      ctx.confettiBurst({ count: 80 });
      ctx.toast(`Собрано за ${moves} ходов!`);
      const improved = ctx.recordHighScore(ctx.profile, "slide", moves, true);
      if (improved) best = moves;
    }
    renderScore();
  }

  const wrap = el("div", { class: "slide-grid", style: `grid-template-columns: repeat(${N}, 1fr)` });
  function render() {
    wrap.innerHTML = "";
    board.forEach((v, i) => {
      wrap.append(el("div", {
        class: "slide-tile" + (v === 0 ? " empty" : ""),
        onclick: () => v && move(i),
      }, v === 0 ? "" : String(v)));
    });
  }
  shuffle(); render();

  host.append(wrap,
    el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" },
      `Собери порядок 1 → ${N*N-1}. Меньше ходов — лучше.`),
    el("div", { class: "row-center", style: "margin-top:14px" },
      el("button", { class: "cta-btn", onclick: () => { shuffle(); render(); renderScore(); } }, "Перемешать"),
    ),
  );
  renderScore();
}
