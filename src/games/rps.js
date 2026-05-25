// ─────────────────────────  GAME · RPS  ─────────────────────────
// AI или online. Online: выбор скрыт до обоих — хост синхронизирует.

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { createRpsAi, beats } from "../engine/ai/rps.js";
import { MSG } from "../network/protocol.js";

const CHOICES = ["rock", "paper", "scissors"];
const LABEL_RU = { rock: "✊ Камень", paper: "✋ Бумага", scissors: "✌ Ножницы" };
const EMOJI = { rock: "✊", paper: "✋", scissors: "✌" };
const P1 = "Алина", P2 = "Артур";

export default function mount(host, ctx) {
  const mode = ctx.mode || "ai";
  const localPlayer = ctx.localPlayer || 1;
  const room = ctx.room;
  const isHost = room?.role === "host";
  const isOnline = mode === "online" && room;
  const ai = mode === "ai" ? createRpsAi() : null;

  let picks = { 1: null, 2: null };
  let locked = { 1: false, 2: false };
  let revealed = false;
  let myChoice = null;
  let scores = { 1: 0, 2: 0 };
  const unsub = [];

  function nameOf(n) { return mode === "ai" && n === 2 ? "AI" : (n === 1 ? P1 : P2); }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(nameOf(1), scores[1]), scoreChip(nameOf(2), scores[2]));
  }

  function resolve() {
    const r = beats(picks[1], picks[2]);
    return r === 0 ? null : (r === 1 ? 1 : 2);
  }

  function syncState() {
    if (!isOnline || !isHost) return;
    room.send(MSG.State, {
      locked: { ...locked },
      picks: revealed ? { ...picks } : { 1: null, 2: null },
      revealed,
      scores: { ...scores },
    });
  }

  function applyRemoteState(s) {
    if (!s) return;
    locked = { ...s.locked };
    scores = { ...s.scores };
    if (s.revealed) {
      picks = { ...s.picks };
      revealed = true;
    } else {
      picks = { 1: null, 2: null };
      revealed = false;
    }
    render();
    renderScore();
  }

  function finishRound() {
    revealed = true;
    const winner = resolve();
    if (winner === null) ctx.recordResult("rps", P1, P2, true);
    else {
      scores[winner] += 1;
      ctx.recordResult("rps", nameOf(winner), nameOf(winner === 1 ? P2 : P1));
      ctx.confettiBurst({ count: 40 });
    }
    if (mode === "ai") ai.observe(picks[1]);
    syncState();
  }

  function hostStorePick(from, choice) {
    picks[from] = choice;
    locked[from] = true;
    if (locked[1] && locked[2]) finishRound();
    else syncState();
  }

  function doPick(choice) {
    if (locked[localPlayer] || revealed) return;
    myChoice = choice;
    locked[localPlayer] = true;

    if (isOnline) {
      if (isHost) hostStorePick(localPlayer, choice);
      else room.send(MSG.Move, { action: "pick", from: localPlayer, choice });
    } else {
      picks[localPlayer] = choice;
      if (mode === "ai" && localPlayer === 1 && !picks[2]) picks[2] = ai.next();
      if (picks[1] && picks[2]) {
        revealed = true;
        finishRound();
      }
    }
    render();
    renderScore();
  }

  function nextRound() {
    picks = { 1: null, 2: null };
    locked = { 1: false, 2: false };
    revealed = false;
    myChoice = null;
    if (isOnline && isHost) syncState();
    render();
    renderScore();
  }

  function hardReset() {
    nextRound();
    scores = { 1: 0, 2: 0 };
    if (isOnline && isHost) syncState();
    renderScore();
  }

  function displayEmoji(slot) {
    if (revealed && picks[slot]) return EMOJI[picks[slot]];
    if (locked[slot]) return "✓";
    return "?";
  }

  function render() {
    host.innerHTML = "";
    const winner = revealed ? resolve() : null;

    const side = (slot, name) => {
      const isMe = slot === localPlayer;
      const canPick = !revealed && !locked[slot] && (!isOnline || isMe);
      return el("div", { class: "rps-side" },
        el("h3", {}, name + (isMe ? " (ты)" : "")),
        el("div", { class: "rps-emoji" + (revealed ? " shake" : "") }, displayEmoji(slot)),
        el("div", { class: "rps-choices" },
          ...CHOICES.map((ch) => el("button", {
            type: "button",
            class: "rps-btn" + (isMe && myChoice === ch && !revealed ? " picked" : ""),
            disabled: !canPick || (mode === "ai" && slot === 2),
            onclick: () => doPick(ch),
          }, LABEL_RU[ch].split(" ")[0])),
        ),
      );
    };

    let statusText;
    if (revealed) {
      statusText = winner === null ? "Ничья! Ещё раунд?" : `Раунд выиграл ${nameOf(winner)}.`;
    } else if (isOnline) {
      if (locked[localPlayer] && !locked[localPlayer === 1 ? 2 : 1]) {
        statusText = "Твой выбор принят. Ждём соперника…";
      } else if (!locked[localPlayer]) {
        statusText = "Сделай скрытый выбор — соперник не видит.";
      } else {
        statusText = "Ждём оба выбора…";
      }
    } else {
      statusText = "Сделай скрытый выбор.";
    }

    host.append(
      el("div", { class: "rps-stage" },
        side(1, nameOf(1)),
        el("div", { class: "rps-vs" }, "VS"),
        side(2, nameOf(2)),
      ),
      el("p", { class: "row-center rps-status" }, statusText),
      el("div", { class: "row-center", style: "margin-top:14px" },
        el("button", {
          type: "button",
          class: "cta-btn",
          onclick: nextRound,
          disabled: !revealed,
        }, "Следующий раунд"),
        el("button", {
          type: "button",
          class: "cta-btn secondary",
          onclick: hardReset,
        }, "Сброс"),
      ),
    );
  }

  if (isOnline) {
    if (isHost) {
      unsub.push(room.on(MSG.Move, ({ action, from, choice }) => {
        if (action === "pick" && from !== localPlayer) hostStorePick(from, choice);
        if (action === "next") nextRound();
        if (action === "reset") hardReset();
      }));
      unsub.push(room.on(MSG.Hello, () => syncState()));
      unsub.push(room.on("sync", () => syncState()));
      syncState();
    } else {
      unsub.push(room.on(MSG.State, applyRemoteState));
      room.send("sync", {});
    }
  }

  render();
  renderScore();
  ctx.registerCleanup?.(() => unsub.forEach((f) => f?.()));
}
