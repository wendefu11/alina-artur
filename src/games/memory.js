// ─────────────────────────  GAME · MEMORY  ─────────────────────────
// Hot-seat. Find pairs. Player with more pairs wins.

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { MEMORY_ICONS } from "../data/content.js";

const P1 = "Алина", P2 = "Артур";

export default function mount(host, ctx) {
  const ICONS = MEMORY_ICONS.slice(0, 8);
  const deck = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
  let flipped = [];
  let matched = new Set();
  let turn = 1;
  let scores = { 1: 0, 2: 0 };
  let lock = false;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(P1, scores[1]), scoreChip(P2, scores[2]));
  }

  function render() {
    host.innerHTML = "";
    const ind = el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot" }),
      el("span", {}, matched.size === deck.length
        ? `Игра окончена! ${scores[1] > scores[2] ? P1 : scores[2] > scores[1] ? P2 : "Ничья"}`
        : `Ходит ${turn === 1 ? P1 : P2}`,
      ),
    );
    const grid = el("div", { class: "memory-grid", style: "grid-template-columns: repeat(4, 1fr)" });
    deck.forEach((sym, i) => {
      const open = flipped.includes(i) || matched.has(i);
      const c = el("div", {
        class: "memory-card" + (open ? " flipped" : "") + (matched.has(i) ? " matched" : ""),
        onclick: () => {
          if (lock || open) return;
          flipped.push(i);
          render();
          if (flipped.length === 2) {
            lock = true;
            setTimeout(() => {
              const [a, b] = flipped;
              if (deck[a] === deck[b]) {
                matched.add(a); matched.add(b);
                scores[turn] += 1;
                if (matched.size === deck.length) {
                  if (scores[1] === scores[2]) ctx.recordResult("memory", P1, P2, true);
                  else {
                    const w = scores[1] > scores[2] ? 1 : 2;
                    ctx.recordResult("memory", w === 1 ? P1 : P2, w === 1 ? P2 : P1);
                    ctx.confettiBurst();
                  }
                }
              } else {
                turn = turn === 1 ? 2 : 1;
              }
              flipped = []; lock = false;
              render(); renderScore();
            }, 700);
          }
        },
      },
        el("div", { class: "memory-card-inner" },
          el("div", { class: "memory-card-face memory-card-front" }),
          el("div", { class: "memory-card-face memory-card-back" }, sym),
        ),
      );
      grid.append(c);
    });
    const btnRow = el("div", { class: "row-center" },
      el("button", { class: "cta-btn", onclick: () => mount(host, ctx) }, "Новая партия"),
    );
    host.append(ind, grid, btnRow);
  }
  render(); renderScore();
}
