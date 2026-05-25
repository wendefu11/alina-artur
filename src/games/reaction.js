// ─────────────────────────  GAME · REACTION (solo)  ─────────────────────────

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";

export default function mount(host, ctx) {
  const stage = el("div", { class: "reaction-stage" }, "Жди зелёный...");
  let phase = "wait";
  let timer = null;
  let startTs = 0;
  let best = ctx.state.highScores[ctx.profile]?.reaction || 9999;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Лучший " + ctx.profile, best === 9999 ? "—" : best + " мс"));
  }

  stage.addEventListener("click", () => {
    if (phase === "wait") {
      stage.textContent = "Ждём...";
      stage.classList.remove("go", "fail");
      phase = "armed";
      timer = setTimeout(() => {
        stage.classList.add("go");
        stage.textContent = "ЖМИ!";
        phase = "go";
        startTs = performance.now();
      }, 800 + Math.random() * 2500);
    } else if (phase === "armed") {
      clearTimeout(timer);
      stage.classList.add("fail");
      stage.textContent = "Рано! Нажми снова чтобы попробовать.";
      phase = "wait";
    } else if (phase === "go") {
      const time = Math.round(performance.now() - startTs);
      if (time < best) {
        best = time;
        ctx.recordHighScore(ctx.profile, "reaction", time, true);
        ctx.confettiBurst({ count: 30 });
        stage.textContent = `${time} мс — новый рекорд!`;
      } else {
        stage.textContent = `${time} мс. Лучший: ${best} мс. Нажми чтобы повторить.`;
      }
      stage.classList.remove("go");
      renderScore();
      phase = "wait";
    } else {
      stage.classList.remove("fail");
      stage.textContent = "Жди зелёный...";
      phase = "wait";
    }
  });

  ctx.registerCleanup?.(() => clearTimeout(timer));
  const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:12px" },
    "Кликай по полю. Когда станет зелёным — жми ещё раз как можно быстрее.");
  host.append(stage, help);
  renderScore();
}
