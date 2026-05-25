// ─────────────────────────  UI / ONLINE GATE  ─────────────────────────
// Два действия: создать комнату / подключиться к партнёру. Без кодов.

import { el } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { Room, setCurrentRoom, getCurrentRoom, isRoomReady } from "../network/room.js";
import { partnerOf } from "../network/peer.js";
import { sendInvite, cancelInvite } from "../network/invite.js";
import { hideInviteBanner } from "./invite-banner.js";
import { CATALOG } from "../data/catalog.js";
import { MSG } from "../network/protocol.js";

export function renderOnlineGate(gameId, profile, { onConnected, title } = {}) {
  if (isRoomReady() && getCurrentRoom()?.gameId === gameId) {
    queueMicrotask(() => onConnected?.());
    return el("div");
  }

  const partner = partnerOf(profile);
  const status = el("div", { class: "lobby-status muted" }, "Подключитесь друг к другу.");

  const hostBtn = el("button", { type: "button", class: "cta-btn" });
  const joinBtn = el("button", { type: "button", class: "cta-btn secondary" });

  hostBtn.textContent = "🏠 Создать комнату";
  joinBtn.textContent = `🔗 Подключиться к ${partner}`;

  hostBtn.onclick = async () => {
    try {
      hostBtn.disabled = joinBtn.disabled = true;
      status.textContent = "Создаю комнату…";
      getCurrentRoom()?.leave?.();
      const room = new Room({ profile });
      setCurrentRoom(room);
      await room.hostRoom({ gameId, profile });
      const gameTitle = CATALOG[gameId]?.title || title || gameId;
      toast(`${profile} создал${profile === "Алина" ? "а" : ""} комнату в «${gameTitle}». Жди ${partner}.`);
      status.textContent = `Ждём ${partner} в «${gameTitle}»…`;

      const pingInvite = () => sendInvite({ toProfile: partner, gameId, host: profile, title: gameTitle }).catch(() => {});
      pingInvite();
      const inviteTimer = setInterval(pingInvite, 20000);

      room.on(MSG.Hello, ({ name }) => {
        clearInterval(inviteTimer);
        toast(`🟢 ${name} подключился!`);
        status.textContent = `🟢 ${name} в комнате`;
        cancelInvite(partner, gameId).catch(() => {});
        hideInviteBanner();
      });
      room.onStatus((s) => {
        if (s === "open") {
          toast("На связи — начинаем!");
          onConnected?.();
        }
        if (s === "error" || s === "closed") {
          status.textContent = s === "error" ? "Ошибка соединения." : "Соединение закрыто.";
          hostBtn.disabled = joinBtn.disabled = false;
        }
      });
    } catch (e) {
      console.error(e);
      status.textContent = "Не удалось создать: " + (e?.message || "");
      hostBtn.disabled = joinBtn.disabled = false;
    }
  };

  joinBtn.onclick = async () => {
    try {
      hostBtn.disabled = joinBtn.disabled = true;
      status.textContent = `Подключаюсь к ${partner}…`;
      getCurrentRoom()?.leave?.();
      const room = new Room({ profile });
      setCurrentRoom(room);
      await room.joinPartner({ gameId, partnerProfile: partner });

      room.on(MSG.Ready, ({ host }) => {
        const who = host || partner;
        toast(`${who} создал${who === "Алина" ? "а" : ""} комнату — ты подключился!`);
        status.textContent = `🟢 На связи с ${who}`;
      });
      room.onStatus((s) => {
        if (s === "open") onConnected?.();
        if (s === "error") {
          status.textContent = `${partner} ещё не создал комнату. Попроси нажать «Создать».`;
          hostBtn.disabled = joinBtn.disabled = false;
        }
        if (s === "closed") {
          status.textContent = "Соединение закрыто.";
          hostBtn.disabled = joinBtn.disabled = false;
        }
      });
    } catch (e) {
      console.error(e);
      status.textContent = "Не удалось подключиться: " + (e?.message || "");
      hostBtn.disabled = joinBtn.disabled = false;
    }
  };

  return el("div", { class: "online-gate card" },
    el("div", { class: "card-head" },
      el("div", {},
        el("h2", {}, title || "Online"),
        el("p", { class: "muted" }, `Один — «Создать комнату», ${partner} — «Подключиться». Коды не нужны.`),
      ),
    ),
    el("div", { class: "online-gate-actions" }, hostBtn, joinBtn),
    status,
  );
}
