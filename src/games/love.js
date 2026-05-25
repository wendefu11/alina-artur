// ─────────────────────────  GAME · LOVE-O-METER  ─────────────────────────

import { el } from "../core/dom.js";

export default function mount(host, ctx) {
  const wrap = el("div", { class: "love-meter-wrap", style: "margin:0 auto" });
  const pct = el("h2", { class: "love-percent" }, "—");
  const bar = el("div", { class: "love-meter" });
  const fill = el("div", { class: "love-meter-fill" });
  bar.append(fill);
  const verdict = el("p", { style: "text-align:center;color:var(--text-2)" }, "Жмёшь — узнаёшь.");
  wrap.append(pct, bar, verdict);

  host.append(wrap,
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => {
      const v = 70 + Math.floor(Math.random() * 31);
      fill.style.width = v + "%";
      setTimeout(() => {
        pct.textContent = v + "%";
        verdict.textContent = v >= 95 ? "Это судьба ✨" : v >= 85 ? "Огонь ❤" : "Очень неплохо, но добавьте обнимашек 🤗";
        ctx.confettiBurst({ count: 30 });
        ctx.recordHighScore?.(ctx.profile, "love", v);
      }, 1500);
    } }, "Замерить любовь"),
  );
}
