// ─────────────────────────  GAME · DURAK  ─────────────────────────
// 36 cards. Hot-seat: Алина vs Артур. Rules: подкидной | переводной.

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

export default function mount(host, ctx) {
  let variant = sessionStorage.getItem("durakVariant") || "podkidnoy";
  let game = createGame(variant);
  let selectedTarget = null;
  let transferMode = false;

  function name(slot) { return PLAYER[slot]; }

  function renderScore() {
    ctx.scoreboardEl.innerHTML = "";
    ctx.scoreboardEl.append(
      scoreChip(P1, game.hands[1].length + " карт"),
      scoreChip(P2, game.hands[2].length + " карт"),
    );
  }

  function cardEl(card, { onClick, selected, disabled, small } = {}) {
    const sym = SUIT_SYMBOLS[card.suit];
    const btn = el("button", {
      type: "button",
      class: `playing-card ${card.suit}${selected ? " selected" : ""}${small ? " compact" : ""}`,
      disabled: disabled || !onClick,
      onclick: onClick,
    },
      el("span", { class: "card-rank" }, card.rank),
      el("span", { class: "card-suit" }, sym),
      el("span", { class: "card-name" }, SUIT_NAMES[card.suit]),
    );
    return btn;
  }

  function flash(msg) { ctx.toast(msg); }

  function onGameEnd() {
    if (!game.winner) return;
    if (game.winner === "draw") {
      ctx.recordResult("durak", P1, P2, true);
      flash("Ничья — оба без карт!");
    } else if (game.winner === 1) {
      ctx.recordResult("durak", P1, P2);
      ctx.confettiBurst();
      flash(`${P1} победила! ${P2} — дурак.`);
    } else {
      ctx.recordResult("durak", P2, P1);
      ctx.confettiBurst();
      flash(`${P2} победил! ${P1} — дурак.`);
    }
  }

  function restart(v = variant) {
    variant = v;
    sessionStorage.setItem("durakVariant", variant);
    game = createGame(variant);
    selectedTarget = null;
    transferMode = false;
    render();
  }

  function handleAttack(cardId) {
    const err = attack(game, cardId);
    if (err) { flash(err); return; }
    transferMode = false;
    onGameEnd();
    render();
  }

  function handleDefend(cardId) {
    if (selectedTarget === null) { flash("Сначала выбери карту на столе для отбоя."); return; }
    const err = defend(game, cardId, selectedTarget);
    if (err) { flash(err); return; }
    selectedTarget = null;
    transferMode = false;
    onGameEnd();
    render();
  }

  function handleTransfer(cardId) {
    const err = transfer(game, cardId);
    if (err) { flash(err); return; }
    transferMode = false;
    onGameEnd();
    render();
  }

  function handleTake() {
    const err = takeCards(game);
    if (err) { flash(err); return; }
    transferMode = false;
    onGameEnd();
    render();
  }

  function handleBita() {
    const err = finishBita(game);
    if (err) { flash(err); return; }
    onGameEnd();
    render();
  }

  function render() {
    host.innerHTML = "";
    renderScore();

    const variantRow = el("div", { class: "durak-variant-row" });
    for (const [key, meta] of Object.entries(VARIANTS)) {
      variantRow.append(el("button", {
        type: "button",
        class: "mode-chip" + (variant === key ? " active" : ""),
        onclick: () => restart(key),
      }, meta.label));
    }
    host.append(variantRow);
    host.append(el("p", { class: "durak-note durak-hint" }, VARIANTS[variant].hint));

    const attacker = game.attacker;
    const defender = game.defender;
    const finished = Boolean(game.winner);

    host.append(el("div", { class: "turn-indicator" },
      el("span", { class: "turn-dot" }),
      el("span", {}, finished
        ? (game.winner === "draw" ? "Ничья!" : `Победил${game.winner === 1 ? "а" : ""} ${name(game.winner)}`)
        : game.statusText),
    ));

    const topline = el("div", { class: "durak-topline" });
    topline.append(
      el("div", { class: "durak-trump" },
        el("div", { class: "durak-label" }, "Козырь"),
        game.trumpCard
          ? cardEl(game.trumpCard, { disabled: true, small: true })
          : el("span", {}, "—"),
      ),
      el("div", { class: "durak-deck" },
        el("div", { class: "durak-label" }, "Колода"),
        el("strong", {}, `${Math.max(0, game.deck.length - 1)} карт`),
      ),
      el("div", { class: "durak-meta" },
        el("span", {}, `Атакует: ${name(attacker)}`),
        el("span", {}, `Защищается: ${name(defender)}`),
      ),
    );
    host.append(topline);

    function renderHand(slot, containerClass) {
      const isDef = slot === defender;
      const isAtk = slot === attacker;
      const block = el("div", { class: "durak-opponent-block durak-hand-wrap" },
        el("div", { class: "durak-label" },
          `${name(slot)}${isAtk ? " · атака" : ""}${isDef ? " · защита" : ""} (${game.hands[slot].length})`,
        ),
        el("div", { class: containerClass }),
      );
      const handEl = block.querySelector(`.${containerClass}`);
      if (!game.hands[slot].length) {
        handEl.append(el("div", { class: "durak-note" }, "Нет карт"));
      } else {
        game.hands[slot].forEach((card) => {
          const canAtk = !finished && slot === attacker && legalAttackCards(game).some((c) => c.id === card.id);
          const canDef = !finished && slot === defender && selectedTarget !== null
            && legalDefendCards(game, selectedTarget).some((c) => c.id === card.id);
          const canTr = !finished && slot === defender && transferMode
            && legalTransferCards(game).some((c) => c.id === card.id);

          if (canAtk) handEl.append(cardEl(card, { onClick: () => handleAttack(card.id) }));
          else if (canTr) handEl.append(cardEl(card, { onClick: () => handleTransfer(card.id), selected: true }));
          else if (canDef) handEl.append(cardEl(card, { onClick: () => handleDefend(card.id) }));
          else handEl.append(cardEl(card, { disabled: true }));
        });
      }
      return block;
    }

    host.append(renderHand(2, "durak-opponent"));

    const tableWrap = el("div", { class: "durak-table-wrap" },
      el("div", { class: "durak-label" }, "Стол"),
      el("div", { class: "durak-table" }),
    );
    const tableEl = tableWrap.querySelector(".durak-table");
    if (!game.table.length) {
      tableEl.append(el("div", { class: "durak-note" }, "Пусто. Атакующий кладёт первую карту."));
    } else {
      game.table.forEach((pair, index) => {
        const open = !finished && index === selectedTarget;
        const pairEl = el("div", { class: "durak-pair" });
        pairEl.append(el("div", { class: "durak-slot" },
          cardEl(pair.attack, { disabled: true, small: true }),
        ));

        const defSlot = el("div", { class: "durak-slot" + (open ? " open-target" : "") });
        if (pair.defense) {
          defSlot.append(cardEl(pair.defense, { disabled: true, small: true }));
        } else if (!finished) {
          const targetBtn = el("button", {
            type: "button",
            class: "durak-slot empty-target",
            onclick: () => {
              selectedTarget = selectedTarget === index ? null : index;
              transferMode = false;
              render();
            },
          }, "Отбой");
          defSlot.append(targetBtn);
        }
        pairEl.append(defSlot);
        tableEl.append(pairEl);
      });
    }
    host.append(tableWrap);
    host.append(renderHand(1, "durak-hand"));

    const actions = el("div", { class: "durak-actions" });
    const canTake = !finished && game.table.length && hasOpenDefense(game.table);
    const canBita = !finished && allDefended(game.table);
    const canTransferBtn = !finished && game.variant === "perevodnoy" && legalTransferCards(game).length;

    actions.append(
      el("button", {
        type: "button",
        class: "cta-btn secondary",
        disabled: !canTake,
        onclick: handleTake,
      }, "Взять"),
      game.variant === "perevodnoy"
        ? el("button", {
          type: "button",
          class: "cta-btn secondary" + (transferMode ? " active" : ""),
          disabled: !canTransferBtn,
          onclick: () => { transferMode = !transferMode; selectedTarget = null; render(); },
        }, transferMode ? "Отмена перевода" : "Перевод")
        : null,
      el("button", {
        type: "button",
        class: "cta-btn",
        disabled: !canBita,
        onclick: handleBita,
      }, "Бита"),
      el("button", {
        type: "button",
        class: "cta-btn ghost",
        onclick: () => restart(variant),
      }, "Новая партия"),
    );
    host.append(actions);

    if (finished) {
      host.append(el("p", { class: "durak-note" },
        game.winner === "draw"
          ? "Оба игрока избавились от карт одновременно."
          : `${name(game.winner === 1 ? 2 : 1)} остался с картами — дурак.`,
      ));
    }
  }

  render();
  ctx.registerCleanup(() => { host.innerHTML = ""; });
}
