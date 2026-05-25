// ─────────────────────────  UI / LOBBY  ─────────────────────────
// Modal for online play: host or join a room. Once connected, redirects to
// the game view with mode=online.
//
// PeerJS is loaded lazily (only when the user actually clicks "Online").

import { el, copyToClipboard } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { Room, setCurrentRoom, getCurrentRoom } from "../network/room.js";
import { CATALOG } from "../data/catalog.js";
import { go } from "./router.js";

let overlayEl = null;
let activeRoom = null;

export function openLobby(gameId) {
  closeLobby();
  const g = CATALOG[gameId];
  if (!g) return;

  overlayEl = el("div", { class: "overlay" }, lobbyCard(gameId, g));
  document.body.append(overlayEl);
  overlayEl.addEventListener("click", (e) => { if (e.target === overlayEl) closeLobby(); });
}

export function closeLobby() {
  if (overlayEl) { overlayEl.remove(); overlayEl = null; }
}

function lobbyCard(gameId, g) {
  const status = el("div", { class: "lobby-status muted" }, "Готов к соединению.");
  const codeBox = el("div", { class: "lobby-codebox hidden" });
  const inviteLink = () => `${location.origin}${location.pathname}#/games/${gameId}/online`;

  const hostBtn = el("button", { class: "cta-btn", onclick: async () => {
    try {
      const profile = window.__state?.profile || "Гость";
      activeRoom = new Room({ profile });
      setCurrentRoom(activeRoom);
      hostBtn.disabled = true; joinBtn.disabled = true;
      status.textContent = "Создаю комнату...";
      const { code } = await activeRoom.hostRoom();
      codeBox.classList.remove("hidden");
      codeBox.innerHTML = "";
      codeBox.append(
        el("div", { class: "lobby-code" }, code),
        el("p", { class: "muted" }, "Поделись кодом или ссылкой с партнёром:"),
        el("div", { class: "row-center" },
          el("button", { class: "cta-btn secondary", onclick: async () => {
            await copyToClipboard(code);
            toast("Код скопирован");
          } }, "📋 Код"),
          el("button", { class: "cta-btn secondary", onclick: async () => {
            await copyToClipboard(`${inviteLink()} (код: ${code})`);
            toast("Ссылка скопирована");
          } }, "🔗 Ссылка"),
        ),
      );
      status.textContent = "Жду партнёра...";
      activeRoom.onStatus((s) => {
        if (s === "open")     { status.textContent = "🟢 Партнёр подключился!"; setTimeout(() => { closeLobby(); go(`games/${gameId}/online`); }, 600); }
        if (s === "closed")   { status.textContent = "Соединение закрыто."; }
        if (s === "error")    { status.textContent = "Ошибка соединения. Попробуй ещё раз."; }
      });
    } catch (e) {
      console.error(e);
      status.textContent = "Не удалось создать комнату: " + (e?.message || "");
      hostBtn.disabled = false; joinBtn.disabled = false;
    }
  } }, "🏠 Создать комнату");

  const codeInput = el("input", { type: "text", class: "text-input lobby-input",
    placeholder: "Код комнаты", maxlength: 8, autocapitalize: "characters" });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const joinBtn = el("button", { class: "cta-btn secondary", onclick: async () => {
    const code = codeInput.value.trim().toUpperCase();
    if (code.length < 4) { toast("Введи код"); return; }
    try {
      const profile = window.__state?.profile || "Гость";
      activeRoom = new Room({ profile });
      setCurrentRoom(activeRoom);
      hostBtn.disabled = true; joinBtn.disabled = true;
      status.textContent = "Подключаюсь...";
      await activeRoom.joinRoom(code);
      activeRoom.onStatus((s) => {
        if (s === "open")   { status.textContent = "🟢 На связи!"; setTimeout(() => { closeLobby(); go(`games/${gameId}/online`); }, 500); }
        if (s === "closed") { status.textContent = "Партнёр отключился."; }
        if (s === "error")  { status.textContent = "Ошибка. Проверь код."; }
      });
    } catch (e) {
      console.error(e);
      status.textContent = "Не удалось подключиться: " + (e?.message || "");
      hostBtn.disabled = false; joinBtn.disabled = false;
    }
  } }, "Войти");

  return el("div", { class: "overlay-card lobby-card" },
    el("div", { class: "eyebrow" }, el("span", { class: "dot" }), "Online · " + g.title),
    el("h2", { class: "display" }, "Online комната"),
    el("p", { class: "muted" }, "P2P через WebRTC. Сервер не нужен. Один создаёт — другой подключается."),

    el("div", { class: "lobby-host" }, hostBtn),
    codeBox,

    el("div", { class: "lobby-or" }, "или"),

    el("div", { class: "lobby-join" }, codeInput, joinBtn),

    status,

    el("div", { class: "row-center", style: "margin-top:18px" },
      el("button", { class: "cta-btn ghost", onclick: closeLobby }, "Закрыть"),
    ),
  );
}
