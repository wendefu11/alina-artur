// All games mounted into a host element via mountGame(id, host, ctx).
// ctx = { profile, partner, recordResult, recordHighScore, addQuizScore, toast, confettiBurst, scoreboardEl }

import { el, $, $$, pickRandom } from "./app.js";
import {
  TRUTHS, DARES, COMPLIMENTS, COUPLE_QUIZ, WHEEL_TASKS, HANGMAN_WORDS, MEMORY_ICONS,
  SIMON_COLORS, SLIDE_SIZE,
} from "./data.js";

export function mountGame(id, host, ctx) {
  // Run cleanup of previous game (if any)
  if (window.__gameCleanup) { try { window.__gameCleanup(); } catch (e) {} }
  window.__gameCleanup = null;
  host.innerHTML = "";
  ctx.scoreboardEl.innerHTML = "";
  const fn = GAMES[id];
  if (!fn) {
    host.append(el("p", {}, "Игра не найдена."));
    return;
  }
  // Helper: games call ctx.registerCleanup(fn) to clean their listeners
  ctx.registerCleanup = (fn) => { window.__gameCleanup = fn; };
  fn(host, ctx);
}

function scoreChip(label, value) {
  return el("div", { class: "score-chip" },
    el("small", {}, label),
    el("strong", {}, String(value)),
  );
}

// ─────────────────────────  TIC TAC TOE  ─────────────────────────
function mountTTT(host, ctx) {
  let board = Array(9).fill("");
  let turn = 1; // 1=X (Алина), 2=O (Артур)
  let winner = null;
  let scores = { 1: 0, 2: 0 };
  const p1 = "Алина", p2 = "Артур";

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(`${p1} (✕)`, scores[1]),
      scoreChip(`${p2} (◯)`, scores[2]),
    );
  }

  function check() {
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of L) {
      if (board[a] && board[a] === board[b] && board[b] === board[c]) return [board[a], [a,b,c]];
    }
    if (board.every(Boolean)) return ["draw", []];
    return [null, []];
  }

  function render() {
    host.innerHTML = "";
    const ind = el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot" }),
      el("span", {}, winner ? (winner === "draw" ? "Ничья — нажми \"Заново\"" : `Победил ${winner === "X" ? p1 : p2} 🌟`) : `Ходит ${turn === 1 ? p1 : p2} (${turn === 1 ? "✕" : "◯"})`),
    );
    const grid = el("div", { class: "ttt-board" });
    const [_, line] = check();
    board.forEach((cell, i) => {
      const c = el("button", {
        class: "ttt-cell" + (cell ? " taken " + (cell === "X" ? "x" : "o") : "") + (line.includes(i) ? " win" : ""),
        onclick: () => {
          if (winner || cell) return;
          board[i] = turn === 1 ? "X" : "O";
          const [w] = check();
          if (w) {
            winner = w;
            if (w === "draw") {
              ctx.recordResult("ttt", p1, p2, true);
            } else {
              const win = w === "X" ? p1 : p2;
              const lose = w === "X" ? p2 : p1;
              scores[w === "X" ? 1 : 2] += 1;
              ctx.recordResult("ttt", win, lose);
              ctx.confettiBurst();
            }
          } else {
            turn = turn === 1 ? 2 : 1;
          }
          render();
          renderScore();
        },
      }, cell === "X" ? "✕" : cell === "O" ? "◯" : "");
      grid.append(c);
    });
    const btnRow = el("div", { style: "display:flex;gap:10px;justify-content:center;margin-top:14px" },
      el("button", { class: "cta-btn", onclick: () => { board = Array(9).fill(""); turn = 1; winner = null; render(); } }, "Заново"),
      el("button", { class: "cta-btn secondary", onclick: () => { board = Array(9).fill(""); turn = 1; winner = null; scores = {1:0,2:0}; render(); renderScore(); } }, "Сбросить счёт"),
    );
    host.append(ind, grid, btnRow);
  }
  render(); renderScore();
}

// ─────────────────────────  CONNECT 4  ─────────────────────────
function mountC4(host, ctx) {
  const COLS = 7, ROWS = 6;
  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let turn = 1, winner = null;
  let scores = { 1: 0, 2: 0 };
  const p1 = "Алина", p2 = "Артур";

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(`${p1} (◉)`, scores[1]),
      scoreChip(`${p2} (◉)`, scores[2]),
    );
  }

  function drop(col) {
    if (winner) return false;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) {
        board[r][col] = turn;
        return true;
      }
    }
    return false;
  }

  function checkWinner() {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!board[r][c]) continue;
      for (const [dr, dc] of dirs) {
        let count = 0;
        for (let k = 0; k < 4; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) break;
          if (board[nr][nc] !== board[r][c]) break;
          count++;
        }
        if (count === 4) return board[r][c];
      }
    }
    if (board.every(row => row.every(v => v))) return "draw";
    return null;
  }

  function render() {
    host.innerHTML = "";
    const ind = el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot", style: turn === 2 ? "background:var(--gold);box-shadow:0 0 10px var(--gold)" : "" }),
      el("span", {}, winner ? (winner === "draw" ? "Ничья — переигрываем" : `Победил ${winner === 1 ? p1 : p2} 🏆`) : `Ходит ${turn === 1 ? p1 : p2}`),
    );
    const wrap = el("div", { class: "c4-board" });
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cellEl = el("div", {
          class: "c4-cell" + (board[r][c] === 1 ? " p1" : board[r][c] === 2 ? " p2" : ""),
          onclick: () => {
            if (winner) return;
            if (drop(c)) {
              const w = checkWinner();
              if (w) {
                winner = w;
                if (w === "draw") ctx.recordResult("connect4", p1, p2, true);
                else {
                  scores[w] += 1;
                  ctx.recordResult("connect4", w === 1 ? p1 : p2, w === 1 ? p2 : p1);
                  ctx.confettiBurst();
                }
              } else turn = turn === 1 ? 2 : 1;
              render(); renderScore();
            }
          },
        });
        wrap.append(cellEl);
      }
    }
    const btnRow = el("div", { style: "display:flex;gap:10px;justify-content:center;margin-top:14px" },
      el("button", { class: "cta-btn", onclick: () => { board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); turn = 1; winner = null; render(); } }, "Заново"),
      el("button", { class: "cta-btn secondary", onclick: () => { board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); turn = 1; winner = null; scores = {1:0,2:0}; render(); renderScore(); } }, "Сбросить счёт"),
    );
    host.append(ind, wrap, btnRow);
  }
  render(); renderScore();
}

