// ─────────────────────────  GAME · RPS  ─────────────────────────
// Hot-seat (both pick on the same device, hidden), AI, or online.

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { createRpsAi, beats } from "../engine/ai/rps.js";

const CHOICES = ["rock", "paper", "scissors"];
const LABEL_RU = { rock: "✊ Камень", paper: "✋ Бумага", scissors: "✌ Ножницы" };
const EMOJI    = { rock: "✊",       paper: "✋",       scissors: "✌"        };
const P1 = "Алина", P2 = "Артур";

export default function mount(host, ctx) {
  const mode = ctx.mode || "ai";
  const localPlayer = ctx.localPlayer || 1;
  const ai = mode === "ai" ? createRpsAi() : null;

  let pick = { 1: null, 2: null };
  let scores = { 1: 0, 2: 0 };

  function nameOf(n) { return mode === "ai" && n === 2 ? "AI" : (n === 1 ? P1 : P2); }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(nameOf(1), scores[1]), scoreChip(nameOf(2), scores[2]));
  }

  function resolve() {
    const r = beats(pick[1], pick[2]);
    return r === 0 ? null : (r === 1 ? 1 : 2);
  }

  function doPick(slot, choice) {
    pick[slot] = choice;
    if (mode === "ai" && slot === 1 && !pick[2]) {
      pick[2] = ai.next();
    }
    if (mode === "online" && slot === localPlayer) {
      ctx.room?.send("pick", { who: localPlayer, choice });
    }
    afterPick();
  }

  function afterPick() {
    const both = pick[1] && pick[2];
    if (both) {
      const winner = resolve();
      if (winner === null) ctx.recordResult("rps", P1, P2, true);
      else {
        scores[winner] += 1;
        ctx.recordResult("rps", nameOf(winner), nameOf(winner === 1 ? 2 : 1));
        ctx.confettiBurst({ count: 40 });
      }
      if (mode === "ai") ai.observe(pick[1]);
    }
    render(); renderScore();
  }

  function render() {
    host.innerHTML = "";
    const both = pick[1] && pick[2];
    const winner = both ? resolve() : null;

    const side = (slot, name) => {
      const myTurn = mode === "online" ? slot === localPlayer : true;
      return el("div", { class: "rps-side" },
        el("h3", {}, name),
        el("div", { class: "rps-emoji" + (both ? " shake" : "") },
          both ? EMOJI[pick[slot]] : (pick[slot] ? "✓" : "?"),
        ),
        el("div", { class: "rps-choices" },
          ...CHOICES.map(ch => el("button", {
            class: "rps-btn" + (pick[slot] === ch && !both ? " picked" : ""),
            disabled: both || !myTurn || (mode === "ai" && slot === 2),
            onclick: () => doPick(slot, ch),
          }, LABEL_RU[ch].split(" ")[0])),
        ),
      );
    };
    const resultText = both
      ? (winner === null ? "Ничья! Бросьте ещё раз." : `Раунд выиграл ${nameOf(winner)}.`)
      : (mode === "online" ? "Ждём оба выбора..." : "Каждый делает скрытый выбор — потом откроем.");

    host.append(
      el("div", { class: "rps-stage" },
        side(1, nameOf(1)),
        el("div", { class: "rps-vs" }, "VS"),
        side(2, nameOf(2)),
      ),
      el("p", { class: "row-center" }, resultText),
      el("div", { class: "row-center", style: "margin-top:14px" },
        el("button", { class: "cta-btn", onclick: () => { pick = {1:null,2:null}; render(); }, disabled: !both }, "Следующий раунд"),
        el("button", { class: "cta-btn secondary", onclick: () => { pick = {1:null,2:null}; scores={1:0,2:0}; render(); renderScore(); } }, "Сброс"),
      ),
    );
  }

  if (mode === "online" && ctx.room) {
    ctx.room.on("pick", ({ who, choice }) => {
      if (who === localPlayer) return;
      pick[who] = choice;
      afterPick();
    });
  }

  render(); renderScore();
}
