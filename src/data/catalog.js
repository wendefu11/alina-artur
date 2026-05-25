// ─────────────────────────  DATA / GAME CATALOG  ─────────────────────────
// Single source of truth for the games list. Each entry says:
//   id     — stable identifier (used in URL hash, storage, events)
//   loader — async function returning a module with default export = mount fn
//   title, icon, sub  — UI
//   tag    — "duo" | "solo" | "pair"  (filter)
//   modes  — supported modes: ["hotseat", "online", "ai"]
//   gradient — css for the tile gradient (optional)
//
// Lazy-loaded via dynamic import to keep first-paint cheap.

const lazy = (path) => () => import(/* @vite-ignore */ path);

export const CATALOG = {
  ttt: {
    title: "Крестики-нолики", icon: "✕◯", sub: "Хот-сит, AI или online",
    tag: "duo", modes: ["hotseat", "ai", "online"],
    loader: lazy("../games/ttt.js"),
    gradient: "linear-gradient(135deg, rgba(255,93,143,.18), rgba(167,139,250,.10))",
  },
  connect4: {
    title: "Connect 4", icon: "🔴", sub: "4 в ряд: хот-сит, AI или online",
    tag: "duo", modes: ["hotseat", "ai", "online"],
    loader: lazy("../games/c4.js"),
    gradient: "linear-gradient(135deg, rgba(96,165,250,.20), rgba(167,139,250,.10))",
  },
  rps: {
    title: "Камень-Ножницы-Бумага", icon: "✊✋✌", sub: "Скрытый выбор, online или AI",
    tag: "duo", modes: ["hotseat", "ai", "online"],
    loader: lazy("../games/rps.js"),
  },
  memory: {
    title: "Память", icon: "🃏", sub: "Найди пары — кто больше",
    tag: "duo", modes: ["hotseat"],
    loader: lazy("../games/memory.js"),
  },
  hangman: {
    title: "Виселица", icon: "🎯", sub: "Угадай слово до 7 ошибок",
    tag: "duo", modes: ["hotseat"],
    loader: lazy("../games/hangman.js"),
  },
  pong: {
    title: "Pong", icon: "🏓", sub: "W/S vs ↑/↓ — до 5 очков",
    tag: "duo", modes: ["hotseat"],
    loader: lazy("../games/pong.js"),
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
  hotseat: "Хот-сит",
  online:  "Online",
  ai:      "vs AI",
  solo:    "Соло",
  pair:    "Для пары",
};
