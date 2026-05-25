// ─────────────────────────  ALINA & ARTUR — APP CORE  ─────────────────────────
// Router, layout, profile, settings, daily message, daily quote, mood, diary,
// stats, wishes, and game mounting. Everything is static; everything is local.

import {
  load, save, recordMatch, recordHighScore as storageRecordHigh,
  addQuizScore as storageAddQuiz, addDiary, removeDiary, setMood,
  addWish, toggleWish, removeWish, exportJSON, importJSON, resetAll,
} from "./storage.js";
import { LOVE_LINES, DAILY_QUOTES, MOODS, WISHES } from "./data.js";
import { mountGame } from "./games.js";

// ───── DOM helpers ─────────────────────────────────────────────────
export const $  = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k === "style") node.style.cssText = v;
    else if (k === "html") node.innerHTML = v;
    else if ((k === "data" || k === "dataset") && typeof v === "object") for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k.startsWith("on") && typeof v !== "function") node[k] = v;
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    if (c instanceof Node) node.appendChild(c);
    else node.appendChild(document.createTextNode(String(c)));
  }
  return node;
}

export function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ───── runtime state ───────────────────────────────────────────────
export const state = load();
const PROFILES = ["Алина", "Артур"];
const partnerOf = (p) => p === "Алина" ? "Артур" : "Алина";

// ───── elements ────────────────────────────────────────────────────
const view = $("#view");
const app = $("#app");
const loginOverlay = $("#loginOverlay");
const settingsDrawer = $("#settingsDrawer");
const navTopLinks = $$("#navTop .nav-link");
const navBottomLinks = $$("#navBottom .nav-link");

// ───── BOOT ────────────────────────────────────────────────────────
function boot() {
  applyTheme(state.theme);
  if (!state.profile) {
    showLoginOverlay();
  } else {
    enterApp();
  }
  initLoginHandlers();
  initDrawerHandlers();
  initRouter();
  startLoveTypewriter();
}

function showLoginOverlay() {
  loginOverlay.classList.remove("hidden");
  app.classList.add("hidden");
}

function enterApp() {
  loginOverlay.classList.add("hidden");
  app.classList.remove("hidden");
  refreshBrandDay();
  refreshBadge();
  if (!location.hash) location.hash = "#/home";
  else route();
}

function initLoginHandlers() {
  $$("[data-login]").forEach(btn => btn.addEventListener("click", () => {
    state.profile = btn.dataset.login;
    save(state);
    enterApp();
    toast(`Привет, ${state.profile}!`);
  }));
}

// ───── ROUTING ─────────────────────────────────────────────────────
const routes = { home: viewHome, games: viewGames, diary: viewDiary, stats: viewStats };

function initRouter() {
  addEventListener("hashchange", route);
}

