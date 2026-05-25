// ─────────────────────────  GAME · DICE  ─────────────────────────

import { el } from "../core/dom.js";

const FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];

export default function mount(host, ctx) {
  const dice = el("div", { style: "display:flex;gap:18px;justify-content:center;margin:22px 0" });
  function show(d1, d2) {
    dice.innerHTML = "";
    [d1, d2].forEach(v => {
      dice.append(el("div", { class: "dice rolling" }, FACES[v]));
    });
  }
  show(0, 0);

  const result = el("p", { style: "text-align:center;font-size:18px" },
    "Брось и сделай столько отжиманий, шагов или поцелуев.");
  host.append(dice, result,
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => {
      const a = Math.floor(Math.random()*6), b = Math.floor(Math.random()*6);
      show(a, b);
      result.textContent = `Выпало: ${a+1} и ${b+1}. Сумма ${a+b+2}.`;
    } }, "Бросить кубики"),
  );
}
