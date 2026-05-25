// ─────────────────────────  NETWORK / INVITE  ─────────────────────────
// Партнёр слушает свой signal-peer и получает приглашение в игру.

import { loadPeer, signalPeerId, partnerOf } from "./peer.js";
import { frame, MSG } from "./protocol.js";

let listenerPeer = null;
let listenerProfile = null;

function waitOpen(peer) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("signal peer timeout")), 15000);
    peer.once("open", () => { clearTimeout(t); resolve(); });
    peer.once("error", (e) => { clearTimeout(t); reject(e); });
  });
}

function waitConn(conn) {
  return new Promise((resolve, reject) => {
    if (conn.open) { resolve(); return; }
    const t = setTimeout(() => reject(new Error("signal conn timeout")), 8000);
    conn.once("open", () => { clearTimeout(t); resolve(); });
    conn.once("error", (e) => { clearTimeout(t); reject(e); });
  });
}

/** Слушать приглашения для profile (Алина / Артур). */
export async function startInviteListener(profile, onInvite) {
  stopInviteListener();
  listenerProfile = profile;
  const Peer = await loadPeer();
  const id = signalPeerId(profile);
  listenerPeer = new Peer(id, { debug: 1 });
  listenerPeer.on("error", (err) => {
    if (err?.type === "unavailable-id") return;
    console.warn("[invite listen]", err);
  });
  await waitOpen(listenerPeer);
  listenerPeer.on("connection", (conn) => {
    conn.on("data", (raw) => {
      if (!raw?.t) return;
      if (raw.t === MSG.Invite && raw.data?.gameId) onInvite?.(raw.data);
      if (raw.t === MSG.InviteCancel) onInvite?.(null);
    });
  });
  return stopInviteListener;
}

export function stopInviteListener() {
  try { listenerPeer?.destroy(); } catch {}
  listenerPeer = null;
  listenerProfile = null;
}

/** Хост шлёт приглашение партнёру. */
export async function sendInvite({ toProfile, gameId, host, title }) {
  const Peer = await loadPeer();
  const peer = new Peer(undefined, { debug: 1 });
  try {
    await waitOpen(peer);
    const conn = peer.connect(signalPeerId(toProfile), { reliable: true });
    await waitConn(conn);
    conn.send(frame(MSG.Invite, { gameId, host, title, ts: Date.now() }));
    await new Promise((r) => setTimeout(r, 400));
  } finally {
    try { peer.destroy(); } catch {}
  }
}

export async function cancelInvite(toProfile, gameId) {
  const Peer = await loadPeer();
  const peer = new Peer(undefined, { debug: 1 });
  try {
    await waitOpen(peer);
    const conn = peer.connect(signalPeerId(toProfile), { reliable: true });
    await waitConn(conn);
    conn.send(frame(MSG.InviteCancel, { gameId }));
    await new Promise((r) => setTimeout(r, 200));
  } catch {} finally {
    try { peer.destroy(); } catch {}
  }
}

export { partnerOf };
