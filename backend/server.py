# server.py
import os
from flask import Flask, request, jsonify, make_response, redirect
from flask_cors import CORS
import time, json, hashlib, requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

app = Flask(__name__)
CORS(app)

# ---------------- HTTP session (browser-like + retries) ----------------
UA = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/115.0.0.0 Safari/537.36"),
    "Accept": "application/json,text/plain,*/*",
    "Origin": "https://www.nba.com",
    "Referer": "https://www.nba.com/",
}

def make_session():
    s = requests.Session() # -- 
    s.headers.update(UA)
    retry = Retry(
        total=5,
        backoff_factor=0.4,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "HEAD"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=8, pool_maxsize=8)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s

S = make_session()

# ---------------- NBA CDN endpoints ----------------
CDN_SCOREBOARD_TODAY = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
CDN_BOXSCORE         = "https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gid}.json"
CDN_PBP              = "https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{gid}.json"
SCHEDULE_FMT         = "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_{v}.json"
SCHEDULE_VERSIONS    = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]  # fallback list

TEAM_LOGO            = "https://cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg"
PLAYER_HEADSHOT      = "https://cdn.nba.com/headshots/nba/latest/260x190/{playerId}.png"

# ---------------- tiny in-memory cache ----------------
CACHE = {}  # key -> {"data": obj, "ts": epoch_seconds}

def cache_get(key, ttl):
    now = time.time()
    entry = CACHE.get(key)
    if entry and (now - entry["ts"] < ttl):
        return entry["data"]
    return None

def cache_set(key, data):
    CACHE[key] = {"data": data, "ts": time.time()}

def fetch_json_throttled(key, url, ttl):
    cached = cache_get(key, ttl)
    if cached is not None:
        return cached, True
    r = S.get(url, timeout=12)
    r.raise_for_status()
    data = r.json()
    cache_set(key, data)
    return data, False

