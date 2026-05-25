// ─────────────────────────  UI / INVITE BANNER  ─────────────────────────

import { el } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { CATALOG } from "../data/catalog.js";
import { Room, setCurrentRoom, getCurrentRoom } from "../network/room.js";
import { go } from "./router.js";

let bannerEl = null;
let currentInvite = null;

export function showInviteBanner(invite, profile) {
  hideInviteBanner();
  if (!invite?.gameId) return;

  currentInvite = invite;
  const gameTitle = invite.title || CATALOG[invite.gameId]?.title || invite.gameId;
  const host = invite.host || "Партнёр";

  bannerEl = el("div", { class: "invite-banner", role: "alert" },
    el("div", { class: "invite-banner-body" },
      el("span", { class: "invite-banner-icon" }, "🎮"),
      el("div", { class: "invite-banner-text" },
        el("strong", {}, `${host} создал${host === "Алина" ? "а" : ""} комнату`),
        el("span", {}, `Игра: ${gameTitle}`),
      ),
    ),
    el("div", { class: "invite-banner-actions" },
      el("button", {
        type: "button",
        class: "cta-btn",
        onclick: () => joinInvite(invite, profile),
      }, "Присоединиться"),
      el("button", {
        type: "button",
        class: "cta-btn ghost invite-dismiss",
        onclick: hideInviteBanner,
        "aria-label": "Закрыть",
      }, "✕"),
    ),
  );

  document.body.append(bannerEl);
  toast(`${host} ждёт тебя в «${gameTitle}»`, 3500);
}

export function hideInviteBanner() {
  currentInvite = null;
  if (bannerEl) { bannerEl.remove(); bannerEl = null; }
}

async function joinInvite(invite, profile) {
  const partner = invite.host;
  if (!partner || !invite.gameId) return;

  hideInviteBanner();
  toast(`Подключаюсь к ${partner}…`);

  try {
    getCurrentRoom()?.leave?.();
    const room = new Room({ profile });
    setCurrentRoom(room);
    await room.joinPartner({ gameId: invite.gameId, partnerProfile: partner });

    room.onStatus((s) => {
      if (s === "open") {
        toast(`На связи с ${partner}!`);
        go(`games/${invite.gameId}/online`);
      }
      if (s === "error") toast(`${partner} уже не в комнате. Попроси создать снова.`);
    });
  } catch (e) {
    console.error(e);
    toast("Не удалось подключиться");
  }
}

export function getCurrentInvite() {
  return currentInvite;
}
