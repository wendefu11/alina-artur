// ─────────────────────────  NETWORK / PROTOCOL  ─────────────────────────
// Wire format for peer-to-peer messages. JSON-serializable.
//
//   { v: 1, t: "hello",  data: { name, side } }       — handshake
//   { v: 1, t: "ready",  data: {} }                   — guest joined, room ready
//   { v: 1, t: "move",   data: <game-specific> }      — gameplay event
//   { v: 1, t: "state",  data: <game-specific snap>}  — anti-desync full state
//   { v: 1, t: "chat",   data: { text } }             — small chat
//   { v: 1, t: "ping",   data: { ts } }               — heartbeat
//   { v: 1, t: "pong",   data: { ts } }
//   { v: 1, t: "bye",    data: {} }                   — graceful disconnect
//
// Anti-desync: host is canonical. Guest performs optimistic move + waits
// for the host's "state" snapshot every K moves (or after a "move" mismatch).

export const PROTOCOL_VERSION = 1;
export const MSG = {
  Hello: "hello",
  Ready: "ready",
  Move:  "move",
  State: "state",
  Chat:  "chat",
  Ping:  "ping",
  Pong:  "pong",
  Bye:   "bye",
};

export function frame(type, data = {}) {
  return { v: PROTOCOL_VERSION, t: type, data };
}

export function isValid(msg) {
  return msg && typeof msg === "object" && msg.v === PROTOCOL_VERSION && typeof msg.t === "string";
}
