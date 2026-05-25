// ─────────────────────────  ENGINE / AI · TIC TAC TOE  ─────────────────────────
// Perfect-play minimax. Board uses ints: 0 empty, 1 = "X", 2 = "O".
// bestMove(board, me) → index 0..8 (or null if board is full).

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function winnerOf(b) {
  for (const [a,bb,c] of LINES) {
    if (b[a] && b[a] === b[bb] && b[bb] === b[c]) return b[a];
  }
  if (b.every(Boolean)) return "draw";
  return null;
}

function score(b, me, opp, depth) {
  const w = winnerOf(b);
  if (w === me)   return 10 - depth;
  if (w === opp)  return depth - 10;
  if (w === "draw") return 0;
  return null;
}

function minimax(b, current, me, opp, depth) {
  const s = score(b, me, opp, depth);
  if (s !== null) return { score: s, move: -1 };
  let best = current === me
    ? { score: -Infinity, move: -1 }
    : { score:  Infinity, move: -1 };
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = current;
    const r = minimax(b, current === me ? opp : me, me, opp, depth + 1);
    b[i] = 0;
    if (current === me ? r.score > best.score : r.score < best.score) {
      best = { score: r.score, move: i };
    }
  }
  return best;
}

export function bestMove(board, me) {
  const opp = me === 1 ? 2 : 1;
  const b = [...board];
  if (b.every(c => c === 0)) return 4; // opening shortcut: center
  const r = minimax(b, me, me, opp, 0);
  return r.move === -1 ? null : r.move;
}
