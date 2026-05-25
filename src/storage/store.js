// ─────────────────────────  STORAGE / STORE  ─────────────────────────
// LocalStorage wrapper. Single key. Versioned schema with soft migration.
// Per-profile: stats, highScores, quiz, diary, mood, achievements, counters.
// Shared:      wishes, history, theme, profile, startDate.

const KEY = "alina-artur-v4";
const LEGACY_KEYS = ["alina-artur-v3"]; // for soft migration of older data

const DEFAULT_STATE = {
  version: 4,
  profile: "",
  theme: "aurora",
  startDate: "2024-02-14",
  hero: { photo: "", songLink: "" },
  stats: { "Алина": emptyStats(), "Артур": emptyStats() },
  history: [],
  highScores: { "Алина": {}, "Артур": {} },
  quiz: { "Алина": [], "Артур": [] },
  diary: { "Алина": [], "Артур": [] },
  wishes: [],
  mood: { "Алина": null, "Артур": null },
  // NEW in v4 ↓
  achievements: { "Алина": {}, "Артур": {} }, // { [id]: {ts, gameId?} }
  counters:     { "Алина": {}, "Артур": {} }, // arbitrary counters for tracker (compliment, dice, …)
  prefs: {
    sound: true,
    vibration: true,
    reducedMotion: false,
    online: { lastPeerId: "" },
  },
};

