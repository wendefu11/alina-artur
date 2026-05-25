// ─────────────────────────  ENGINE / AI · RPS  ─────────────────────────
// Tracks player history → builds a 2-order Markov chain on the player's moves
// → picks the move that beats the predicted next move. Falls back to random.
//
// usage:
//   const ai = createRpsAi();
//   const aiMove = ai.next();       // before player moves
//   ai.observe(playerMove);         // after each round
//
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };
const COUNTER = { rock: "paper", paper: "scissors", scissors: "rock" };
const CHOICES = ["rock", "paper", "scissors"];

export function createRpsAi() {
  const history = [];        // player's actual moves
  const table = new Map();   // "AB" → {rock, paper, scissors}

  function key(n = 2) {
    return history.slice(-n).join("");
  }

  function counter(move) { return COUNTER[move]; }

  function next() {
    if (history.length < 2) return CHOICES[Math.floor(Math.random() * 3)];
    const k = key(2);
    const probs = table.get(k);
    if (!probs) return CHOICES[Math.floor(Math.random() * 3)];
    let bestMove = "rock", bestC = -1;
    for (const m of CHOICES) {
      if ((probs[m] || 0) > bestC) { bestC = probs[m]; bestMove = m; }
    }
    return counter(bestMove);
  }

  function observe(playerMove) {
    if (history.length >= 2) {
      const k = key(2);
      const t = table.get(k) || { rock: 0, paper: 0, scissors: 0 };
      t[playerMove] = (t[playerMove] || 0) + 1;
      table.set(k, t);
    }
    history.push(playerMove);
  }

  return { next, observe, counter };
}

export function beats(a, b) {
  if (a === b) return 0;
  return BEATS[a] === b ? 1 : -1;
}
