// ─────────────────────────  NETWORK / ROOM  ─────────────────────────

import { loadPeer, roomPeerId } from "./peer.js";
import { frame, isValid, MSG } from "./protocol.js";
import { emit, EVT } from "../core/events.js";

export class Room {
  constructor({ profile } = {}) {
    this.profile = profile || "?";
    this.gameId = "";
    this.peer = null;
    this.conn = null;
    this.role = null;
    this.code = "";
    this.peerCount = 0;
    this.handlers = new Map();
    this.statusHandlers = new Set();
    this.lastState = null;
    this.lastPong = 0;
    this._heartbeatTimer = null;
  }

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

  /** Создатель комнаты — peer id привязан к игре и профилю. */
  async hostRoom({ gameId, profile } = {}) {
    const Peer = await loadPeer();
    this.role = "host";
    this.gameId = gameId || "";
    this.code = roomPeerId(gameId, profile || this.profile);
    this.peer = new Peer(this.code, { debug: 1 });
    this._wirePeer();
    await this._waitOpen();
    this.peer.on("connection", (conn) => this._adoptConnection(conn));
    emit(EVT.RoomCreated, { code: this.code, gameId, hostId: this.peer.id });
    return { code: this.code };
  }

  /** Партнёр подключается к комнате создателя (без кодов). */
  async joinPartner({ gameId, partnerProfile }) {
    const Peer = await loadPeer();
    this.role = "guest";
    this.gameId = gameId || "";
    this.code = roomPeerId(gameId, partnerProfile);
    this.peer = new Peer(undefined, { debug: 1 });
    this._wirePeer();
    await this._waitOpen();
    const conn = this.peer.connect(this.code, { reliable: true });
    this._adoptConnection(conn);
    emit(EVT.RoomJoined, { code: this.code, gameId, role: this.role, peerId: this.peer.id });
    return true;
  }

  get isOpen() {
    return Boolean(this.conn?.open);
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
      this._status("open", { code: this.code, role: this.role, gameId: this.gameId });
      this.send(MSG.Hello, { name: this.profile });
      if (this.role === "host") this.send(MSG.Ready, { host: this.profile });
      this._startHeartbeat();
    });
    conn.on("data", (raw) => {
      if (!isValid(raw)) return;
      if (raw.t === MSG.Pong) { this.lastPong = Date.now(); return; }
      if (raw.t === MSG.Ping) { this.conn.send(frame(MSG.Pong, raw.data)); return; }
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

let _current = null;
export function getCurrentRoom() { return _current; }
export function setCurrentRoom(r) { _current = r; }

export function isRoomReady() {
  const r = getCurrentRoom();
  return Boolean(r?.isOpen);
}
