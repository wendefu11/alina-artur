// Главный модуль: маршрутизация, профили, экраны, инициализация
import * as store from "./storage.js";
import * as data from "./data.js";
import { toast, sound, celebrate, initHearts, typewriter, h, clear, fmtDate, partner } from "./ui.js";

import { mount as mountTTT } from "./games/ttt.js";
import { mount as mountConnect4 } from "./games/connect4.js";
import { mount as mountRPS } from "./games/rps.js";
import { mount as mountMemory } from "./games/memory.js";
import { mount as mountHangman } from "./games/hangman.js";
import { mount as mountPong } from "./games/pong.js";
import { mount as mountSnake } from "./games/snake.js";
import { mount as mount2048 } from "./games/g2048.js";
import { mount as mountReaction } from "./games/reaction.js";
import { mount as mountWheel } from "./games/wheel.js";
import { mount as mountTruth } from "./games/truth.js";
import { mount as mountQuiz } from "./games/quiz.js";
import { mount as mountCompliment } from "./games/compliment.js";
import { mount as mountCoin } from "./games/coin.js";
import { mount as mountDice } from "./games/dice.js";
import { mount as mountLove } from "./games/love.js";

const GAME_MOUNTERS = {
  ttt: mountTTT, connect4: mountConnect4, rps: mountRPS, memory: mountMemory,
  hangman: mountHangman, pong: mountPong, snake: mountSnake, g2048: mount2048,
  reaction: mountReaction, wheel: mountWheel, truth: mountTruth, quiz: mountQuiz,
  compliment: mountCompliment, coin: mountCoin, dice: mountDice, love: mountLove,
};

const ROUTES = {
  home: { title: "Главная", sub: "Добро пожаловать обратно" },
  games: { title: "Игры", sub: "Выбери развлечение для двоих" },
  journal: { title: "Дневник", sub: "Заметки, желания, мысли" },
  stats: { title: "Статистика", sub: "Кто чаще выигрывает" },
  settings: { title: "Настройки", sub: "Тема и личные данные" },
};

let currentRoute = "home";
let currentRouteData = null;

// ── INIT ──
function init() {
  applyTheme();
  initHearts();
  bindLogin();
  bindShell();
  store.subscribe(() => {
    applyTheme();
    refreshShell();
  });

  const s = store.getState();
  if (s.profile) {
    showApp();
    go("home");
  } else {
    showLogin();
  }
}

function applyTheme() {
  const s = store.getState();
  document.body.classList.remove("theme-aurora", "theme-dawn", "theme-noir");
  document.body.classList.add("theme-" + (s.theme || "aurora"));
}

function bindLogin() {
  document.querySelectorAll("[data-login]").forEach(btn => {
    btn.addEventListener("click", () => {
      store.setProfile(btn.dataset.login);
      sound.heart();
      showApp();
      go("home");
    });
  });
}

function showLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}
function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  refreshShell();
}

function refreshShell() {
  const s = store.getState();
  const p = s.profile;
  if (!p) return;
  const displayName = s.customNames?.[p] || p;
  const avatar = document.getElementById("meAvatar");
  const name = document.getElementById("meName");
  if (avatar) {
    avatar.textContent = displayName[0];
    avatar.classList.toggle("is-artur", p === "Артур");
  }
  if (name) name.textContent = displayName;

  document.querySelectorAll(".nav-item").forEach(b => {
    b.classList.toggle("active", b.dataset.route === currentRoute);
  });

  const info = ROUTES[currentRoute] || ROUTES.home;
  document.getElementById("crumbTitle").textContent = info.title;
  document.getElementById("crumbSub").textContent = info.sub;
}

function bindShell() {
  document.querySelectorAll("[data-route]").forEach(b => {
    b.addEventListener("click", () => go(b.dataset.route));
  });
  document.getElementById("themeBtn")?.addEventListener("click", cycleTheme);
  document.getElementById("muteBtn")?.addEventListener("click", toggleMute);
  document.getElementById("meChip")?.addEventListener("click", () => go("settings"));
  document.getElementById("surpriseBtn")?.addEventListener("click", surprise);
}

