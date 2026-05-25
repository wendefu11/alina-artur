// ─────────────────────────  GAME · HANGMAN  ─────────────────────────
// Online. Host = слово. По очереди угадывают буквы.

import { el, pickRandom } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { MSG } from "../network/protocol.js";
import { HANGMAN_WORDS } from "../data/content.js";

const P1 = "Алина", P2 = "Артур";
const ALPHA = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");
const MAX = 7;

const PARTS = [
  `<line x1="20" y1="200" x2="200" y2="200"/>`,
  `<line x1="50" y1="200" x2="50" y2="20"/>`,
  `<line x1="50" y1="20" x2="130" y2="20"/>`,
  `<line x1="130" y1="20" x2="130" y2="50"/>`,
  `<circle cx="130" cy="70" r="20"/>`,
  `<line x1="130" y1="90" x2="130" y2="150"/>`,
  `<line x1="130" y1="110" x2="110" y2="130"/>`,
  `<line x1="130" y1="110" x2="150" y2="130"/>`,
  `<line x1="130" y1="150" x2="115" y2="180"/>`,
  `<line x1="130" y1="150" x2="145" y2="180"/>`,
];

function freshState() {
  const entry = pickRandom(HANGMAN_WORDS);
  return {
    word: entry.word,
    hint: entry.hint,
    guessed: [],
    wrong: 0,
    turn: 1,
    recorded: false,
    scores: { 1: 0, 2: 0 },
  };
}

export default function mount(host, ctx) {
  const room = ctx.room;
  const isHost = room?.role === "host";
  const mySlot = ctx.profile === P1 ? 1 : 2;
  let state = isHost ? freshState() : null;
  let ready = isHost;
  const unsub = [];

  function broadcast() {
    if (isHost && state) room.send(MSG.State, state);
  }

  function ingest(s) {
    state = s;
    ready = true;
    render();
    renderScore();
  }

  function isWon() {
    return state.word.split("").every((l) => state.guessed.includes(l));
  }
  function isLost() {
    return state.wrong >= MAX;
  }

  function finishRound(winnerSlot) {
    if (state.recorded) return;
    state.recorded = true;
    if (isHost) {
      const w = winnerSlot === 1 ? P1 : P2;
      const l = winnerSlot === 1 ? P2 : P1;
      state.scores[winnerSlot] += 1;
      ctx.recordResult("hangman", w, l);
      ctx.confettiBurst({ count: 40 });
      broadcast();
    }
  }

  function guess(ch) {
    if (!state || state.guessed.includes(ch)) return;
    if (state.turn !== mySlot) { ctx.toast("Сейчас не твой ход"); return; }
    if (!isHost) {
      room.send(MSG.Move, { letter: ch, from: mySlot });
      return;
    }
    applyGuess(ch);
    broadcast();
    render();
    renderScore();
  }

  function applyGuess(ch) {
    state.guessed.push(ch);
    if (!state.word.includes(ch)) state.wrong += 1;
    const won = isWon();
    const lost = isLost();
    if (won) finishRound(state.turn);
    else if (lost) finishRound(state.turn === 1 ? 2 : 1);
    else if (!won && !lost) state.turn = state.turn === 1 ? 2 : 1;
  }

  function renderScore() {
    if (!state) return;
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(P1, state.scores[1]), scoreChip(P2, state.scores[2]));
  }

  function render() {
    host.innerHTML = "";
    if (!ready || !state) {
      host.append(el("p", { class: "muted" }, "Синхронизация…"));
      return;
    }
    const won = isWon();
    const lost = isLost();
    const svg = `<svg class="hangman-svg" viewBox="0 0 220 220">${PARTS.slice(0, 4 + state.wrong).join("")}</svg>`;
    const display = state.word.split("").map((l) => (state.guessed.includes(l) ? l : "_")).join(" ");

    host.append(el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot" }),
      el("span", {}, won || lost
        ? (won ? `${name(state.turn)} угадал${state.turn === 1 ? "а" : ""}!` : `Слово: ${state.word}`)
        : state.turn === mySlot ? "Твой ход — угадай букву" : `Ход ${name(state.turn)}`),
    ));

    const letters = el("div", { class: "letter-grid" },
      ...ALPHA.map((ch) => el("button", {
        class: "letter-btn" + (state.guessed.includes(ch) ? (state.word.includes(ch) ? " hit" : " miss") : ""),
        disabled: state.guessed.includes(ch) || won || lost || state.turn !== mySlot,
        onclick: () => guess(ch),
      }, ch)),
    );

    host.append(el("div", { class: "hangman-wrap" },
      el("div", { class: "hangman-stage" },
        el("div", { html: svg }),
        el("p", { style: "color:var(--text-2);margin-top:6px" }, `Ошибки: ${state.wrong} / ${MAX}`),
        el("p", { style: "margin-top:8px;font-style:italic" }, "Подсказка: " + state.hint),
      ),
      el("div", { class: "hangman-stage" },
        el("div", { class: "word-display" }, display),
        letters,
      ),
    ));

    if (isHost) {
      host.append(el("button", {
        class: "cta-btn", style: "margin-top:14px",
        onclick: () => { state = freshState(); broadcast(); render(); renderScore(); },
      }, "Новое слово"));
    }
  }

  function name(slot) { return slot === 1 ? P1 : P2; }

  if (isHost) {
    unsub.push(room.on(MSG.Move, ({ letter, from }) => {
      if (from === state.turn) {
        applyGuess(letter);
        broadcast();
        render();
        renderScore();
      }
    }));
    unsub.push(room.on("sync", broadcast));
    unsub.push(room.on(MSG.Hello, broadcast));
    broadcast();
  } else {
    unsub.push(room.on(MSG.State, ingest));
    room.send("sync", {});
  }

  render();
  renderScore();
  ctx.registerCleanup(() => unsub.forEach((f) => f?.()));
}
