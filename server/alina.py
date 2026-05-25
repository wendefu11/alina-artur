import json
import mimetypes
import os
import random
import string
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8000"))
ROOM_TTL_SECONDS = 60 * 60 * 6
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"
STATS_FILE = DATA_DIR / "stats.json"
PROFILES = ["Алина", "Артур"]
GAME_LABELS = {"ticTacToe": "крестики-нолики", "rps": "камень, ножницы, бумага", "pong": "pong", "durak": "дураку"}
rooms = {}
rooms_lock = threading.Lock()
DATA_DIR.mkdir(exist_ok=True)

def now(): return time.time()
def create_token(): return uuid.uuid4().hex
def random_room_code(length=5): return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

def default_stats():
    return {"profiles": {profile: {"ticTacToe": {"wins": 0, "losses": 0, "draws": 0}, "rps": {"wins": 0, "losses": 0, "draws": 0}, "pong": {"wins": 0, "losses": 0, "draws": 0}, "durak": {"wins": 0, "losses": 0, "draws": 0}, "history": []} for profile in PROFILES}}

def load_stats():
    if STATS_FILE.exists():
        try:
            with STATS_FILE.open("r", encoding="utf-8") as file:
                data = json.load(file)
            if "profiles" in data:
                return data
        except (OSError, json.JSONDecodeError):
            pass
    return default_stats()

stats_data = load_stats()

def save_stats():
    with STATS_FILE.open("w", encoding="utf-8") as file:
        json.dump(stats_data, file, ensure_ascii=False, indent=2)

def profile_exists(name): return name in PROFILES

def push_history(profile, item):
    history = stats_data["profiles"][profile]["history"]
    history.insert(0, item)
    del history[20:]

def record_result(game_key, winner_name=None, loser_name=None, draw_names=None):
    timestamp = int(now())
    if draw_names:
        for name in draw_names:
            stats_data["profiles"][name][game_key]["draws"] += 1
            push_history(name, {"game": game_key, "result": "draw", "vs": next(other for other in draw_names if other != name), "timestamp": timestamp})
    elif winner_name and loser_name:
        stats_data["profiles"][winner_name][game_key]["wins"] += 1
        stats_data["profiles"][loser_name][game_key]["losses"] += 1
        push_history(winner_name, {"game": game_key, "result": "win", "vs": loser_name, "timestamp": timestamp})
        push_history(loser_name, {"game": game_key, "result": "loss", "vs": winner_name, "timestamp": timestamp})
    save_stats()

def empty_ttt_board(): return [""] * 9
def empty_rps_round(): return {"1": None, "2": None}