// ─────────────────────────  RPS  ─────────────────────────
function mountRPS(host, ctx) {
  const choices = ["rock", "paper", "scissors"];
  const labels = { rock: "✊ Камень", paper: "✋ Бумага", scissors: "✌ Ножницы" };
  const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
  const p1 = "Алина", p2 = "Артур";
  let pick = { 1: null, 2: null };
  let scores = { 1: 0, 2: 0 };

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(p1, scores[1]), scoreChip(p2, scores[2]));
  }

  function resolve() {
    const [a, b] = [pick[1], pick[2]];
    if (a === b) return null;
    return beats[a] === b ? 1 : 2;
  }

  function render() {
    host.innerHTML = "";
    const both = pick[1] && pick[2];
    const winner = both ? resolve() : null;
    if (both) {
      if (winner === null) ctx.recordResult("rps", p1, p2, true);
      else {
        scores[winner] += 1;
        ctx.recordResult("rps", winner === 1 ? p1 : p2, winner === 1 ? p2 : p1);
        ctx.confettiBurst({ count: 40 });
      }
    }
    const side = (slot, name) => el("div", { class: "rps-side" },
      el("h3", {}, name),
      el("div", { class: "rps-emoji" + (both ? " shake" : "") },
        both ? (pick[slot] === "rock" ? "✊" : pick[slot] === "paper" ? "✋" : "✌") : (pick[slot] ? "✓" : "?"),
      ),
      el("div", { class: "rps-choices" },
        ...choices.map(ch => el("button", {
          class: "rps-btn" + (pick[slot] === ch && !both ? " picked" : ""),
          disabled: both,
          onclick: () => {
            pick[slot] = ch;
            ctx.toast(`${name} выбрал(а) свой ход`);
            render();
          },
        }, labels[ch].split(" ")[0])),
      ),
    );
    const resultText = both
      ? (winner === null ? "Ничья! Бросьте ещё раз." : `Раунд выиграл ${winner === 1 ? p1 : p2}.`)
      : "Каждый делает скрытый выбор — потом откроем.";
    host.append(
      el("div", { class: "rps-stage" }, side(1, p1), el("div", { class: "rps-vs" }, "VS"), side(2, p2)),
      el("p", { style: "text-align:center" }, resultText),
      el("div", { style: "display:flex;gap:10px;justify-content:center;margin-top:14px" },
        el("button", { class: "cta-btn", onclick: () => { pick = {1:null,2:null}; render(); }, disabled: !both }, "Следующий раунд"),
        el("button", { class: "cta-btn secondary", onclick: () => { pick = {1:null,2:null}; scores={1:0,2:0}; render(); renderScore(); } }, "Сброс"),
      ),
    );
    renderScore();
  }
  render();
}

// ─────────────────────────  MEMORY  ─────────────────────────
function mountMemory(host, ctx) {
  const ICONS = MEMORY_ICONS.slice(0, 8);
  const deck = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
  let flipped = []; // indices
  let matched = new Set();
  let turn = 1;
  let scores = { 1: 0, 2: 0 };
  const p1 = "Алина", p2 = "Артур";
  let lock = false;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(p1, scores[1]), scoreChip(p2, scores[2]));
  }

  function render() {
    host.innerHTML = "";
    const ind = el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot" }),
      el("span", {}, matched.size === deck.length ? `Игра окончена! ${scores[1] > scores[2] ? p1 : scores[2] > scores[1] ? p2 : "Ничья"}` : `Ходит ${turn === 1 ? p1 : p2}`),
    );
    const grid = el("div", { class: "memory-grid", style: "grid-template-columns: repeat(4, 1fr)" });
    deck.forEach((sym, i) => {
      const open = flipped.includes(i) || matched.has(i);
      const c = el("div", {
        class: "memory-card" + (open ? " flipped" : "") + (matched.has(i) ? " matched" : ""),
        onclick: () => {
          if (lock || open) return;
          flipped.push(i);
          render();
          if (flipped.length === 2) {
            lock = true;
            setTimeout(() => {
              const [a, b] = flipped;
              if (deck[a] === deck[b]) {
                matched.add(a); matched.add(b);
                scores[turn] += 1;
                if (matched.size === deck.length) {
                  if (scores[1] === scores[2]) ctx.recordResult("memory", p1, p2, true);
                  else {
                    const w = scores[1] > scores[2] ? 1 : 2;
                    ctx.recordResult("memory", w === 1 ? p1 : p2, w === 1 ? p2 : p1);
                    ctx.confettiBurst();
                  }
                }
              } else {
                turn = turn === 1 ? 2 : 1;
              }
              flipped = []; lock = false;
              render(); renderScore();
            }, 700);
          }
        },
      },
        el("div", { class: "memory-card-inner" },
          el("div", { class: "memory-card-face memory-card-front" }),
          el("div", { class: "memory-card-face memory-card-back" }, sym),
        ),
      );
      grid.append(c);
    });
    const btnRow = el("div", { style: "display:flex;gap:10px;justify-content:center;margin-top:14px" },
      el("button", { class: "cta-btn", onclick: () => mountMemory(host, ctx) }, "Новая партия"),
    );
    host.append(ind, grid, btnRow);
  }
  render(); renderScore();
}

