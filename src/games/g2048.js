// ─────────────────────────  GAME · 2048 (solo)  ─────────────────────────

import { el, pickRandom } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";

const N = 4;

export default function mount(host, ctx) {
  let grid;
  let score = 0;
  let high = ctx.state.highScores[ctx.profile]?.g2048 || 0;

  const empty = () => Array.from({ length: N }, () => Array(N).fill(0));

  function addRandom() {
    const empties = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empties.push([r,c]);
    if (!empties.length) return;
    const [r, c] = pickRandom(empties);
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slideRow(row) {
    const arr = row.filter(v => v);
    const out = []; let gained = 0; let i = 0;
    while (i < arr.length) {
      if (i + 1 < arr.length && arr[i] === arr[i+1]) {
        out.push(arr[i] * 2); gained += arr[i] * 2; i += 2;
      } else { out.push(arr[i]); i++; }
    }
    while (out.length < N) out.push(0);
    return [out, gained];
  }

  function move(dir) {
    const before = JSON.stringify(grid);
    let gained = 0;
    if (dir === "left") {
      for (let r = 0; r < N; r++) { const [n, g] = slideRow(grid[r]); grid[r] = n; gained += g; }
    } else if (dir === "right") {
      for (let r = 0; r < N; r++) { const [n, g] = slideRow(grid[r].slice().reverse()); grid[r] = n.reverse(); gained += g; }
    } else if (dir === "up") {
      for (let c = 0; c < N; c++) {
        const col = grid.map(r => r[c]); const [n, g] = slideRow(col);
        for (let r = 0; r < N; r++) grid[r][c] = n[r]; gained += g;
      }
    } else if (dir === "down") {
      for (let c = 0; c < N; c++) {
        const col = grid.map(r => r[c]).reverse(); const [n, g] = slideRow(col); n.reverse();
        for (let r = 0; r < N; r++) grid[r][c] = n[r]; gained += g;
      }
    }
    if (JSON.stringify(grid) !== before) {
      score += gained;
      if (score > high) { high = score; ctx.recordHighScore(ctx.profile, "g2048", score); }
      addRandom();
      if (isOver()) ctx.toast(`Конец! Счёт ${score}`);
    }
    render();
  }

  function isOver() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!grid[r][c]) return false;
      if (c + 1 < N && grid[r][c] === grid[r][c+1]) return false;
      if (r + 1 < N && grid[r][c] === grid[r+1][c]) return false;
    }
    return true;
  }

  function render() {
    host.innerHTML = "";
    const stage = el("div", { class: "g2048-stage" });
    const g = el("div", { class: "g2048-grid" });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      g.append(el("div", { class: "g2048-cell" + (v ? " pop" : ""), dataset: { v: v || "" } }, v || ""));
    }
    stage.append(g);
    const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:10px" }, "Стрелки / WASD. На телефоне — свайпы.");
    const mobile = el("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:240px;margin:14px auto" },
      el("div", {}), el("button", { class: "cta-btn secondary", onclick: () => move("up") }, "▲"), el("div", {}),
      el("button", { class: "cta-btn secondary", onclick: () => move("left") }, "◀"),
      el("div", {}),
      el("button", { class: "cta-btn secondary", onclick: () => move("right") }, "▶"),
      el("div", {}), el("button", { class: "cta-btn secondary", onclick: () => move("down") }, "▼"), el("div", {}),
    );
    const restart = el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => mount(host, ctx) }, "Начать заново");
    host.append(stage, mobile, help, restart);
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Счёт", score), scoreChip("Рекорд " + ctx.profile, high));
  }

  const handler = (e) => {
    const k = e.key.toLowerCase(); let dir = null;
    if (k === "arrowleft"  || k === "a") dir = "left";
    else if (k === "arrowright" || k === "d") dir = "right";
    else if (k === "arrowup"    || k === "w") dir = "up";
    else if (k === "arrowdown"  || k === "s") dir = "down";
    if (dir) { e.preventDefault(); move(dir); }
  };
  addEventListener("keydown", handler);

  let touchStart = null;
  host.addEventListener("touchstart", (e) => { touchStart = e.touches[0]; }, { passive: true });
  host.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.clientX;
    const dy = t.clientY - touchStart.clientY;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  });
  ctx.registerCleanup?.(() => removeEventListener("keydown", handler));

  grid = empty();
  addRandom(); addRandom();
  render();
}