function cycleTheme() {
  const order = ["aurora", "dawn", "noir"];
  const s = store.getState();
  const i = order.indexOf(s.theme || "aurora");
  store.setTheme(order[(i + 1) % order.length]);
  sound.click();
  toast("Тема: " + (store.getState().theme === "dawn" ? "Рассветная" : store.getState().theme === "noir" ? "Полночь" : "Аврора"));
}
function toggleMute() {
  store.setMuted(!store.getState().muted);
  document.getElementById("muteBtn").textContent = store.getState().muted ? "♪̸" : "♪";
  toast(store.getState().muted ? "Звук выключен" : "Звук включён");
}

function surprise() {
  const tasks = [
    () => {
      const q = data.LOVE_QUOTES[Math.floor(Math.random() * data.LOVE_QUOTES.length)];
      toast(`„${q.text}" — ${q.author}`, "ok", 4500);
    },
    () => toast("✨ " + data.COMPLIMENTS[Math.floor(Math.random() * data.COMPLIMENTS.length)], "ok", 4000),
    () => { celebrate(); toast("Подарок: +10 к нежности 💞"); },
    () => toast("Совет: " + data.DAILY_NOTES[Math.floor(Math.random() * data.DAILY_NOTES.length)], "ok", 4000),
  ];
  tasks[Math.floor(Math.random() * tasks.length)]();
  sound.heart();
}

export function go(route, routeData = null) {
  currentRoute = route;
  currentRouteData = routeData;
  refreshShell();
  const view = document.getElementById("view");
  clear(view);
  if (route === "home") renderHome(view);
  else if (route === "games") renderGames(view);
  else if (route === "journal") renderJournal(view);
  else if (route === "stats") renderStats(view);
  else if (route === "settings") renderSettings(view);
  else if (route === "game" && routeData) renderGame(view, routeData);
  else renderHome(view);
  window.scrollTo(0, 0);
}

// ─────────────────────  HOME  ─────────────────────
function renderHome(view) {
  const s = store.getState();
  const me = s.customNames?.[s.profile] || s.profile;
  const other = partner(s.profile);
  const otherName = s.customNames?.[other] || other;

  const days = daysSince(s.anniversary);
  const todayIdx = dayOfYear() % data.DAILY_NOTES.length;
  const noteIdx = dayOfYear() % data.LOVE_QUOTES.length;

  // hero
  const hero = h("div", { class: "panel panel--hero" }, [
    h("span", { class: "eyebrow", text: "Private Lounge · только для двоих" }),
    h("div", { class: "hero-greeting", html: `Привет, <em>${me}</em>.<br>Здесь тебя ждёт ${otherName}.` }),
    h("div", { id: "homeTypewriter", class: "hero-typewriter" }),
    h("div", { style: { marginTop: "22px", display: "flex", gap: "10px", flexWrap: "wrap" } }, [
      h("button", { class: "cta-btn", onClick: () => go("games") }, ["Открыть игры ", h("span", { text: "→" })]),
      h("button", { class: "cta-btn secondary", onClick: surprise }, ["Сюрприз ✦"]),
    ]),
  ]);
  view.appendChild(hero);
  setTimeout(() => {
    const tw = document.getElementById("homeTypewriter");
    if (tw) typewriter(tw, me + ", " + data.DAILY_NOTES[todayIdx], 40);
  }, 280);

  // days + mood
  const row = h("div", { class: "grid grid-aside" }, [
    h("div", { class: "panel" }, [
      h("h3", { text: "Мы вместе уже" }),
      h("div", { class: "days-tile" }, [
        h("span", { class: "days-num", text: days != null ? days : "—" }),
        h("div", {}, [
          h("small", { text: days != null ? "дней счастья" : "Установи дату в настройках" }),
          h("strong", { text: s.anniversary ? `с ${new Date(s.anniversary).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}` : "Любви не назначен дедлайн" }),
        ]),
      ]),
      h("div", { style: { marginTop: "18px" } }, [
        h("h3", { text: "Как ты сегодня?" }),
        moodRow(s),
      ]),
    ]),

    h("div", { class: "panel" }, [
      h("h3", { text: "Цитата дня" }),
      h("div", { class: "quote-box" }, [
        document.createTextNode(data.LOVE_QUOTES[noteIdx].text),
        h("span", { class: "quote-author", text: "— " + data.LOVE_QUOTES[noteIdx].author }),
      ]),
    ]),
  ]);
  view.appendChild(row);

  // recent activity & top games
  const lastMatches = s.history.slice(0, 6);
  const wins = countWins(s, s.profile);
  const losses = countLosses(s, s.profile);
  const draws = countDraws(s, s.profile);

  const meStats = h("div", { class: "panel" }, [
    h("h3", { text: "Твоя статистика" }),
    h("div", { class: "stats-grid" }, [
      h("div", { class: "stat-card" }, [h("small", { text: "Побед" }), h("h4", { class: "win", text: wins })]),
      h("div", { class: "stat-card" }, [h("small", { text: "Поражений" }), h("h4", { class: "loss", text: losses })]),
      h("div", { class: "stat-card" }, [h("small", { text: "Ничьи" }), h("h4", { class: "draw", text: draws })]),
    ]),
    h("div", { style: { marginTop: "16px" } }, [
      h("button", { class: "cta-btn ghost", onClick: () => go("stats") }, ["Все цифры →"]),
    ]),
  ]);

  const hist = h("div", { class: "panel" }, [
    h("h3", { text: "Последние матчи" }),
    h("div", { class: "history-list" },
      lastMatches.length === 0
        ? [h("small", { text: "Пока матчей нет. Запустите первую игру." })]
        : lastMatches.map(m => renderHistoryRow(m, s.profile))
    ),
  ]);

  view.appendChild(h("div", { class: "grid grid-aside" }, [meStats, hist]));

  // quick play
  const quick = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Быстро во что-то поиграть?" }), h("small", { text: "Самые залипательные сейчас" })]),
      h("button", { class: "cta-btn ghost", onClick: () => go("games") }, ["Все игры"]),
    ]),
    h("div", { class: "games-grid" }, ["ttt", "connect4", "wheel", "truth"].map(id => gameCard(data.GAMES.find(g => g.id === id)))),
  ]);
  view.appendChild(quick);
}

