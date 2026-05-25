// ─────────────────────────  CORE / CONFETTI  ─────────────────────────
// Canvas-based confetti burst. Uses a single <canvas id="confetti"> overlay.
// Particles are simple physics (gravity + drag-less). Stops itself when empty.

const CANVAS_ID = "confetti";
const DEFAULT_COLORS = ["#ff5d8f", "#a78bfa", "#22d3ee", "#fbbf24", "#34d399"];

let canvas, ctx, W = 0, H = 0;
let particles = [];
let raf = null;

function init() {
  canvas = document.getElementById(CANVAS_ID);
  if (!canvas) return false;
  ctx = canvas.getContext("2d");
  resize();
  addEventListener("resize", resize);
  return true;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function tick() {
  ctx.clearRect(0, 0, W, H);
  for (const p of particles) {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life--;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
    ctx.restore();
  }
  particles = particles.filter(p => p.life > 0 && p.y < H + 60);
  if (particles.length) {
    raf = requestAnimationFrame(tick);
  } else {
    raf = null;
    ctx.clearRect(0, 0, W, H);
  }
}

export function confettiBurst({ count = 80, colors = DEFAULT_COLORS, origin } = {}) {
  if (!canvas && !init()) return;
  const cx = origin?.x ?? -1;
  const cy = origin?.y ?? -1;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: cx >= 0 ? cx : Math.random() * W,
      y: cy >= 0 ? cy : -20,
      vx: (Math.random() - 0.5) * 8,
      vy: 3 + Math.random() * 6,
      g: 0.18,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 120 + Math.random() * 60,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

// Auto-init on first import (cheap; <canvas> always exists in our HTML).
queueMicrotask(() => init());
