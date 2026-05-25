// ─────────────────────────  ENGINE / SCOREBOARD  ─────────────────────────
// Score chip used by every game. Pure UI primitive.

import { el } from "../core/dom.js";

export function scoreChip(label, value) {
  return el("div", { class: "score-chip" },
    el("small", {}, label),
    el("strong", {}, String(value)),
  );
}

export function renderScoreboard(scoreboardEl, chips) {
  scoreboardEl.innerHTML = "";
  for (const c of chips) scoreboardEl.append(c);
}
