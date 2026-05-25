// ─────────────────────────  GAME · DURAK  ─────────────────────────
// Online only. Host = source of truth. Profile = slot (Алина=1, Артур=2).

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import { MSG } from "../network/protocol.js";
import {
  SUIT_SYMBOLS, SUIT_NAMES, createGame, applyMove, packGame, unpackGame,
  hasOpenDefense, allDefended, legalAttackCards, legalDefendCards, legalTransferCards,
} from "../engine/durak.js";

const P1 = "Алина", P2 = "Артур";
const PLAYER = { 1: P1, 2: P2 };

const VARIANTS = {
  podkidnoy: { label: "Подкидной", hint: "Подкидывай карты того же достоинства. Перевода нет." },
  perevodnoy: { label: "Переводной", hint: "Одна атака за раз. Защитник может перевести картой того же достоинства." },
};

const BITA_LINES = ["БИТА!", "В отбой!", "На свалку!", "Пока-пока!", "Чисто!", "В утиль!"];
const TAKE_LINES = ["Забрал всё…", "Жадина!", "Ой-ой, много карт"];
const TRANSFER_LINES = ["Перевод!", "Лови обратно!", "Бум — перевод!"];
const DURAK_LINES = {
  [P1]: ["Алина — дурак 👑", "Корона дурака — твоя, Алина"],
  [P2]: ["Артур — дурак 👑", "Дурак вечера — Артур"],
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function mount(host, ctx) {
  const room = ctx.room;
  const isHost = room?.role === "host";
  const mySlot = ctx.profile === P1 ? 1 : 2;

  host.classList.add("durak-stage");
  let variant = sessionStorage.getItem("durakVariant") || "podkidnoy";
  let game = isHost ? createGame(variant) : null;
  let selectedTarget = null;
  let transferMode = false;
  let bitaCount = 0;
  let animLock = false;
  let onlineReady = isHost;
  let pendingFx = null;
  let unsub = [];

  function name(slot) { return PLAYER[slot]; }
  function oppSlot(slot) { return slot === 1 ? 2 : 1; }
  const view = () => mySlot;
  const opp = () => oppSlot(mySlot);

  function activeSlot() {
    if (!game || game.winner) return null;
    if (hasOpenDefense(game.table)) return game.defender;
    return game.attacker;
  }

  function canAct() {
    if (!game || animLock || !onlineReady) return false;
    return activeSlot() === mySlot;
  }

  function flash(msg) { ctx.toast(msg); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function renderScore() {
    if (!game) return;
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(P1, game.hands[1].length + " 🃏"),
      scoreChip("Бит", bitaCount + "×"),
      scoreChip(P2, game.hands[2].length + " 🃏"),
    );
  }

  function cardEl(card, opts = {}) {
    const { onClick, selected, disabled, small, anim = "" } = opts;
    return el("button", {
      type: "button",
      class: `playing-card ${card.suit}${selected ? " selected" : ""}${small ? " compact" : ""}${anim ? ` ${anim}` : ""}`,
      disabled: disabled || !onClick,
      onclick: onClick,
    },
      el("span", { class: "card-rank" }, card.rank),
      el("span", { class: "card-suit" }, SUIT_SYMBOLS[card.suit]),
      el("span", { class: "card-name" }, SUIT_NAMES[card.suit]),
    );
  }

  function cardBackEl(i, total) {
    const mid = (total - 1) / 2;
    const offset = (i - mid) * 14;
    const rot = (i - mid) * 4;
    return el("div", {
      class: "card-back durak-back-card",
      style: `--i:${i}; --off:${offset}px; --rot:${rot}deg;`,
      "aria-hidden": "true",
    });
  }

  function showFx(kind, text) {
    const overlay = host.querySelector(".durak-fx-layer");
    if (!overlay || !text) return;
    overlay.innerHTML = "";
    const node = el("div", { class: `durak-fx durak-fx-${kind}` }, text);
    overlay.append(node);
    requestAnimationFrame(() => node.classList.add("show"));
    setTimeout(() => node.remove(), kind === "bita" ? 1400 : 900);
  }

  function shakeHand() {
    const hand = host.querySelector(".durak-my-hand .durak-hand");
    if (!hand) return;
    hand.classList.remove("shake");
    void hand.offsetWidth;
    hand.classList.add("shake");
  }

  function celebrateEnd() {
    if (!game?.winner || game._celebrated) return;
    game._celebrated = true;
    if (game.winner === "draw") flash("Ничья — оба без карт!");
    else {
      const l = game.winner === 1 ? P2 : P1;
      showFx("durak", pick(DURAK_LINES[l]));
      ctx.confettiBurst({ count: 55 });
      ctx.sound("win");
      ctx.vibrate("win");
    }
  }

  function onGameEnd() {
    if (!game?.winner || game.recorded) return;
    celebrateEnd();
    if (!isHost) return;

    game.recorded = true;
    if (game.winner === "draw") {
      ctx.recordResult("durak", P1, P2, true);
    } else {
      const w = game.winner === 1 ? P1 : P2;
      const l = game.winner === 1 ? P2 : P1;
      ctx.recordResult("durak", w, l);
      flash(`${w} победил${w === P1 ? "а" : ""}!`);
    }
    broadcastState();
  }

  function broadcastState() {
    if (!isHost || !game) return;
    room.send(MSG.State, packGame(game, bitaCount));
  }

  function ingestState(payload, fx) {
    if (!payload?.hands) return;
    game = unpackGame(payload);
    bitaCount = payload.bitaCount || 0;
    variant = game.variant;
    onlineReady = true;
    selectedTarget = null;
    transferMode = false;
    animLock = false;
    if (payload.error) flash(payload.error);
    onGameEnd();
    render(true);
    if (fx) showFx(fx.show, fx.text);
    else if (pendingFx) {
      showFx(pendingFx.show, pendingFx.text);
      pendingFx = null;
    }
  }

  function setupOnline() {
    unsub.push(room.on(MSG.State, (payload) => ingestState(payload)));

    unsub.push(room.on(MSG.Move, (move) => {
      if (!isHost || !game) return;
      const err = applyMove(game, move);
      if (move.action === "bita" && !err) bitaCount += 1;
      if (err) {
        room.send(MSG.State, { ...packGame(game, bitaCount), error: err });
        return;
      }
      onGameEnd();
      broadcastState();
    }));

    unsub.push(room.on("sync", () => {
      if (isHost) broadcastState();
    }));

    unsub.push(room.on(MSG.Hello, ({ name }) => {
      if (isHost) {
        flash(`${name} подключился — синхронизирую карты`);
        broadcastState();
      }
    }));

    if (isHost) {
      broadcastState();
      unsub.push(room.onStatus((s) => { if (s === "open") broadcastState(); }));
    } else {
      room.send("sync", {});
    }
  }

  function restart(v = variant) {
    if (!isHost) { flash("Новую партию начинает создатель комнаты"); return; }
    variant = v;
    sessionStorage.setItem("durakVariant", variant);
    game = createGame(variant);
    selectedTarget = null;
    transferMode = false;
    bitaCount = 0;
    broadcastState();
    render(true);
    ctx.sound("pop");
  }

  async function execMove(move, fx) {
    if (animLock || !game) return;
    if (!canAct()) {
      flash("Сейчас не твой ход");
      shakeHand();
      return;
    }

    if (!isHost) {
      animLock = true;
      pendingFx = fx;
      if (fx?.sound) ctx.sound(fx.sound);
      room.send(MSG.Move, { ...move, from: mySlot });
      return;
    }

    animLock = true;
    if (fx?.sound) ctx.sound(fx.sound);
    if (fx?.vibe) ctx.vibrate(fx.vibe);
    if (fx?.delay) await wait(fx.delay);

    const err = applyMove(game, { ...move, from: mySlot });
    if (err) {
      flash(err);
      shakeHand();
      ctx.sound("lose");
      animLock = false;
      render();
      return;
    }
    if (move.action === "bita") bitaCount += 1;
    transferMode = false;
    selectedTarget = null;
    onGameEnd();
    broadcastState();
    render();
    if (fx?.show) showFx(fx.show, fx.text);
    if (fx?.after) await wait(fx.after);
    animLock = false;
    if (move.action === "bita" && !game.winner) ctx.confettiBurst({ count: 40 });
  }

  function handleAttack(cardId) {
    execMove({ action: "attack", cardId }, { sound: "card", vibe: "tap", delay: 100, show: "play", text: "На стол!" });
  }
  function handleDefend(cardId) {
    if (selectedTarget === null) { flash("Сначала выбери «Отбой» на столе."); shakeHand(); return; }
    execMove({ action: "defend", cardId, targetIndex: selectedTarget }, { sound: "match", vibe: "hit", delay: 120, show: "defend", text: "Отбил!" });
  }
  function handleTransfer(cardId) {
    execMove({ action: "transfer", cardId }, { sound: "transfer", vibe: "hit", delay: 150, show: "transfer", text: pick(TRANSFER_LINES) });
  }
  function handleTake() {
    execMove({ action: "take" }, { sound: "take", vibe: "lose", delay: 200, show: "take", text: pick(TAKE_LINES) });
  }
  function handleBita() {
    execMove({ action: "bita" }, { sound: "bita", vibe: "win", delay: 80, show: "bita", text: pick(BITA_LINES), after: 600 });
  }

  function renderHandFace(handEl, slot, isMine) {
    handEl.innerHTML = "";
    if (!game) return;
    const finished = Boolean(game.winner);
    const hand = game.hands[slot];
    if (!hand.length) { handEl.append(el("div", { class: "durak-note" }, "Нет карт")); return; }

    if (!isMine) {
      const fan = el("div", { class: "durak-opponent-fan" });
      const shown = Math.min(hand.length, 7);
      for (let i = 0; i < shown; i++) fan.append(cardBackEl(i, shown));
      if (hand.length > 7) fan.append(el("span", { class: "durak-fan-more" }, `+${hand.length - 7}`));
      handEl.append(fan);
      return;
    }

    hand.forEach((card, i) => {
      const canActNow = canAct() && !finished;
      const canAtk = canActNow && slot === game.attacker && legalAttackCards(game).some((c) => c.id === card.id);
      const canDef = canActNow && slot === game.defender && selectedTarget !== null
        && legalDefendCards(game, selectedTarget).some((c) => c.id === card.id);
      const canTr = canActNow && slot === game.defender && transferMode
        && legalTransferCards(game).some((c) => c.id === card.id);
      const anim = `deal-in deal-delay-${Math.min(i, 5)}`;
      if (canAtk) handEl.append(cardEl(card, { onClick: () => handleAttack(card.id), anim }));
      else if (canTr) handEl.append(cardEl(card, { onClick: () => handleTransfer(card.id), selected: true, anim }));
      else if (canDef) handEl.append(cardEl(card, { onClick: () => handleDefend(card.id), anim }));
      else handEl.append(cardEl(card, { disabled: true, anim }));
    });
  }

  function render(isDeal = false) {
    host.innerHTML = "";

    if (!onlineReady) {
      host.append(
        el("div", { class: "durak-online-bar" },
          el("strong", {}, "Синхронизация…"),
          el("p", { class: "muted" }, "Ждём раздачу от создателя комнаты."),
        ),
      );
      return;
    }

    renderScore();
    host.append(el("div", { class: "durak-fx-layer" }));

    if (room) {
      host.append(el("div", { class: "durak-online-bar" },
        el("span", { class: "durak-online-dot" }),
        el("strong", {}, `${ctx.profile} vs ${ctx.partner}`),
        el("span", { class: "muted" }, isHost ? "ты создал комнату" : "подключён"),
      ));
    }

    const finished = Boolean(game.winner);
    const actor = activeSlot();

    const variantRow = el("div", { class: "durak-variant-row" });
    for (const [key, meta] of Object.entries(VARIANTS)) {
      variantRow.append(el("button", {
        type: "button",
        class: "mode-chip" + (variant === key ? " active" : ""),
        disabled: animLock || !isHost,
        onclick: () => restart(key),
      }, meta.label));
    }
    host.append(variantRow, el("p", { class: "durak-note durak-hint" }, VARIANTS[variant].hint));

    const statusText = finished
      ? (game.winner === "draw" ? "Ничья!" : `Победил${game.winner === 1 ? "а" : ""} ${name(game.winner)}`)
      : actor !== mySlot
        ? `Ход ${name(actor)} — жди соперника`
        : game.statusText;

    host.append(el("div", { class: "turn-indicator" + (actor === mySlot ? " my-turn" : "") },
      el("span", { class: "turn-dot" }),
      el("span", {}, statusText),
    ));

    host.append(el("div", { class: "durak-topline" },
      el("div", { class: "durak-trump durak-trump-glow" },
        el("div", { class: "durak-label" }, "Козырь"),
        game.trumpCard ? cardEl(game.trumpCard, { disabled: true, small: true }) : el("span", {}, "—"),
      ),
      el("div", { class: "durak-deck durak-deck-stack" },
        el("div", { class: "durak-label" }, "Колода"),
        el("div", { class: "durak-deck-visual" },
          el("div", { class: "card-back deck-card" }),
          el("strong", {}, `${Math.max(0, game.deck.length - 1)}`),
        ),
      ),
      el("div", { class: "durak-discard" },
        el("div", { class: "durak-label" }, "Отбой"),
        el("div", { class: "durak-discard-pile" + (bitaCount ? " has-cards" : "") },
          bitaCount ? el("span", { class: "durak-discard-count" }, `${bitaCount}×`) : el("span", { class: "durak-note" }, "пусто"),
        ),
      ),
      el("div", { class: "durak-meta" },
        el("span", { class: game.attacker === mySlot ? "active-role" : "" }, `⚔ ${name(game.attacker)}`),
        el("span", { class: game.defender === mySlot ? "active-role" : "" }, `🛡 ${name(game.defender)}`),
      ),
    ));

    const opponent = oppSlot(mySlot);

    const oppBlock = el("div", { class: "durak-opponent-block" },
      el("div", { class: "durak-label" }, `🙈 ${name(opponent)} (${game.hands[opponent].length})`),
      el("div", { class: "durak-opponent" }),
    );
    renderHandFace(oppBlock.querySelector(".durak-opponent"), opponent, false);
    host.append(oppBlock);

    const tableWrap = el("div", { class: "durak-table-wrap" },
      el("div", { class: "durak-label" }, "Стол"),
      el("div", { class: "durak-table" + (isDeal ? " dealing" : "") }),
    );
    const tableEl = tableWrap.querySelector(".durak-table");
    if (!game.table.length) {
      tableEl.append(el("div", { class: "durak-note durak-table-empty" }, "Пусто — атакующий кладёт карту"));
    } else {
      game.table.forEach((pair, index) => {
        const open = !finished && index === selectedTarget && canAct();
        const pairEl = el("div", { class: `durak-pair table-enter table-enter-${index % 4}` });
        pairEl.append(el("div", { class: "durak-slot" }, cardEl(pair.attack, { disabled: true, small: true, anim: "card-land" })));
        const defSlot = el("div", { class: "durak-slot" + (open ? " open-target" : "") });
        if (pair.defense) {
          defSlot.append(cardEl(pair.defense, { disabled: true, small: true, anim: "defend-land" }));
        } else if (!finished && canAct() && game.defender === mySlot) {
          defSlot.append(el("button", {
            type: "button",
            class: "durak-slot empty-target" + (open ? " pulse-target" : ""),
            onclick: () => { selectedTarget = selectedTarget === index ? null : index; transferMode = false; ctx.sound("click"); render(); },
          }, open ? "✓ Сюда" : "Отбой"));
        } else if (!finished) {
          defSlot.append(el("div", { class: "durak-slot empty-target ghost" }, "…"));
        }
        pairEl.append(defSlot);
        tableEl.append(pairEl);
      });
    }
    host.append(tableWrap);

    const myBlock = el("div", { class: "durak-opponent-block durak-hand-wrap durak-my-hand" },
      el("div", { class: "durak-label" }, `🃏 Твои карты · ${ctx.profile} (${game.hands[mySlot].length})`),
      el("div", { class: "durak-hand" }),
    );
    renderHandFace(myBlock.querySelector(".durak-hand"), mySlot, true);
    host.append(myBlock);

    const canTake = !finished && canAct() && game.defender === mySlot && game.table.length && hasOpenDefense(game.table);
    const canBita = !finished && canAct() && game.attacker === mySlot && allDefended(game.table);
    const canTransferBtn = !finished && game.variant === "perevodnoy" && canAct() && game.defender === mySlot && legalTransferCards(game).length;

    host.append(el("div", { class: "durak-actions" },
      el("button", { type: "button", class: "cta-btn secondary", disabled: !canTake || animLock, onclick: handleTake }, "😬 Взять"),
      game.variant === "perevodnoy"
        ? el("button", {
          type: "button",
          class: "cta-btn secondary" + (transferMode ? " active" : ""),
          disabled: !canTransferBtn || animLock,
          onclick: () => { transferMode = !transferMode; selectedTarget = null; ctx.sound("click"); render(); },
        }, transferMode ? "Отмена" : "🔄 Перевод")
        : null,
      el("button", {
        type: "button",
        class: "cta-btn durak-bita-btn" + (canBita ? " bita-ready" : ""),
        disabled: !canBita || animLock,
        onclick: handleBita,
      }, canBita ? "🔥 БИТА!" : "Бита"),
      el("button", {
        type: "button",
        class: "cta-btn ghost",
        disabled: animLock || !isHost,
        onclick: () => restart(variant),
      }, "↻ Заново"),
    ));

    if (finished) {
      host.append(el("div", { class: "durak-end-card" },
        el("p", {}, game.winner === "draw" ? "Оба без карт!" : `${name(game.winner === 1 ? 2 : 1)} — дурак 👑`),
      ));
    }
  }

  setupOnline();
  render(true);

  ctx.registerCleanup(() => {
    unsub.forEach((fn) => fn?.());
    host.innerHTML = "";
    host.classList.remove("durak-stage");
  });
}
