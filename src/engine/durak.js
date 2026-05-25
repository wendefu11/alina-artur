// ─────────────────────────  ENGINE · DURAK  ─────────────────────────
// 36-card deck (6–A). Variants: podkidnoy (throw-in) | perevodnoy (transfer).

export const SUITS = ["hearts", "diamonds", "clubs", "spades"];
export const SUIT_SYMBOLS = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
export const SUIT_NAMES = { hearts: "черви", diamonds: "бубны", clubs: "трефы", spades: "пики" };
export const RANKS = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const RANK_VALUE = { 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };

let uid = 0;

export function makeCard(rank, suit) {
  return { id: `${rank}-${suit}-${++uid}`, rank, suit, value: RANK_VALUE[rank] };
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(makeCard(rank, suit));
  shuffle(deck);
  return deck;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortHand(hand, trumpSuit) {
  return [...hand].sort((a, b) => {
    const ta = a.suit === trumpSuit ? 1 : 0;
    const tb = b.suit === trumpSuit ? 1 : 0;
    if (ta !== tb) return tb - ta;
    if (a.suit !== b.suit) return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    return a.value - b.value;
  });
}

export function canDefend(attack, defend, trumpSuit) {
  if (defend.suit === attack.suit && defend.value > attack.value) return true;
  if (defend.suit === trumpSuit && attack.suit !== trumpSuit) return true;
  if (defend.suit === trumpSuit && attack.suit === trumpSuit && defend.value > attack.value) return true;
  return false;
}

export function tableRanks(table) {
  const ranks = new Set();
  for (const pair of table) {
    ranks.add(pair.attack.rank);
    if (pair.defense) ranks.add(pair.defense.rank);
  }
  return ranks;
}

export function maxAttacks(game) {
  const n = game.hands[game.defender].length;
  return Math.max(1, Math.min(6, n));
}

export function hasOpenDefense(table) {
  return table.some((p) => p.defense === null);
}

export function allDefended(table) {
  return table.length > 0 && table.every((p) => p.defense !== null);
}

/** Перевод возможен: одна неотбитая атака, карта того же достоинства. */
export function canTransfer(game, card) {
  if (game.variant !== "perevodnoy" || game.winner) return false;
  if (game.table.length !== 1 || game.table[0].defense !== null) return false;
  return card.rank === game.table[0].attack.rank;
}

export function lowestTrumpHolder(hands, trumpSuit) {
  let best = null;
  let bestVal = Infinity;
  for (const slot of [1, 2]) {
    for (const c of hands[slot]) {
      if (c.suit !== trumpSuit) continue;
      if (c.value < bestVal) {
        bestVal = c.value;
        best = slot;
      }
    }
  }
  if (best) return best;
  bestVal = Infinity;
  for (const slot of [1, 2]) {
    for (const c of hands[slot]) {
      if (c.value < bestVal) {
        bestVal = c.value;
        best = slot;
      }
    }
  }
  return best || 1;
}

export function dealToSix(game) {
  for (const slot of [1, 2]) {
    while (game.hands[slot].length < 6 && game.deck.length > 0) {
      game.hands[slot].push(game.deck.shift());
    }
    game.hands[slot] = sortHand(game.hands[slot], game.trumpSuit);
  }
}

export function checkWinner(game) {
  if (game.winner) return;
  if (game.deck.length > 0) return;
  const empty1 = !game.hands[1].length;
  const empty2 = !game.hands[2].length;
  if (!empty1 && !empty2) return;
  if (empty1 && empty2) game.winner = "draw";
  else if (empty1) game.winner = 1;
  else game.winner = 2;
}

export function createGame(variant = "podkidnoy") {
  uid = 0;
  const deck = createDeck();
  const trumpCard = deck[deck.length - 1];
  const trumpSuit = trumpCard.suit;
  const hands = { 1: [], 2: [] };

  for (let i = 0; i < 12; i++) {
    const slot = (i % 2) + 1;
    hands[slot].push(deck.shift());
  }
  hands[1] = sortHand(hands[1], trumpSuit);
  hands[2] = sortHand(hands[2], trumpSuit);

  const first = lowestTrumpHolder(hands, trumpSuit);
  const attacker = first;
  const defender = first === 1 ? 2 : 1;

  return {
    variant,
    deck,
    hands,
    trumpSuit,
    trumpCard,
    attacker,
    defender,
    table: [],
    winner: null,
    statusText: variant === "perevodnoy"
      ? "Переводной: атакуй одной картой. Защитник может перевести картой того же достоинства."
      : "Подкидной: атакуй и подкидывай карты того же достоинства, что на столе.",
    selectedTarget: null,
  };
}

export function findCard(hand, cardId) {
  return hand.find((c) => c.id === cardId) || null;
}

export function attack(game, cardId) {
  if (game.winner) return "Партия завершена.";
  const hand = game.hands[game.attacker];
  const card = findCard(hand, cardId);
  if (!card) return "Карта не найдена.";

  if (game.table.length >= maxAttacks(game)) return "Больше карт подкинуть нельзя.";
  if (hasOpenDefense(game.table)) return "Сначала отбейся или возьми карты.";

  if (game.table.length) {
    if (game.variant === "perevodnoy") return "В переводном можно атаковать только одной картой.";
    if (!tableRanks(game.table).has(card.rank)) return "Подкидывать можно только карту того же достоинства.";
  }

  hand.splice(hand.indexOf(card), 1);
  game.table.push({ attack: card, defense: null });
  game.selectedTarget = null;
  game.statusText = "Защитник отбивается, берёт или переводит.";
  return null;
}

export function defend(game, cardId, targetIndex) {
  if (game.winner) return "Партия завершена.";
  const pair = game.table[targetIndex];
  if (!pair || pair.defense) return "Некуда отбиваться.";
  const hand = game.hands[game.defender];
  const card = findCard(hand, cardId);
  if (!card) return "Карта не найдена.";
  if (!canDefend(pair.attack, card, game.trumpSuit)) return "Этой картой нельзя отбиться.";

  hand.splice(hand.indexOf(card), 1);
  pair.defense = card;
  game.selectedTarget = null;

  if (allDefended(game.table)) {
    game.statusText = "Все отбиты. Атакующий — «Бита».";
  } else {
    game.statusText = game.variant === "podkidnoy"
      ? "Отбивайся дальше. Атакующий может подкинуть."
      : "Отбивайся дальше.";
  }
  return null;
}

export function transfer(game, cardId) {
  if (game.variant !== "perevodnoy") return "Перевод только в переводном дураке.";
  const hand = game.hands[game.defender];
  const card = findCard(hand, cardId);
  if (!card) return "Карта не найдена.";
  if (!canTransfer(game, card)) return "Сейчас нельзя перевести этой картой.";

  hand.splice(hand.indexOf(card), 1);
  game.table.push({ attack: card, defense: null });

  const oldAttacker = game.attacker;
  game.attacker = game.defender;
  game.defender = oldAttacker;
  game.selectedTarget = null;
  game.statusText = "Перевод! Новый защитник должен отбиться или взять.";
  return null;
}

export function takeCards(game) {
  if (!game.table.length) return "На столе нет карт.";
  const hand = game.hands[game.defender];
  for (const pair of game.table) {
    hand.push(pair.attack);
    if (pair.defense) hand.push(pair.defense);
  }
  game.hands[game.defender] = sortHand(hand, game.trumpSuit);
  game.table = [];
  game.selectedTarget = null;
  dealToSix(game);
  game.statusText = "Защитник взял карты. Атакующий ходит снова.";
  checkWinner(game);
  return null;
}

export function finishBita(game) {
  if (!game.table.length) return "Сначала положи карту.";
  if (hasOpenDefense(game.table)) return "Не все карты отбиты.";
  game.table = [];
  game.selectedTarget = null;
  [game.attacker, game.defender] = [game.defender, game.attacker];
  dealToSix(game);
  game.statusText = "Бита. Ход переходит другому игроку.";
  checkWinner(game);
  return null;
}

export function legalAttackCards(game) {
  if (game.winner) return [];
  const hand = game.hands[game.attacker];
  if (!game.table.length) return hand;
  if (game.variant === "perevodnoy" || hasOpenDefense(game.table)) return [];
  if (game.table.length >= maxAttacks(game)) return [];
  const ranks = tableRanks(game.table);
  return hand.filter((c) => ranks.has(c.rank));
}

export function legalDefendCards(game, targetIndex) {
  if (game.winner || targetIndex < 0 || targetIndex >= game.table.length) return [];
  const pair = game.table[targetIndex];
  if (!pair || pair.defense) return [];
  return game.hands[game.defender].filter((c) => canDefend(pair.attack, c, game.trumpSuit));
}

export function legalTransferCards(game) {
  if (game.variant !== "perevodnoy" || game.winner) return [];
  if (game.table.length !== 1 || game.table[0].defense) return [];
  const rank = game.table[0].attack.rank;
  return game.hands[game.defender].filter((c) => c.rank === rank);
}

/** Синхронизация id карт после получения состояния по сети. */
export function syncUidFromGame(state) {
  let max = 0;
  const scan = (list) => {
    for (const c of list || []) {
      if (!c?.id) continue;
      const n = parseInt(c.id.split("-").pop(), 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  };
  scan(state.deck);
  scan(state.hands?.[1]);
  scan(state.hands?.[2]);
  for (const p of state.table || []) {
    scan([p.attack]);
    if (p.defense) scan([p.defense]);
  }
  uid = max;
}

export function packGame(game, bitaCount = 0) {
  return {
    variant: game.variant,
    deck: game.deck,
    hands: game.hands,
    trumpSuit: game.trumpSuit,
    trumpCard: game.trumpCard,
    attacker: game.attacker,
    defender: game.defender,
    table: game.table,
    winner: game.winner,
    statusText: game.statusText,
    bitaCount,
    recorded: Boolean(game.recorded),
  };
}

export function unpackGame(payload) {
  syncUidFromGame(payload);
  return {
    variant: payload.variant,
    deck: payload.deck,
    hands: payload.hands,
    trumpSuit: payload.trumpSuit,
    trumpCard: payload.trumpCard,
    attacker: payload.attacker,
    defender: payload.defender,
    table: payload.table,
    winner: payload.winner,
    statusText: payload.statusText,
    selectedTarget: null,
    recorded: Boolean(payload.recorded),
  };
}

export function applyMove(game, move) {
  const { action, cardId, targetIndex, from } = move;
  switch (action) {
    case "attack":
      if (from !== game.attacker) return "Сейчас не твоя атака.";
      return attack(game, cardId);
    case "defend":
      if (from !== game.defender) return "Сейчас не твоя защита.";
      return defend(game, cardId, targetIndex ?? 0);
    case "transfer":
      if (from !== game.defender) return "Сейчас не твоя защита.";
      return transfer(game, cardId);
    case "take":
      if (from !== game.defender) return "Брать карты может только защитник.";
      return takeCards(game);
    case "bita":
      if (from !== game.attacker) return "Биту завершает атакующий.";
      return finishBita(game);
    default:
      return "Неизвестный ход.";
  }
}