function moodRow(s) {
  const myMood = s.mood[s.profile]?.id;
  const row = h("div", { class: "mood-row" });
  data.MOOD_OPTIONS.forEach(m => {
    const btn = h("button", {
      class: "mood-pill" + (myMood === m.id ? " active" : ""),
      onClick: () => { store.setMood(s.profile, m.id); sound.pick(); }
    }, [m.emoji + " " + m.label]);
    row.appendChild(btn);
  });
  return row;
}

// ─────────────────────  GAMES LIST  ─────────────────────
function renderGames(view) {
  const groups = [
    { id: "duo", title: "Вдвоём", sub: "Hot-seat: передавайте телефон или играйте за одним столом" },
    { id: "couple", title: "Романтика и фан", sub: "Лёгкие развлечения, гадания и подкол" },
    { id: "solo", title: "Соло с рейтингом", sub: "Лучший счёт сохраняется за профилем" },
  ];
  groups.forEach(g => {
    const games = data.GAMES.filter(x => x.category === g.id);
    view.appendChild(h("div", { class: "section-heading" }, [
      h("h2", { text: g.title }),
      h("small", { text: g.sub }),
    ]));
    view.appendChild(h("div", { class: "games-grid" }, games.map(gameCard)));
  });
}

function gameCard(g) {
  return h("button", { class: "game-card", onClick: () => openGame(g.id) }, [
    h("div", { class: "game-card-bg " + g.color }),
    h("div", { class: "game-card-inner" }, [
      h("span", { class: "game-card-emoji", text: g.emoji }),
      h("div", {}, [
        h("h3", { text: g.title }),
        h("p", { text: g.subtitle }),
        h("span", { class: "tag", text: g.category === "duo" ? "Вдвоём" : g.category === "solo" ? "Соло" : "Романтика" }),
      ]),
    ]),
  ]);
}

function openGame(id) {
  if (!GAME_MOUNTERS[id]) { toast("Игра скоро будет ✨"); return; }
  go("game", { id });
}

