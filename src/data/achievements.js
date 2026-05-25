// ─────────────────────────  DATA / ACHIEVEMENTS  ─────────────────────────
// Pure definitions. The tracker (achievements/tracker.js) decides when each
// one unlocks by listening to events from the bus.
//
// Each achievement has:
//   id     — stable key
//   title  — display
//   desc   — short explanation
//   icon   — emoji
//   tier   — "bronze" | "silver" | "gold" | "secret"
//   check  — function(stats, event) → boolean. Called on relevant events.
//   on     — array of event names that should re-evaluate this achievement
//
// `stats` shape: { wins, losses, draws, bestStreak, hsByGame, sessions, achievements }

export const ACHIEVEMENTS = [
  // First steps
  {
    id: "first_blood", title: "Первая кровь", desc: "Победи в любой игре",
    icon: "🥇", tier: "bronze",
    on: ["game:ended"],
    check: (s, e) => e?.winner && !e.draw,
  },
  {
    id: "first_loss", title: "Учусь проигрывать", desc: "Проиграй в любой игре",
    icon: "🤝", tier: "bronze",
    on: ["game:ended"],
    check: (s, e) => e?.loser && !e.draw,
  },
  {
    id: "first_draw", title: "Боевая ничья", desc: "Сведи партию в ничью",
    icon: "⚖️", tier: "bronze",
    on: ["game:ended"],
    check: (s, e) => !!e?.draw,
  },

  // Streaks
  {
    id: "streak_3", title: "Серия из 3", desc: "Выиграй 3 раза подряд",
    icon: "🔥", tier: "silver",
    on: ["game:ended"],
    check: (s) => (s?.bestStreak || 0) >= 3,
  },
  {
    id: "streak_7", title: "Доминатор", desc: "Серия из 7 побед подряд",
    icon: "💎", tier: "gold",
    on: ["game:ended"],
    check: (s) => (s?.bestStreak || 0) >= 7,
  },

  // Game count
  {
    id: "wins_10", title: "Десятка", desc: "10 побед всего",
    icon: "🏆", tier: "silver",
    on: ["game:ended"],
    check: (s) => (s?.wins || 0) >= 10,
  },
  {
    id: "wins_50", title: "Полтинник", desc: "50 побед всего",
    icon: "👑", tier: "gold",
    on: ["game:ended"],
    check: (s) => (s?.wins || 0) >= 50,
  },

  // High scores
  {
    id: "snake_50", title: "Серьёзная змея", desc: "Snake: 50+ очков",
    icon: "🐍", tier: "silver",
    on: ["game:highscore"],
    check: (s, e) => e?.gameId === "snake" && e.value >= 50,
  },
  {
    id: "g2048_won", title: "2048 собран", desc: "Достигни клетки 2048",
    icon: "🧮", tier: "gold",
    on: ["game:highscore"],
    check: (s, e) => e?.gameId === "g2048" && e.value >= 2048,
  },
  {
    id: "reaction_250", title: "Молния", desc: "Реакция < 250 мс",
    icon: "⚡", tier: "gold",
    on: ["game:highscore"],
    check: (s, e) => e?.gameId === "reaction" && e.value > 0 && e.value < 250,
  },
  {
    id: "simon_10", title: "Memory master", desc: "Simon: раунд 10+",
    icon: "🎵", tier: "silver",
    on: ["game:highscore"],
    check: (s, e) => e?.gameId === "simon" && e.value >= 10,
  },

  // Online
  {
    id: "online_first", title: "Первый коннект", desc: "Сыграй онлайн-партию",
    icon: "🌐", tier: "silver",
    on: ["game:ended"],
    check: (s, e) => e?.mode === "online",
  },

  // Romantic / secret
  {
    id: "love_100", title: "100%", desc: "Love-O-Meter показал 100%",
    icon: "💞", tier: "secret",
    on: ["game:highscore"],
    check: (s, e) => e?.gameId === "love" && e.value >= 100,
  },
  {
    id: "wheel_first", title: "Крути её", desc: "Сделай первый спин",
    icon: "🎡", tier: "bronze",
    on: ["game:started"],
    check: (s, e) => e?.gameId === "wheel",
  },
  {
    id: "compliment_5", title: "Поэт", desc: "Прочитай 5 комплиментов",
    icon: "🌹", tier: "bronze",
    on: ["counter:compliment"],
    check: (s) => (s?.counters?.compliment || 0) >= 5,
  },
  {
    id: "quiz_full", title: "Знаток", desc: "Пройди quiz с 7/8+ правильных",
    icon: "🧠", tier: "gold",
    on: ["game:quiz"],
    check: (s, e) => e?.score >= 7,
  },
];

export function byId(id) { return ACHIEVEMENTS.find(a => a.id === id); }
