// ─────────────────────────  GAME · PONG  ─────────────────────────
// Online. Host = физика. Алина слева, Артур справа.

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { MSG } from "../network/protocol.js";

const P1 = "Алина", P2 = "Артур";
const W = 800, H = 440;
const PADDLE = 90, PAD_W = 12, BALL = 14, TARGET = 5;

export default function mount(host, ctx) {
  const room = ctx.room;
  const isHost = room?.role === "host";
  const mySlot = ctx.profile === P1 ? 1 : 2;
  let state = freshState(1);
  let keys = {};
  let raf = null;
  let tick = 0;
  const unsub = [];

  function freshState(servedSide) {
    return {
      p1: H / 2, p2: H / 2,
      bx: W / 2, by: H / 2,
      vx: 5 * (servedSide >= 0 ? -1 : 1),
      vy: (Math.random() - 0.5) * 4,
      s1: 0, s2: 0, winner: null, recorded: false,
    };
  }

  const stageWrap = el("div", { class: "pong-stage" });
  const left  = el("div", { class: "pong-paddle" });
  const right = el("div", { class: "pong-paddle" });
  const ball  = el("div", { class: "pong-ball" });
  stageWrap.append(left, right, ball);
  left.style.left = "12px";
  right.style.right = "12px";

  function place() {
    const rect = stageWrap.getBoundingClientRect();
    const sy = rect.height / H;
    left.style.height = right.style.height = (PADDLE * sy) + "px";
    left.style.width = right.style.width = PAD_W + "px";
    ball.style.width = ball.style.height = BALL + "px";
    left.style.top = ((state.p1 - PADDLE / 2) * sy) + "px";
    right.style.top = ((state.p2 - PADDLE / 2) * sy) + "px";
    ball.style.left = ((state.bx - BALL / 2) * (rect.width / W)) + "px";
    ball.style.top = ((state.by - BALL / 2) * sy) + "px";
  }

  function resetBall(side) {
    state.bx = W / 2; state.by = H / 2;
    state.vx = 5 * (side >= 0 ? -1 : 1);
    state.vy = (Math.random() - 0.5) * 4;
  }

  function applyInput() {
    if (mySlot === 1) {
      if (keys["w"] || keys["arrowup"]) state.p1 -= 6;
      if (keys["s"] || keys["arrowdown"]) state.p1 += 6;
    } else {
      if (keys["w"] || keys["arrowup"]) state.p2 -= 6;
      if (keys["s"] || keys["arrowdown"]) state.p2 += 6;
    }
    if (!isHost) {
      room.send(MSG.Move, { paddle: mySlot === 1 ? state.p1 : state.p2, from: mySlot });
    }
  }

  function hostStep() {
    if (state.winner) return;
    state.p1 = Math.max(PADDLE / 2, Math.min(H - PADDLE / 2, state.p1));
    state.p2 = Math.max(PADDLE / 2, Math.min(H - PADDLE / 2, state.p2));
    state.bx += state.vx; state.by += state.vy;
    if (state.by < BALL / 2 || state.by > H - BALL / 2) state.vy *= -1;
    if (state.bx < 26 && state.by > state.p1 - PADDLE / 2 && state.by < state.p1 + PADDLE / 2 && state.vx < 0) {
      state.vx = -state.vx * 1.04;
      state.vy = ((state.by - state.p1) / (PADDLE / 2)) * 5;
    }
    if (state.bx > W - 26 && state.by > state.p2 - PADDLE / 2 && state.by < state.p2 + PADDLE / 2 && state.vx > 0) {
      state.vx = -state.vx * 1.04;
      state.vy = ((state.by - state.p2) / (PADDLE / 2)) * 5;
    }
    if (state.bx < 0) { state.s2++; resetBall(-1); }
    else if (state.bx > W) { state.s1++; resetBall(1); }
    if (state.s1 >= TARGET) state.winner = 1;
    if (state.s2 >= TARGET) state.winner = 2;
    if (state.winner && !state.recorded) {
      const w = state.winner === 1 ? P1 : P2;
      const l = state.winner === 1 ? P2 : P1;
      ctx.recordResult("pong", w, l);
      ctx.confettiBurst();
      state.recorded = true;
    }
    tick += 1;
    if (tick % 2 === 0) room.send(MSG.State, state);
  }

  function step() {
    applyInput();
    if (isHost) hostStep();
    renderScore();
    place();
    raf = requestAnimationFrame(step);
  }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(`${P1} (слева)`, state.s1),
      scoreChip(`${P2} (справа)`, state.s2),
    );
  }

  const onDown = (e) => {
    keys[e.key.toLowerCase()] = true;
    if (["arrowup", "arrowdown", "w", "s", " "].includes(e.key.toLowerCase())) e.preventDefault();
  };
  const onUp = (e) => { keys[e.key.toLowerCase()] = false; };
  addEventListener("keydown", onDown);
  addEventListener("keyup", onUp);

  const help = el("p", { style: "text-align:center;color:var(--text-2);margin-top:10px" },
    `${ctx.profile}: W/↑ вверх, S/↓ вниз. До ${TARGET} очков.`);
  const hold = (k, label) => el("button", {
    class: "cta-btn secondary",
    ontouchstart: (e) => { e.preventDefault(); keys[k] = true; },
    ontouchend: () => keys[k] = false,
    onmousedown: () => keys[k] = true,
    onmouseup: () => keys[k] = false,
    onmouseleave: () => keys[k] = false,
  }, label);

  const mobile = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px" },
    hold("w", "▲"), hold("s", "▼"),
  );

  if (isHost) {
    unsub.push(room.on(MSG.Move, ({ paddle, from }) => {
      if (from === 1) state.p1 = paddle;
      if (from === 2) state.p2 = paddle;
    }));
    room.send(MSG.State, state);
  } else {
    unsub.push(room.on(MSG.State, (s) => { state = s; }));
    room.send("sync", {});
  }

  host.append(stageWrap, help, mobile);
  if (isHost) {
    host.append(el("button", {
      class: "cta-btn", style: "margin:14px auto 0;display:block",
      onclick: () => { state = freshState(1); room.send(MSG.State, state); },
    }, "Новый матч"));
  }

  ctx.registerCleanup?.(() => {
    cancelAnimationFrame(raf);
    removeEventListener("keydown", onDown);
    removeEventListener("keyup", onUp);
    unsub.forEach((f) => f?.());
  });

  renderScore();
  raf = requestAnimationFrame(step);
}
