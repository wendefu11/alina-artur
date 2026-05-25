// ─────────────────────────  UI / VIEW · HOME  ─────────────────────────

import { el, plural } from "../../core/dom.js";
import { LOVE_LINES, DAILY_QUOTES, MOODS } from "../../data/content.js";
import { CATALOG } from "../../data/catalog.js";
import { setMood } from "../../storage/store.js";
import { toast } from "../../core/toast.js";
import { go } from "../router.js";
import { tileFor } from "./_tile.js";

export function renderHome(state) {
  const root = el("div");
  const start = new Date(state.startDate || "2024-02-14");
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  const meStats = state.stats[state.profile] || { wins: 0, bestStreak: 0 };
  const partner = state.profile === "Алина" ? "Артур" : "Алина";

  const today = new Date();
  const dayIndex = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    - Date.UTC(today.getFullYear(), 0, 0)) / 86400000);
  const q = DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];

  // hero
  const hero = el("div", { class: "card hero" },
    el("div", { class: "hero-grid" },
      el("div", {},
        el("div", { class: "eyebrow" }, el("span", { class: "dot" }), "Private match club"),
        el("h1", {}, "Привет, ", el("span", { class: "grad" }, state.profile || "друг"), "."),
        el("p", { class: "hero-text" },
          `${partner} ждёт твоего следующего хода. Здесь — ваши игры, дневник и статистика. Открывай меню «Игры» и поехали.`),
        el("div", { class: "hero-stats" },
          stat(String(days), `${plural(days,"день","дня","дней")} вместе`),
          stat(String(meStats.wins || 0), "побед"),
          stat(String(meStats.bestStreak || 0), "лучшая серия"),
        ),
        el("div", { class: "hero-actions" },
          el("button", { class: "cta-btn",            onclick: () => go("games") }, "🎮 Открыть игры"),
          el("button", { class: "cta-btn secondary",  onclick: () => go("games/truth") }, "💌 Правда / Действие"),
          el("button", { class: "cta-btn ghost",      onclick: () => go("diary") }, "📓 Дневник"),
        ),
        el("div", { class: "hero-typewriter", id: "heroTypewriter" }),
      ),
      el("div", {},
        el("div", { class: "couple-stage" },
          coupleCard("left",  "Алина", moodLabel(state, "Алина", "Никого нет краше")),
          el("div", { class: "couple-center" }, el("div", { class: "big-heart" })),
          coupleCard("right", "Артур", moodLabel(state, "Артур", "Готов к новому матчу")),
        ),
      ),
    ),
  );

  // daily quote
  const quote = el("div", { class: "quote-card" },
    el("div", { class: "quote-mark" }, "“"),
    el("blockquote", {}, q.text),
    el("cite", {}, "— " + q.author),
  );

  // mood
  const moodCard = el("div", { class: "card" },
    el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, `Настроение — ${state.profile}`),
                    el("p", {}, "Один тап — и партнёр сразу видит, как ты сегодня.")),
    ),
    el("div", { class: "mood-row" },
      ...MOODS.map(m => el("button", {
        class: "mood-chip" + (state.mood[state.profile]?.id === m.id ? " active" : ""),
        onclick: () => {
          setMood(state, state.profile, m.id);
          toast(`Настроение: ${m.label}`);
          // soft-reload: emit a hashchange to re-render
          const evt = new Event("hashchange"); window.dispatchEvent(evt);
        },
      }, el("span", {}, m.icon), m.label)),
    ),
  );

  // featured games
  const featured = el("div", { class: "card" },
    el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, "Сыграем?"), el("p", {}, "Подборка любимых. Все игры — на странице «Игры».")),
      el("button", { class: "cta-btn ghost", onclick: () => go("games") }, "Все игры →"),
    ),
    el("div", { class: "games-grid" },
      ...["ttt", "rps", "truth", "love", "wheel", "memory"].map(id => tileFor(id, CATALOG[id])),
    ),
  );

  root.append(hero, quote, moodCard, featured);
  queueMicrotask(() => mountTypewriter("#heroTypewriter", LOVE_LINES));
  return root;
}

function stat(v, label) {
  return el("div", { class: "hero-stat" },
    el("strong", {}, v),
    el("small", {}, label),
  );
}

function coupleCard(side, name, sub) {
  return el("div", { class: `couple-card ${side}` },
    el("div", { class: "avatar-big" }, name[0]),
    el("h3", {}, name),
    el("p", {}, sub),
  );
}

function moodLabel(state, profile, fallback) {
  const m = state.mood?.[profile];
  if (!m?.id) return fallback;
  const def = MOODS.find(x => x.id === m.id);
  return def ? `${def.icon} ${def.label}` : fallback;
}

function mountTypewriter(sel, lines) {
  const node = document.querySelector(sel); if (!node) return;
  let i = Math.floor(Math.random() * lines.length);
  let p = 0, dir = 1, line = lines[i];
  const tick = () => {
    if (!document.contains(node)) return;
    p += dir; node.textContent = line.slice(0, p);
    if (dir === 1 && p >= line.length) { dir = -1; setTimeout(tick, 1800); return; }
    if (dir === -1 && p <= 0) { i = (i + 1) % lines.length; line = lines[i]; dir = 1; setTimeout(tick, 280); return; }
    setTimeout(tick, dir === 1 ? 42 : 22);
  };
  tick();
}
