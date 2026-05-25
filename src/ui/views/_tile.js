// ─────────────────────────  UI / VIEW HELPER · GAME TILE  ─────────────────────────
// Shared between home and games-view to avoid duplication.

import { el } from "../../core/dom.js";
import { go } from "../router.js";

export function tileFor(id, g) {
  if (!g) return el("div");
  const tagLabel = g.tag === "duo"  ? "Вдвоём"
                : g.tag === "solo" ? "Соло"
                : "Для пары";
  const modesBadge = (g.modes || []).filter(m => m !== "hotseat" && m !== g.tag).map(m => {
    const labels = { ai: "AI", online: "Online" };
    return el("span", { class: "tile-tag" }, labels[m] || m);
  });
  return el("button", {
    class: "game-tile",
    style: g.gradient ? `--tile-grad:${g.gradient}` : "",
    onclick: () => {
      const modes = (g.modes || []).filter(m => m !== "hotseat");
      if (modes.length === 1 && modes[0] === "online") go(`games/${id}/online`);
      else go(`games/${id}`);
    },
  },
    el("span", { class: "tile-icon" }, g.icon),
    el("span", { class: "tile-title" }, g.title),
    el("span", { class: "tile-sub" }, g.sub),
    el("span", { class: "tile-foot" },
      el("span", { class: `tile-tag ${g.tag}` }, tagLabel),
      ...modesBadge,
    ),
  );
}
