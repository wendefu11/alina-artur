// ─────────────────────────  GAME · COMPLIMENT MACHINE  ─────────────────────────

import { el, pickRandom } from "../core/dom.js";
import { emit } from "../core/events.js";
import { COMPLIMENTS } from "../data/content.js";

export default function mount(host, ctx) {
  const card = el("div", { class: "flashcard" });

  function show() {
    card.innerHTML = "";
    card.append(
      el("div", { class: "badge-row" }, el("span", { class: "tag" }, "Комплимент дня")),
      el("h2", {}, pickRandom(COMPLIMENTS)),
      el("p", {}, "Скажи это вслух с улыбкой."),
    );
    emit("counter:compliment", { profile: ctx.profile });
  }
  show();

  host.append(card,
    el("div", { class: "row-center", style: "margin-top:18px" },
      el("button", { class: "cta-btn", onclick: () => { show(); ctx.confettiBurst({ count: 30 }); } },
        "Ещё комплимент"),
    ),
  );
}