function route() {
  if (!state.profile) { showLoginOverlay(); return; }
  cleanupGame();
  const slug = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "home";
  const handler = routes[slug] || viewHome;
  navTopLinks.concat(navBottomLinks).forEach(a => a.classList.toggle("active", a.dataset.route === slug));
  view.innerHTML = "";
  view.append(handler());
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ───── DRAWER ──────────────────────────────────────────────────────
function initDrawerHandlers() {
  $("#settingsBtn").addEventListener("click", openDrawer);
  $$("[data-close-drawer]").forEach(el => el.addEventListener("click", closeDrawer));

  $$("[data-switch]").forEach(btn => btn.addEventListener("click", () => {
    state.profile = btn.dataset.switch;
    save(state);
    refreshBadge();
    refreshDrawerActive();
    route();
    closeDrawer();
    toast(`Кабинет ${state.profile}`);
  }));

  $$("[data-theme]").forEach(btn => btn.addEventListener("click", () => {
    state.theme = btn.dataset.theme;
    save(state);
    applyTheme(state.theme);
    refreshDrawerActive();
    toast(`Тема: ${state.theme}`);
  }));

  $("#startDateInput").addEventListener("change", (e) => {
    state.startDate = e.target.value || state.startDate;
    save(state);
    refreshBrandDay();
    toast("Дата сохранена");
  });

  $("#exportBtn").addEventListener("click", () => {
    const data = exportJSON(state);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `alina-artur-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast("Файл сохранён");
  });

  $("#importInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    if (importJSON(text)) { toast("Импорт ок. Перезагружаю..."); setTimeout(()=>location.reload(), 600); }
    else toast("Не получилось :(");
  });

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Стереть все данные?")) { resetAll(); location.reload(); }
  });

  $("#logoutBtn").addEventListener("click", () => {
    state.profile = ""; save(state);
    closeDrawer(); showLoginOverlay();
  });

  $("#quickGameBtn").addEventListener("click", () => {
    const all = Object.keys(GAME_CATALOG);
    const pick = pickRandom(all);
    location.hash = `#/games/${pick}`;
  });

  $("#profileBadge").addEventListener("click", openDrawer);
}

function openDrawer() {
  settingsDrawer.classList.remove("hidden");
  $("#startDateInput").value = state.startDate || "";
  refreshDrawerActive();
}
function closeDrawer() { settingsDrawer.classList.add("hidden"); }

function refreshDrawerActive() {
  $$("[data-switch]").forEach(b => b.classList.toggle("active", b.dataset.switch === state.profile));
  $$("[data-theme]").forEach(b => b.classList.toggle("active", b.dataset.theme === state.theme));
}

// ───── THEMES ──────────────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.dataset.theme = t || "aurora";
}

// ───── BRAND / BADGE ───────────────────────────────────────────────
function refreshBrandDay() {
  const start = new Date(state.startDate || "2024-02-14");
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  $("#brandDay").textContent = `Вместе ${days} ${plural(days, "день","дня","дней")}`;
}
function refreshBadge() {
  const p = state.profile || "Гость";
  $("#badgeAvatar").textContent = p ? p[0] : "?";
  $("#badgeName").textContent = p;
  $("#profileBadge").dataset.profile = p;
}
function plural(n, one, few, many) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

// ───── TYPEWRITER LOVE LINE ────────────────────────────────────────
function startLoveTypewriter() {
  const out = $("#loveLine");
  const lines = LOVE_LINES;
  let idx = Math.floor(Math.random() * lines.length);
  let charPos = 0;
  let dir = 1;
  let line = lines[idx];
  const tick = () => {
    charPos += dir;
    out.textContent = line.slice(0, charPos);
    if (dir === 1 && charPos >= line.length) { dir = -1; setTimeout(tick, 1800); return; }
    if (dir === -1 && charPos <= 0) { idx = (idx + 1) % lines.length; line = lines[idx]; dir = 1; setTimeout(tick, 250); return; }
    setTimeout(tick, dir === 1 ? 38 : 18);
  };
  tick();
}

// ───── TOAST / CONFETTI ─────────────────────────────────────────────
let toastTimer = null;
export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

let confettiCanvas, confettiCtx, confettiW, confettiH, confettiParticles = [], confettiRaf = null;
function initConfetti() {
  confettiCanvas = $("#confetti");
  confettiCtx = confettiCanvas.getContext("2d");
  resizeConfetti();
  addEventListener("resize", resizeConfetti);
}
function resizeConfetti() {
  const dpr = window.devicePixelRatio || 1;
  confettiW = innerWidth; confettiH = innerHeight;
  confettiCanvas.width = confettiW * dpr; confettiCanvas.height = confettiH * dpr;
  confettiCanvas.style.width = confettiW + "px"; confettiCanvas.style.height = confettiH + "px";
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
export function confettiBurst({ count = 80, colors = ["#ff5d8f", "#a78bfa", "#22d3ee", "#fbbf24", "#34d399"] } = {}) {
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: Math.random() * confettiW,
      y: -20,
      vx: (Math.random() - .5) * 8,
      vy: 3 + Math.random() * 6,
      g: 0.18,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - .5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 120 + Math.random() * 60,
    });
  }
  if (!confettiRaf) confettiTick();
}
function confettiTick() {
  confettiCtx.clearRect(0, 0, confettiW, confettiH);
  for (const p of confettiParticles) {
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y); confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.5);
    confettiCtx.restore();
  }
  confettiParticles = confettiParticles.filter(p => p.life > 0 && p.y < confettiH + 60);
  if (confettiParticles.length) confettiRaf = requestAnimationFrame(confettiTick);
  else { confettiRaf = null; confettiCtx.clearRect(0, 0, confettiW, confettiH); }
}

