// ─────────────────────────  CORE / AUDIO  ─────────────────────────
// Web Audio sound bank. No external sample files: every effect is synthesized
// on-the-fly with oscillators + envelopes, so the PWA stays tiny and offline-safe.
//
// Public API:
//   tone(freq, ms, opts)       — single pitched tone
//   play(name)                 — named sound: "tap", "win", "lose", "drop", "click", "pop", "match"
//   setEnabled(bool)           — global mute toggle
//   isEnabled() → bool
//
// Browsers require a user gesture before AudioContext starts. We lazily
// create the context on first play(), so importing this module is free.

let ctx = null;
let enabled = true;

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  // resume after browser autoplay restriction
  if (ctx.state === "suspended") ctx.resume?.();
  return ctx;
}

export function setEnabled(v) { enabled = !!v; if (!enabled && ctx) ctx.suspend?.(); }
export function isEnabled()    { return enabled; }

export function tone(freq, ms = 220, { type = "sine", gain = 0.18 } = {}) {
  const ac = ensure(); if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  const now = ac.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
  o.connect(g); g.connect(ac.destination);
  o.start(now);
  o.stop(now + ms / 1000 + 0.02);
}

function chord(freqs, ms, opts) {
  for (const f of freqs) tone(f, ms, opts);
}

// Named SFX
const SOUNDS = {
  tap:   () => tone(880, 60,  { type: "square", gain: 0.10 }),
  click: () => tone(660, 50,  { type: "triangle", gain: 0.10 }),
  pop:   () => tone(520, 90,  { type: "sine",   gain: 0.14 }),
  drop:  () => { tone(180, 80); setTimeout(() => tone(120, 80), 70); },
  match: () => chord([523.25, 659.25], 220, { type: "sine", gain: 0.12 }),
  win:   () => {
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => setTimeout(() => tone(f, 220, { type: "triangle", gain: 0.14 }), i * 90));
  },
  lose:  () => {
    [330, 277, 220, 165].forEach((f, i) => setTimeout(() => tone(f, 230, { type: "sawtooth", gain: 0.10 }), i * 110));
  },
  notify: () => chord([880, 1320], 160, { type: "sine", gain: 0.12 }),
};

export function play(name) {
  const fn = SOUNDS[name];
  if (fn) fn();
}
