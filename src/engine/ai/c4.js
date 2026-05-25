// ─────────────────────────  ENGINE / AI · CONNECT 4  ─────────────────────────
// Alpha-beta with simple heuristic. Depth tunable; default 5 is fast & solid.
// Board: 6 rows × 7 cols. 0 empty, 1/2 players.

const ROWS = 6, COLS = 7;
const DIRS = [[0,1],[1,0],[1,1],[1,-1]];

function clone(b) { return b.map(r => r.slice()); }

function lowestEmpty(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r;
  return -1;
}

function drop(b, c, who) {
  const r = lowestEmpty(b, c);
  if (r < 0) return -1;
  b[r][c] = who;
  return r;
}

function winnerOf(b) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = b[r][c]; if (!v) continue;
    for (const [dr, dc] of DIRS) {
      let n = 0;
      for (let k = 0; k < 4; k++) {
        const nr = r + dr*k, nc = c + dc*k;
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) break;
        if (b[nr][nc] !== v) break;
        n++;
      }
      if (n === 4) return v;
    }
  }
  if (b.every(row => row.every(v => v))) return "draw";
  return null;
}

function score(b, me, opp) {
  // window-scoring heuristic
  let s = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of DIRS) {
      let mine = 0, his = 0;
      let ok = true;
      for (let k = 0; k < 4; k++) {
        const nr = r + dr*k, nc = c + dc*k;
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) { ok = false; break; }
        if (b[nr][nc] === me) mine++;
        else if (b[nr][nc] === opp) his++;
      }
      if (!ok) continue;
      if (mine && his) continue;
      if (mine === 4) s += 1000;
      else if (mine === 3) s += 30;
      else if (mine === 2) s += 4;
      if (his === 4) s -= 1000;
      else if (his === 3) s -= 35;
      else if (his === 2) s -= 4;
    }
  }
  // center bias
  for (let r = 0; r < ROWS; r++) if (b[r][3] === me) s += 3;
  return s;
}

function order(cols) {
  // search middle first → better alpha-beta cuts
  const center = Math.floor(COLS / 2);
  return cols.slice().sort((a, bb) => Math.abs(a - center) - Math.abs(bb - center));
}

function legalCols(b) {
  const out = [];
  for (let c = 0; c < COLS; c++) if (lowestEmpty(b, c) >= 0) out.push(c);
  return order(out);
}

function alphabeta(b, depth, alpha, beta, current, me, opp) {
  const w = winnerOf(b);
  if (w === me)   return { score:  10000 - (5 - depth), move: -1 };
  if (w === opp)  return { score: -10000 + (5 - depth), move: -1 };
  if (w === "draw" || depth === 0) return { score: score(b, me, opp), move: -1 };

  const cols = legalCols(b);
  let best = current === me
    ? { score: -Infinity, move: cols[0] ?? -1 }
    : { score:  Infinity, move: cols[0] ?? -1 };
  for (const c of cols) {
    const r = drop(b, c, current);
    if (r < 0) continue;
    const sub = alphabeta(b, depth - 1, alpha, beta, current === me ? opp : me, me, opp);
    b[r][c] = 0;
    if (current === me) {
      if (sub.score > best.score) best = { score: sub.score, move: c };
      alpha = Math.max(alpha, best.score);
    } else {
      if (sub.score < best.score) best = { score: sub.score, move: c };
      beta = Math.min(beta, best.score);
    }
    if (alpha >= beta) break;
  }
  return best;
}

export function bestColumn(board, me, depth = 5) {
  const opp = me === 1 ? 2 : 1;
  const b = clone(board);
  const r = alphabeta(b, depth, -Infinity, Infinity, me, me, opp);
  return r.move === -1 ? null : r.move;
}
