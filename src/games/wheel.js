// ─────────────────────────  GAME · WHEEL OF FORTUNE  ─────────────────────────

import { el, $ } from "../core/dom.js";
import { WHEEL_TASKS } from "../data/content.js";

export default function mount(host, ctx) {
  const tasks = WHEEL_TASKS;
  const total = tasks.length;
  const sliceDeg = 360 / total;

  const slices = tasks.map((t, i) => {
    const start = i * sliceDeg, end = (i + 1) * sliceDeg;
    const x1 = 50 + 50 * Math.cos((start - 90) * Math.PI / 180);
    const y1 = 50 + 50 * Math.sin((start - 90) * Math.PI / 180);
    const x2 = 50 + 50 * Math.cos((end   - 90) * Math.PI / 180);
    const y2 = 50 + 50 * Math.sin((end   - 90) * Math.PI / 180);
    const large = sliceDeg > 180 ? 1 : 0;
    const path = `M 50 50 L ${x1} ${y1} A 50 50 0 ${large} 1 ${x2} ${y2} Z`;
    const midAngle = (start + end) / 2 - 90;
    const tx = 50 + 28 * Math.cos(midAngle * Math.PI / 180);
    const ty = 50 + 28 * Math.sin(midAngle * Math.PI / 180);
    return `<g>
      <path d="${path}" fill="${t.color}" stroke="rgba(255,255,255,0.18)" stroke-width=".3"/>
      <text x="${tx}" y="${ty}" fill="white" font-size="3" text-anchor="middle" alignment-baseline="middle" transform="rotate(${midAngle + 90} ${tx} ${ty})" style="font-family:Inter;font-weight:700">${t.label.slice(0, 16)}</text>
    </g>`;
  }).join("");

  const svgEl = el("div", { html: `
    <div class="wheel-wrap">
      <div class="wheel-pointer"></div>
      <svg class="wheel-svg" viewBox="0 0 100 100" id="wheelSvg">
        ${slices}
        <circle cx="50" cy="50" r="6" fill="#fff"/>
        <circle cx="50" cy="50" r="3" fill="#ff5d8f"/>
      </svg>
    </div>` });

  const result = el("h2", {
    class: "display",
    style: "text-align:center;margin-top:18px;min-height:40px",
  }, "Крутани и узнай свою судьбу");

  let totalRot = 0;
  const spin = el("button", {
    class: "cta-btn", style: "display:block;margin:14px auto",
    onclick: () => {
      const wheel = $("#wheelSvg");
      const turns = 4 + Math.random() * 4;
      const offset = Math.random() * 360;
      totalRot += turns * 360 + offset;
      wheel.style.transform = `rotate(${totalRot}deg)`;
      setTimeout(() => {
        const finalAngle = (360 - (totalRot % 360)) % 360;
        const idx = Math.floor(finalAngle / sliceDeg) % total;
        result.textContent = tasks[idx].label + " 💫";
        ctx.confettiBurst({ count: 50, colors: [tasks[idx].color] });
      }, 4100);
    },
  }, "Крутить колесо");

  host.append(svgEl, spin, result);
}
