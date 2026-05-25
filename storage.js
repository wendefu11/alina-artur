// LocalStorage layer with safe fallbacks
const KEY = "aa_state_v1";

const DEFAULT = {
  profile: null,              // "Алина" | "Артур"
  theme: "aurora",            // aurora | dawn | noir
  muted: false,
  anniversary: null,          // ISO date string
  customNames: { "Алина": "Алина", "Артур": "Артур" },
  mood: {},                   // { "Алина": {id, ts}, "Артур": {...} }
  notes: [],                  // [{id, ts, author, text}]
  wishlist: [],               // [{id, ts, author, text, done}]
  highScores: {               // per-profile high scores
    "Алина": { snake: 0, g2048: 0, reaction: 9999 },
    "Артур": { snake: 0, g2048: 0, reaction: 9999 },
  },
  stats: {                    // per-profile per-game w/l/d
    "Алина": {},
    "Артур": {},
  },
  history: [],                // last 60 results
  quizScores: [],             // history of couple quizzes
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      deepMerge(target[key], source[key]);
    } else if (!(key in target)) {
      target[key] = source[key];
    }
  }
  return target;
}

let state = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw);
    return deepMerge(parsed, structuredClone(DEFAULT));
  } catch (e) {
    return structuredClone(DEFAULT);
  }
})();

const listeners = new Set();

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function notify() {
  for (const fn of listeners) fn(state);
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  notify();
}

export function setProfile(name) { state.profile = name; save(); }
export function clearProfile() { state.profile = null; save(); }
export function setTheme(t) { state.theme = t; save(); }
export function setMuted(m) { state.muted = !!m; save(); }
export function setAnniversary(iso) { state.anniversary = iso; save(); }
export function setCustomName(profile, name) { state.customNames[profile] = name; save(); }

export function setMood(profile, mood) {
  state.mood[profile] = { id: mood, ts: Date.now() };
  save();
}

export function addNote(profile, text) {
  state.notes.unshift({ id: crypto.randomUUID(), ts: Date.now(), author: profile, text });
  state.notes = state.notes.slice(0, 100);
  save();
}
export function removeNote(id) { state.notes = state.notes.filter(n => n.id !== id); save(); }

export function addWish(profile, text) {
  state.wishlist.unshift({ id: crypto.randomUUID(), ts: Date.now(), author: profile, text, done: false });
  state.wishlist = state.wishlist.slice(0, 60);
  save();
}
export function toggleWish(id) {
  const w = state.wishlist.find(x => x.id === id);
  if (w) w.done = !w.done;
  save();
}
export function removeWish(id) { state.wishlist = state.wishlist.filter(n => n.id !== id); save(); }

export function recordHighScore(profile, game, score, lowerIsBetter = false) {
  if (!state.highScores[profile]) state.highScores[profile] = {};
  const prev = state.highScores[profile][game] ?? (lowerIsBetter ? Infinity : 0);
  let improved = false;
  if (lowerIsBetter ? score < prev : score > prev) {
    state.highScores[profile][game] = score;
    improved = true;
  }
  save();
  return improved;
}

export function recordResult(game, winner, loser, draw = false) {
  const ts = Date.now();
  const ensure = (p) => {
    if (!state.stats[p]) state.stats[p] = {};
    if (!state.stats[p][game]) state.stats[p][game] = { w: 0, l: 0, d: 0 };
  };
  if (draw) {
    ensure(winner); ensure(loser);
    state.stats[winner][game].d += 1;
    state.stats[loser][game].d += 1;
    state.history.unshift({ ts, game, result: "draw", a: winner, b: loser });
  } else if (winner && loser) {
    ensure(winner); ensure(loser);
    state.stats[winner][game].w += 1;
    state.stats[loser][game].l += 1;
    state.history.unshift({ ts, game, result: "win", a: winner, b: loser });
  }
  state.history = state.history.slice(0, 60);
  save();
}

export function addQuizScore(profile, score, total) {
  state.quizScores.unshift({ ts: Date.now(), profile, score, total });
  state.quizScores = state.quizScores.slice(0, 20);
  save();
}

export function resetAll() {
  localStorage.removeItem(KEY);
  state = structuredClone(DEFAULT);
  notify();
}