function renderGame(view, { id }) {
  const meta = data.GAMES.find(g => g.id === id);
  if (!meta) { renderGames(view); return; }
  const wrap = h("div", { class: "game-view" });

  const hud = h("div", { class: "game-hud" }, [
    h("div", { class: "game-hud-l" }, [
      h("button", { class: "cta-btn ghost", onClick: () => go("games") }, ["← Назад"]),
      h("h2", { text: meta.title }),
    ]),
    h("div", { class: "scoreboard", id: "scoreboard" }),
  ]);
  wrap.appendChild(hud);

  const container = h("div", { id: "gameBody" });
  wrap.appendChild(container);
  view.appendChild(wrap);

  const ctx = {
    me: store.getState().profile,
    other: partner(store.getState().profile),
    customNames: store.getState().customNames,
    sound,
    toast,
    celebrate,
    store,
    h, clear,
    score: document.getElementById("scoreboard"),
    onResult: ({ winner, loser, draw }) => {
      if (draw) {
        store.recordResult(id, winner, loser, true);
        sound.draw();
      } else if (winner && loser) {
        store.recordResult(id, winner, loser, false);
        if (winner === ctx.me) celebrate();
      }
    },
  };

  GAME_MOUNTERS[id](container, ctx);
}

// ─────────────────────  JOURNAL  ─────────────────────
function renderJournal(view) {
  const s = store.getState();
  const me = s.profile;

  // Notes
  const noteInput = h("input", { type: "text", placeholder: "Записать что-то милое или серьёзное…", maxlength: 240 });
  const addNote = () => {
    const txt = noteInput.value.trim();
    if (!txt) return;
    store.addNote(me, txt);
    noteInput.value = "";
    sound.pick();
  };
  noteInput.addEventListener("keydown", e => { if (e.key === "Enter") addNote(); });
  const notesPanel = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Дневник" }), h("small", { text: "Заметки сохраняются на этом устройстве" })]),
    ]),
    h("div", { class: "journal-input" }, [
      noteInput,
      h("button", { class: "cta-btn", onClick: addNote }, ["Добавить"]),
    ]),
    h("div", { class: "journal-list", style: { marginTop: "14px" } },
      s.notes.length === 0
        ? [h("small", { text: "Пока пусто. Запиши первую мысль." })]
        : s.notes.map(n =>
            h("div", { class: "journal-item" }, [
              h("button", { class: "x", onClick: () => { store.removeNote(n.id); } }, ["×"]),
              h("small", { text: `${n.author} · ${fmtDate(n.ts)}` }),
              h("div", { style: { marginTop: "6px" }, text: n.text }),
            ])
          )
    ),
  ]);

  // Wishlist
  const wishInput = h("input", { type: "text", placeholder: "Хотим сделать вместе…" });
  const addWish = () => {
    const txt = wishInput.value.trim();
    if (!txt) return;
    store.addWish(me, txt);
    wishInput.value = "";
    sound.pick();
  };
  wishInput.addEventListener("keydown", e => { if (e.key === "Enter") addWish(); });
  const wishPanel = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Список желаний" }), h("small", { text: "Места, дела, мечты, фильмы" })]),
    ]),
    h("div", { class: "journal-input" }, [
      wishInput,
      h("button", { class: "cta-btn", onClick: addWish }, ["Добавить"]),
    ]),
    h("div", { class: "journal-list", style: { marginTop: "14px" } },
      s.wishlist.length === 0
        ? [h("small", { text: "Пока пусто. Запиши первое желание." })]
        : s.wishlist.map(w =>
            h("div", { class: "journal-item", style: { opacity: w.done ? .55 : 1 } }, [
              h("button", { class: "x", onClick: () => store.removeWish(w.id) }, ["×"]),
              h("small", { text: `${w.author} · ${fmtDate(w.ts)}` }),
              h("div", { style: { marginTop: "6px", textDecoration: w.done ? "line-through" : "none" }, text: w.text }),
              h("button", { class: "cta-btn ghost", style: { marginTop: "10px", padding: "6px 12px", fontSize: "12px" }, onClick: () => store.toggleWish(w.id) }, [w.done ? "Не сделано" : "Сделано ✓"]),
            ])
          )
    ),
  ]);

  view.appendChild(h("div", { class: "grid grid-aside" }, [notesPanel, wishPanel]));
}