// ───── GAME CATALOG ────────────────────────────────────────────────
const GAME_CATALOG = {
  ttt:        { title: "Крестики-нолики", icon: "✕◯", sub: "Классика на двоих",            tag: "duo",  grad: "linear-gradient(135deg, rgba(255,93,143,.18), rgba(167,139,250,.10))" },
  connect4:   { title: "Connect 4",       icon: "🔴", sub: "Четыре в ряд — за вертикальной сеткой", tag: "duo", grad: "linear-gradient(135deg, rgba(96,165,250,.20), rgba(167,139,250,.10))" },
  rps:        { title: "Камень-Ножницы-Бумага", icon: "✊✋✌", sub: "Скрытый выбор и быстрая партия", tag: "duo" },
  memory:     { title: "Память",          icon: "🃏", sub: "Найди пару — кто больше пар",  tag: "duo" },
  hangman:    { title: "Виселица",        icon: "🎯", sub: "Угадай слово до 7 ошибок",     tag: "duo" },
  pong:       { title: "Pong",            icon: "🏓", sub: "W/S vs ↑/↓ — до 5 очков",      tag: "duo" },
  simon:      { title: "Simon Says",      icon: "🎵", sub: "Повтори световую цепочку",     tag: "solo" },
  whack:      { title: "Поймай момент",   icon: "🐹", sub: "Реакция на скорости",          tag: "solo" },
  slide:      { title: "15-Пятнашки",     icon: "🔢", sub: "Собери порядок 1-15",          tag: "solo" },
  mine:       { title: "Минёр",           icon: "💣", sub: "Открой клетки, не нарвись",    tag: "solo" },
  snake:      { title: "Змейка",          icon: "🐍", sub: "Лучший счёт на профиль",       tag: "solo" },
  g2048:      { title: "2048",            icon: "🧮", sub: "Свайпы. Собирай степени двойки", tag: "solo" },
  reaction:   { title: "Реакция",         icon: "⚡", sub: "Тапни как только загорится зелёный", tag: "solo" },
  wheel:      { title: "Колесо решений",  icon: "🎡", sub: "Что делаем — пусть решит судьба", tag: "pair" },
  truth:      { title: "Правда или Действие", icon: "💌", sub: "Тёплые вопросы и заявки",  tag: "pair" },
  compliment: { title: "Машина комплиментов", icon: "💖", sub: "Тёплая фраза на каждый день", tag: "pair" },
  quiz:       { title: "Couple Quiz",     icon: "❓", sub: "Насколько хорошо вы друг друга знаете", tag: "pair" },
  coin:       { title: "Монетка",         icon: "🪙", sub: "Орёл / Решка",                 tag: "pair" },
  dice:       { title: "Кубики",          icon: "🎲", sub: "1-6 для решений",              tag: "pair" },
  love:       { title: "Love-O-Meter",    icon: "💘", sub: "Сколько % любви прямо сейчас", tag: "pair" },
};
const GAME_FILTERS = {
  all:  "Все",
  duo:  "Вдвоём за устройством",
  solo: "Соло (рекорды)",
  pair: "Для пары",
};

// ───── VIEWS ───────────────────────────────────────────────────────

