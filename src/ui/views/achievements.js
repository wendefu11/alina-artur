// ─────────────────────────  UI / VIEW · ACHIEVEMENTS  ─────────────────────────

import { el } from "../../core/dom.js";
import { ACHIEVEMENTS } from "../../data/achievements.js";

export function renderAchievements(state) {
  const root = el("div");
  const unlocked = state.achievements?.[state.profile] || {};
  const total = ACHIEVEMENTS.length;
  const have  = Object.keys(unlocked).length;
  const pct = Math.round(have / total * 100);

  root.append(el("div", { class: "section-header" },
    el("div", {},
      el("h2", { class: "display" }, "Достижения"),
      el("p", {}, `${have} из ${total} открыто (${pct}%) — у ${state.profile}.`),
    ),
  ));

  // progress bar
  root.append(el("div", { class: "love-meter-wrap" },
    el("div", { class: "love-meter" }, el("div", { class: "love-meter-fill", style: `width:${pct}%` })),
  ));

  const grid = el("div", { class: "ach-grid" });
  for (const a of ACHIEVEMENTS) {
    const isOpen = !!unlocked[a.id];
    if (a.tier === "secret" && !isOpen) {
      grid.append(card("❔", "???", "Скрытое достижение", a.tier, false));
      continue;
    }
    grid.append(card(a.icon, a.title, a.desc, a.tier, isOpen));
  }
  root.append(grid);
  return root;
}

function card(icon, title, desc, tier, on) {
  return el("div", {
    class: "ach-card" + (on ? " on" : " off") + " tier-" + tier,
  },
    el("div", { class: "ach-icon" }, icon),
    el("div", { class: "ach-body" },
      el("strong", {}, title),
      el("small", {}, desc),
    ),
    el("div", { class: "ach-state" }, on ? "Открыто" : "—"),
  );
}