def card_rank_value(rank):
    return {"6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14}[rank]

def make_card(rank, suit):
    return {"id": f"{rank}-{suit}", "rank": rank, "suit": suit, "value": card_rank_value(rank)}

def create_durak_deck():
    suits = ["hearts", "diamonds", "clubs", "spades"]
    ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"]
    deck = [make_card(rank, suit) for suit in suits for rank in ranks]
    random.shuffle(deck)
    return deck

def sort_durak_hand(hand, trump_suit):
    return sorted(hand, key=lambda card: (card["suit"] == trump_suit, card["value"], card["suit"]))

def make_durak_state():
    return {"deck": [], "hands": {"1": [], "2": []}, "trumpSuit": None, "trumpCard": None, "attacker": 1, "defender": 2, "table": [], "statusText": "Ждем второго игрока.", "winner": None, "statsRecorded": False}

def make_pong_state():
    return {"ball": {"x": 0.0, "y": 0.0}, "aim": {"x": random.choice([-5.2, 5.2]), "y": random.choice([-2.2, 2.2])}, "paddles": {"1": 0.0, "2": 0.0}, "scores": {"1": 0, "2": 0}, "field": {"width": 760, "height": 420}, "paddleHeight": 96, "ballSize": 14, "targetScore": 5, "status": "waiting", "lastScored": None, "winner": None, "statsRecorded": False}

def deal_durak_cards(room):
    game = room["durak"]
    if not game["deck"]:
        return
    for slot in ("1", "2"):
        while len(game["hands"][slot]) < 6 and game["deck"]:
            game["hands"][slot].append(game["deck"].pop(0))
        game["hands"][slot] = sort_durak_hand(game["hands"][slot], game["trumpSuit"])

def durak_can_defend(attack_card, defend_card, trump_suit):
    if defend_card["suit"] == attack_card["suit"] and defend_card["value"] > attack_card["value"]:
        return True
    if defend_card["suit"] == trump_suit and attack_card["suit"] != trump_suit:
        return True
    if defend_card["suit"] == trump_suit and attack_card["suit"] == trump_suit and defend_card["value"] > attack_card["value"]:
        return True
    return False

def durak_table_ranks(game):
    ranks = set()
    for pair in game["table"]:
        ranks.add(pair["attack"]["rank"])
        if pair["defense"]:
            ranks.add(pair["defense"]["rank"])
    return ranks

def durak_max_attacks(game):
    defender_hand = len(game["hands"][str(game["defender"])])
    return max(1, min(6, defender_hand))

def reset_durak(room):
    room["durak"] = make_durak_state()
    game = room["durak"]
    if len(room["players"]) < 2:
        room["updatedAt"] = now()
        return
    deck = create_durak_deck()
    trump_card = deck[-1]
    game["deck"] = deck
    game["trumpSuit"] = trump_card["suit"]
    game["trumpCard"] = trump_card
    game["attacker"] = 1
    game["defender"] = 2
    game["table"] = []
    game["statusText"] = "Атакующий ходит первой картой."
    deal_durak_cards(room)
    room["updatedAt"] = now()

def maybe_finish_durak(room):
    game = room["durak"]
    if game["winner"] or len(room["players"]) < 2:
        return
    first_empty = not game["hands"]["1"] and not game["deck"]
    second_empty = not game["hands"]["2"] and not game["deck"]
    if not first_empty and not second_empty:
        return
    if first_empty and second_empty:
        first = room["players"][0]["name"]
        second = room["players"][1]["name"]
        record_result("durak", draw_names=[first, second])
        game["winner"] = "draw"
    elif first_empty:
        record_result("durak", winner_name=room["players"][0]["name"], loser_name=room["players"][1]["name"])
        game["winner"] = 1
    else:
        record_result("durak", winner_name=room["players"][1]["name"], loser_name=room["players"][0]["name"])
        game["winner"] = 2
    game["statsRecorded"] = True
    game["statusText"] = "Партия завершена."

def make_durak_attack(room, player, card_id):
    game = room["durak"]
    if len(room["players"]) < 2:
        return "Нужен второй игрок."
    if game["winner"]:
        return "Партия уже завершена."
    if player["slot"] != game["attacker"]:
        return "Сейчас не твоя атака."
    hand = game["hands"][str(player["slot"])]
    card = next((item for item in hand if item["id"] == card_id), None)
    if not card:
        return "Карта не найдена."
    if len(game["table"]) >= durak_max_attacks(game):
        return "Больше карт в этот ход подкинуть нельзя."
    if game["table"]:
        if any(pair["defense"] is None for pair in game["table"]):
            return "Сначала дождись отбоя или возьми карты."
        if card["rank"] not in durak_table_ranks(game):
            return "Подкидывать можно только карту того же достоинства."
    hand.remove(card)
    game["table"].append({"attack": card, "defense": None})
    hand[:] = sort_durak_hand(hand, game["trumpSuit"])
    game["statusText"] = "Защитник должен отбиться или взять."
    room["updatedAt"] = now()
    return None

def make_durak_defense(room, player, card_id, target_index):
    game = room["durak"]
    if len(room["players"]) < 2:
        return "Нужен второй игрок."
    if game["winner"]:
        return "Партия уже завершена."
    if player["slot"] != game["defender"]:
        return "Сейчас не твоя защита."
    if target_index < 0 or target_index >= len(game["table"]):
        return "Некуда отбиваться."
    pair = game["table"][target_index]
    if pair["defense"] is not None:
        return "Эта карта уже отбита."
    hand = game["hands"][str(player["slot"])]
    card = next((item for item in hand if item["id"] == card_id), None)
    if not card:
        return "Карта не найдена."
    if not durak_can_defend(pair["attack"], card, game["trumpSuit"]):
        return "Этой картой нельзя отбиться."
    hand.remove(card)
    pair["defense"] = card
    hand[:] = sort_durak_hand(hand, game["trumpSuit"])
    if all(item["defense"] is not None for item in game["table"]):
        game["statusText"] = "Все карты отбиты. Атакующий может нажать Бита."
    else:
        game["statusText"] = "Отбивайся дальше или жди подкидывания."
    room["updatedAt"] = now()
    return None

def durak_take_cards(room, player):
    game = room["durak"]
    if player["slot"] != game["defender"]:
        return "Брать карты может только защитник."
    if not game["table"]:
        return "На столе нет карт."
    defender_hand = game["hands"][str(game["defender"])]
    for pair in game["table"]:
        defender_hand.append(pair["attack"])
        if pair["defense"]:
            defender_hand.append(pair["defense"])
    defender_hand[:] = sort_durak_hand(defender_hand, game["trumpSuit"])
    game["table"] = []
    deal_durak_cards(room)
    game["statusText"] = "Защитник взял карты. Атакующий ходит снова."
    maybe_finish_durak(room)
    room["updatedAt"] = now()
    return None

def durak_finish_attack(room, player):
    game = room["durak"]
    if player["slot"] != game["attacker"]:
        return "Биту завершает атакующий."
    if not game["table"]:
        return "Сначала нужно положить карту."
    if any(pair["defense"] is None for pair in game["table"]):
        return "Не все карты отбиты."
    game["table"] = []
    game["attacker"], game["defender"] = game["defender"], game["attacker"]
    deal_durak_cards(room)
    game["statusText"] = "Бита. Теперь ходит другой игрок."
    maybe_finish_durak(room)
    room["updatedAt"] = now()
    return None

def make_room(game, owner_name):
    room_id = random_room_code()
    while room_id in rooms:
        room_id = random_room_code()
    room = {"id": room_id, "game": game, "owner": owner_name, "inviteFor": "Артур" if owner_name == "Алина" else "Алина", "createdAt": now(), "updatedAt": now(), "players": [], "ttt": {"board": empty_ttt_board(), "turn": 1, "winner": None, "winningLine": [], "status": "waiting", "statsRecorded": False}, "rps": {"choices": empty_rps_round(), "scores": {"1": 0, "2": 0}, "resultText": "Сделайте выбор: камень, ножницы или бумага.", "lastRoundWinner": None, "round": 1, "status": "waiting"}, "pong": make_pong_state(), "durak": make_durak_state()}
    rooms[room_id] = room
    return room

def find_player(room, token):
    for player in room["players"]:
        if player["token"] == token:
            return player
    return None

def room_status(room):
    status = "playing" if len(room["players"]) >= 2 else "waiting"
    room["ttt"]["status"] = "finished" if room["ttt"]["winner"] else status
    room["rps"]["status"] = status
    room["pong"]["status"] = "finished" if room["pong"]["winner"] else status
    room["durak"]["status"] = "finished" if room["durak"]["winner"] else status

def join_room(room_id, profile_name, token):
    room = rooms.get(room_id)
    if not room: return None, None, "Комната не найдена."
    if not profile_exists(profile_name): return None, None, "Выберите Алина или Артур."
    if token:
        existing = find_player(room, token)
        if existing: return room, existing, None
    if len(room["players"]) >= 2: return None, None, "Комната уже заполнена."
    if any(player["name"] == profile_name for player in room["players"]): return None, None, "Этот профиль уже используется."
    player = {"token": create_token(), "name": profile_name, "slot": len(room["players"]) + 1}
    room["players"].append(player)
    room["updatedAt"] = now()
    if room["game"] == "durak" and len(room["players"]) == 2:
        reset_durak(room)
    room_status(room)
    return room, player, None

def room_public_state(room, viewer_token=None):
    if not room: return None
    me = None
    for player in room["players"]:
        if player["token"] == viewer_token:
            me = {"name": player["name"], "slot": player["slot"]}
    durak = room["durak"]
    durak_view = {"trumpSuit": durak["trumpSuit"], "trumpCard": durak["trumpCard"], "deckCount": len(durak["deck"]), "attacker": durak["attacker"], "defender": durak["defender"], "table": durak["table"], "statusText": durak["statusText"], "winner": durak["winner"], "myHand": [], "opponentCount": 0}
    if me:
        my_slot = str(me["slot"])
        enemy_slot = "2" if my_slot == "1" else "1"
        durak_view["myHand"] = durak["hands"][my_slot]
        durak_view["opponentCount"] = len(durak["hands"][enemy_slot])
    return {"roomId": room["id"], "game": room["game"], "owner": room["owner"], "inviteFor": room["inviteFor"], "playerCount": len(room["players"]), "players": [{"name": p["name"], "slot": p["slot"]} for p in room["players"]], "me": me, "ticTacToe": room["ttt"], "rps": room["rps"], "pong": room["pong"], "durak": durak_view}

def reset_room_for_waiting_player(room):
    reset_ttt(room)
    reset_rps(room)
    reset_pong(room)
    reset_durak(room)
    room_status(room)

def leave_room(room_id, token):
    room = rooms.get(room_id)
    if not room:
        return None, "Комната не найдена."
    player = find_player(room, token)
    if not player:
        return None, "Игрок не найден в комнате."
    room["players"] = [item for item in room["players"] if item["token"] != token]
    for index, item in enumerate(room["players"], start=1):
        item["slot"] = index
    room["updatedAt"] = now()
    if not room["players"]:
        rooms.pop(room_id, None)
        return None, None
    room["owner"] = room["players"][0]["name"]
    room["inviteFor"] = "Артур" if room["owner"] == "Алина" else "Алина"
    reset_room_for_waiting_player(room)
    return room, None

def current_room_for_token(token):
    if not token: return None
    for room in rooms.values():
        if find_player(room, token): return room
    return None

def current_invitation_for(profile_name):
    latest = None
    for room in rooms.values():
        if room["inviteFor"] == profile_name and len(room["players"]) == 1:
            if latest is None or room["createdAt"] > latest["createdAt"]: latest = room
    return latest

def home_state(profile_name=None, token=None):
    room = current_room_for_token(token)
    invitation = current_invitation_for(profile_name) if profile_name else None
    return {"profiles": PROFILES, "selectedProfile": profile_name, "stats": stats_data["profiles"], "invitation": room_public_state(invitation), "currentRoom": room_public_state(room, token)}

def check_ttt_winner(board):
    lines = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
    for a,b,c in lines:
        if board[a] and board[a] == board[b] == board[c]: return board[a], [a,b,c]
    if all(board): return "draw", []
    return None, []

def make_ttt_move(room, player, cell):
    game = room["ttt"]
    if len(room["players"]) < 2: return "Нужен второй игрок."
    if game["winner"] is not None: return "Партия уже завершена."
    if player["slot"] != game["turn"]: return "Сейчас ход соперника."
    if cell < 0 or cell > 8 or game["board"][cell]: return "Некорректный ход."
    game["board"][cell] = "X" if player["slot"] == 1 else "O"
    winner, line = check_ttt_winner(game["board"])
    if winner:
        game["winner"] = winner
        game["winningLine"] = line
        if not game["statsRecorded"]:
            first = room["players"][0]["name"]
            second = room["players"][1]["name"]
            if winner == "draw": record_result("ticTacToe", draw_names=[first, second])
            elif winner == "X": record_result("ticTacToe", winner_name=first, loser_name=second)
            else: record_result("ticTacToe", winner_name=second, loser_name=first)
            game["statsRecorded"] = True
    else:
        game["turn"] = 2 if game["turn"] == 1 else 1
    room["updatedAt"] = now()
    room_status(room)
    return None

def reset_ttt(room):
    room["ttt"] = {"board": empty_ttt_board(), "turn": 1, "winner": None, "winningLine": [], "status": "playing" if len(room["players"]) >= 2 else "waiting", "statsRecorded": False}
    room["updatedAt"] = now()

def resolve_rps(choice1, choice2):
    if choice1 == choice2: return None, "Ничья."
    beats = {"rock": "scissors", "scissors": "paper", "paper": "rock"}
    if beats[choice1] == choice2: return 1, "Раунд выиграл игрок 1."
    return 2, "Раунд выиграл игрок 2."

def make_rps_choice(room, player, choice):
    game = room["rps"]
    if len(room["players"]) < 2: return "Нужен второй игрок."
    if choice not in {"rock", "paper", "scissors"}: return "Некорректный выбор."
    slot_key = str(player["slot"])
    if game["choices"][slot_key] is not None: return "Вы уже выбрали ход."
    game["choices"][slot_key] = choice
    if all(game["choices"].values()):
        winner, text = resolve_rps(game["choices"]["1"], game["choices"]["2"])
        first = room["players"][0]["name"]
        second = room["players"][1]["name"]
        if winner is None:
            record_result("rps", draw_names=[first, second])
        elif winner == 1:
            game["scores"]["1"] += 1
            record_result("rps", winner_name=first, loser_name=second)
        else:
            game["scores"]["2"] += 1
            record_result("rps", winner_name=second, loser_name=first)
        labels = {"rock": "камень", "paper": "бумага", "scissors": "ножницы"}
        game["resultText"] = f"Игрок 1: {labels[game['choices']['1']]}, игрок 2: {labels[game['choices']['2']]}. {text}"
        game["lastRoundWinner"] = winner
        game["round"] += 1
        game["choices"] = empty_rps_round()
    else:
        game["resultText"] = "Ожидаем выбор второго игрока."
    room["updatedAt"] = now()
    return None

def reset_rps(room):
    scores = room["rps"]["scores"]
    round_num = room["rps"]["round"]
    room["rps"] = {"choices": empty_rps_round(), "scores": scores, "resultText": "Сделайте выбор: камень, ножницы или бумага.", "lastRoundWinner": None, "round": round_num, "status": "playing" if len(room["players"]) >= 2 else "waiting"}
    room["updatedAt"] = now()

def clamp(value, low, high): return max(low, min(high, value))

def move_pong_paddle(room, player, direction):
    pong = room["pong"]
    if len(room["players"]) < 2: return "Нужен второй игрок."
    if pong["winner"]: return "Матч уже завершен."
    if direction not in {"up", "down"}: return "Некорректное направление."
    half_field = pong["field"]["height"] / 2
    half_paddle = pong["paddleHeight"] / 2
    delta = -18 if direction == "up" else 18
    key = str(player["slot"])
    pong["paddles"][key] = clamp(pong["paddles"][key] + delta, -half_field + half_paddle, half_field - half_paddle)
    room["updatedAt"] = now()
    return None

def reset_pong(room, keep_scores=False, last_scored=None):
    scores = room["pong"]["scores"] if keep_scores else {"1": 0, "2": 0}
    serve_x = 5.2 if last_scored == 2 else -5.2 if last_scored == 1 else random.choice([-5.2, 5.2])
    room["pong"] = {"ball": {"x": 0.0, "y": 0.0}, "aim": {"x": serve_x, "y": random.choice([-2.2, 2.2])}, "paddles": {"1": 0.0, "2": 0.0}, "scores": scores, "field": {"width": 760, "height": 420}, "paddleHeight": 96, "ballSize": 14, "targetScore": 5, "status": "playing" if len(room["players"]) >= 2 else "waiting", "lastScored": last_scored, "winner": None, "statsRecorded": False}
    room["updatedAt"] = now()

def tick_pong(room):
    pong = room["pong"]
    if room["game"] != "pong": return
    if len(room["players"]) < 2:
        pong["status"] = "waiting"
        return
    if pong["winner"]:
        pong["status"] = "finished"
        return
    half_width = pong["field"]["width"] / 2
    half_height = pong["field"]["height"] / 2
    paddle_x = half_width - 26
    paddle_half = pong["paddleHeight"] / 2
    ball_half = pong["ballSize"] / 2
    ball = pong["ball"]
    aim = pong["aim"]
    ball["x"] += aim["x"]
    ball["y"] += aim["y"]
    if ball["y"] <= -half_height + ball_half or ball["y"] >= half_height - ball_half:
        aim["y"] *= -1
        ball["y"] = clamp(ball["y"], -half_height + ball_half, half_height - ball_half)
    left_y = pong["paddles"]["1"]
    right_y = pong["paddles"]["2"]
    if ball["x"] <= -paddle_x + 12 and aim["x"] < 0 and left_y - paddle_half <= ball["y"] <= left_y + paddle_half:
        offset = clamp((ball["y"] - left_y) / paddle_half, -1, 1)
        aim["x"] = min(abs(aim["x"]) * 1.03, 8.0)
        aim["y"] = clamp(offset * 4.8 + aim["y"] * 0.35, -5.5, 5.5)
        ball["x"] = -paddle_x + 12
    if ball["x"] >= paddle_x - 12 and aim["x"] > 0 and right_y - paddle_half <= ball["y"] <= right_y + paddle_half:
        offset = clamp((ball["y"] - right_y) / paddle_half, -1, 1)
        aim["x"] = -min(abs(aim["x"]) * 1.03, 8.0)
        aim["y"] = clamp(offset * 4.8 + aim["y"] * 0.35, -5.5, 5.5)
        ball["x"] = paddle_x - 12
    if ball["x"] < -half_width:
        pong["scores"]["2"] += 1
        reset_pong(room, keep_scores=True, last_scored=2)
        pong = room["pong"]
    elif ball["x"] > half_width:
        pong["scores"]["1"] += 1
        reset_pong(room, keep_scores=True, last_scored=1)
        pong = room["pong"]
    if pong["scores"]["1"] >= pong["targetScore"]: pong["winner"] = 1
    elif pong["scores"]["2"] >= pong["targetScore"]: pong["winner"] = 2
    if pong["winner"] and not pong["statsRecorded"]:
        first = room["players"][0]["name"]
        second = room["players"][1]["name"]
        if pong["winner"] == 1: record_result("pong", winner_name=first, loser_name=second)
        else: record_result("pong", winner_name=second, loser_name=first)
        pong["statsRecorded"] = True
    room["updatedAt"] = now()
    room_status(room)

def cleanup_rooms():
    while True:
        time.sleep(300)
        cutoff = now() - ROOM_TTL_SECONDS
        with rooms_lock:
            stale_ids = [room_id for room_id, room in rooms.items() if room["updatedAt"] < cutoff]
            for room_id in stale_ids: rooms.pop(room_id, None)

def game_loop():
    while True:
        time.sleep(0.016)
        with rooms_lock:
            for room in rooms.values(): tick_pong(room)

class GameHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.serve_static("index.html")
            return
        if parsed.path.startswith("/static/"):
            self.serve_static(parsed.path.replace("/static/", "", 1))
            return
        if parsed.path == "/api/home":
            params = parse_qs(parsed.query)
            profile = params.get("profile", [""])[0]
            token = params.get("token", [""])[0]
            if profile and not profile_exists(profile):
                self.respond_json({"error": "Профиль не найден."}, 400)
                return
            with rooms_lock:
                self.respond_json(home_state(profile_name=profile or None, token=token or None))
            return
        self.respond_json({"error": "Маршрут не найден."}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        payload = self.read_json()
        path = parsed.path
        if path == "/api/rooms":
            profile = payload.get("profile")
            game = payload.get("game")
            if not profile_exists(profile):
                self.respond_json({"error": "Выберите Алина или Артур."}, 400)
                return
            if game not in GAME_LABELS:
                self.respond_json({"error": "Выберите игру."}, 400)
                return
            with rooms_lock:
                room = make_room(game, profile)
                player = {"token": create_token(), "name": profile, "slot": 1}
                room["players"].append(player)
                room_status(room)
                self.respond_json({"room": room_public_state(room, player["token"]), "token": player["token"]}, 201)
            return
        if path.startswith("/api/rooms/") and path.endswith("/join"):
            room_id = path.split("/")[3]
            with rooms_lock:
                room, player, error = join_room(room_id, payload.get("profile"), payload.get("token"))
                if error:
                    self.respond_json({"error": error}, 400)
                    return
                self.respond_json({"room": room_public_state(room, player["token"]), "token": player["token"]})
            return
        if path.startswith("/api/rooms/") and path.endswith("/leave"):
            self.handle_leave_room(path.split("/")[3], payload)
            return
        action_map = {"/ttt/move": self.handle_ttt_move, "/ttt/reset": self.handle_ttt_reset, "/rps/choice": self.handle_rps_choice, "/rps/reset": self.handle_rps_reset, "/pong/move": self.handle_pong_move, "/pong/reset": self.handle_pong_reset, "/durak/attack": self.handle_durak_attack, "/durak/defend": self.handle_durak_defend, "/durak/take": self.handle_durak_take, "/durak/finish": self.handle_durak_finish, "/durak/reset": self.handle_durak_reset}
        for suffix, handler in action_map.items():
            if path.startswith("/api/rooms/") and path.endswith(suffix):
                handler(path.split("/")[3], payload)
                return
        self.respond_json({"error": "Маршрут не найден."}, 404)

    def handle_ttt_move(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            try: cell = int(payload.get("cell", -1))
            except (TypeError, ValueError):
                self.respond_json({"error": "Некорректный ход."}, 400)
                return
            error = make_ttt_move(room, player, cell)
            if error:
                self.respond_json({"error": error}, 400)
                return
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_ttt_reset(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            reset_ttt(room)
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_rps_choice(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            error = make_rps_choice(room, player, payload.get("choice"))
            if error:
                self.respond_json({"error": error}, 400)
                return
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_rps_reset(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            reset_rps(room)
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_pong_move(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            error = move_pong_paddle(room, player, payload.get("direction"))
            if error:
                self.respond_json({"error": error}, 400)
                return
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_pong_reset(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            reset_pong(room)
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_durak_attack(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            error = make_durak_attack(room, player, payload.get("cardId"))
            if error:
                self.respond_json({"error": error}, 400)
                return
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_durak_defend(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            try: target_index = int(payload.get("targetIndex", -1))
            except (TypeError, ValueError):
                self.respond_json({"error": "Некорректная цель защиты."}, 400)
                return
            error = make_durak_defense(room, player, payload.get("cardId"), target_index)
            if error:
                self.respond_json({"error": error}, 400)
                return
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_durak_take(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            error = durak_take_cards(room, player)
            if error:
                self.respond_json({"error": error}, 400)
                return
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_durak_finish(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            error = durak_finish_attack(room, player)
            if error:
                self.respond_json({"error": error}, 400)
                return
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_durak_reset(self, room_id, payload):
        with rooms_lock:
            room, player = self.room_and_player(room_id, payload.get("token"))
            if not room or not player: return
            reset_durak(room)
            self.respond_json({"room": room_public_state(room, player["token"])})
    def handle_leave_room(self, room_id, payload):
        with rooms_lock:
            room, error = leave_room(room_id, payload.get("token"))
            if error:
                status = 404 if error == "Комната не найдена." else 403
                self.respond_json({"error": error}, status)
                return
            self.respond_json({"room": room_public_state(room)})
    def room_and_player(self, room_id, token):
        room = rooms.get(room_id)
        if not room:
            self.respond_json({"error": "Комната не найдена."}, 404)
            return None, None
        player = find_player(room, token)
        if not player:
            self.respond_json({"error": "Игрок не найден в комнате."}, 403)
            return None, None
        return room, player
    def serve_static(self, relative_path):
        target = (STATIC_DIR / relative_path).resolve()
        if not str(target).startswith(str(STATIC_DIR.resolve())) or not target.exists():
            self.respond_json({"error": "Файл не найден."}, 404)
            return
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if not length: return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}
    def respond_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def log_message(self, fmt, *args): return

def run():
    threading.Thread(target=cleanup_rooms, daemon=True).start()
    threading.Thread(target=game_loop, daemon=True).start()
    server = ThreadingHTTPServer((HOST, PORT), GameHandler)
    print(f"Server running on http://127.0.0.1:{PORT}")
    server.serve_forever()

if __name__ == "__main__":
    run()