function viewHome() {
  const root = el("div");
  const start = new Date(state.startDate || "2024-02-14");
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  const meStats = state.stats[state.profile] || { wins: 0, bestStreak: 0 };
  const partner = partnerOf(state.profile);

  // pick a daily quote based on day-of-year so it changes every day
  const today = new Date();
  const dayIndex = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(today.getFullYear(), 0, 0)) / 86400000);
  const q = DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];

  // hero
  const hero = el("div", { class: "card hero" });
  hero.append(
    el("div", { class: "hero-grid" },
      el("div", {},
        el("div", { class: "eyebrow" }, el("span", { class: "dot" }), "Private match club"),
        el("h1", {},
          state.profile === "Алина" ? "Привет, " : "Привет, ",
          el("span", { class: "grad" }, state.profile),
          ".",
        ),
        el("p", { class: "hero-text" }, `${partner} ждёт твоего следующего хода. Здесь — ваши игры, ваши воспоминания и ваша личная статистика. Выбирай что угодно — и поехали.`),
        el("div", { class: "hero-stats" },
          heroStat(String(days), `${plural(days,"день","дня","дней")} вместе`),
          heroStat(String(meStats.wins || 0), "побед"),
          heroStat(String(meStats.bestStreak || 0), "лучшая серия"),
        ),
        el("div", { class: "hero-actions" },
          el("button", { class: "cta-btn", onclick: () => location.hash = "#/games" }, "🎮 Открыть игры"),
          el("button", { class: "cta-btn secondary", onclick: () => location.hash = "#/games/truth" }, "💌 Правда / Действие"),
          el("button", { class: "cta-btn ghost", onclick: () => location.hash = "#/diary" }, "📓 Дневник"),
        ),
        el("div", { class: "hero-typewriter", id: "heroTypewriter" }),
      ),
      el("div", {},
        el("div", { class: "couple-stage" },
          el("div", { class: "couple-card left" },
            el("div", { class: "avatar-big" }, "А"),
            el("h3", {}, "Алина"),
            el("p", {}, state.mood["Алина"]?.id ? MOODS.find(m => m.id === state.mood["Алина"].id)?.icon + " " + MOODS.find(m => m.id === state.mood["Алина"].id)?.label : "Никого нет краше"),
          ),
          el("div", { class: "couple-center" }, el("div", { class: "big-heart" })),
          el("div", { class: "couple-card right" },
            el("div", { class: "avatar-big" }, "А"),
            el("h3", {}, "Артур"),
            el("p", {}, state.mood["Артур"]?.id ? MOODS.find(m => m.id === state.mood["Артур"].id)?.icon + " " + MOODS.find(m => m.id === state.mood["Артур"].id)?.label : "Готов к новому матчу"),
          ),
        ),
      ),
    ),
  );

  // quote card
  const quote = el("div", { class: "quote-card" },
    el("div", { class: "quote-mark" }, "“"),
    el("blockquote", {}, q.text),
    el("cite", {}, "— " + q.author),
  );

  // mood
  const mood = el("div", { class: "card" });
  mood.append(
    el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, `Настроение — ${state.profile}`), el("p", {}, "Один тап — и партнёр сразу видит, как ты сегодня.")),
    ),
    el("div", { class: "mood-row" },
      ...MOODS.map(m => el("button", {
        class: "mood-chip" + (state.mood[state.profile]?.id === m.id ? " active" : ""),
        onclick: () => { setMood(state, state.profile, m.id); toast(`Настроение: ${m.label}`); route(); }
      }, el("span", {}, m.icon), m.label)),
    ),
  );

  // featured games
  const featured = el("div", { class: "card" },
    el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, "Сыграем?"), el("p", {}, "Любимое — крупно. Все остальные — на странице «Игры».")),
      el("button", { class: "cta-btn ghost", onclick: () => location.hash = "#/games" }, "Все игры →"),
    ),
    el("div", { class: "games-grid" },
      ...["ttt", "rps", "truth", "love", "wheel", "memory"].map(id => gameTile(id)),
    ),
  );

  root.append(hero, quote, mood, featured);
  setTimeout(() => fillTypewriter("#heroTypewriter", LOVE_LINES), 50);
  return root;
}

function heroStat(value, label) {
  return el("div", { class: "hero-stat" },
    el("strong", {}, value),
    el("small", {}, label),
  );
}

