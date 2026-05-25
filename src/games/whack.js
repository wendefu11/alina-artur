// ─────────────────────────  GAME · WHACK-A-MOLE  ─────────────────────────

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";

const SIZE = 9;

export default function mount(host, ctx) {
  let score = 0;
  let time = 30;
  let running = false;
  let popInterval, tickInterval;
  let best = ctx.state.highScores[ctx.profile]?.whack || 0;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip("Очки", score),
      scoreChip("Время", time),
      scoreChip("Рекорд", best),
    );
  }

  const grid = el("div", { class: "whack-grid" });
  const moles = [];
  for (let i = 0; i < SIZE; i++) {
    const mole = el("div", { class: "whack-mole" }, "🐹");
    const hole = el("div", { class: "whack-hole", onclick: () => bonk(i) }, mole);
    moles.push({ mole, hole, up: false });
    grid.append(hole);
  }

  function bonk(i) {
    if (!running) return;
    const m = moles[i];
    if (!m.up) return;
    m.up = false;
    m.mole.classList.add("bonk");
    setTimeout(() => { m.mole.classList.remove("bonk", "up"); }, 250);
    score++;
    renderScore();
    ctx.confettiBurst({ count: 6 });
  }

  function popRandom() {
    if (!running) return;
    const i = Math.floor(Math.random() * SIZE);
    const m = moles[i];
    if (m.up) return;
    m.up = true;
    m.mole.classList.add("up");
    setTimeout(() => {
      if (m.up) { m.up = false; m.mole.classList.remove("up"); }
    }, 600 + Math.random() * 600);
  }

  function start() {
    score = 0; time = 30; running = true;
    renderScore();
    btn.disabled = true; btn.textContent = "Поехали!";
    popInterval = setInterval(popRandom, 550);
    tickInterval = setInterval(() => {
      time--;
      renderScore();
      if (time <= 0) {
        running = false;
        clearInterval(popInterval); clearInterval(tickInterval);
        moles.forEach(m => { m.up = false; m.mole.classList.remove("up"); });
        const improved = ctx.recordHighScore(ctx.profile, "whack", score);
        if (improved) { best = score; ctx.confettiBurst({ count: 60 }); ctx.toast("Новый рекорд!"); }
        btn.disabled = false; btn.textContent = "Ещё раз";
        renderScore();
      }
    }, 1000);
  }

  const btn = el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: start }, "Старт");
  host.append(grid,
    el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" }, "30 секунд. Тапай моль как только она выпрыгнула."),
    btn,
  );
  ctx.registerCleanup?.(() => { clearInterval(popInterval); clearInterval(tickInterval); running = false; });
  renderScore();
}