def stable_hash(obj) -> str:
    return hashlib.sha256(
        json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()

# ---------------- schedule helpers ----------------
def load_schedule_json():
    """Try scheduleLeagueV2_N.json until we find one with gameDates."""
    for v in SCHEDULE_VERSIONS:
        url = SCHEDULE_FMT.format(v=v)
        r = S.get(url, timeout=20)
        if r.ok:
            js = r.json()
            if js.get("leagueSchedule", {}).get("gameDates"):
                return js, url
    raise RuntimeError("Cannot load scheduleLeagueV2_* from CDN")

def get_schedule_cached():
    """Load schedule, cache it for 12 hours."""
    js = cache_get("schedule:json", ttl=12 * 3600)
    if js is not None:
        return js
    js, used_url = load_schedule_json()
    cache_set("schedule:json", js)
    app.logger.info("Loaded schedule file from CDN")
    return js

def schedule_game_ids_for_date(schedule_json, date_iso, fuzzy_days=1):
    """Return list of gameIds for YYYY-MM-DD. Schedule uses 'MM/DD/YYYY HH:MM:SS'."""
    import datetime as dt
    base = dt.datetime.strptime(date_iso, "%Y-%m-%d").date()

    def parse_sched_date(raw):
        mmddyyyy = (raw or "").split(" ")[0]
        try:
            return dt.datetime.strptime(mmddyyyy, "%m/%d/%Y").date()
        except Exception:
            return None

    want = { (base + dt.timedelta(days=d)) for d in range(-fuzzy_days, fuzzy_days + 1) }
    out = []
    for gd in schedule_json.get("leagueSchedule", {}).get("gameDates", []):
        d = parse_sched_date(gd.get("gameDate"))
        if d in want:
            for g in gd.get("games", []):
                gid = g.get("gameId")
                if gid:
                    out.append(gid)

    # unique, preserve order
    seen, uniq = set(), []
    for gid in out:
        if gid not in seen:
            seen.add(gid); uniq.append(gid)
    return uniq

# ===================== ROUTES =====================

@app.get("/health")
def health():
    return jsonify({"ok": True})

# Today’s live scoreboard (raw). If ?date=YYYY-MM-DD, return gameIds for that date via schedule.
@app.get("/scoreboard")
def scoreboard():
    date_iso = request.args.get("date")
    if date_iso:
        try:
            sched = get_schedule_cached()
            gids = schedule_game_ids_for_date(sched, date_iso, fuzzy_days=1)
            return jsonify({"date": date_iso, "gameIds": gids})
        except Exception as e:
            return jsonify({"date": date_iso, "gameIds": [], "error": str(e)}), 200

    data, _ = fetch_json_throttled("scoreboard:today", CDN_SCOREBOARD_TODAY, ttl=12)
    return jsonify(data)

# Raw boxscore (live/final)
@app.get("/game/<game_id>/boxscore")
def boxscore(game_id):
    url = CDN_BOXSCORE.format(gid=game_id)
    try:
        data, _ = fetch_json_throttled(f"box:{game_id}", url, ttl=10)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": "upstream_boxscore_failed", "gameId": game_id, "detail": str(e)}), 502

# Raw play-by-play (live/final)
@app.get("/game/<game_id>/pbp")
def pbp(game_id):
    url = CDN_PBP.format(gid=game_id)
    try:
        data, _ = fetch_json_throttled(f"pbp:{game_id}", url, ttl=10)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": "upstream_pbp_failed", "gameId": game_id, "detail": str(e)}), 502

# Asset redirects (so your <img> can use your API host)
@app.get("/assets/team-logo/<int:team_id>")
def team_logo(team_id):
    return redirect(TEAM_LOGO.format(teamId=team_id), code=302)

@app.get("/assets/player-headshot/<int:player_id>")
def player_headshot(player_id):
    return redirect(PLAYER_HEADSHOT.format(playerId=player_id), code=302)

# Slim poll endpoint with ETag/304, ultra-defensive against shape changes
@app.get("/poll/game/<game_id>")
def poll_game(game_id):
    """
    Returns a slim payload (clock/period/scores + per-player points) with an ETag.
    If client sends If-None-Match and nothing changed, respond 304.
    Never 500: network/shape errors become 502/200 with safe payload.
    """
    # 1) Fetch upstream (cached)
    try:
        url = CDN_BOXSCORE.format(gid=game_id)
        box, _ = fetch_json_throttled(f"box:{game_id}", url, ttl=10)
    except Exception as e:
        return jsonify({"error": "upstream_boxscore_failed", "gameId": game_id, "detail": str(e)}), 502

    game = (box or {}).get("game") or {}

    # 2) If nothing in payload (pregame / bad id), return safe minimal 200
    if not isinstance(game, dict) or not game:
        slim = {"gameId": game_id, "status": None, "scores": None, "players": {"home": [], "away": []}}
        etag = stable_hash(slim)
        resp = make_response(jsonify(slim), 200)
        resp.headers["ETag"] = etag
        resp.headers["Cache-Control"] = "public, max-age=8, stale-while-revalidate=20"
        return resp

    # 3) Safe extraction, tolerant of weird shapes
    h = game.get("homeTeam") or {}
    a = game.get("awayTeam") or {}

    # period can be a dict {"current": N} OR an int N
    period_raw = game.get("period")
    if isinstance(period_raw, dict):
        period_current = period_raw.get("current")
    else:
        period_current = period_raw  # could be int/None

    def player_snap(team):
        out = []
        for p in (team.get("players") or []):
            stats = p.get("statistics") or {}
            out.append({
                "playerId": p.get("personId"),
                "jerseyNum": p.get("jerseyNum"),
                "name": p.get("name"),
                "pts": stats.get("points"),
            })
        return out

    slim = {
        "gameId": game_id,
        "status": {
            "gameStatusText": game.get("gameStatusText"),
            "gameClock": game.get("gameClock"),
            "period": period_current,
        },
        "scores": {
            "home": {"teamId": h.get("teamId"), "triCode": h.get("teamTricode"), "score": h.get("score")},
            "away": {"teamId": a.get("teamId"), "triCode": a.get("teamTricode"), "score": a.get("score")},
        },
        "players": {"home": player_snap(h), "away": player_snap(a)},
    }

    # 4) ETag + 304 support, guarded
    try:
        etag = stable_hash(slim)
    except Exception:
        minimal = {
            "gameId": game_id,
            "h": (h.get("score") if isinstance(h, dict) else None),
            "a": (a.get("score") if isinstance(a, dict) else None),
            "p": period_current,
            "t": game.get("gameClock"),
        }
        etag = stable_hash(minimal)

    inm = request.headers.get("If-None-Match")
    if inm and inm == etag:
        return ("", 304)

    resp = make_response(jsonify(slim), 200)
    resp.headers["ETag"] = etag
    resp.headers["Cache-Control"] = "public, max-age=8, stale-while-revalidate=20"
    return resp

# ---------------- boot ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