// ─────────────────────────  HANGMAN  ─────────────────────────
function mountHangman(host, ctx) {
  const alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");
  let entry = pickRandom(HANGMAN_WORDS);
  let word = entry.word;
  let guessed = new Set();
  let wrong = 0;
  const MAX = 7;
  const p1 = "Алина", p2 = "Артур";
  let scores = { [p1]: 0, [p2]: 0 };

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(p1, scores[p1]), scoreChip(p2, scores[p2]));
  }

  function isWon() { return word.split("").every(l => guessed.has(l)); }
  function isLost() { return wrong >= MAX; }
  let resultRecorded = false;

  function svg() {
    const parts = [
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
    const total = 4 + wrong;
    return `<svg class="hangman-svg" viewBox="0 0 220 220">${parts.slice(0, total).join("")}</svg>`;
  }

  function render() {
    host.innerHTML = "";
    const wonView = isWon(), lostView = isLost();
    if (wonView && !resultRecorded) {
      const winner = ctx.profile;
      scores[winner] = (scores[winner] || 0) + 1;
      ctx.recordResult("hangman", winner, winner === p1 ? p2 : p1);
      ctx.confettiBurst({ count: 40 });
      resultRecorded = true;
    } else if (lostView && !resultRecorded) {
      const loser = ctx.profile;
      scores[loser === p1 ? p2 : p1] = (scores[loser === p1 ? p2 : p1] || 0) + 1;
      ctx.recordResult("hangman", loser === p1 ? p2 : p1, loser);
      resultRecorded = true;
    }
    const left = el("div", { class: "hangman-stage" },
      el("div", { html: svg() }),
      el("p", { style: "color:var(--text-2);margin-top:6px" }, `Ошибки: ${wrong} / ${MAX}`),
      el("div", { style: "margin-top:10px;font-style:italic" }, "Подсказка: " + entry.hint),
    );
    const display = word.split("").map(l => guessed.has(l) ? l : "_").join(" ");
    const letters = el("div", { class: "letter-grid" },
      ...alphabet.map(ch => el("button", {
        class: "letter-btn" + (guessed.has(ch) ? (word.includes(ch) ? " hit" : " miss") : ""),
        disabled: guessed.has(ch) || wonView || lostView,
        onclick: () => {
          guessed.add(ch);
          if (!word.includes(ch)) wrong++;
          render(); renderScore();
        },
      }, ch)),
    );
    const right = el("div", { class: "hangman-stage", style: "background:var(--surface-0)" },
      el("h2", { style: "font-family:'Cormorant Garamond', serif;letter-spacing:.04em" }, `Угадывает: ${ctx.profile}`),
      el("div", { class: "word-display" }, display),
      letters,
      wonView ? el("p", { style: "margin-top:14px;color:var(--win);font-weight:700" }, "Угадано! 💞") : null,
      lostView ? el("p", { style: "margin-top:14px;color:var(--loss);font-weight:700" }, "Слово было: " + word) : null,
      el("button", { class: "cta-btn", style: "margin-top:14px", onclick: () => mountHangman(host, ctx) }, "Новое слово"),
    );
    host.append(el("div", { class: "hangman-wrap" }, left, right));
  }
  render(); renderScore();
}

// ─────────────────────────  PONG  ─────────────────────────
function mountPong(host, ctx) {
  const p1 = "Алина", p2 = "Артур";
  const W = 800, H = 440;
  let state = {
    p1: H / 2, p2: H / 2,
    bx: W / 2, by: H / 2,
    vx: 5 * (Math.random() > .5 ? 1 : -1), vy: (Math.random() - .5) * 4,
    s1: 0, s2: 0, winner: null, recorded: false,
  };
  const PADDLE = 90, PAD_W = 12, BALL = 14, TARGET = 5;
  let keys = {};
  let raf = null;

  const stageWrap = el("div", { class: "pong-stage" });
  const left = el("div", { class: "pong-paddle" });
  const right = el("div", { class: "pong-paddle" });
  const ball = el("div", { class: "pong-ball" });
  stageWrap.append(left, right, ball);
  left.style.left = "12px";
  right.style.right = "12px";

  function place() {
    const rect = stageWrap.getBoundingClientRect();
    const scaleY = rect.height / H;
    left.style.height = (PADDLE * scaleY) + "px";
    right.style.height = (PADDLE * scaleY) + "px";
    left.style.width = right.style.width = PAD_W + "px";
    ball.style.width = ball.style.height = BALL + "px";
    left.style.top = ((state.p1 - PADDLE/2) * scaleY) + "px";
    right.style.top = ((state.p2 - PADDLE/2) * scaleY) + "px";
    ball.style.left = ((state.bx - BALL/2) * (rect.width / W)) + "px";
    ball.style.top = ((state.by - BALL/2) * scaleY) + "px";
  }

  function step() {
    if (!state.winner) {
      if (keys["w"]) state.p1 -= 6;
      if (keys["s"]) state.p1 += 6;
      if (keys["arrowup"]) state.p2 -= 6;
      if (keys["arrowdown"]) state.p2 += 6;
      state.p1 = Math.max(PADDLE/2, Math.min(H - PADDLE/2, state.p1));
      state.p2 = Math.max(PADDLE/2, Math.min(H - PADDLE/2, state.p2));
      state.bx += state.vx;
      state.by += state.vy;
      if (state.by < BALL/2 || state.by > H - BALL/2) state.vy *= -1;
      if (state.bx < 26 && state.by > state.p1 - PADDLE/2 && state.by < state.p1 + PADDLE/2 && state.vx < 0) {
        state.vx = -state.vx * 1.04;
        state.vy = ((state.by - state.p1) / (PADDLE/2)) * 5;
      }
      if (state.bx > W - 26 && state.by > state.p2 - PADDLE/2 && state.by < state.p2 + PADDLE/2 && state.vx > 0) {
        state.vx = -state.vx * 1.04;
        state.vy = ((state.by - state.p2) / (PADDLE/2)) * 5;
      }
      if (state.bx < 0) {
        state.s2++; reset(-1);
      } else if (state.bx > W) {
        state.s1++; reset(1);
      }
      if (state.s1 >= TARGET) state.winner = 1;
      if (state.s2 >= TARGET) state.winner = 2;
      if (state.winner && !state.recorded) {
        const w = state.winner === 1 ? p1 : p2;
        const l = state.winner === 1 ? p2 : p1;
        ctx.recordResult("pong", w, l);
        ctx.confettiBurst();
        state.recorded = true;
      }
    }
    renderScore();
    place();
    raf = requestAnimationFrame(step);
  }

  function reset(servedSide = 0) {
    state.bx = W / 2; state.by = H / 2;
    state.vx = 5 * (servedSide >= 0 ? -1 : 1);
    state.vy = (Math.random() - .5) * 4;
  }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip(p1 + " (W/S)", state.s1), scoreChip(p2 + " (↑/↓)", state.s2));
  }

  const handlerDown = (e) => { keys[e.key.toLowerCase()] = true; if (["arrowup","arrowdown","w","s"," "].includes(e.key.toLowerCase())) e.preventDefault(); };
  const handlerUp = (e) => { keys[e.key.toLowerCase()] = false; };
  addEventListener("keydown", handlerDown);
  addEventListener("keyup", handlerUp);
  ctx.registerCleanup(() => {
    cancelAnimationFrame(raf);
    removeEventListener("keydown", handlerDown);
    removeEventListener("keyup", handlerUp);
  });

  const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:10px" }, "Алина — W / S, Артур — стрелки ↑ ↓. До 5 очков.");
  const restart = el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => {
    state = { p1: H/2, p2: H/2, bx: W/2, by: H/2, vx: 5 * (Math.random() > .5 ? 1 : -1), vy: (Math.random()-.5)*4, s1: 0, s2: 0, winner: null, recorded: false };
  } }, "Новый матч");

  // Mobile up/down buttons
  const mobile = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px" },
    el("button", { class: "cta-btn secondary", ontouchstart: () => keys["w"] = true, ontouchend: () => keys["w"] = false, onmousedown: () => keys["w"] = true, onmouseup: () => keys["w"] = false, onmouseleave: () => keys["w"] = false }, "▲ Алина"),
    el("button", { class: "cta-btn secondary", ontouchstart: () => keys["s"] = true, ontouchend: () => keys["s"] = false, onmousedown: () => keys["s"] = true, onmouseup: () => keys["s"] = false, onmouseleave: () => keys["s"] = false }, "▼ Алина"),
    el("button", { class: "cta-btn secondary", ontouchstart: () => keys["arrowup"] = true, ontouchend: () => keys["arrowup"] = false, onmousedown: () => keys["arrowup"] = true, onmouseup: () => keys["arrowup"] = false, onmouseleave: () => keys["arrowup"] = false }, "▲ Артур"),
    el("button", { class: "cta-btn secondary", ontouchstart: () => keys["arrowdown"] = true, ontouchend: () => keys["arrowdown"] = false, onmousedown: () => keys["arrowdown"] = true, onmouseup: () => keys["arrowdown"] = false, onmouseleave: () => keys["arrowdown"] = false }, "▼ Артур"),
  );

  host.append(stageWrap, help, mobile, restart);
  renderScore();
  raf = requestAnimationFrame(step);
}

