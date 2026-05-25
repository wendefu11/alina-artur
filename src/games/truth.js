// ─────────────────────────  GAME · TRUTH OR DARE  ─────────────────────────

import { el, pickRandom } from "../core/dom.js";
import { TRUTHS, DARES } from "../data/content.js";

export default function mount(host, ctx) {
  let mode = "truth";
  const card = el("div", { class: "flashcard" });

  function show() {
    const pool = mode === "truth" ? TRUTHS : DARES;
    card.innerHTML = "";
    card.append(
      el("div", { class: "badge-row" },
        el("span", { class: "tag" }, mode === "truth" ? "ПРАВДА" : "ДЕЙСТВИЕ"),
        el("span", { class: "tag" }, "Для двоих"),
      ),
      el("h2", {}, pickRandom(pool)),
    );
  }
  show();

  host.append(
    card,
    el("div", { class: "row-center", style: "margin-top:18px" },
      el("button", { class: "cta-btn", onclick: () => { mode = "truth"; show(); } }, "Правда"),
      el("button", { class: "cta-btn secondary", onclick: () => { mode = "dare"; show(); } }, "Действие"),
      el("button", { class: "cta-btn ghost", onclick: show }, "Ещё"),
    ),
  );
}
