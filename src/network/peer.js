// ─────────────────────────  NETWORK / PEER  ─────────────────────────
// Thin wrapper around PeerJS (loaded from esm.sh).
//
// Why PeerJS:
//   - Free public signaling broker — no backend needed for GitHub Pages.
//   - Mature WebRTC abstraction with automatic reconnect.
//   - We export ONLY what we use (Peer, error/open/connection events),
//     so swapping for Trystero/Firebase later is a 1-file change.

let _Peer = null;

export async function loadPeer() {
  if (_Peer) return _Peer;
  // ESM bundle of peerjs (works directly in GitHub Pages, no build step).
  const mod = await import("https://esm.sh/peerjs@1.5.4?bundle");
  _Peer = mod.Peer || mod.default;
  if (!_Peer) throw new Error("PeerJS module missing Peer export");
  return _Peer;
}

// Generate a short, human-shareable room code (6 chars, no ambiguous glyphs).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function makeRoomCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

// Map room code → PeerJS id. Prefix keeps codes within our app's namespace.
export function peerIdFor(roomCode) {
  return "alinartur-" + roomCode;
}

export function parseRoomCode(peerId) {
  return peerId.startsWith("alinartur-") ? peerId.slice("alinartur-".length) : peerId;
}