function fillTypewriter(sel, lines) {
  const node = $(sel); if (!node) return;
  let i = Math.floor(Math.random() * lines.length);
  let p = 0, dir = 1, line = lines[i];
  const tick = () => {
    if (!document.contains(node)) return;
    p += dir;
    node.textContent = line.slice(0, p);
    if (dir === 1 && p >= line.length) { dir = -1; setTimeout(tick, 1800); return; }
    if (dir === -1 && p <= 0) { i = (i + 1) % lines.length; line = lines[i]; dir = 1; setTimeout(tick, 280); return; }
    setTimeout(tick, dir === 1 ? 42 : 22);
  };
  tick();
}

// ── GAMES VIEW ────────────────────────────────────────────────────
function viewGames() {
  const root = el("div");
  const slug = (location.hash.split("/")[2]) || ""; // #/games/<id>
  const filter = (location.hash.split("/")[3]) || ""; // not used; future

  const hdr = el("div", { class: "section-header" },
    el("div", {}, el("h2", {}, "Игры"), el("p", {}, `${Object.keys(GAME_CATALOG).length} штук. Выбирай — и сразу играем.`)),
    el("button", { class: "cta-btn ghost", onclick: () => { location.hash = "#/games"; } }, "↻ Закрыть игру"),
  );
  root.append(hdr);

  // filter chips
  const filterRow = el("div", { class: "filter-row" });
  const current = sessionStorage.getItem("gameFilter") || "all";
  for (const [k, v] of Object.entries(GAME_FILTERS)) {
    filterRow.append(el("button", {
      class: "filter-chip" + (current === k ? " active" : ""),
      onclick: () => { sessionStorage.setItem("gameFilter", k); route(); },
    }, v));
  }
  root.append(filterRow);

  // grid
  const grid = el("div", { class: "games-grid" });
  Object.entries(GAME_CATALOG).forEach(([id, g]) => {
    if (current !== "all" && g.tag !== current) return;
    grid.append(gameTile(id));
  });
  root.append(grid);

  // game host
  if (slug && GAME_CATALOG[slug]) {
    const wrap = el("div", { class: "game-host-wrap" });
    const head = el("div", { class: "card-head" },
      el("div", {}, el("h2", {}, GAME_CATALOG[slug].title), el("p", {}, GAME_CATALOG[slug].sub)),
      el("button", { class: "cta-btn secondary", onclick: () => { cleanupGame(); location.hash = "#/games"; } }, "← Закрыть"),
    );
    const scoreboard = el("div", { class: "scoreboard" });
    const host = el("div", { class: "game-host" });
    const card = el("div", { class: "card" });
    card.append(head, scoreboard, host);
    wrap.append(card);
    root.append(wrap);
    setTimeout(() => mountGameWithCtx(slug, host, scoreboard), 0);
    setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }
  return root;
}

function gameTile(id) {
  const g = GAME_CATALOG[id];
  return el("button", {
    class: "game-tile",
    style: g.grad ? `--tile-grad:${g.grad}` : "",
    onclick: () => { location.hash = `#/games/${id}`; },
  },
    el("span", { class: "tile-icon" }, g.icon),
    el("span", { class: "tile-title" }, g.title),
    el("span", { class: "tile-sub" }, g.sub),
    el("span", { class: "tile-foot" },
      el("span", { class: `tile-tag ${g.tag}` }, g.tag === "duo" ? "Вдвоём" : g.tag === "solo" ? "Соло" : "Для пары"),
    ),
  );
}

function cleanupGame() {
  if (window.__gameCleanup) { try { window.__gameCleanup(); } catch (e) {} window.__gameCleanup = null; }
}

function mountGameWithCtx(id, host, scoreboardEl) {
  const ctx = {
    profile: state.profile,
    partner: partnerOf(state.profile),
    state,
    scoreboardEl,
    recordResult: (gameId, winner, loser, isDraw = false) => recordMatch(state, gameId, winner, loser, isDraw),
    recordHighScore: (profile, gameId, value, isLowerBetter = false) => storageRecordHigh(state, profile, gameId, value, isLowerBetter),
    addQuizScore: (profile, score, total) => storageAddQuiz(state, profile, score, total),
    toast,
    confettiBurst,
    registerCleanup: (fn) => { window.__gameCleanup = fn; },
  };
  mountGame(id, host, ctx);
}

