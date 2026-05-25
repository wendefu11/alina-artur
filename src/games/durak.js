// ─────────────────────────  GAME · DURAK  ─────────────────────────
// 36 cards. Hidden opponent hand + animations + bita flair.

import { el } from "../core/dom.js";
import { scoreChip } from "../engine/scoreboard.js";
import {
  SUIT_SYMBOLS, SUIT_NAMES, createGame, attack, defend, transfer,
  takeCards, finishBita, hasOpenDefense, allDefended,
  legalAttackCards, legalDefendCards, legalTransferCards,
} from "../engine/durak.js";

const P1 = "Алина", P2 = "Артур";
const PLAYER = { 1: P1, 2: P2 };

const VARIANTS = {
  podkidnoy: { label: "Подкидной", hint: "Подкидывай карты того же достоинства. Перевода нет." },
  perevodnoy: { label: "Переводной", hint: "Одна атака за раз. Защитник может перевести картой того же достоинства." },
};

const BITA_LINES = [
  "БИТА!", "В отбой!", "На свалку!", "Пока-пока!", "Чисто!", "В утиль!", "Не нужно!", "Снос!",
];
const TAKE_LINES = ["Забрал всё…", "Жадина!", "Ой-ой, много карт", "Тяжёлая рука"];
const TRANSFER_LINES = ["Перевод!", "Лови обратно!", "Бум — перевод!", "Не отвертишься!"];
const DURAK_LINES = {
  [P1]: ["Алина — дурак 👑", "Корона дурака — твоя, Алина", "Алина, карты не отпускают"],
  [P2]: ["Артур — дурак 👑", "Дурак вечера — Артур", "Артур остался с картами, ха!"],
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function mount(host, ctx) {
  host.classList.add("durak-stage");
  const mySlot = ctx.profile === P1 ? 1 : 2;
  let holderSlot = mySlot;
  let variant = sessionStorage.getItem("durakVariant") || "podkidnoy";
  let game = createGame(variant);
  let selectedTarget = null;
  let transferMode = false;
  let bitaCount = 0;
  let animLock = false;
  let tableEnter = 0;

  function name(slot) { return PLAYER[slot]; }
  function oppSlot(slot) { return slot === 1 ? 2 : 1; }

  function activeSlot() {
    if (game.winner) return null;
    if (hasOpenDefense(game.table)) return game.defender;
    return game.attacker;
  }

  function canHolderAct() {
    const a = activeSlot();
    return a === holderSlot && !animLock;
  }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(P1, game.hands[1].length + " 🃏"),
      scoreChip("Бит", bitaCount + "×"),
      scoreChip(P2, game.hands[2].length + " 🃏"),
    );
  }

  function cardEl(card, { onClick, selected, disabled, small, anim = "" } = {}) {
    const sym = SUIT_SYMBOLS[card.suit];
    return el("button", {
      type: "button",
      class: `playing-card ${card.suit}${selected ? " selected" : ""}${small ? " compact" : ""}${anim ? ` ${anim}` : ""}`,
      disabled: disabled || !onClick,
      onclick: onClick,
    },
      el("span", { class: "card-rank" }, card.rank),
      el("span", { class: "card-suit" }, sym),
      el("span", { class: "card-name" }, SUIT_NAMES[card.suit]),
    );
  }

  function cardBackEl(i, total) {
    const mid = (total - 1) / 2;
    const spread = Math.min(total, 8);
    const offset = (i - mid) * 14;
    const rot = (i - mid) * 4;
    return el("div", {
      class: "card-back durak-back-card",
      style: `--i:${i}; --off:${offset}px; --rot:${rot}deg;`,
      "aria-hidden": "true",
    });
  }

  function flash(msg) { ctx.toast(msg); }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function showFx(kind, text) {
    const overlay = host.querySelector(".durak-fx-layer");
    if (!overlay) return;
    overlay.innerHTML = "";
    const node = el("div", { class: `durak-fx durak-fx-${kind}` }, text);
    overlay.append(node);
    requestAnimationFrame(() => node.classList.add("show"));
    setTimeout(() => { if (node.parentNode) node.remove(); }, kind === "bita" ? 1400 : 900);
  }

  function shakeHand() {
    const hand = host.querySelector(".durak-my-hand .durak-hand");
    if (!hand) return;
    hand.classList.remove("shake");
    void hand.offsetWidth;
    hand.classList.add("shake");
  }

  function onGameEnd() {
    if (!game.winner) return;
    if (game.winner === "draw") {
      ctx.recordResult("durak", P1, P2, true);
      flash("Ничья — оба без карт!");
    } else {
      const w = game.winner === 1 ? P1 : P2;
      const l = game.winner === 1 ? P2 : P1;
      ctx.recordResult("durak", w, l);
      ctx.confettiBurst();
      ctx.sound("win");
      ctx.vibrate("win");
      showFx("durak", pick(DURAK_LINES[l]));
      flash(`${w} победил${w === P1 ? "а" : ""}! ${pick(DURAK_LINES[l])}`);
    }
  }

  function restart(v = variant) {
    variant = v;
    sessionStorage.setItem("durakVariant", variant);
    game = createGame(variant);
    selectedTarget = null;
    transferMode = false;
    bitaCount = 0;
    holderSlot = mySlot;
    tableEnter = 0;
    render(true);
    ctx.sound("pop");
  }

  async function withAnim(fn, fx) {
    if (animLock) return;
    if (!canHolderAct() && fx !== "deal") {
      flash(`Передай телефон: ход ${name(activeSlot())}`);
      shakeHand();
      ctx.vibrate("hit");
      return;
    }
    animLock = true;
    if (fx?.sound) ctx.sound(fx.sound);
    if (fx?.vibe) ctx.vibrate(fx.vibe);
    if (fx?.delay) await wait(fx.delay);
    const err = fn();
    if (err) {
      flash(err);
      shakeHand();
      ctx.sound("lose");
      animLock = false;
      render();
      return;
    }
    transferMode = false;
    onGameEnd();
    tableEnter++;
    render();
    if (fx?.show) showFx(fx.show, fx.text);
    if (fx?.after) await wait(fx.after);
    animLock = false;
  }

  function handleAttack(cardId) {
    withAnim(() => attack(game, cardId), {
      sound: "card", vibe: "tap", delay: 120, show: "play", text: "На стол!",
    });
  }

  function handleDefend(cardId) {
    if (selectedTarget === null) { flash("Сначала выбери «Отбой» на столе."); shakeHand(); return; }
    withAnim(() => {
      const err = defend(game, cardId, selectedTarget);
      selectedTarget = null;
      return err;
    }, { sound: "match", vibe: "hit", delay: 160, show: "defend", text: "Отбил!" });
  }

  function handleTransfer(cardId) {
    withAnim(() => transfer(game, cardId), {
      sound: "transfer", vibe: "hit", delay: 200, show: "transfer", text: pick(TRANSFER_LINES),
    });
  }

  function handleTake() {
    withAnim(() => takeCards(game), {
      sound: "take", vibe: "lose", delay: 280, show: "take", text: pick(TAKE_LINES), after: 200,
    });
  }

  function handleBita() {
    withAnim(() => {
      const err = finishBita(game);
      if (!err) bitaCount += 1;
      return err;
    }, {
      sound: "bita", vibe: "win", delay: 100, show: "bita", text: pick(BITA_LINES), after: 700,
    });
    if (!game.winner) ctx.confettiBurst({ count: 40 });
  }

  function renderHandFace(handEl, slot, { isMine }) {
    handEl.innerHTML = "";
    const finished = Boolean(game.winner);
    const hand = game.hands[slot];

    if (!hand.length) {
      handEl.append(el("div", { class: "durak-note" }, "Нет карт"));
      return;
    }

    if (!isMine) {
      const fan = el("div", { class: "durak-opponent-fan" });
      const shown = Math.min(hand.length, 7);
      for (let i = 0; i < shown; i++) fan.append(cardBackEl(i, shown));
      if (hand.length > 7) {
        fan.append(el("span", { class: "durak-fan-more" }, `+${hand.length - 7}`));
      }
      handEl.append(fan);
      return;
    }

    hand.forEach((card, i) => {
      const canAct = canHolderAct() && !finished;
      const canAtk = canAct && slot === game.attacker && legalAttackCards(game).some((c) => c.id === card.id);
      const canDef = canAct && slot === game.defender && selectedTarget !== null
        && legalDefendCards(game, selectedTarget).some((c) => c.id === card.id);
      const canTr = canAct && slot === game.defender && transferMode
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
    renderScore();

    const opp = oppSlot(holderSlot);
    const finished = Boolean(game.winner);
    const actor = activeSlot();
    const needPass = actor && actor !== holderSlot && !finished;

    host.append(el("div", { class: "durak-fx-layer" }));

    const variantRow = el("div", { class: "durak-variant-row" });
    for (const [key, meta] of Object.entries(VARIANTS)) {
      variantRow.append(el("button", {
        type: "button",
        class: "mode-chip" + (variant === key ? " active" : ""),
        disabled: animLock,
        onclick: () => restart(key),
      }, meta.label));
    }
    host.append(variantRow);
    host.append(el("p", { class: "durak-note durak-hint" }, VARIANTS[variant].hint));

    if (needPass) {
      host.append(el("div", { class: "durak-pass-banner" },
        el("span", { class: "durak-pass-icon" }, "🙈"),
        el("div", {},
          el("strong", {}, `Ход ${name(actor)}`),
          el("p", {}, "Карты соперника скрыты. Передай телефон и подтверди."),
        ),
        el("button", {
          type: "button",
          class: "cta-btn",
          onclick: () => { holderSlot = actor; render(); ctx.sound("notify"); },
        }, `Я — ${name(actor)}`),
      ));
    }

    host.append(el("div", { class: "turn-indicator" + (actor === holderSlot ? " my-turn" : "") },
      el("span", { class: "turn-dot" }),
      el("span", {}, finished
        ? (game.winner === "draw" ? "Ничья!" : `Победил${game.winner === 1 ? "а" : ""} ${name(game.winner)}`)
        : needPass ? `Ждём ${name(actor)}…` : game.statusText),
    ));

    const topline = el("div", { class: "durak-topline" });
    topline.append(
      el("div", { class: "durak-trump durak-trump-glow" },
        el("div", { class: "durak-label" }, "Козырь"),
        game.trumpCard
          ? cardEl(game.trumpCard, { disabled: true, small: true })
          : el("span", {}, "—"),
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
        el("span", { class: game.attacker === holderSlot ? "active-role" : "" }, `⚔ ${name(game.attacker)}`),
        el("span", { class: game.defender === holderSlot ? "active-role" : "" }, `🛡 ${name(game.defender)}`),
      ),
    );
    host.append(topline);

    const oppBlock = el("div", { class: "durak-opponent-block" },
      el("div", { class: "durak-label" },
        `🙈 ${name(opp)} · ${game.attacker === opp ? "атака" : game.defender === opp ? "защита" : ""} (${game.hands[opp].length})`,
      ),
      el("div", { class: "durak-opponent" }),
    );
    renderHandFace(oppBlock.querySelector(".durak-opponent"), opp, { isMine: false });
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
        const open = !finished && index === selectedTarget && canHolderAct();
        const pairEl = el("div", { class: `durak-pair table-enter table-enter-${index % 4}` });
        pairEl.append(el("div", { class: "durak-slot" },
          cardEl(pair.attack, { disabled: true, small: true, anim: "card-land" }),
        ));

        const defSlot = el("div", { class: "durak-slot" + (open ? " open-target" : "") });
        if (pair.defense) {
          defSlot.append(cardEl(pair.defense, { disabled: true, small: true, anim: "defend-land" }));
        } else if (!finished && canHolderAct() && game.defender === holderSlot) {
          defSlot.append(el("button", {
            type: "button",
            class: "durak-slot empty-target" + (open ? " pulse-target" : ""),
            onclick: () => {
              selectedTarget = selectedTarget === index ? null : index;
              transferMode = false;
              ctx.sound("click");
              render();
            },
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
      el("div", { class: "durak-label" },
        `🃏 Твои карты · ${name(holderSlot)} (${game.hands[holderSlot].length})`,
      ),
      el("div", { class: "durak-hand" }),
    );
    renderHandFace(myBlock.querySelector(".durak-hand"), holderSlot, { isMine: true });
    host.append(myBlock);

    const actions = el("div", { class: "durak-actions" });
    const canTake = !finished && canHolderAct() && game.defender === holderSlot
      && game.table.length && hasOpenDefense(game.table);
    const canBita = !finished && canHolderAct() && game.attacker === holderSlot && allDefended(game.table);
    const canTransferBtn = !finished && game.variant === "perevodnoy"
      && canHolderAct() && game.defender === holderSlot && legalTransferCards(game).length;

    actions.append(
      el("button", {
        type: "button",
        class: "cta-btn secondary",
        disabled: !canTake || animLock,
        onclick: handleTake,
      }, "😬 Взять"),
      game.variant === "perevodnoy"
        ? el("button", {
          type: "button",
          class: "cta-btn secondary" + (transferMode ? " active" : ""),
          disabled: !canTransferBtn || animLock,
          onclick: () => {
            if (!canHolderAct()) { flash(`Передай телефон: ${name(activeSlot())}`); return; }
            transferMode = !transferMode;
            selectedTarget = null;
            ctx.sound("click");
            render();
          },
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
        disabled: animLock,
        onclick: () => restart(variant),
      }, "↻ Заново"),
    );
    host.append(actions);

    if (finished) {
      const loser = name(game.winner === 1 ? 2 : 1);
      host.append(el("div", { class: "durak-end-card" },
        el("p", {}, game.winner === "draw" ? "Оба без карт — редкая ничья!" : `${loser} — дурак 👑`),
      ));
    }
  }

  render(true);
  ctx.registerCleanup(() => { host.innerHTML = ""; host.classList.remove("durak-stage"); });
}
