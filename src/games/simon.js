// ─────────────────────────  GAME · SIMON SAYS  ─────────────────────────
// Sound via the shared audio system (core/audio.js).

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { tone } from "../core/audio.js";
import { SIMON_COLORS } from "../data/content.js";

export default function mount(host, ctx) {
  let seq = [];
  let userIdx = 0;
  let playing = false;
  let best = ctx.state.highScores[ctx.profile]?.simon || 0;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Раунд", seq.length), scoreChip("Рекорд", best));
  }

  const stage = el("div", { class: "simon-stage" });
  const pads = SIMON_COLORS.map((s, i) => el("button", {
    class: `simon-pad s${i}`,
    onclick: () => userPress(i),
  }));
  pads.forEach(p => stage.append(p));
  const center = el("div", { class: "simon-center" }, "Старт");
  stage.append(center);

  host.append(stage,
    el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" }, "Повтори последовательность."),
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: nextRound }, "Начать"),
  );

  async function flash(i, ms = 360) {
    pads[i].classList.add("lit");
    tone(SIMON_COLORS[i].tone, ms - 20);
    await new Promise(r => setTimeout(r, ms));
    pads[i].classList.remove("lit");
    await new Promise(r => setTimeout(r, 120));
  }

  async function playSequence() {
    playing = true;
    center.textContent = "Смотри";
    for (const i of seq) await flash(i);
    playing = false;
    userIdx = 0;
    center.textContent = "Повторяй";
  }

  function nextRound() {
    seq.push(Math.floor(Math.random() * 4));
    renderScore();
    setTimeout(playSequence, 250);
  }

  async function userPress(i) {
    if (playing) return;
    if (seq.length === 0) { nextRound(); return; }
    await flash(i, 220);
    if (seq[userIdx] !== i) {
      center.textContent = "Ой!";
      tone(120, 400);
      if (seq.length - 1 > best) {
        best = seq.length - 1;
        ctx.recordHighScore(ctx.profile, "simon", best);
        ctx.confettiBurst({ count: 30 });
      }
      ctx.toast(`Конец на раунде ${seq.length}`);
      seq = []; userIdx = 0;
      renderScore();
      return;
    }
    userIdx++;
    if (userIdx >= seq.length) {
      center.textContent = "Класс!";
      setTimeout(nextRound, 700);
    }
  }
  renderScore();
}