// ── DIARY VIEW ────────────────────────────────────────────────────
function viewDiary() {
  const root = el("div");
  root.append(el("div", { class: "section-header" },
    el("div", {}, el("h2", {}, "Дневник"), el("p", {}, "Личные записи и общий список желаний.")),
  ));

  const grid = el("div", { class: "diary-grid" });

  // notes
  const notes = el("div", { class: "card" });
  const textarea = el("textarea", { placeholder: "Что чувствуешь? О чём думаешь? Что хочешь сказать партнёру..." });
  const addBtn = el("button", { class: "cta-btn", onclick: () => {
    const t = textarea.value.trim(); if (!t) return;
    addDiary(state, state.profile, t);
    textarea.value = "";
    route();
    toast("Запись сохранена");
  } }, "Добавить запись");
  const list = el("div", {});
  (state.diary[state.profile] || []).forEach(entry => {
    list.append(el("div", { class: "diary-entry" },
      el("header", {},
        el("span", {}, new Date(entry.ts).toLocaleString("ru-RU")),
        el("button", { onclick: () => { removeDiary(state, state.profile, entry.ts); route(); } }, "Удалить"),
      ),
      el("p", {}, entry.text),
    ));
  });
  if (!(state.diary[state.profile] || []).length) {
    list.append(el("p", { class: "muted" }, "Записей пока нет. Напиши что-нибудь — даже одно слово."));
  }
  notes.append(
    el("div", { class: "card-head" }, el("div", {}, el("h2", {}, `${state.profile}: записи`), el("p", {}, "Только ты их видишь на этом устройстве."))),
    el("div", { class: "diary-form" }, textarea, addBtn),
    el("hr", { style: "border:0;border-top:1px solid var(--line);margin:18px 0" }),
    list,
  );

  // wishes
  const wishes = el("div", { class: "card" });
  const newWish = el("input", { type: "text", class: "text-input", placeholder: "Хочу вместе с тобой..." });
  const wishBtn = el("button", { class: "cta-btn", onclick: () => {
    const t = newWish.value.trim(); if (!t) return;
    addWish(state, t, state.profile); newWish.value = ""; route();
  } }, "Добавить желание");
  const wishList = el("div", {});
  state.wishes.forEach(w => {
    const row = el("div", { class: "wish-row" + (w.done ? " done" : "") },
      el("input", { type: "checkbox", checked: w.done, onchange: () => { toggleWish(state, w.id); route(); } }),
      el("span", { class: "wish-text" }, w.text),
      el("span", { class: "wish-by" }, "— " + w.by),
      el("button", { onclick: () => { removeWish(state, w.id); route(); }, style: "background:transparent;color:var(--text-3);font-size:18px" }, "×"),
    );
    wishList.append(row);
  });
  if (!state.wishes.length) {
    wishList.append(el("p", { class: "muted" }, "Пока пусто. Добавь идеи — мы потом по ним пройдёмся вместе."));
  }
  const suggest = el("div", { style: "margin-top:16px" },
    el("p", { class: "muted", style: "margin-bottom:8px" }, "Несколько идей, можно тапнуть:"),
    el("div", { class: "filter-row" },
      ...WISHES.slice(0, 6).map(w => el("button", { class: "filter-chip", onclick: () => { addWish(state, w, state.profile); route(); } }, w)),
    ),
  );

  wishes.append(
    el("div", { class: "card-head" }, el("div", {}, el("h2", {}, "Наши желания"), el("p", {}, "Общий список — видят оба."))),
    el("div", { style: "display:flex;gap:10px;margin-bottom:14px" }, newWish, wishBtn),
    wishList, suggest,
  );

  grid.append(notes, wishes);
  root.append(grid);
  return root;
}