// ─────────────────────  STATS  ─────────────────────
function renderStats(view) {
  const s = store.getState();
  const both = ["Алина", "Артур"];

  // overall summary
  const summary = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Личный счёт" }), h("small", { text: "Битва двух титанов" })]),
    ]),
    h("div", { class: "grid grid-2" }, both.map(p => {
      const w = countWins(s, p), l = countLosses(s, p), d = countDraws(s, p);
      const name = s.customNames?.[p] || p;
      return h("div", { class: "stat-card" }, [
        h("small", { text: "Профиль" }),
        h("h4", { text: name }),
        h("div", { class: "stat-row" }, [h("span", { text: "Побед" }), h("strong", { class: "win", text: w })]),
        h("div", { class: "stat-row" }, [h("span", { text: "Поражений" }), h("strong", { class: "loss", text: l })]),
        h("div", { class: "stat-row" }, [h("span", { text: "Ничьи" }), h("strong", { class: "draw", text: d })]),
      ]);
    })),
  ]);
  view.appendChild(summary);

  // by game
  const cards = h("div", { class: "stats-grid" });
  data.GAMES.forEach(g => {
    const a = s.stats["Алина"]?.[g.id] || { w: 0, l: 0, d: 0 };
    const b = s.stats["Артур"]?.[g.id] || { w: 0, l: 0, d: 0 };
    const hsa = s.highScores["Алина"]?.[g.id];
    const hsb = s.highScores["Артур"]?.[g.id];
    if (g.category === "couple" && !a.w && !a.l && !a.d && !b.w && !b.l && !b.d) return;
    cards.appendChild(h("div", { class: "stat-card" }, [
      h("small", { text: g.subtitle }),
      h("h4", { text: g.title }),
      g.category === "solo"
        ? h("div", {}, [
            h("div", { class: "stat-row" }, [h("span", { text: "Алина · рекорд" }), h("strong", { class: "win", text: hsa != null ? hsa : "—" })]),
            h("div", { class: "stat-row" }, [h("span", { text: "Артур · рекорд" }), h("strong", { class: "win", text: hsb != null ? hsb : "—" })]),
          ])
        : h("div", {}, [
            h("div", { class: "stat-row" }, [h("span", { text: "Алина" }), h("strong", { html: `<span class="win">${a.w}</span> / <span class="loss">${a.l}</span> / <span class="draw">${a.d}</span>` })]),
            h("div", { class: "stat-row" }, [h("span", { text: "Артур" }), h("strong", { html: `<span class="win">${b.w}</span> / <span class="loss">${b.l}</span> / <span class="draw">${b.d}</span>` })]),
          ]),
    ]));
  });
  view.appendChild(h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "По играм" }), h("small", { text: "Победы / поражения / ничьи" })]),
    ]),
    cards,
  ]));

  // history
  const hist = s.history;
  view.appendChild(h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Журнал матчей" }), h("small", { text: "Последние партии" })]),
    ]),
    h("div", { class: "history-list" },
      hist.length === 0
        ? [h("small", { text: "Пока никто никого не побеждал. Старт?" })]
        : hist.map(m => renderHistoryRow(m, s.profile))
    ),
  ]));
}

function renderHistoryRow(m, viewer) {
  let res = "draw", label = "ничья";
  if (m.result === "win") {
    if (m.a === viewer) { res = "win"; label = "победа"; }
    else if (m.b === viewer) { res = "loss"; label = "поражение"; }
    else { res = "win"; label = m.a + " выиграл"; }
  }
  const name = data.GAME_LABELS[m.game] || m.game;
  return h("div", { class: "history-row" }, [
    h("span", { class: "history-result " + res, text: label }),
    h("div", {}, [
      h("strong", { text: name }),
      h("div", {}, [h("small", { text: m.a + " vs " + m.b })]),
    ]),
    h("span", { class: "history-meta", text: fmtDate(m.ts) }),
  ]);
}

