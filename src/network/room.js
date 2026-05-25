// ─────────────────────────  NETWORK / ROOM  ─────────────────────────
// State machine for online play. Two roles: HOST (creates room, peerId = roomCode)
// and GUEST (connects to existing room). One DataConnection per room.
//
// Public API (Room instance):
//   await room.hostRoom(opts)            → { code }
//   await room.joinRoom(code, opts)      → ok
//   room.send(type, data)                — send game move / chat / etc.
//   room.on(type, handler)               — subscribe to incoming msgs by type
//   room.onStatus(handler)               — "connecting", "open", "closed", "error"
//   room.leave()                         — graceful disconnect
//   room.role                            — "host" | "guest"
//   room.peerCount                       — 0 or 1
//
// Reconnect: PeerJS auto-reconnects to broker; we re-emit "open" then ask
// host to resend full state (anti-desync).

import { loadPeer, makeRoomCode, peerIdFor } from "./peer.js";
import { frame, isValid, MSG } from "./protocol.js";
import { emit, EVT } from "../core/events.js";

export class Room {
  constructor({ profile } = {}) {
    this.profile = profile || "?";
    this.peer = null;
    this.conn = null;
    this.role = null;     // "host" | "guest"
    this.code = "";
    this.peerCount = 0;
    this.handlers = new Map();
    this.statusHandlers = new Set();
    this.lastState = null;
    this.lastPong = 0;
    this._heartbeatTimer = null;
  }

  // ── public subscribe API ────────────────────────────────
  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }
  onStatus(handler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }
  _emit(type, payload) {
    this.handlers.get(type)?.forEach(fn => {
      try { fn(payload); } catch (e) { console.error("[room] handler", type, e); }
    });
  }
  _status(s, meta) {
    this.statusHandlers.forEach(fn => { try { fn(s, meta); } catch {} });
  }

  // ── host ────────────────────────────────────────────────
  async hostRoom({ code } = {}) {
    const Peer = await loadPeer();
    this.role = "host";
    this.code = code || makeRoomCode();
    const id  = peerIdFor(this.code);
    this.peer = new Peer(id, { debug: 1 });
    this._wirePeer();
    await this._waitOpen();
    this.peer.on("connection", (conn) => this._adoptConnection(conn));
    emit(EVT.RoomCreated, { code: this.code, hostId: this.peer.id });
    return { code: this.code };
  }

  // ── guest ───────────────────────────────────────────────
  async joinRoom(code) {
    const Peer = await loadPeer();
    this.role = "guest";
    this.code = code.trim().toUpperCase();
    this.peer = new Peer(undefined, { debug: 1 });
    this._wirePeer();
    await this._waitOpen();
    const conn = this.peer.connect(peerIdFor(this.code), { reliable: true });
    this._adoptConnection(conn);
    emit(EVT.RoomJoined, { code: this.code, role: this.role, peerId: this.peer.id });
    return true;
  }

  _wirePeer() {
    this.peer.on("error", (err) => {
      console.warn("[peer]", err);
      this._status("error", err);
    });
    this.peer.on("disconnected", () => this._status("disconnected"));
    this.peer.on("close", () => this._status("closed"));
  }

  _waitOpen() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("peer open timeout")), 15000);
      this.peer.once("open", () => { clearTimeout(t); resolve(); });
      this.peer.once("error", (e) => { clearTimeout(t); reject(e); });
    });
  }

  _adoptConnection(conn) {
    this.conn = conn;
    this._status("connecting");
    conn.on("open", () => {
      this.peerCount = 1;
      this._status("open", { code: this.code, role: this.role });
      // Greet
      this.send(MSG.Hello, { name: this.profile });
      if (this.role === "host") this.send(MSG.Ready, {});
      this._startHeartbeat();
    });
    conn.on("data", (raw) => {
      if (!isValid(raw)) return;
      // Pong tracking (silent)
      if (raw.t === MSG.Pong) { this.lastPong = Date.now(); return; }
      if (raw.t === MSG.Ping) { this.conn.send(frame(MSG.Pong, raw.data)); return; }
      // Remember snapshots for resume/reconnect.
      if (raw.t === MSG.State) this.lastState = raw.data;
      this._emit(raw.t, raw.data);
      emit(EVT.RoomMessage, { type: raw.t, payload: raw.data });
    });
    conn.on("close", () => {
      this.peerCount = 0;
      this._status("closed");
      this._stopHeartbeat();
    });
    conn.on("error", (e) => {
      console.warn("[conn]", e);
      this._status("error", e);
    });
  }

  send(type, data = {}) {
    if (!this.conn || !this.conn.open) return false;
    try { this.conn.send(frame(type, data)); return true; } catch { return false; }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      this.send(MSG.Ping, { ts: Date.now() });
    }, 8000);
  }
  _stopHeartbeat() {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = null;
  }

  leave() {
    try { this.send(MSG.Bye); } catch {}
    this._stopHeartbeat();
    try { this.conn?.close(); } catch {}
    try { this.peer?.destroy(); } catch {}
    this.conn = null; this.peer = null;
    this.peerCount = 0;
    emit(EVT.RoomLeft, { code: this.code });
    this._status("closed");
  }
}

// Singleton helper — most of the UI assumes one active room at a time.
let _current = null;
export function getCurrentRoom() { return _current; }
export function setCurrentRoom(r) { _current = r; }