// ── STATS VIEW ────────────────────────────────────────────────────
function viewStats() {
  const root = el("div");
  root.append(el("div", { class: "section-header" },
    el("div", {}, el("h2", {}, "Статистика"), el("p", {}, "Победы, поражения, рекорды и история матчей.")),
  ));

  const sCards = el("div", { class: "stats-grid" });
  PROFILES.forEach(p => {
    const s = state.stats[p] || { wins: 0, losses: 0, draws: 0, bestStreak: 0, byGame: {} };
    const hs = state.highScores[p] || {};
    const box = el("div", { class: "stat-box" },
      el("h3", {}, el("span", { class: "badge-avatar", style: `background:${p === "Алина" ? "var(--alina-grad)" : "var(--artur-grad)"}` }, "А"), p),
      el("div", { class: "stat-row" }, el("span", {}, "Победы"), el("strong", { style: "color:var(--win)" }, String(s.wins))),
      el("div", { class: "stat-row" }, el("span", {}, "Поражения"), el("strong", { style: "color:var(--loss)" }, String(s.losses))),
      el("div", { class: "stat-row" }, el("span", {}, "Ничьи"), el("strong", { style: "color:var(--draw)" }, String(s.draws))),
      el("div", { class: "stat-row" }, el("span", {}, "Лучшая серия побед"), el("strong", {}, String(s.bestStreak))),
      el("div", { class: "stat-row" }, el("span", {}, "Текущая серия"), el("strong", {}, String(s.streakWin || 0))),
      hs.snake     != null ? el("div", { class: "stat-row" }, el("span", {}, "🐍 Snake — рекорд"), el("strong", {}, String(hs.snake))) : null,
      hs.g2048     != null ? el("div", { class: "stat-row" }, el("span", {}, "🧮 2048 — рекорд"), el("strong", {}, String(hs.g2048))) : null,
      hs.reaction  != null ? el("div", { class: "stat-row" }, el("span", {}, "⚡ Реакция — лучшее"), el("strong", {}, hs.reaction + " мс")) : null,
      hs.simon     != null ? el("div", { class: "stat-row" }, el("span", {}, "🎵 Simon — рекорд"), el("strong", {}, String(hs.simon))) : null,
      hs.whack     != null ? el("div", { class: "stat-row" }, el("span", {}, "🐹 Whack — рекорд"), el("strong", {}, String(hs.whack))) : null,
      hs.slide     != null ? el("div", { class: "stat-row" }, el("span", {}, "🔢 15-puzzle — лучшее (ходы)"), el("strong", {}, String(hs.slide))) : null,
    );
    sCards.append(box);
  });
  root.append(sCards);

  // history
  const hist = el("div", { class: "card" });
  hist.append(el("div", { class: "card-head" },
    el("div", {}, el("h2", {}, "История матчей"), el("p", {}, "Последние 50 партий.")),
  ));
  const list = el("div", { class: "history-list" });
  const arr = (state.history || []).slice(0, 50);
  if (!arr.length) list.append(el("p", { class: "muted" }, "Пока нет ни одной партии — самое время начать."));
  arr.forEach(h => {
    const game = GAME_CATALOG[h.game]?.title || h.game;
    if (h.draw) {
      list.append(el("div", { class: "history-item" },
        el("div", {},
          el("strong", {}, `${h.winner} ${h.loser ? "и " + h.loser : ""}`),
          el("div", { class: "meta" }, `${game} · ${new Date(h.ts).toLocaleString("ru-RU")}`),
        ),
        el("span", { class: "history-badge draw" }, "Ничья"),
      ));
    } else {
      list.append(el("div", { class: "history-item" },
        el("div", {},
          el("strong", {}, `${h.winner} победил${h.winner === "Алина" ? "а" : ""}`),
          el("div", { class: "meta" }, `${game} · vs ${h.loser} · ${new Date(h.ts).toLocaleString("ru-RU")}`),
        ),
        el("span", { class: "history-badge win" }, "Победа"),
      ));
    }
  });
  hist.append(list);
  root.append(hist);
  return root;
}

// ───── BOOT ────────────────────────────────────────────────────────
initConfetti();
boot();
