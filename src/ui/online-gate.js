// ─────────────────────────  UI / ONLINE GATE  ─────────────────────────
// Создать комнату / подключиться. Без кодов — партнёр получает баннер «Присоединиться».

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
  const gameTitle = CATALOG[gameId]?.title || title || gameId;
  const status = el("div", { class: "lobby-status muted" }, "Подключитесь друг к другу.");
  const hint = el("p", { class: "muted online-gate-hint" },
    `Один нажимает «Создать комнату» — ${partner} увидит уведомление с кнопкой «Присоединиться». Коды не нужны.`,
  );

  const hostBtn = el("button", { type: "button", class: "cta-btn" });
  const joinBtn = el("button", { type: "button", class: "cta-btn secondary" });
  let inviteTimer = null;

  hostBtn.textContent = "🏠 Создать комнату";
  joinBtn.textContent = `🔗 Подключиться к ${partner}`;

  function clearInviteTimer() {
    if (inviteTimer) { clearInterval(inviteTimer); inviteTimer = null; }
  }

  hostBtn.onclick = async () => {
    try {
      hostBtn.disabled = joinBtn.disabled = true;
      status.textContent = "Создаю комнату…";
      hint.textContent = `Отправляем приглашение ${partner}…`;
      getCurrentRoom()?.leave?.();
      clearInviteTimer();

      const room = new Room({ profile });
      setCurrentRoom(room);
      await room.hostRoom({ gameId, profile });

      toast(`${profile} создал${profile === "Алина" ? "а" : ""} комнату в «${gameTitle}». Жди ${partner}.`);
      status.textContent = `Ждём ${partner}…`;
      hint.textContent = `${partner} получит уведомление «${profile} создал${profile === "Алина" ? "а" : ""} комнату · ${gameTitle}» — пусть нажмёт «Присоединиться».`;

      const pingInvite = () => sendInvite({ toProfile: partner, gameId, host: profile, title: gameTitle }).catch(() => {});
      pingInvite();
      inviteTimer = setInterval(pingInvite, 20000);

      room.on(MSG.Hello, ({ name }) => {
        clearInviteTimer();
        toast(`🟢 ${name} подключился!`);
        status.textContent = `🟢 ${name} в комнате`;
        hint.textContent = "На связи — начинаем!";
        cancelInvite(partner, gameId).catch(() => {});
        hideInviteBanner();
      });
      room.onStatus((s) => {
        if (s === "open") {
          toast("На связи — начинаем!");
          onConnected?.();
        }
        if (s === "error" || s === "closed") {
          clearInviteTimer();
          status.textContent = s === "error" ? "Ошибка соединения." : "Соединение закрыто.";
          hint.textContent = `Один — «Создать комнату», ${partner} — «Присоединиться» или баннер.`;
          hostBtn.disabled = joinBtn.disabled = false;
        }
      });
    } catch (e) {
      console.error(e);
      clearInviteTimer();
      status.textContent = "Не удалось создать: " + (e?.message || "");
      hint.textContent = `Один — «Создать комнату», ${partner} — «Присоединиться» или баннер.`;
      hostBtn.disabled = joinBtn.disabled = false;
    }
  };

  joinBtn.onclick = async () => {
    try {
      hostBtn.disabled = joinBtn.disabled = true;
      status.textContent = `Подключаюсь к ${partner}…`;
      hint.textContent = `Если ${partner} ещё не создал комнату — попроси нажать «Создать комнату».`;
      getCurrentRoom()?.leave?.();
      clearInviteTimer();

      const room = new Room({ profile });
      setCurrentRoom(room);
      await room.joinPartner({ gameId, partnerProfile: partner });

      room.on(MSG.Ready, ({ host }) => {
        const who = host || partner;
        toast(`${who} создал${who === "Алина" ? "а" : ""} комнату — ты подключился!`);
        status.textContent = `🟢 На связи с ${who}`;
        hint.textContent = "На связи — начинаем!";
      });
      room.onStatus((s) => {
        if (s === "open") onConnected?.();
        if (s === "error") {
          status.textContent = `${partner} ещё не создал комнату. Жди уведомление или попроси нажать «Создать».`;
          hint.textContent = `Когда ${partner} создаст комнату, появится баннер «Присоединиться».`;
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
        el("div", { class: "eyebrow" }, el("span", { class: "dot" }), "Online · " + gameTitle),
        el("h2", {}, gameTitle),
        hint,
      ),
    ),
    el("div", { class: "online-gate-actions" }, hostBtn, joinBtn),
    status,
  );
}
