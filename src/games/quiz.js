// ─────────────────────────  GAME · COUPLE QUIZ  ─────────────────────────

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { COUPLE_QUIZ } from "../data/content.js";

export default function mount(host, ctx) {
  const questions = [...COUPLE_QUIZ].sort(() => Math.random() - 0.5).slice(0, 8);
  let idx = 0;
  let score = 0;

  function render() {
    host.innerHTML = "";
    if (idx >= questions.length) {
      ctx.addQuizScore(ctx.profile, score, questions.length);
      ctx.confettiBurst();
      host.append(
        el("div", { class: "flashcard" },
          el("h2", {}, "Игра окончена 💞"),
          el("p", {}, `Ты ответил(а) на ${questions.length} вопросов.`),
          el("p", {}, "Сверьте ответы вместе и поставьте балл."),
        ),
        el("button", { class: "cta-btn", style: "display:block;margin:18px auto", onclick: () => mount(host, ctx) }, "Ещё раз"),
      );
      return;
    }
    const q = questions[idx];
    const card = el("div", { class: "flashcard" },
      el("div", { class: "badge-row" }, el("span", { class: "tag" }, `Вопрос ${idx + 1} / ${questions.length}`)),
      el("h2", {}, q),
      el("p", {}, `Отвечает: ${ctx.profile}. Партнёр потом проверит.`),
    );
    const ans = el("input", { type: "text", class: "text-input", placeholder: "Твой ответ...", style: "margin-top:14px" });
    host.append(card, ans, el("div", { style: "display:flex;gap:10px;margin-top:10px" },
      el("button", { class: "cta-btn secondary", onclick: () => { score++; idx++; render(); } }, "Угадал(а)"),
      el("button", { class: "cta-btn ghost", onclick: () => { idx++; render(); } }, "Не угадал(а)"),
    ));
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Очки", score));
  }
  render();
}