function emptyStats() {
  return {
    wins: 0, losses: 0, draws: 0,
    streakWin: 0, bestStreak: 0,
    byGame: {},
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function readLegacy() {
  for (const k of LEGACY_KEYS) {
    const raw = localStorage.getItem(k);
    const parsed = raw ? safeParse(raw) : null;
    if (parsed) return parsed;
  }
  return null;
}

export function load() {
  let parsed = safeParse(localStorage.getItem(KEY));
  if (!parsed) {
    const legacy = readLegacy();
    if (legacy) parsed = legacy;
  }
  if (!parsed) {
    save(DEFAULT_STATE);
    return structuredClone(DEFAULT_STATE);
  }
  // Soft-merge: ensure newly added keys are present.
  const merged = { ...structuredClone(DEFAULT_STATE), ...parsed };
  const PER_PROFILE = ["stats", "highScores", "quiz", "diary", "mood", "achievements", "counters"];
  for (const k of PER_PROFILE) {
    merged[k] = { ...DEFAULT_STATE[k], ...(parsed[k] || {}) };
    for (const who of ["Алина", "Артур"]) {
      if (k === "stats") {
        merged[k][who] = { ...emptyStats(), ...(merged[k][who] || {}) };
        merged[k][who].byGame = { ...(merged[k][who].byGame || {}) };
      } else if (k === "highScores" || k === "achievements" || k === "counters") {
        merged[k][who] = merged[k][who] || {};
      } else if (k === "quiz" || k === "diary") {
        merged[k][who] = Array.isArray(merged[k][who]) ? merged[k][who] : [];
      } else if (k === "mood") {
        merged[k][who] = merged[k][who] || null;
      }
    }
  }
  merged.history = Array.isArray(merged.history) ? merged.history : [];
  merged.wishes  = Array.isArray(merged.wishes)  ? merged.wishes  : [];
  merged.hero    = { ...DEFAULT_STATE.hero, ...(merged.hero || {}) };
  merged.prefs   = { ...DEFAULT_STATE.prefs, ...(parsed.prefs || {}) };
  merged.version = DEFAULT_STATE.version;
  save(merged);
  return merged;
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

// ── mutation helpers ────────────────────────────────────────

export function recordMatch(state, gameId, winner, loser, isDraw = false) {
  const ts = Date.now();
  state.history.unshift({ ts, game: gameId, winner, loser, draw: !!isDraw });
  if (state.history.length > 200) state.history.length = 200;

  if (isDraw) {
    [winner, loser].forEach(p => {
      if (!state.stats[p]) state.stats[p] = emptyStats();
      state.stats[p].draws += 1;
      state.stats[p].streakWin = 0;
      const g = state.stats[p].byGame[gameId] || { wins: 0, losses: 0, draws: 0 };
      g.draws += 1;
      state.stats[p].byGame[gameId] = g;
    });
  } else {
    if (!state.stats[winner]) state.stats[winner] = emptyStats();
    if (!state.stats[loser])  state.stats[loser]  = emptyStats();
    state.stats[winner].wins += 1;
    state.stats[loser].losses += 1;
    state.stats[winner].streakWin += 1;
    state.stats[winner].bestStreak = Math.max(state.stats[winner].bestStreak, state.stats[winner].streakWin);
    state.stats[loser].streakWin = 0;
    const gw = state.stats[winner].byGame[gameId] || { wins: 0, losses: 0, draws: 0 };
    gw.wins += 1;
    state.stats[winner].byGame[gameId] = gw;
    const gl = state.stats[loser].byGame[gameId] || { wins: 0, losses: 0, draws: 0 };
    gl.losses += 1;
    state.stats[loser].byGame[gameId] = gl;
  }
  save(state);
}

export function recordHighScore(state, profile, gameId, value, isLowerBetter = false) {
  if (!state.highScores[profile]) state.highScores[profile] = {};
  const prev = state.highScores[profile][gameId];
  let improved = false;
  if (prev == null) improved = true;
  else if (isLowerBetter) improved = value < prev;
  else improved = value > prev;
  if (improved) {
    state.highScores[profile][gameId] = value;
    save(state);
  }
  return improved;
}

export function addQuizScore(state, profile, score, total) {
  if (!state.quiz[profile]) state.quiz[profile] = [];
  state.quiz[profile].unshift({ ts: Date.now(), score, total });
  if (state.quiz[profile].length > 50) state.quiz[profile].length = 50;
  save(state);
}

export function addDiary(state, profile, text, mood = "") {
  if (!state.diary[profile]) state.diary[profile] = [];
  state.diary[profile].unshift({ ts: Date.now(), text, mood });
  save(state);
}

export function removeDiary(state, profile, ts) {
  state.diary[profile] = (state.diary[profile] || []).filter(d => d.ts !== ts);
  save(state);
}

export function setMood(state, profile, moodId) {
  state.mood[profile] = { id: moodId, ts: Date.now() };
  save(state);
}

export function addWish(state, text, by) {
  state.wishes.unshift({ id: cryptoId(), text, done: false, by, ts: Date.now() });
  save(state);
}

export function toggleWish(state, id) {
  const w = state.wishes.find(w => w.id === id);
  if (w) { w.done = !w.done; save(state); }
}

export function removeWish(state, id) {
  state.wishes = state.wishes.filter(w => w.id !== id);
  save(state);
}

function cryptoId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return "w_" + Math.random().toString(36).slice(2, 10);
}

// ── achievements / counters ────────────────────────────────

export function unlockAchievement(state, profile, achId, meta = {}) {
  if (!state.achievements[profile]) state.achievements[profile] = {};
  if (state.achievements[profile][achId]) return false; // already unlocked
  state.achievements[profile][achId] = { ts: Date.now(), ...meta };
  save(state);
  return true;
}

export function isUnlocked(state, profile, achId) {
  return !!state.achievements?.[profile]?.[achId];
}

export function bumpCounter(state, profile, key, by = 1) {
  if (!state.counters[profile]) state.counters[profile] = {};
  state.counters[profile][key] = (state.counters[profile][key] || 0) + by;
  save(state);
  return state.counters[profile][key];
}

export function getCounters(state, profile) {
  return state.counters?.[profile] || {};
}

export function setPref(state, key, value) {
  state.prefs = state.prefs || {};
  state.prefs[key] = value;
  save(state);
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const obj = safeParse(text);
  if (!obj || typeof obj !== "object") return false;
  obj.version = DEFAULT_STATE.version;
  save(obj);
  return true;
}

export function resetAll() {
  localStorage.removeItem(KEY);
}
