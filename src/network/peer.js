// ─────────────────────────  NETWORK / PEER  ─────────────────────────

let _Peer = null;

export async function loadPeer() {
  if (_Peer) return _Peer;
  const mod = await import("https://esm.sh/peerjs@1.5.4?bundle");
  _Peer = mod.Peer || mod.default;
  if (!_Peer) throw new Error("PeerJS module missing Peer export");
  return _Peer;
}

export const PROFILES = ["Алина", "Артур"];

export function partnerOf(profile) {
  return profile === "Алина" ? "Артур" : "Алина";
}

export function profileSlug(profile) {
  return profile === "Алина" ? "alina" : "artur";
}

/** Одна комната на пару + игру: создатель = свой профиль, партнёр подключается к его id. */
export function roomPeerId(gameId, hostProfile) {
  return `alinartur-${gameId}-${profileSlug(hostProfile)}`;
}
