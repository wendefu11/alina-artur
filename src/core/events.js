// ─────────────────────────  CORE / EVENT BUS  ─────────────────────────
// Tiny global event emitter. Modules publish events ("game:win", "room:joined",
// "achievement:unlock") and subscribers react without coupling to each other.
//
// Why this exists:
// Old code wired storage.recordMatch directly inside game files. To add an
// AchievementTracker without touching every game we need a pub/sub bus.

const handlers = new Map();

export function on(event, handler) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(handler);
  return () => off(event, handler);
}

export function once(event, handler) {
  const unsub = on(event, (...args) => { unsub(); handler(...args); });
  return unsub;
}

export function off(event, handler) {
  handlers.get(event)?.delete(handler);
}

export function emit(event, payload) {
  const set = handlers.get(event);
  if (!set) return;
  for (const fn of [...set]) {
    try { fn(payload); }
    catch (e) { console.error(`[bus] handler for "${event}" threw:`, e); }
  }
}

// Convenience: subscribe to many at once, returns mass-unsubscribe.
export function onMany(map) {
  const unsubs = Object.entries(map).map(([event, handler]) => on(event, handler));
  return () => unsubs.forEach(u => u());
}

// Well-known event names (single source of truth, prevents typo bugs).
export const EVT = {
  GameStarted:        "game:started",        // {gameId, mode, profile}
  GameEnded:          "game:ended",          // {gameId, winner, loser, draw, score?}
  HighScore:          "game:highscore",      // {gameId, profile, value}
  QuizScore:          "game:quiz",           // {profile, score, total}
  RoomCreated:        "room:created",        // {code, hostId}
  RoomJoined:         "room:joined",         // {code, role, peerId}
  RoomLeft:           "room:left",           // {code}
  Invite:             "room:invite",         // {gameId, host, title}
  RoomMessage:        "room:message",        // {type, payload}
  AchievementUnlock:  "achievement:unlock",  // {id, title, icon}
  ProfileChanged:     "profile:changed",     // {profile}
  ThemeChanged:       "theme:changed",       // {theme}
};
