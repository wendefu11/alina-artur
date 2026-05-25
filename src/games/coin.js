// ─────────────────────────  GAME · COIN FLIP  ─────────────────────────

import { el } from "../core/dom.js";

export default function mount(host, ctx) {
  const coin = el("div", { class: "coin" }, "♥");
  const result = el("p", { style: "text-align:center;margin-top:14px;font-size:18px" }, "Брось и узнай.");
  host.append(coin, result,
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => {
      const r = Math.random() < 0.5;
      coin.style.transform = `rotateY(${1080 + (r ? 0 : 180)}deg)`;
      coin.textContent = r ? "♥" : "✦";
      setTimeout(() => {
        result.textContent = r ? "Орёл — выбирает Алина 💖" : "Решка — выбирает Артур 🌟";
      }, 1200);
    } }, "Бросить монетку"),
  );
}
