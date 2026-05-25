// ─────────────────────────  UI / LOBBY  ─────────────────────────

import { el } from "../core/dom.js";
import { CATALOG } from "../data/catalog.js";
import { renderOnlineGate } from "./online-gate.js";
import { go } from "./router.js";

let overlayEl = null;

export function openLobby(gameId) {
  closeLobby();
  const g = CATALOG[gameId];
  if (!g) return;
  const profile = window.__state?.profile || "Гость";

  overlayEl = el("div", { class: "overlay" });
  overlayEl.append(el("div", { class: "overlay-card lobby-card" },
    renderOnlineGate(gameId, profile, {
      title: g.title,
      onConnected: () => { closeLobby(); go(`games/${gameId}/online`); },
    }),
    el("div", { class: "row-center", style: "margin-top:14px" },
      el("button", { type: "button", class: "cta-btn ghost", onclick: closeLobby }, "Закрыть"),
    ),
  ));
  document.body.append(overlayEl);
  overlayEl.addEventListener("click", (e) => { if (e.target === overlayEl) closeLobby(); });
}

export function closeLobby() {
  if (overlayEl) { overlayEl.remove(); overlayEl = null; }
}
