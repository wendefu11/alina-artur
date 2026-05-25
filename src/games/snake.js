// ─────────────────────────  GAME · SNAKE (solo)  ─────────────────────────

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";

const N = 18;

export default function mount(host, ctx) {
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
  const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:10px" },
    "Стрелки или WASD. На телефоне — свайпы.");

  function placeApple() {
    do { apple = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
    while (snake.some(s => s.x === apple.x && s.y === apple.y));
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const cx = canvas.getContext("2d");
    cx.scale(dpr, dpr);
    const cell = rect.width / N;

    cx.fillStyle = "rgba(255,255,255,0.04)";
    cx.fillRect(0, 0, rect.width, rect.height);
    cx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 1; i < N; i++) {
      cx.beginPath(); cx.moveTo(i * cell, 0); cx.lineTo(i * cell, rect.height); cx.stroke();
      cx.beginPath(); cx.moveTo(0, i * cell); cx.lineTo(rect.width, i * cell); cx.stroke();
    }
    cx.fillStyle = "#ff5d8f";
    cx.shadowColor = "#ff5d8f"; cx.shadowBlur = 18;
    cx.beginPath();
    cx.arc(apple.x * cell + cell/2, apple.y * cell + cell/2, cell * 0.36, 0, Math.PI*2);
    cx.fill();
    cx.shadowBlur = 0;
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
    } else { snake.pop(); }
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
    if (k === "arrowup"    || k === "w") changeDir(0, -1);
    else if (k === "arrowdown"  || k === "s") changeDir(0,  1);
    else if (k === "arrowleft"  || k === "a") changeDir(-1, 0);
    else if (k === "arrowright" || k === "d") changeDir(1,  0);
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  };
  addEventListener("keydown", handler);

  let touchStart = null;
  canvas.addEventListener("touchstart", (e) => { touchStart = e.touches[0]; }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.clientX;
    const dy = t.clientY - touchStart.clientY;
    if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? 1 : -1, 0);
    else changeDir(0, dy > 0 ? 1 : -1);
  });

  ctx.registerCleanup?.(() => {
    clearInterval(timer);
    removeEventListener("keydown", handler);
  });

  const mobile = el("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:240px;margin:14px auto" },
    el("div", {}), el("button", { class: "cta-btn secondary", onclick: () => changeDir(0, -1) }, "▲"), el("div", {}),
    el("button", { class: "cta-btn secondary", onclick: () => changeDir(-1, 0) }, "◀"),
    el("div", {}),
    el("button", { class: "cta-btn secondary", onclick: () => changeDir( 1, 0) }, "▶"),
    el("div", {}), el("button", { class: "cta-btn secondary", onclick: () => changeDir(0,  1) }, "▼"), el("div", {}),
  );
  const restart = el("button", { class: "cta-btn", style: "margin:14px auto 0;display:block", onclick: () => mount(host, ctx) }, "Заново");
  host.append(stage, mobile, help, restart);
  renderScore();
  placeApple();
  timer = setInterval(step, speed);
  draw();
}
