// ─────────────────────────  GAME · HANGMAN  ─────────────────────────
// One player guesses on this device; ctx.profile gets the result credit.

import { el } from "../core/dom.js";
import { pickRandom } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { HANGMAN_WORDS } from "../data/content.js";

const P1 = "Алина", P2 = "Артур";
const ALPHA = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");
const MAX = 7;

const PARTS = [
  `<line x1="20" y1="200" x2="200" y2="200"/>`,
  `<line x1="50" y1="200" x2="50" y2="20"/>`,
  `<line x1="50" y1="20" x2="130" y2="20"/>`,
  `<line x1="130" y1="20" x2="130" y2="50"/>`,
  `<circle cx="130" cy="70" r="20"/>`,
  `<line x1="130" y1="90" x2="130" y2="150"/>`,
  `<line x1="130" y1="110" x2="110" y2="130"/>`,
  `<line x1="130" y1="110" x2="150" y2="130"/>`,
  `<line x1="130" y1="150" x2="115" y2="180"/>`,
  `<line x1="130" y1="150" x2="145" y2="180"/>`,
];

export default function mount(host, ctx) {
  const entry = pickRandom(HANGMAN_WORDS);
  const word = entry.word;
  const guessed = new Set();
  let wrong = 0;
  const scores = { [P1]: 0, [P2]: 0 };
  let recorded = false;

  const renderScore = () => {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(P1, scores[P1]), scoreChip(P2, scores[P2]));
  };

  const isWon  = () => word.split("").every(l => guessed.has(l));
  const isLost = () => wrong >= MAX;

  const svg = () => {
    const total = 4 + wrong;
    return `<svg class="hangman-svg" viewBox="0 0 220 220">${PARTS.slice(0, total).join("")}</svg>`;
  };

  function render() {
    host.innerHTML = "";
    const won = isWon(), lost = isLost();
    if (won && !recorded) {
      const winner = ctx.profile;
      scores[winner] = (scores[winner] || 0) + 1;
      ctx.recordResult("hangman", winner, winner === P1 ? P2 : P1);
      ctx.confettiBurst({ count: 40 });
      recorded = true;
    } else if (lost && !recorded) {
      const loser = ctx.profile;
      scores[loser === P1 ? P2 : P1] = (scores[loser === P1 ? P2 : P1] || 0) + 1;
      ctx.recordResult("hangman", loser === P1 ? P2 : P1, loser);
      recorded = true;
    }
    const left = el("div", { class: "hangman-stage" },
      el("div", { html: svg() }),
      el("p", { style: "color:var(--text-2);margin-top:6px" }, `Ошибки: ${wrong} / ${MAX}`),
      el("div", { style: "margin-top:10px;font-style:italic" }, "Подсказка: " + entry.hint),
    );
    const display = word.split("").map(l => guessed.has(l) ? l : "_").join(" ");
    const letters = el("div", { class: "letter-grid" },
      ...ALPHA.map(ch => el("button", {
        class: "letter-btn" + (guessed.has(ch) ? (word.includes(ch) ? " hit" : " miss") : ""),
        disabled: guessed.has(ch) || won || lost,
        onclick: () => {
          guessed.add(ch);
          if (!word.includes(ch)) wrong++;
          render(); renderScore();
        },
      }, ch)),
    );
    const right = el("div", { class: "hangman-stage" },
      el("h2", { class: "display", style: "letter-spacing:.04em" }, `Угадывает: ${ctx.profile}`),
      el("div", { class: "word-display" }, display),
      letters,
      won  ? el("p", { style: "margin-top:14px;color:var(--win);font-weight:700" }, "Угадано! 💞") : null,
      lost ? el("p", { style: "margin-top:14px;color:var(--loss);font-weight:700" }, "Слово было: " + word) : null,
      el("button", { class: "cta-btn", style: "margin-top:14px", onclick: () => mount(host, ctx) }, "Новое слово"),
    );
    host.append(el("div", { class: "hangman-wrap" }, left, right));
  }
  render(); renderScore();
}