// ─────────────────────────  WHEEL OF FORTUNE  ─────────────────────────
function mountWheel(host, ctx) {
  const tasks = WHEEL_TASKS;
  const total = tasks.length;
  const sliceDeg = 360 / total;

  const slices = tasks.map((t, i) => {
    const start = i * sliceDeg;
    const end = (i + 1) * sliceDeg;
    const x1 = 50 + 50 * Math.cos((start - 90) * Math.PI / 180);
    const y1 = 50 + 50 * Math.sin((start - 90) * Math.PI / 180);
    const x2 = 50 + 50 * Math.cos((end - 90) * Math.PI / 180);
    const y2 = 50 + 50 * Math.sin((end - 90) * Math.PI / 180);
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
    </div>
  `});

  const result = el("h2", { style: "text-align:center;margin-top:18px;min-height:40px;font-family:'Cormorant Garamond',serif;font-weight:500" }, "Крутани и узнай свою судьбу");
  let totalRot = 0;
  const spin = el("button", { class: "cta-btn", style: "display:block;margin:14px auto", onclick: () => {
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
  } }, "Крутить колесо");
  host.append(svgEl, spin, result);
}

// ─────────────────────────  TRUTH OR DARE  ─────────────────────────
function mountTruthDare(host, ctx) {
  let mode = "truth";
  const card = el("div", { class: "flashcard" });
  function show() {
    const pool = mode === "truth" ? TRUTHS : DARES;
    const item = pickRandom(pool);
    card.innerHTML = "";
    card.append(
      el("div", { class: "badge-row" },
        el("span", { class: "tag" }, mode === "truth" ? "ПРАВДА" : "ДЕЙСТВИЕ"),
        el("span", { class: "tag" }, "Для двоих"),
      ),
      el("h2", {}, item),
    );
  }
  show();
  host.append(
    card,
    el("div", { style: "display:flex;gap:10px;justify-content:center;margin-top:18px" },
      el("button", { class: "cta-btn", onclick: () => { mode = "truth"; show(); } }, "Правда"),
      el("button", { class: "cta-btn secondary", onclick: () => { mode = "dare"; show(); } }, "Действие"),
      el("button", { class: "cta-btn ghost", onclick: show }, "Ещё"),
    ),
  );
}

// ─────────────────────────  COMPLIMENTS  ─────────────────────────
function mountCompliment(host, ctx) {
  const card = el("div", { class: "flashcard" });
  function show() {
    const c = pickRandom(COMPLIMENTS);
    card.innerHTML = "";
    card.append(
      el("div", { class: "badge-row" }, el("span", { class: "tag" }, "Комплимент дня")),
      el("h2", {}, c),
      el("p", {}, "Скажи это вслух с улыбкой."),
    );
  }
  show();
  host.append(card,
    el("div", { style: "display:flex;gap:10px;justify-content:center;margin-top:18px" },
      el("button", { class: "cta-btn", onclick: () => { show(); ctx.confettiBurst({ count: 30 }); } }, "Ещё комплимент"),
    ),
  );
}

// ─────────────────────────  COUPLE QUIZ  ─────────────────────────
function mountQuiz(host, ctx) {
  const questions = [...COUPLE_QUIZ].sort(() => Math.random() - 0.5).slice(0, 8);
  let idx = 0;
  let score = 0;

  function render() {
    host.innerHTML = "";
    if (idx >= questions.length) {
      ctx.addQuizScore(ctx.profile, score, questions.length);
      ctx.confettiBurst();
      host.append(
        el("div", { class: "flashcard" },
          el("h2", {}, "Игра окончена 💞"),
          el("p", {}, `Ты ответил(а) на ${questions.length} вопросов.`),
          el("p", {}, "Сверьте ответы вместе и поставьте балл."),
        ),
        el("button", { class: "cta-btn", style: "display:block;margin:18px auto", onclick: () => mountQuiz(host, ctx) }, "Ещё раз"),
      );
      return;
    }
    const q = questions[idx];
    const card = el("div", { class: "flashcard" },
      el("div", { class: "badge-row" }, el("span", { class: "tag" }, `Вопрос ${idx + 1} / ${questions.length}`)),
      el("h2", {}, q),
      el("p", {}, `Отвечает: ${ctx.profile}. Партнёр потом проверит.`),
    );
    const ans = el("input", { type: "text", placeholder: "Твой ответ...", style: "width:100%;margin-top:14px" });
    const next = el("button", { class: "cta-btn", style: "margin-top:14px" }, "Дальше →");
    next.addEventListener("click", () => {
      idx++; render();
    });
    host.append(card, ans, el("div", { style: "display:flex;gap:10px;margin-top:10px" },
      el("button", { class: "cta-btn secondary", onclick: () => { score++; idx++; render(); } }, "Угадал(а)"),
      el("button", { class: "cta-btn ghost", onclick: () => { idx++; render(); } }, "Не угадал(а)"),
    ));
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Очки", score));
  }
  render();
}

// ─────────────────────────  SNAKE (solo)  ─────────────────────────
function mountSnake(host, ctx) {
  const N = 18;
  let snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let apple = { x: 12, y: 9 };
  let score = 0;
  let high = ctx.state.highScores[ctx.profile]?.snake || 0;
  let alive = true;
  let speed = 130;
  let timer = null;

  const canvas = el("canvas", { class: "snake-canvas" });
  const stage = el("div", { class: "snake-stage" }, canvas);
  const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:10px" }, "Управление: стрелки или WASD. На телефоне — свайпы.");

  function placeApple() {
    do {
      apple = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
    } while (snake.some(s => s.x === apple.x && s.y === apple.y));
  }

  function draw() {
    const c = canvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const cx = c.getContext("2d");
    cx.scale(dpr, dpr);
    const cell = rect.width / N;

    cx.fillStyle = "rgba(255,255,255,0.04)";
    cx.fillRect(0, 0, rect.width, rect.height);

    // grid lines (soft)
    cx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 1; i < N; i++) {
      cx.beginPath(); cx.moveTo(i * cell, 0); cx.lineTo(i * cell, rect.height); cx.stroke();
      cx.beginPath(); cx.moveTo(0, i * cell); cx.lineTo(rect.width, i * cell); cx.stroke();
    }

    // apple
    cx.fillStyle = "#ff5d8f";
    cx.shadowColor = "#ff5d8f"; cx.shadowBlur = 18;
    cx.beginPath();
    cx.arc(apple.x * cell + cell/2, apple.y * cell + cell/2, cell * 0.36, 0, Math.PI*2);
    cx.fill();
    cx.shadowBlur = 0;

    // snake
    snake.forEach((seg, i) => {
      const t = i / snake.length;
      cx.fillStyle = `hsl(${320 - t * 80}, 80%, ${65 - t * 15}%)`;
      const pad = 2;
      cx.fillRect(seg.x * cell + pad, seg.y * cell + pad, cell - pad*2, cell - pad*2);
    });
  }

  function step() {
    if (!alive) return;
    dir = nextDir;
    const head = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N };
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      alive = false;
      const improved = ctx.recordHighScore(ctx.profile, "snake", score);
      ctx.toast(`Конец! Счёт ${score}${improved ? " — НОВЫЙ РЕКОРД!" : ""}`);
      if (improved) ctx.confettiBurst();
      clearInterval(timer);
      return;
    }
    snake.unshift(head);
    if (head.x === apple.x && head.y === apple.y) {
      score += 10;
      high = Math.max(high, score);
      placeApple();
      speed = Math.max(60, speed - 3);
      clearInterval(timer);
      timer = setInterval(step, speed);
    } else {
      snake.pop();
    }
    renderScore();
    draw();
  }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Счёт", score), scoreChip("Рекорд " + ctx.profile, high));
  }

  function changeDir(dx, dy) {
    if (dx === -dir.x && dy === -dir.y) return;
    nextDir = { x: dx, y: dy };
  }

  const handler = (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") changeDir(0, -1);
    else if (k === "arrowdown" || k === "s") changeDir(0, 1);
    else if (k === "arrowleft" || k === "a") changeDir(-1, 0);
    else if (k === "arrowright" || k === "d") changeDir(1, 0);
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  };
  addEventListener("keydown", handler);

  // swipe
  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => { touchStart = e.touches[0]; });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.clientX;
    const dy = t.clientY - touchStart.clientY;
    if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? 1 : -1, 0);
    else changeDir(0, dy > 0 ? 1 : -1);
  });

  ctx.registerCleanup(() => {
    clearInterval(timer);
    removeEventListener("keydown", handler);
  });

  const mobile = el("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:240px;margin:14px auto" },
    el("div", {}),
    el("button", { class: "cta-btn secondary", onclick: () => changeDir(0, -1) }, "▲"),
    el("div", {}),
    el("button", { class: "cta-btn secondary", onclick: () => changeDir(-1, 0) }, "◀"),
    el("div", {}),
    el("button", { class: "cta-btn secondary", onclick: () => changeDir(1, 0) }, "▶"),
    el("div", {}),
    el("button", { class: "cta-btn secondary", onclick: () => changeDir(0, 1) }, "▼"),
    el("div", {}),
  );

  const restart = el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => mountSnake(host, ctx) }, "Заново");

  host.append(stage, mobile, help, restart);
  renderScore();
  placeApple();
  timer = setInterval(step, speed);
  draw();
}

// ─────────────────────────  2048 (solo)  ─────────────────────────
function mount2048(host, ctx) {
  const N = 4;
  let grid;
  let score = 0;
  let high = ctx.state.highScores[ctx.profile]?.g2048 || 0;

  function empty() { return Array.from({ length: N }, () => Array(N).fill(0)); }
  function addRandom() {
    const empties = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empties.push([r,c]);
    if (!empties.length) return;
    const [r, c] = pickRandom(empties);
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slideRow(row) {
    let arr = row.filter(v => v);
    let result = [];
    let i = 0;
    let gained = 0;
    while (i < arr.length) {
      if (i + 1 < arr.length && arr[i] === arr[i+1]) {
        result.push(arr[i] * 2);
        gained += arr[i] * 2;
        i += 2;
      } else { result.push(arr[i]); i++; }
    }
    while (result.length < N) result.push(0);
    return [result, gained];
  }

  function move(dir) {
    const before = JSON.stringify(grid);
    let gained = 0;
    if (dir === "left") {
      for (let r = 0; r < N; r++) { const [n, g] = slideRow(grid[r]); grid[r] = n; gained += g; }
    } else if (dir === "right") {
      for (let r = 0; r < N; r++) { const [n, g] = slideRow(grid[r].slice().reverse()); grid[r] = n.reverse(); gained += g; }
    } else if (dir === "up") {
      for (let c = 0; c < N; c++) {
        const col = grid.map(r => r[c]);
        const [n, g] = slideRow(col);
        for (let r = 0; r < N; r++) grid[r][c] = n[r];
        gained += g;
      }
    } else if (dir === "down") {
      for (let c = 0; c < N; c++) {
        const col = grid.map(r => r[c]).reverse();
        const [n, g] = slideRow(col);
        n.reverse();
        for (let r = 0; r < N; r++) grid[r][c] = n[r];
        gained += g;
      }
    }
    if (JSON.stringify(grid) !== before) {
      score += gained;
      if (score > high) {
        high = score;
        ctx.recordHighScore(ctx.profile, "g2048", score);
      }
      addRandom();
      if (isOver()) {
        ctx.toast(`Конец! Счёт ${score}`);
      }
    }
    render();
  }

  function isOver() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!grid[r][c]) return false;
      if (c + 1 < N && grid[r][c] === grid[r][c+1]) return false;
      if (r + 1 < N && grid[r][c] === grid[r+1][c]) return false;
    }
    return true;
  }

  function render() {
    host.innerHTML = "";
    const stage = el("div", { class: "g2048-stage" });
    const g = el("div", { class: "g2048-grid" });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      g.append(el("div", { class: "g2048-cell" + (v ? " pop" : ""), dataset: { v: v || "" } }, v || ""));
    }
    stage.append(g);
    const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:10px" }, "Стрелки или WASD. На телефоне — свайпы.");
    const mobile = el("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:240px;margin:14px auto" },
      el("div", {}),
      el("button", { class: "cta-btn secondary", onclick: () => move("up") }, "▲"),
      el("div", {}),
      el("button", { class: "cta-btn secondary", onclick: () => move("left") }, "◀"),
      el("div", {}),
      el("button", { class: "cta-btn secondary", onclick: () => move("right") }, "▶"),
      el("div", {}),
      el("button", { class: "cta-btn secondary", onclick: () => move("down") }, "▼"),
      el("div", {}),
    );
    const restart = el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => mount2048(host, ctx) }, "Начать заново");
    host.append(stage, mobile, help, restart);
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Счёт", score), scoreChip("Рекорд " + ctx.profile, high));
  }

  const handler = (e) => {
    const k = e.key.toLowerCase();
    let dir = null;
    if (k === "arrowleft" || k === "a") dir = "left";
    else if (k === "arrowright" || k === "d") dir = "right";
    else if (k === "arrowup" || k === "w") dir = "up";
    else if (k === "arrowdown" || k === "s") dir = "down";
    if (dir) { e.preventDefault(); move(dir); }
  };
  addEventListener("keydown", handler);

  let touchStart = null;
  host.addEventListener("touchstart", (e) => { touchStart = e.touches[0]; }, { passive: true });
  host.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.clientX;
    const dy = t.clientY - touchStart.clientY;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  });

  ctx.registerCleanup(() => removeEventListener("keydown", handler));
  grid = empty();
  addRandom(); addRandom();
  render();
}

// ─────────────────────────  REACTION (solo)  ─────────────────────────
function mountReaction(host, ctx) {
  const stage = el("div", { class: "reaction-stage" }, "Жди зелёный...");
  let phase = "wait";
  let timer = null;
  let startTs = 0;
  let best = ctx.state.highScores[ctx.profile]?.reaction || 9999;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(scoreChip("Лучший " + ctx.profile, (best === 9999 ? "—" : best + " мс")));
  }

  stage.addEventListener("click", () => {
    if (phase === "wait") {
      stage.textContent = "Ждём...";
      stage.classList.remove("go", "fail");
      phase = "armed";
      timer = setTimeout(() => {
        stage.classList.add("go");
        stage.textContent = "ЖМИ!";
        phase = "go";
        startTs = performance.now();
      }, 800 + Math.random() * 2500);
    } else if (phase === "armed") {
      clearTimeout(timer);
      stage.classList.add("fail");
      stage.textContent = "Рано! Нажми снова чтобы попробовать.";
      phase = "wait";
    } else if (phase === "go") {
      const time = Math.round(performance.now() - startTs);
      if (time < best) {
        best = time;
        ctx.recordHighScore(ctx.profile, "reaction", time, true);
        ctx.confettiBurst({ count: 30 });
        stage.textContent = `${time} мс — новый рекорд!`;
      } else {
        stage.textContent = `${time} мс. Лучший: ${best} мс. Нажми чтобы повторить.`;
      }
      stage.classList.remove("go");
      renderScore();
      phase = "wait";
    } else if (phase === "fail" || phase === "result") {
      stage.classList.remove("fail");
      stage.textContent = "Жди зелёный...";
      phase = "wait";
    }
  });

  const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:12px" }, "Кликай по полю. Когда станет зелёным — жми ещё раз как можно быстрее.");
  host.append(stage, help);
  renderScore();
}

// ─────────────────────────  COIN  ─────────────────────────
function mountCoin(host, ctx) {
  const coin = el("div", {
    style: "width:200px;height:200px;border-radius:50%;background:var(--grad-gold);margin:18px auto;display:grid;place-items:center;font-family:'Cormorant Garamond',serif;font-size:48px;color:#5e3a14;font-weight:700;box-shadow:0 30px 60px -20px rgba(240,200,140,0.55);transition:transform 1.2s cubic-bezier(.18,.89,.32,1.02)",
  }, "♥");
  const result = el("p", { style: "text-align:center;margin-top:14px;font-size:18px" }, "Брось и узнай.");
  host.append(coin, result,
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => {
      const r = Math.random() < 0.5;
      coin.style.transform = `rotateY(${1080 + (r ? 0 : 180)}deg)`;
      coin.textContent = r ? "♥" : "✦";
      setTimeout(() => result.textContent = r ? "Орёл — выбирает Алина 💖" : "Решка — выбирает Артур 🌟", 1200);
    } }, "Бросить монетку"),
  );
}

// ─────────────────────────  DICE  ─────────────────────────
function mountDice(host, ctx) {
  const FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];
  const dice = el("div", {
    style: "display:flex;gap:18px;justify-content:center;margin:22px 0",
  });
  function render(d1, d2) {
    dice.innerHTML = "";
    [d1, d2].forEach(v => {
      dice.append(el("div", {
        style: "width:130px;height:130px;background:linear-gradient(135deg,#fff,#ffe0e8);color:#8a3050;border-radius:24px;display:grid;place-items:center;font-size:90px;box-shadow:0 24px 60px -20px rgba(180,80,120,0.5);animation:pop .35s var(--ease)",
      }, FACES[v]));
    });
  }
  render(0, 0);
  const result = el("p", { style: "text-align:center;font-size:18px" }, "Брось и сделай столько отжиманий, шагов или поцелуев.");
  host.append(dice, result,
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => {
      const a = Math.floor(Math.random()*6), b = Math.floor(Math.random()*6);
      render(a, b);
      result.textContent = `Выпало: ${a+1} и ${b+1}. Сумма ${a+b+2}.`;
    } }, "Бросить кубики"),
  );
}

// ─────────────────────────  LOVE-O-METER  ─────────────────────────
function mountLoveMeter(host, ctx) {
  const bar = el("div", {
    style: "width:100%;max-width:520px;margin:24px auto;height:34px;border-radius:99px;background:var(--surface-1);border:1px solid var(--line);position:relative;overflow:hidden",
  });
  const fill = el("div", {
    style: "position:absolute;left:0;top:0;bottom:0;width:0%;background:var(--grad-fire);transition:width 1.6s var(--ease)",
  });
  bar.append(fill);
  const pct = el("h2", { style: "text-align:center;font-family:'Cormorant Garamond', serif;font-size:64px;margin-top:6px" }, "—");
  const verdict = el("p", { style: "text-align:center;color:var(--text-1)" }, "Жмёшь — узнаёшь.");
  host.append(pct, bar, verdict,
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => {
      const v = 70 + Math.floor(Math.random() * 31);
      fill.style.width = v + "%";
      setTimeout(() => {
        pct.textContent = v + "%";
        verdict.textContent = v >= 95 ? "Это судьба ✨" : v >= 85 ? "Огонь ❤" : "Очень неплохо, но добавьте обнимашек 🤗";
        ctx.confettiBurst({ count: 30 });
      }, 1500);
    } }, "Замерить любовь"),
  );
}

// ─────────────────────────  SIMON SAYS  ─────────────────────────
function mountSimon(host, ctx) {
  let seq = [];
  let userIdx = 0;
  let playing = false;
  let best = ctx.state.highScores[ctx.profile]?.simon || 0;

  let audioCtx = null;
  function tone(freq, duration = 280) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration / 1000);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + duration / 1000 + 0.02);
    } catch (e) {}
  }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip("Раунд", seq.length),
      scoreChip("Рекорд", best),
    );
  }

  const stage = el("div", { class: "simon-stage" });
  const pads = SIMON_COLORS.map((s, i) => el("button", {
    class: `simon-pad s${i}`,
    onclick: () => userPress(i),
  }));
  pads.forEach(p => stage.append(p));
  const center = el("div", { class: "simon-center" }, "Старт");
  stage.append(center);
  host.append(stage,
    el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" }, "Повтори последовательность. С каждым раундом — на один сигнал длиннее."),
    el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: nextRound }, "Начать"),
  );

  async function flash(i, ms = 360) {
    pads[i].classList.add("lit");
    tone(SIMON_COLORS[i].tone, ms - 20);
    await new Promise(r => setTimeout(r, ms));
    pads[i].classList.remove("lit");
    await new Promise(r => setTimeout(r, 120));
  }

  async function playSequence() {
    playing = true;
    center.textContent = "Смотри";
    for (const i of seq) await flash(i);
    playing = false;
    userIdx = 0;
    center.textContent = "Повторяй";
  }

  function nextRound() {
    seq.push(Math.floor(Math.random() * 4));
    renderScore();
    setTimeout(playSequence, 250);
  }

  async function userPress(i) {
    if (playing) return;
    if (seq.length === 0) { nextRound(); return; }
    await flash(i, 220);
    if (seq[userIdx] !== i) {
      center.textContent = "Ой!";
      tone(120, 400);
      if (seq.length - 1 > best) {
        best = seq.length - 1;
        ctx.recordHighScore(ctx.profile, "simon", best);
        ctx.confettiBurst({ count: 30 });
      }
      ctx.toast(`Конец на раунде ${seq.length}`);
      seq = []; userIdx = 0;
      renderScore();
      return;
    }
    userIdx++;
    if (userIdx >= seq.length) {
      center.textContent = "Класс!";
      setTimeout(nextRound, 700);
    }
  }
  renderScore();
}

// ─────────────────────────  WHACK A MOLE  ─────────────────────────
function mountWhack(host, ctx) {
  const SIZE = 9; // 3x3
  let score = 0;
  let time = 30;
  let running = false;
  let popInterval, tickInterval;
  let best = ctx.state.highScores[ctx.profile]?.whack || 0;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip("Очки", score),
      scoreChip("Время", time),
      scoreChip("Рекорд", best),
    );
  }

  const grid = el("div", { class: "whack-grid" });
  const moles = [];
  for (let i = 0; i < SIZE; i++) {
    const mole = el("div", { class: "whack-mole" }, "🐹");
    const hole = el("div", { class: "whack-hole", onclick: () => bonk(i) }, mole);
    moles.push({ mole, hole, up: false });
    grid.append(hole);
  }

  function bonk(i) {
    if (!running) return;
    const m = moles[i];
    if (!m.up) return;
    m.up = false;
    m.mole.classList.add("bonk");
    setTimeout(() => { m.mole.classList.remove("bonk", "up"); }, 250);
    score++;
    renderScore();
    ctx.confettiBurst({ count: 6 });
  }

  function popRandom() {
    if (!running) return;
    const i = Math.floor(Math.random() * SIZE);
    const m = moles[i];
    if (m.up) return;
    m.up = true;
    m.mole.classList.add("up");
    setTimeout(() => {
      if (m.up) { m.up = false; m.mole.classList.remove("up"); }
    }, 600 + Math.random() * 600);
  }

  function start() {
    score = 0; time = 30; running = true;
    renderScore();
    btn.disabled = true; btn.textContent = "Поехали!";
    popInterval = setInterval(popRandom, 550);
    tickInterval = setInterval(() => {
      time--;
      renderScore();
      if (time <= 0) {
        running = false;
        clearInterval(popInterval); clearInterval(tickInterval);
        moles.forEach(m => { m.up = false; m.mole.classList.remove("up"); });
        const improved = ctx.recordHighScore(ctx.profile, "whack", score);
        if (improved) { best = score; ctx.confettiBurst({ count: 60 }); ctx.toast("Новый рекорд!"); }
        btn.disabled = false; btn.textContent = "Ещё раз";
        renderScore();
      }
    }, 1000);
  }

  const btn = el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: start }, "Старт");
  host.append(grid, el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" }, "30 секунд. Тапай моль как только она выпрыгнула."), btn);
  ctx.registerCleanup(() => { clearInterval(popInterval); clearInterval(tickInterval); running = false; });
  renderScore();
}

// ─────────────────────────  15-PUZZLE  ─────────────────────────
function mountSlide(host, ctx) {
  const N = SLIDE_SIZE;
  let board = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N)); // 0 = empty
  let moves = 0;
  let best = ctx.state.highScores[ctx.profile]?.slide || 9999;
  let won = false;

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip("Ходы", moves),
      scoreChip("Лучшее", best === 9999 ? "—" : best),
    );
  }

  function shuffle() {
    moves = 0; won = false;
    let emptyIdx = N * N - 1;
    for (let i = 0; i < 200; i++) {
      const neighbours = [];
      const r = Math.floor(emptyIdx / N), c = emptyIdx % N;
      if (r > 0)     neighbours.push(emptyIdx - N);
      if (r < N - 1) neighbours.push(emptyIdx + N);
      if (c > 0)     neighbours.push(emptyIdx - 1);
      if (c < N - 1) neighbours.push(emptyIdx + 1);
      const m = neighbours[Math.floor(Math.random() * neighbours.length)];
      [board[emptyIdx], board[m]] = [board[m], board[emptyIdx]];
      emptyIdx = m;
    }
  }

  function move(i) {
    if (won) return;
    const emptyIdx = board.indexOf(0);
    const r1 = Math.floor(i / N), c1 = i % N;
    const r2 = Math.floor(emptyIdx / N), c2 = emptyIdx % N;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    [board[i], board[emptyIdx]] = [board[emptyIdx], board[i]];
    moves++;
    render();
    if (board.every((v, idx) => v === (idx + 1) % (N * N))) {
      won = true;
      ctx.confettiBurst({ count: 80 });
      ctx.toast(`Собрано за ${moves} ходов!`);
      const improved = ctx.recordHighScore(ctx.profile, "slide", moves, true);
      if (improved) best = moves;
    }
    renderScore();
  }

  const wrap = el("div", { class: "slide-grid", style: `grid-template-columns: repeat(${N}, 1fr)` });
  function render() {
    wrap.innerHTML = "";
    board.forEach((v, i) => {
      const tile = el("div", {
        class: "slide-tile" + (v === 0 ? " empty" : ""),
        onclick: () => v && move(i),
      }, v === 0 ? "" : String(v));
      wrap.append(tile);
    });
  }
  shuffle(); render();

  host.append(wrap,
    el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" }, "Собери порядок 1 → 15 (или 1 → " + (N*N-1) + "). Меньше ходов — лучше."),
    el("div", { style: "display:flex;justify-content:center;gap:10px;margin-top:14px" },
      el("button", { class: "cta-btn", onclick: () => { shuffle(); render(); renderScore(); } }, "Перемешать"),
    ),
  );
  renderScore();
}

// ─────────────────────────  MINESWEEPER  ─────────────────────────
function mountMine(host, ctx) {
  const W = 9, H = 9, MINES = 10;
  let board, opened, flagged;
  let gameOver = false, won = false;

  function reset() {
    gameOver = false; won = false;
    board = Array.from({ length: H }, () => Array(W).fill(0));
    opened = Array.from({ length: H }, () => Array(W).fill(false));
    flagged = Array.from({ length: H }, () => Array(W).fill(false));
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * H), c = Math.floor(Math.random() * W);
      if (board[r][c] === -1) continue;
      board[r][c] = -1; placed++;
    }
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (board[r][c] === -1) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
        if (board[nr][nc] === -1) n++;
      }
      board[r][c] = n;
    }
  }

  function openCell(r, c) {
    if (r < 0 || c < 0 || r >= H || c >= W) return;
    if (opened[r][c] || flagged[r][c]) return;
    opened[r][c] = true;
    if (board[r][c] === -1) { gameOver = true; return; }
    if (board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        openCell(r + dr, c + dc);
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (board[r][c] !== -1 && !opened[r][c]) return false;
    }
    return true;
  }

  function renderScore() {
    let flags = 0; for (const row of flagged) for (const f of row) if (f) flags++;
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip("Флаги", `${flags} / ${MINES}`),
      scoreChip("Статус", gameOver ? "Бум 💥" : won ? "Победа!" : "Идём"),
    );
  }

  const grid = el("div", { class: "mine-grid", style: `grid-template-columns: repeat(${W}, 1fr)` });
  function render() {
    grid.innerHTML = "";
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const isOpen = opened[r][c];
      const isFlag = flagged[r][c];
      const v = board[r][c];
      const cls = "mine-cell"
        + (isOpen ? " opened" : "")
        + (isFlag && !isOpen ? " flag" : "")
        + (isOpen && v === -1 ? " boom" : "");
      const txt = isOpen ? (v === -1 ? "💣" : (v > 0 ? String(v) : "")) : "";
      const cell = el("div", {
        class: cls,
        dataset: isOpen && v > 0 ? { n: String(v) } : {},
        onclick: () => {
          if (gameOver || won) return;
          if (isFlag) return;
          openCell(r, c);
          if (gameOver) {
            for (let rr = 0; rr < H; rr++) for (let cc = 0; cc < W; cc++) {
              if (board[rr][cc] === -1) opened[rr][cc] = true;
            }
            ctx.toast("Бум! Попробуй ещё.");
          } else if (checkWin()) {
            won = true;
            ctx.confettiBurst({ count: 80 });
            ctx.toast("Очищено! 💎");
          }
          render(); renderScore();
        },
        oncontextmenu: (e) => {
          e.preventDefault();
          if (gameOver || won || opened[r][c]) return;
          flagged[r][c] = !flagged[r][c];
          render(); renderScore();
        },
      }, txt);
      grid.append(cell);
    }
  }
  reset(); render();

  host.append(grid,
    el("p", { style: "text-align:center;color:var(--text-2);margin-top:14px" }, "Левый клик — открыть. Правый — флаг. Зажми и удерживай на телефоне."),
    el("div", { style: "display:flex;justify-content:center;gap:10px;margin-top:14px" },
      el("button", { class: "cta-btn", onclick: () => { reset(); render(); renderScore(); } }, "Новое поле"),
    ),
  );
  renderScore();
}

// ─────────────────────────  DISPATCHER  ─────────────────────────
const GAMES = {
  ttt: mountTTT,
  connect4: mountC4,
  rps: mountRPS,
  memory: mountMemory,
  hangman: mountHangman,
  pong: mountPong,
  wheel: mountWheel,
  truth: mountTruthDare,
  compliment: mountCompliment,
  quiz: mountQuiz,
  snake: mountSnake,
  g2048: mount2048,
  reaction: mountReaction,
  coin: mountCoin,
  dice: mountDice,
  love: mountLoveMeter,
  simon: mountSimon,
  whack: mountWhack,
  slide: mountSlide,
  mine: mountMine,
};