// ─────────────────────  SETTINGS  ─────────────────────
function renderSettings(view) {
  const s = store.getState();

  // profile switch
  const profileBlock = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Профиль" }), h("small", { text: "Кто сейчас за устройством" })]),
    ]),
    h("div", { class: "grid grid-2" }, [
      h("button", {
        class: "cta-btn " + (s.profile === "Алина" ? "" : "secondary"),
        onClick: () => { store.setProfile("Алина"); refreshShell(); }
      }, ["Алина"]),
      h("button", {
        class: "cta-btn " + (s.profile === "Артур" ? "" : "secondary"),
        onClick: () => { store.setProfile("Артур"); refreshShell(); }
      }, ["Артур"]),
    ]),
    h("div", { style: { marginTop: "16px" } }, [
      h("button", { class: "cta-btn ghost", onClick: () => {
        store.clearProfile();
        showLogin();
      } }, ["Выйти из профиля"]),
    ]),
  ]);

  // theme
  const themeBlock = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Тема" }), h("small", { text: "Цвета меняются мгновенно" })]),
    ]),
    h("div", { class: "grid grid-3" }, [
      themeCard("aurora", "Аврора", "Глубокая фиалка и закат", s),
      themeCard("dawn", "Рассвет", "Светлая, тёплая, нежная", s),
      themeCard("noir", "Полночь", "Контраст, чёрный кофе", s),
    ]),
  ]);

  // names
  const nameAlina = h("input", { type: "text", value: s.customNames["Алина"] || "Алина", maxlength: 32 });
  const nameArtur = h("input", { type: "text", value: s.customNames["Артур"] || "Артур", maxlength: 32 });
  const namesBlock = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Как вас называть" }), h("small", { text: "Поменяй на ласковые прозвища" })]),
    ]),
    h("div", { class: "grid grid-2" }, [
      h("div", { class: "field" }, [h("label", { text: "Профиль Алины" }), nameAlina]),
      h("div", { class: "field" }, [h("label", { text: "Профиль Артура" }), nameArtur]),
    ]),
    h("button", { class: "cta-btn", style: { marginTop: "16px" }, onClick: () => {
      store.setCustomName("Алина", nameAlina.value.trim() || "Алина");
      store.setCustomName("Артур", nameArtur.value.trim() || "Артур");
      toast("Имена сохранены ✓");
      refreshShell();
    } }, ["Сохранить имена"]),
  ]);

  // anniversary
  const annInput = h("input", { type: "date", value: s.anniversary ? s.anniversary.slice(0, 10) : "" });
  const annBlock = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Дата начала отношений" }), h("small", { text: "Счётчик дней появится на главной" })]),
    ]),
    h("div", { class: "field" }, [
      h("label", { text: "Когда всё началось" }),
      annInput,
    ]),
    h("button", { class: "cta-btn", style: { marginTop: "16px" }, onClick: () => {
      if (!annInput.value) return;
      store.setAnniversary(new Date(annInput.value).toISOString());
      toast("Дата сохранена ✓");
    } }, ["Сохранить"]),
  ]);

  // danger zone
  const dangerBlock = h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [h("h3", { text: "Опасная зона" }), h("small", { text: "Сбросит весь прогресс на этом устройстве" })]),
    ]),
    h("button", { class: "cta-btn ghost", onClick: () => {
      if (confirm("Точно сбросить ВСЁ? Статистика, дневник, имена, темы — всё пропадёт.")) {
        store.resetAll();
        showLogin();
      }
    } }, ["Сбросить всё"]),
  ]);

  view.appendChild(h("div", { class: "grid grid-aside" }, [profileBlock, themeBlock]));
  view.appendChild(h("div", { class: "grid grid-aside" }, [namesBlock, annBlock]));
  view.appendChild(dangerBlock);
}

function themeCard(id, title, sub, s) {
  const card = h("button", {
    class: "stat-card" + (s.theme === id ? " active" : ""),
    onClick: () => { store.setTheme(id); toast("Тема: " + title); },
    style: { textAlign: "left", cursor: "pointer", border: s.theme === id ? "1px solid var(--rose)" : undefined }
  }, [
    h("small", { text: "Тема" }),
    h("h4", { text: title }),
    h("small", { text: sub }),
  ]);
  return card;
}

// ─────────────────────  HELPERS  ─────────────────────
function daysSince(iso) {
  if (!iso) return null;
  const start = new Date(iso);
  const now = new Date();
  const ms = now - start;
  if (ms < 0) return 0;
  return Math.floor(ms / 86400000);
}
function dayOfYear() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}
function countWins(s, p) { return Object.values(s.stats?.[p] || {}).reduce((a, x) => a + (x.w || 0), 0); }
function countLosses(s, p) { return Object.values(s.stats?.[p] || {}).reduce((a, x) => a + (x.l || 0), 0); }
function countDraws(s, p) { return Object.values(s.stats?.[p] || {}).reduce((a, x) => a + (x.d || 0), 0); }

// expose for game modules (back navigation)
window.__go = go;

init();
