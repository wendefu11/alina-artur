// ─────────────────────────  UI / VIEW · STATS  ─────────────────────────

import { el, formatDate } from "../../core/dom.js";
import { CATALOG } from "../../data/catalog.js";

const PROFILES = ["Алина", "Артур"];

export function renderStats(state) {
  const root = el("div");
  root.append(el("div", { class: "section-header" },
    el("div", {}, el("h2", { class: "display" }, "Статистика"),
                  el("p", {}, "Победы, поражения, рекорды и история матчей.")),
  ));

  // per-profile boxes
  const sCards = el("div", { class: "stats-grid" });
  PROFILES.forEach(p => {
    const s = state.stats[p] || { wins: 0, losses: 0, draws: 0, bestStreak: 0, byGame: {} };
    const hs = state.highScores[p] || {};
    const box = el("div", { class: "stat-box" },
      el("h3", {},
        el("span", { class: "badge-avatar",
          style: `background:${p === "Алина" ? "var(--alina-grad)" : "var(--artur-grad)"}` }, "А"),
        p),
      row("Победы",          s.wins, "var(--win)"),
      row("Поражения",       s.losses, "var(--loss)"),
      row("Ничьи",           s.draws, "var(--draw)"),
      row("Лучшая серия",    s.bestStreak),
      row("Текущая серия",   s.streakWin || 0),
      hs.snake     != null ? row("🐍 Snake — рекорд", hs.snake) : null,
      hs.g2048     != null ? row("🧮 2048 — рекорд",  hs.g2048) : null,
      hs.reaction  != null ? row("⚡ Реакция — лучшее", hs.reaction + " мс") : null,
      hs.simon     != null ? row("🎵 Simon — рекорд",  hs.simon) : null,
      hs.whack     != null ? row("🐹 Whack — рекорд",  hs.whack) : null,
      hs.slide     != null ? row("🔢 15-puzzle — лучшее (ходы)", hs.slide) : null,
      hs.love      != null ? row("💘 Love-meter — макс", hs.love + "%") : null,
    );
    sCards.append(box);
  });
  root.append(sCards);

  // history
  const hist = el("div", { class: "card" },
    el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, "История матчей"),
                    el("p", {}, "Последние 50 партий.")),
    ),
  );
  const list = el("div", { class: "history-list" });
  const arr = (state.history || []).slice(0, 50);
  if (!arr.length) list.append(el("p", { class: "muted" }, "Пока нет ни одной партии — самое время начать."));
  arr.forEach(h => {
    const game = CATALOG[h.game]?.title || h.game;
    if (h.draw) {
      list.append(el("div", { class: "history-item" },
        el("div", {},
          el("strong", {}, `${h.winner} и ${h.loser || ""}`),
          el("div", { class: "meta" }, `${game} · ${formatDate(h.ts)}`),
        ),
        el("span", { class: "history-badge draw" }, "Ничья"),
      ));
    } else {
      const female = h.winner === "Алина";
      list.append(el("div", { class: "history-item" },
        el("div", {},
          el("strong", {}, `${h.winner} победил${female ? "а" : ""}`),
          el("div", { class: "meta" }, `${game} · vs ${h.loser} · ${formatDate(h.ts)}`),
        ),
        el("span", { class: "history-badge win" }, "Победа"),
      ));
    }
  });
  hist.append(list);
  root.append(hist);
  return root;
}

function row(label, value, color) {
  return el("div", { class: "stat-row" },
    el("span", {}, label),
    el("strong", { style: color ? `color:${color}` : "" }, String(value)),
  );
}
