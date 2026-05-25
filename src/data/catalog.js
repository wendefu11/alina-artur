// ─────────────────────────  DATA / GAME CATALOG  ─────────────────────────

const lazy = (path) => () => import(/* @vite-ignore */ path);

export const CATALOG = {
  ttt: {
    title: "Крестики-нолики", icon: "✕◯", sub: "Online или vs AI",
    tag: "duo", modes: ["ai", "online"],
    loader: lazy("../games/ttt.js"),
    gradient: "linear-gradient(135deg, rgba(255,93,143,.18), rgba(167,139,250,.10))",
  },
  connect4: {
    title: "Connect 4", icon: "🔴", sub: "4 в ряд — online или vs AI",
    tag: "duo", modes: ["ai", "online"],
    loader: lazy("../games/c4.js"),
    gradient: "linear-gradient(135deg, rgba(96,165,250,.20), rgba(167,139,250,.10))",
  },
  rps: {
    title: "Камень-Ножницы-Бумага", icon: "✊✋✌", sub: "Online или vs AI",
    tag: "duo", modes: ["ai", "online"],
    loader: lazy("../games/rps.js"),
  },
  memory: {
    title: "Память", icon: "🃏", sub: "Найди пары — online",
    tag: "duo", modes: ["online"],
    loader: lazy("../games/memory.js"),
  },
  hangman: {
    title: "Виселица", icon: "🎯", sub: "Угадай слово — online",
    tag: "duo", modes: ["online"],
    loader: lazy("../games/hangman.js"),
  },
  pong: {
    title: "Pong", icon: "🏓", sub: "Online — каждый со своего телефона",
    tag: "duo", modes: ["online"],
    loader: lazy("../games/pong.js"),
  },
  durak: {
    title: "Дурак", icon: "🃏", sub: "36 карт — online",
    tag: "duo", modes: ["online"],
    loader: lazy("../games/durak.js"),
    gradient: "linear-gradient(135deg, rgba(255,154,118,.18), rgba(255,215,111,.12))",
  },
  simon: {
    title: "Simon Says", icon: "🎵", sub: "Повтори световую цепочку",
    tag: "solo", modes: ["solo"],
    loader: lazy("../games/simon.js"),
  },
  whack: {
    title: "Поймай момент", icon: "🐹", sub: "30 секунд реакции",
    tag: "solo", modes: ["solo"],
    loader: lazy("../games/whack.js"),
  },
  slide: {
    title: "15-Пятнашки", icon: "🔢", sub: "Собери порядок",
    tag: "solo", modes: ["solo"],
    loader: lazy("../games/slide.js"),
  },
  mine: {
    title: "Минёр", icon: "💣", sub: "Открой клетки, не нарвись",
    tag: "solo", modes: ["solo"],
    loader: lazy("../games/mine.js"),
  },
  snake: {
    title: "Змейка", icon: "🐍", sub: "Рекорд на профиль",
    tag: "solo", modes: ["solo"],
    loader: lazy("../games/snake.js"),
  },
  g2048: {
    title: "2048", icon: "🧮", sub: "Свайпы и степени двойки",
    tag: "solo", modes: ["solo"],
    loader: lazy("../games/g2048.js"),
  },
  reaction: {
    title: "Реакция", icon: "⚡", sub: "Тапни на зелёный",
    tag: "solo", modes: ["solo"],
    loader: lazy("../games/reaction.js"),
  },
  wheel: {
    title: "Колесо решений", icon: "🎡", sub: "Пусть решит судьба",
    tag: "pair", modes: ["pair"],
    loader: lazy("../games/wheel.js"),
  },
  truth: {
    title: "Правда / Действие", icon: "💌", sub: "Тёплые вопросы и заявки",
    tag: "pair", modes: ["pair"],
    loader: lazy("../games/truth.js"),
  },
  compliment: {
    title: "Машина комплиментов", icon: "💖", sub: "Тёплая фраза на каждый день",
    tag: "pair", modes: ["pair"],
    loader: lazy("../games/compliment.js"),
  },
  quiz: {
    title: "Couple Quiz", icon: "❓", sub: "Хорошо ли вы друг друга знаете",
    tag: "pair", modes: ["pair"],
    loader: lazy("../games/quiz.js"),
  },
  coin: {
    title: "Монетка", icon: "🪙", sub: "Орёл / Решка",
    tag: "pair", modes: ["pair"],
    loader: lazy("../games/coin.js"),
  },
  dice: {
    title: "Кубики", icon: "🎲", sub: "1-6 для решений",
    tag: "pair", modes: ["pair"],
    loader: lazy("../games/dice.js"),
  },
  love: {
    title: "Love-O-Meter", icon: "💘", sub: "Сколько % любви прямо сейчас",
    tag: "pair", modes: ["pair"],
    loader: lazy("../games/love.js"),
  },
};

export const FILTERS = {
  all:  "Все",
  duo:  "Вдвоём",
  solo: "Соло",
  pair: "Для пары",
};

export const MODE_LABELS = {
  online:  "Online",
  ai:      "vs AI",
  solo:    "Соло",
  pair:    "Для пары",
};

/** Режимы без устаревшего hot-seat. */
export function playableModes(g) {
  return (g.modes || []).filter((m) => m !== "hotseat");
}

export function isOnlineOnly(g) {
  const m = playableModes(g);
  return m.length === 1 && m[0] === "online";
}
