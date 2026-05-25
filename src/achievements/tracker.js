// ─────────────────────────  ACHIEVEMENTS / TRACKER  ─────────────────────────
// Subscribes to event bus, evaluates each achievement on relevant events,
// unlocks via store, surfaces a toast + confetti when unlocked.
//
// Single source of unlock truth → no game has to know about achievements.

import { on } from "../core/events.js";
import { ACHIEVEMENTS } from "../data/achievements.js";
import { unlockAchievement, isUnlocked, bumpCounter } from "../storage/store.js";
import { toast } from "../core/toast.js";
import { confettiBurst } from "../core/confetti.js";

let state = null;

export function startTracker(currentState) {
  state = currentState;

  // Group achievements by event for O(1) lookup
  const byEvent = new Map();
  for (const a of ACHIEVEMENTS) {
    for (const evt of (a.on || [])) {
      if (!byEvent.has(evt)) byEvent.set(evt, []);
      byEvent.get(evt).push(a);
    }
  }

  function evalEvent(eventName, payload) {
    const profile = state.profile || "Алина";
    const stats = state.stats[profile];
    if (!stats) return;
    const ctx = { ...stats, counters: state.counters?.[profile] || {}, achievements: state.achievements?.[profile] || {} };
    for (const a of byEvent.get(eventName) || []) {
      if (isUnlocked(state, profile, a.id)) continue;
      let ok = false;
      try { ok = a.check(ctx, payload); } catch (e) { console.warn("[ach]", a.id, e); }
      if (ok) {
        unlockAchievement(state, profile, a.id, { gameId: payload?.gameId });
        notify(a);
      }
    }
  }

  // ── wire subscriptions ─────────────────────────────────
  on("game:started",  (p) => evalEvent("game:started", p));
  on("game:ended",    (p) => evalEvent("game:ended", p));
  on("game:highscore",(p) => evalEvent("game:highscore", p));
  on("game:quiz",     (p) => evalEvent("game:quiz", p));

  // Counter-based events (e.g. compliment shown N times)
  on("counter:compliment", (p) => {
    const v = bumpCounter(state, p?.profile || state.profile, "compliment");
    evalEvent("counter:compliment", { value: v });
  });
}

function notify(ach) {
  toast(`🏆 ${ach.title}`);
  confettiBurst({ count: 40 });
}
