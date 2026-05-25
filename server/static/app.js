const THEME_KEY = "alina-theme";
const LOVE_LINES = [
  "Алина, я тебя люблю...",
  "Новая комната, новая дуэль, новая история вдвоем.",
];

const state = {
  selectedProfile: localStorage.getItem("alina-selected-profile") || "",
  token: localStorage.getItem("alina-player-token") || "",
  roomId: localStorage.getItem("alina-room-id") || "",
  room: null,
  invitation: null,
  stats: null,
  polling: null,
  theme: localStorage.getItem(THEME_KEY) || "light",
  pongHoldDirection: null,
  pongHoldTimer: null,
  typewriterTimer: null,
  previousTttBoard: Array(9).fill(""),
  selectedDurakTarget: 0,
};

const GAME_LABELS = {
  ticTacToe: "крестикам-ноликам",
  rps: "камню, ножницам, бумаге",
  pong: "pong",
  durak: "дураку",
};

const SUIT_SYMBOLS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_NAMES = {
  hearts: "Черви",
  diamonds: "Бубны",
  clubs: "Трефы",
  spades: "Пики",
};

const els = {
  flash: document.getElementById("flash"),
  loveTypewriter: document.getElementById("loveTypewriter"),
  profileOverlay: document.getElementById("profileOverlay"),
  overlayAlina: document.getElementById("overlayAlina"),
  overlayArtur: document.getElementById("overlayArtur"),
  settingsDrawer: document.getElementById("settingsDrawer"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  openSettingsBtn: document.getElementById("openSettingsBtn"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  drawerAlina: document.getElementById("drawerAlina"),
  drawerArtur: document.getElementById("drawerArtur"),
  themeLightBtn: document.getElementById("themeLightBtn"),
  themeDarkBtn: document.getElementById("themeDarkBtn"),
  clearProfileBtn: document.getElementById("clearProfileBtn"),
  profileHeader: document.getElementById("profileHeader"),
  inviteEmpty: document.getElementById("inviteEmpty"),
  inviteCard: document.getElementById("inviteCard"),
  inviteTitle: document.getElementById("inviteTitle"),
  inviteSubtitle: document.getElementById("inviteSubtitle"),
  joinInviteBtn: document.getElementById("joinInviteBtn"),
  statsCards: document.getElementById("statsCards"),
  historyBox: document.getElementById("historyBox"),
  roomText: document.getElementById("roomText"),
  roomBadge: document.getElementById("roomBadge"),
  playersBox: document.getElementById("playersBox"),
  leaveRoomBtn: document.getElementById("leaveRoomBtn"),
  gameButtons: Array.from(document.querySelectorAll("[data-game]")),
  ticTacToeCard: document.getElementById("ticTacToeCard"),
  rpsCard: document.getElementById("rpsCard"),
  pongCard: document.getElementById("pongCard"),
  durakCard: document.getElementById("durakCard"),
  tttBoard: document.getElementById("tttBoard"),
  tttStatus: document.getElementById("tttStatus"),
  restartTttBtn: document.getElementById("restartTttBtn"),
  restartRpsBtn: document.getElementById("restartRpsBtn"),
  restartPongBtn: document.getElementById("restartPongBtn"),
  restartDurakBtn: document.getElementById("restartDurakBtn"),
  rpsRound: document.getElementById("rpsRound"),
  score1: document.getElementById("score1"),
  score2: document.getElementById("score2"),
  rpsResult: document.getElementById("rpsResult"),
  rpsChoices: Array.from(document.querySelectorAll(".rps-choice")),
  pongStatus: document.getElementById("pongStatus"),
  pongScore1: document.getElementById("pongScore1"),
  pongScore2: document.getElementById("pongScore2"),
  pongStage: document.getElementById("pongStage"),
  pongPaddle1: document.getElementById("pongPaddle1"),
  pongPaddle2: document.getElementById("pongPaddle2"),
  pongBall: document.getElementById("pongBall"),
  pongUpBtn: document.getElementById("pongUpBtn"),
  pongDownBtn: document.getElementById("pongDownBtn"),
  durakStatus: document.getElementById("durakStatus"),
  durakTrump: document.getElementById("durakTrump"),
  durakDeck: document.getElementById("durakDeck"),
  durakOpponent: document.getElementById("durakOpponent"),
  durakTable: document.getElementById("durakTable"),
  durakTakeBtn: document.getElementById("durakTakeBtn"),
  durakFinishBtn: document.getElementById("durakFinishBtn"),
  durakHand: document.getElementById("durakHand"),
};

function setFlash(message, isError = false) {
  els.flash.textContent = message;
  els.flash.style.color = isError ? "var(--loss)" : "var(--muted)";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "Ошибка запроса");
  return data;
}

function saveIdentity(profile, roomId, token) {
  state.selectedProfile = profile || "";
  state.roomId = roomId || "";
  state.token = token || "";
  localStorage.setItem("alina-selected-profile", state.selectedProfile);
  localStorage.setItem("alina-room-id", state.roomId);
  localStorage.setItem("alina-player-token", state.token);
}

function clearIdentity() {
  state.selectedProfile = "";
  state.roomId = "";
  state.token = "";
  state.room = null;
  localStorage.removeItem("alina-selected-profile");
  localStorage.removeItem("alina-room-id");
  localStorage.removeItem("alina-player-token");
}

function clearRoomIdentity() {
  state.roomId = "";
  state.token = "";
  state.room = null;
  localStorage.removeItem("alina-room-id");
  localStorage.removeItem("alina-player-token");
}

function saveTheme(theme) {
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle("theme-dark", state.theme === "dark");
}

function startTypewriter() {
  if (!els.loveTypewriter) return;
  if (state.typewriterTimer) clearTimeout(state.typewriterTimer);
  let lineIndex = 0;
  let charIndex = 0;
  let deleting = false;
  const tick = () => {
    const line = LOVE_LINES[lineIndex];
    els.loveTypewriter.textContent = deleting ? line.slice(0, charIndex--) : line.slice(0, charIndex++);
    let delay = deleting ? 35 : 70;
    if (!deleting && charIndex > line.length) {
      deleting = true;
      delay = 1400;
    } else if (deleting && charIndex < 0) {
      deleting = false;
      lineIndex = (lineIndex + 1) % LOVE_LINES.length;
      charIndex = 0;
      delay = 260;
    }
    state.typewriterTimer = setTimeout(tick, delay);
  };
  tick();
}

function openSettings() { els.settingsDrawer.classList.remove("hidden"); }
function closeSettings() { els.settingsDrawer.classList.add("hidden"); }
function updateOverlay() { els.profileOverlay.classList.toggle("hidden", Boolean(state.selectedProfile)); }
function playerSlot() { return state.room && state.room.me ? state.room.me.slot : null; }
function gameName(game) { return GAME_LABELS[game] || game; }

function buildBoard() {
  els.tttBoard.innerHTML = "";
  for (let i = 0; i < 9; i += 1) {
    const button = document.createElement("button");
    button.className = "ttt-cell";
    button.addEventListener("click", () => playTtt(i).catch((e) => setFlash(e.message, true)));
    els.tttBoard.appendChild(button);
  }
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function schedulePolling() {
  if (state.polling) clearTimeout(state.polling);
  const delay = state.room && state.room.game === "pong" ? 80 : 1200;
  state.polling = setTimeout(() => refreshHome().catch(() => {}), delay);
}

function syncRoomTransitions(previousRoom, nextRoom) {
  if (!previousRoom || !nextRoom) return;
  if (previousRoom.roomId === nextRoom.roomId && previousRoom.playerCount === 2 && nextRoom.playerCount === 1 && nextRoom.me) {
    setFlash("Партнер вышел из игры.", true);
  }
}

function renderProfileControls() {
  const selected = state.selectedProfile;
  [[els.overlayAlina, "Алина"], [els.overlayArtur, "Артур"], [els.drawerAlina, "Алина"], [els.drawerArtur, "Артур"]].forEach(([button, profile]) => {
    if (!button) return;
    button.classList.toggle("active", selected === profile);
    button.disabled = false;
  });
  els.profileHeader.innerHTML = !selected ? '<div class="quick-note">Сначала выбери профиль, чтобы открыть кабинет и начать игру.</div>' : `<div class="quick-note"><strong>Профиль:</strong> ${selected}. Комната и приглашения будут работать от его имени.</div>`;
  els.gameButtons.forEach((button) => { button.disabled = !selected || Boolean(state.room); });
  els.leaveRoomBtn.classList.toggle("hidden", !state.room);
  updateOverlay();
}

function renderThemeControls() {
  els.themeLightBtn.classList.toggle("active", state.theme === "light");
  els.themeDarkBtn.classList.toggle("active", state.theme === "dark");
}

function renderStats() {
  const stats = state.stats || {};
  els.statsCards.innerHTML = ["Алина", "Артур"].map((profile) => {
    const item = stats[profile] || {};
    return `<div class="stats-card"><h3>${profile}</h3><div class="stat-line"><span>Крестики-нолики</span><strong>${item.ticTacToe?.wins || 0} / ${item.ticTacToe?.losses || 0} / ${item.ticTacToe?.draws || 0}</strong></div><div class="stat-line"><span>КНБ</span><strong>${item.rps?.wins || 0} / ${item.rps?.losses || 0} / ${item.rps?.draws || 0}</strong></div><div class="stat-line"><span>Pong</span><strong>${item.pong?.wins || 0} / ${item.pong?.losses || 0} / ${item.pong?.draws || 0}</strong></div><div class="stat-line"><span>Дурак</span><strong>${item.durak?.wins || 0} / ${item.durak?.losses || 0} / ${item.durak?.draws || 0}</strong></div></div>`;
  }).join("");
}

function renderHistory() {
  if (!state.selectedProfile) {
    els.historyBox.innerHTML = '<div class="history-empty">Выбери профиль, и здесь появится история матчей.</div>';
    return;
  }
  const history = state.stats?.[state.selectedProfile]?.history || [];
  if (!history.length) {
    els.historyBox.innerHTML = '<div class="history-empty">Пока матчей не было.</div>';
    return;
  }
  els.historyBox.innerHTML = history.map((item) => `<div class="history-item"><div><div><strong>${gameName(item.game)}</strong></div><div class="hero-text">${item.vs ? `против ${item.vs}` : ""}</div></div><div><div class="history-badge ${item.result}">${item.result === "win" ? "Победа" : item.result === "loss" ? "Поражение" : "Ничья"}</div><div class="hero-text" style="margin-top:6px;text-align:right">${formatTime(item.timestamp)}</div></div></div>`).join("");
}

function renderInvitation() {
  if (state.invitation && state.selectedProfile && !state.room) {
    els.inviteCard.classList.remove("hidden");
    els.inviteEmpty.classList.add("hidden");
    els.inviteTitle.textContent = `${state.invitation.owner} создал комнату`;
    els.inviteSubtitle.textContent = `Игра: ${gameName(state.invitation.game)}. Не хочешь подключиться?`;
  } else {
    els.inviteCard.classList.add("hidden");
    els.inviteEmpty.classList.remove("hidden");
  }
}

function renderRoomInfo() {
  if (!state.room) {
    els.roomText.textContent = state.selectedProfile ? "Сейчас активной комнаты нет." : "Сначала выбери профиль.";
    els.roomBadge.textContent = "Нет комнаты";
    els.playersBox.textContent = state.selectedProfile ? "Создай новую игру или дождись приглашения." : "Профиль еще не выбран.";
    return;
  }
  els.roomText.textContent = `${state.room.owner} открыл комнату по игре ${gameName(state.room.game)}.`;
  els.roomBadge.textContent = `Комната ${state.room.roomId}`;
  els.playersBox.textContent = `В комнате: ${state.room.players.map((player) => player.name).join(" и ")}`;
}

function renderGameVisibility() {
  const game = state.room ? state.room.game : "";
  els.ticTacToeCard.classList.toggle("hidden", game !== "ticTacToe");
  els.rpsCard.classList.toggle("hidden", game !== "rps");
  els.pongCard.classList.toggle("hidden", game !== "pong");
  els.durakCard.classList.toggle("hidden", game !== "durak");
}

function animateCell(cell, mark) {
  cell.classList.remove("pop");
  void cell.offsetWidth;
  cell.classList.add("pop");
  cell.classList.toggle("x-mark", mark === "X");
  cell.classList.toggle("o-mark", mark === "O");
}

function renderTtt() {
  if (!state.room || state.room.game !== "ticTacToe") {
    state.previousTttBoard = Array(9).fill("");
    return;
  }
  const game = state.room.ticTacToe;
  const mySlot = playerSlot();
  const myMark = mySlot === 1 ? "X" : mySlot === 2 ? "O" : "";
  const active = state.room.playerCount === 2 && game.winner === null && game.turn === mySlot;
  Array.from(els.tttBoard.children).forEach((cell, index) => {
    const nextMark = game.board[index];
    const prevMark = state.previousTttBoard[index];
    cell.textContent = nextMark;
    cell.disabled = !active || nextMark !== "";
    cell.classList.toggle("active", game.winningLine.includes(index));
    cell.classList.toggle("x-mark", nextMark === "X");
    cell.classList.toggle("o-mark", nextMark === "O");
    if (nextMark && nextMark !== prevMark) animateCell(cell, nextMark);
  });
  state.previousTttBoard = [...game.board];
  if (state.room.playerCount < 2) els.tttStatus.textContent = "Ждем второго игрока.";
  else if (game.winner === "draw") els.tttStatus.textContent = "Ничья.";
  else if (game.winner) els.tttStatus.textContent = game.winner === myMark ? "Ты выиграл." : "Победил соперник.";
  else els.tttStatus.textContent = active ? "Твой ход." : "Ход соперника.";
}

function renderRps() {
  if (!state.room || state.room.game !== "rps") return;
  const game = state.room.rps;
  const slot = playerSlot();
  const locked = slot ? game.choices[String(slot)] !== null : true;
  els.rpsRound.textContent = state.room.playerCount === 2 ? `Раунд ${game.round}` : "Ждем второго игрока.";
  els.score1.textContent = String(game.scores["1"]);
  els.score2.textContent = String(game.scores["2"]);
  els.rpsResult.textContent = game.resultText;
  els.rpsChoices.forEach((button) => { button.disabled = state.room.playerCount < 2 || locked; });
}

function renderPong() {
  if (!state.room || state.room.game !== "pong") return;
  const pong = state.room.pong;
  const width = pong.field.width;
  const height = pong.field.height;
  const stageWidth = els.pongStage.clientWidth || 760;
  const stageHeight = stageWidth * (height / width);
  const scaleX = stageWidth / width;
  const scaleY = stageHeight / height;
  els.pongScore1.textContent = String(pong.scores["1"]);
  els.pongScore2.textContent = String(pong.scores["2"]);
  if (state.room.playerCount < 2) els.pongStatus.textContent = "Ждем второго игрока.";
  else if (pong.winner) els.pongStatus.textContent = pong.winner === playerSlot() ? "Ты выиграл матч." : "Матч выиграл соперник.";
  else els.pongStatus.textContent = playerSlot() === 1 ? "Ты играешь слева." : "Ты играешь справа.";
  const leftTop = ((pong.paddles["1"] + height / 2) - pong.paddleHeight / 2) * scaleY;
  const rightTop = ((pong.paddles["2"] + height / 2) - pong.paddleHeight / 2) * scaleY;
  const ballLeft = (pong.ball.x + width / 2 - pong.ballSize / 2) * scaleX;
  const ballTop = (pong.ball.y + height / 2 - pong.ballSize / 2) * scaleY;
  Object.assign(els.pongPaddle1.style, { left: "24px", top: `${leftTop}px`, height: `${pong.paddleHeight * scaleY}px` });
  Object.assign(els.pongPaddle2.style, { right: "24px", top: `${rightTop}px`, height: `${pong.paddleHeight * scaleY}px` });
  Object.assign(els.pongBall.style, { left: `${ballLeft}px`, top: `${ballTop}px`, width: `${pong.ballSize * scaleX}px`, height: `${pong.ballSize * scaleY}px` });
}

function suitClass(card) { return card ? card.suit : ""; }
function cardDisplayName(card) { return `${card.rank} ${SUIT_NAMES[card.suit]}`; }

function createPlayingCard(card, onClick, selected = false) {
  const button = document.createElement("button");
  button.className = `playing-card ${suitClass(card)}${selected ? " selected" : ""}`;
  button.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span><span class="card-name">${cardDisplayName(card)}</span>`;
  if (onClick) button.addEventListener("click", onClick);
  else button.disabled = true;
  return button;
}

function isDurakAttacker(game) { return playerSlot() === game.attacker; }
function isDurakDefender(game) { return playerSlot() === game.defender; }

function renderDurak() {
  if (!state.room || state.room.game !== "durak") {
    state.selectedDurakTarget = 0;
    return;
  }
  const game = state.room.durak;
  const slot = playerSlot();
  const attacker = isDurakAttacker(game);
  const defender = isDurakDefender(game);
  const openIndices = game.table.map((pair, index) => pair.defense === null ? index : -1).filter((index) => index >= 0);
  if (!openIndices.length) state.selectedDurakTarget = 0;
  else if (!openIndices.includes(state.selectedDurakTarget)) state.selectedDurakTarget = openIndices[0];

  els.durakStatus.textContent = game.statusText || "Ждем второго игрока.";
  els.durakTrump.textContent = game.trumpCard ? `Козырь: ${game.trumpCard.rank} ${SUIT_SYMBOLS[game.trumpCard.suit]} ${SUIT_NAMES[game.trumpCard.suit]}` : "Козырь появится после раздачи.";
  els.durakDeck.textContent = `Карт в колоде: ${game.deckCount}`;

  els.durakOpponent.innerHTML = "";
  for (let i = 0; i < (game.opponentCount || 0); i += 1) {
    const back = document.createElement("div");
    back.className = "card-back";
    els.durakOpponent.appendChild(back);
  }
  if (!game.opponentCount) {
    els.durakOpponent.innerHTML = '<div class="durak-note">Соперник еще не подключился или у него нет карт.</div>';
  }

  els.durakTable.innerHTML = "";
  if (!game.table.length) {
    els.durakTable.innerHTML = '<div class="durak-note">Стол пуст. Атакующий начинает с любой карты.</div>';
  } else {
    game.table.forEach((pair, index) => {
      const wrap = document.createElement("div");
      wrap.className = "durak-pair";
      const attackSlot = document.createElement("div");
      attackSlot.className = `durak-slot${defender && pair.defense === null && state.selectedDurakTarget === index ? " open-target" : ""}`;
      if (defender && pair.defense === null) {
        attackSlot.addEventListener("click", () => { state.selectedDurakTarget = index; renderDurak(); });
      }
      attackSlot.appendChild(createPlayingCard(pair.attack));
      wrap.appendChild(attackSlot);

      const defenseSlot = document.createElement("div");
      defenseSlot.className = `durak-slot${defender && pair.defense === null && state.selectedDurakTarget === index ? " open-target" : ""}`;
      if (pair.defense) {
        defenseSlot.appendChild(createPlayingCard(pair.defense));
      } else {
        const empty = document.createElement("div");
        empty.className = "durak-slot empty-target";
        empty.textContent = defender ? "Нажми сюда, потом карту" : "Ожидает защиты";
        defenseSlot.appendChild(empty);
      }
      if (defender && pair.defense === null) {
        defenseSlot.addEventListener("click", () => { state.selectedDurakTarget = index; renderDurak(); });
      }
      wrap.appendChild(defenseSlot);
      els.durakTable.appendChild(wrap);
    });
  }

  els.durakHand.innerHTML = "";
  (game.myHand || []).forEach((card) => {
    let onClick = null;
    let selected = false;
    if (attacker) {
      onClick = () => durakAttack(card.id).catch((e) => setFlash(e.message, true));
    } else if (defender && openIndices.length) {
      selected = false;
      onClick = () => durakDefend(card.id, state.selectedDurakTarget).catch((e) => setFlash(e.message, true));
    }
    els.durakHand.appendChild(createPlayingCard(card, onClick, selected));
  });
  if (!(game.myHand || []).length) {
    els.durakHand.innerHTML = '<div class="durak-note">Рука пустая.</div>';
  }

  els.durakTakeBtn.disabled = !defender || !game.table.length || Boolean(game.winner);
  els.durakFinishBtn.disabled = !attacker || !game.table.length || openIndices.length > 0 || Boolean(game.winner);
}

function render() {
  renderProfileControls();
  renderThemeControls();
  renderStats();
  renderHistory();
  renderInvitation();
  renderRoomInfo();
  renderGameVisibility();
  renderTtt();
  renderRps();
  renderPong();
  renderDurak();
}

async function refreshHome() {
  const params = new URLSearchParams();
  if (state.selectedProfile) params.set("profile", state.selectedProfile);
  if (state.token) params.set("token", state.token);
  const query = params.toString();
  const previousRoom = state.room;
  const data = await api(`/api/home${query ? `?${query}` : ""}`);
  state.stats = data.stats;
  state.invitation = data.invitation;
  state.room = data.currentRoom;
  state.roomId = state.room ? state.room.roomId : "";
  if (!state.room) localStorage.removeItem("alina-room-id");
  syncRoomTransitions(previousRoom, state.room);
  render();
  schedulePolling();
}

async function selectProfile(profile) {
  clearRoomIdentity();
  saveIdentity(profile, "", "");
  updateOverlay();
  await refreshHome();
  closeSettings();
  setFlash(`Выбран профиль ${profile}.`);
}

async function logoutProfile() {
  stopPongHold();
  clearIdentity();
  closeSettings();
  await refreshHome();
  updateOverlay();
  setFlash("Профиль сброшен. Выбери новый вход.");
}

async function leaveRoom() {
  if (!state.roomId || !state.token) return;
  await api(`/api/rooms/${state.roomId}/leave`, { method: "POST", body: { token: state.token } });
  stopPongHold();
  clearRoomIdentity();
  await refreshHome();
  setFlash("Ты вышел из игры.");
}

async function createRoom(game) {
  if (!state.selectedProfile) throw new Error("Сначала выбери профиль.");
  const data = await api("/api/rooms", { method: "POST", body: { profile: state.selectedProfile, game } });
  saveIdentity(state.selectedProfile, data.room.roomId, data.token);
  state.room = data.room;
  setFlash(`${state.selectedProfile} создал комнату по игре ${gameName(game)}.`);
  await refreshHome();
}

async function joinInvitation() {
  if (!state.invitation || !state.selectedProfile) return;
  const data = await api(`/api/rooms/${state.invitation.roomId}/join`, { method: "POST", body: { profile: state.selectedProfile, token: state.token } });
  saveIdentity(state.selectedProfile, data.room.roomId, data.token);
  state.room = data.room;
  setFlash(`${state.selectedProfile} подключился к комнате.`);
  await refreshHome();
}

async function playTtt(index) {
  const data = await api(`/api/rooms/${state.roomId}/ttt/move`, { method: "POST", body: { token: state.token, cell: index } });
  state.room = data.room;
  render();
  schedulePolling();
}

async function restartTtt() {
  const data = await api(`/api/rooms/${state.roomId}/ttt/reset`, { method: "POST", body: { token: state.token } });
  state.room = data.room;
  state.previousTttBoard = Array(9).fill("");
  render();
}

async function chooseRps(choice) {
  const data = await api(`/api/rooms/${state.roomId}/rps/choice`, { method: "POST", body: { token: state.token, choice } });
  state.room = data.room;
  render();
  schedulePolling();
}

async function restartRps() {
  const data = await api(`/api/rooms/${state.roomId}/rps/reset`, { method: "POST", body: { token: state.token } });
  state.room = data.room;
  render();
}

async function movePong(direction) {
  if (!state.room || state.room.game !== "pong") return;
  const data = await api(`/api/rooms/${state.roomId}/pong/move`, { method: "POST", body: { token: state.token, direction } });
  state.room = data.room;
  render();
}

async function restartPong() {
  const data = await api(`/api/rooms/${state.roomId}/pong/reset`, { method: "POST", body: { token: state.token } });
  state.room = data.room;
  render();
}

async function durakAttack(cardId) {
  const data = await api(`/api/rooms/${state.roomId}/durak/attack`, { method: "POST", body: { token: state.token, cardId } });
  state.room = data.room;
  render();
}

async function durakDefend(cardId, targetIndex) {
  const data = await api(`/api/rooms/${state.roomId}/durak/defend`, { method: "POST", body: { token: state.token, cardId, targetIndex } });
  state.room = data.room;
  render();
}

async function durakTake() {
  const data = await api(`/api/rooms/${state.roomId}/durak/take`, { method: "POST", body: { token: state.token } });
  state.room = data.room;
  render();
}

async function durakFinish() {
  const data = await api(`/api/rooms/${state.roomId}/durak/finish`, { method: "POST", body: { token: state.token } });
  state.room = data.room;
  render();
}

async function restartDurak() {
  const data = await api(`/api/rooms/${state.roomId}/durak/reset`, { method: "POST", body: { token: state.token } });
  state.room = data.room;
  render();
}

function stopPongHold() {
  state.pongHoldDirection = null;
  if (state.pongHoldTimer) {
    clearInterval(state.pongHoldTimer);
    state.pongHoldTimer = null;
  }
}

function startPongHold(direction) {
  if (!state.room || state.room.game !== "pong" || state.room.playerCount < 2) return;
  if (state.pongHoldDirection === direction && state.pongHoldTimer) return;
  stopPongHold();
  state.pongHoldDirection = direction;
  movePong(direction).catch(() => {});
  state.pongHoldTimer = setInterval(() => movePong(direction).catch(() => {}), 55);
}

function setupPongButton(button, direction) {
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); startPongHold(direction); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => button.addEventListener(eventName, stopPongHold));
}

els.overlayAlina.addEventListener("click", () => selectProfile("Алина").catch((e) => setFlash(e.message, true)));
els.overlayArtur.addEventListener("click", () => selectProfile("Артур").catch((e) => setFlash(e.message, true)));
els.drawerAlina.addEventListener("click", () => selectProfile("Алина").catch((e) => setFlash(e.message, true)));
els.drawerArtur.addEventListener("click", () => selectProfile("Артур").catch((e) => setFlash(e.message, true)));
els.clearProfileBtn.addEventListener("click", () => logoutProfile().catch((e) => setFlash(e.message, true)));
els.leaveRoomBtn.addEventListener("click", () => leaveRoom().catch((e) => setFlash(e.message, true)));
els.openSettingsBtn.addEventListener("click", openSettings);
els.closeSettingsBtn.addEventListener("click", closeSettings);
els.drawerBackdrop.addEventListener("click", closeSettings);
els.themeLightBtn.addEventListener("click", () => { saveTheme("light"); renderThemeControls(); });
els.themeDarkBtn.addEventListener("click", () => { saveTheme("dark"); renderThemeControls(); });
els.joinInviteBtn.addEventListener("click", () => joinInvitation().catch((e) => setFlash(e.message, true)));
els.gameButtons.forEach((button) => button.addEventListener("click", () => createRoom(button.dataset.game).catch((e) => setFlash(e.message, true))));
els.restartTttBtn.addEventListener("click", () => restartTtt().catch((e) => setFlash(e.message, true)));
els.restartRpsBtn.addEventListener("click", () => restartRps().catch((e) => setFlash(e.message, true)));
els.restartPongBtn.addEventListener("click", () => restartPong().catch((e) => setFlash(e.message, true)));
els.restartDurakBtn.addEventListener("click", () => restartDurak().catch((e) => setFlash(e.message, true)));
els.durakTakeBtn.addEventListener("click", () => durakTake().catch((e) => setFlash(e.message, true)));
els.durakFinishBtn.addEventListener("click", () => durakFinish().catch((e) => setFlash(e.message, true)));
els.rpsChoices.forEach((button) => button.addEventListener("click", () => chooseRps(button.dataset.choice).catch((e) => setFlash(e.message, true))));
setupPongButton(els.pongUpBtn, "up");
setupPongButton(els.pongDownBtn, "down");

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSettings();
  if (!state.room || state.room.game !== "pong") return;
  if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].includes(event.key)) event.preventDefault();
  if (event.repeat && state.pongHoldDirection) return;
  if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") startPongHold("up");
  if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") startPongHold("down");
});

window.addEventListener("keyup", (event) => { if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].includes(event.key)) stopPongHold(); });
window.addEventListener("blur", stopPongHold);
document.addEventListener("visibilitychange", () => { if (document.hidden) stopPongHold(); });
window.addEventListener("resize", render);

applyTheme();
buildBoard();
render();
startTypewriter();
refreshHome().catch((e) => setFlash(e.message, true));

