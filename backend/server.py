# server.py - Optimized NBA API Backend
import os
from flask import Flask, request, jsonify, make_response, redirect
from flask_cors import CORS
from flask_compress import Compress
import time
import json
import hashlib
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
import threading

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# Enable gzip/brotli compression for all responses
Compress(app)
app.config['COMPRESS_MIMETYPES'] = ['application/json', 'text/html', 'text/css', 'text/javascript']
app.config['COMPRESS_MIN_SIZE'] = 500  # Only compress responses > 500 bytes

# Thread pool for concurrent requests
executor = ThreadPoolExecutor(max_workers=10)

# ---------------- HTTP session (browser-like + retries) ----------------
UA = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/115.0.0.0 Safari/537.36"),
    "Accept": "application/json,text/plain,*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": "https://www.nba.com",
    "Referer": "https://www.nba.com/",
}

def make_session():
    s = requests.Session()
    s.headers.update(UA)
    retry = Retry(
        total=3,  # Reduced from 5 for faster failures
        backoff_factor=0.3,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "HEAD"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(
        max_retries=retry, 
        pool_connections=20,  # Increased from 8
        pool_maxsize=20       # Increased from 8
    )
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s

S = make_session()

# ---------------- NBA CDN endpoints ----------------
CDN_SCOREBOARD_TODAY = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
CDN_BOXSCORE = "https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gid}.json"
CDN_PBP = "https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{gid}.json"
SCHEDULE_FMT = "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_{v}.json"
SCHEDULE_VERSIONS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

TEAM_LOGO = "https://cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg"
PLAYER_HEADSHOT = "https://cdn.nba.com/headshots/nba/latest/260x190/{playerId}.png"

# ---------------- Thread-safe in-memory cache ----------------
class ThreadSafeCache:
    def __init__(self):
        self._cache = {}
        self._lock = threading.RLock()
    
    def get(self, key, ttl):
        with self._lock:
            entry = self._cache.get(key)
            if entry and (time.time() - entry["ts"] < ttl):
                return entry["data"]
            return None
    
    def set(self, key, data, is_final=False):
        with self._lock:
            # Final games get longer cache (1 hour)
            self._cache[key] = {
                "data": data, 
                "ts": time.time(),
                "final": is_final
            }
    
    def get_ttl(self, key):
        """Get remaining TTL for a key"""
        with self._lock:
            entry = self._cache.get(key)
            if entry:
                return entry.get("final", False)
            return False
    
    def cleanup(self, max_age=3600):
        """Remove entries older than max_age seconds"""
        with self._lock:
            now = time.time()
            keys_to_delete = [
                k for k, v in self._cache.items() 
                if now - v["ts"] > max_age
            ]
            for k in keys_to_delete:
                del self._cache[k]

CACHE = ThreadSafeCache()

def cache_get(key, ttl):
    return CACHE.get(key, ttl)

def cache_set(key, data, is_final=False):
    CACHE.set(key, data, is_final)

def fetch_json_throttled(key, url, ttl, check_final=False):
    """Fetch JSON with caching. Final games use longer TTL."""
    # Check if this is a final game (use longer TTL)
    if check_final and CACHE.get_ttl(key):
        ttl = 3600  # 1 hour for final games
    
    cached = cache_get(key, ttl)
    if cached is not None:
        return cached, True
    
    r = S.get(url, timeout=10)  # Reduced timeout from 12
    r.raise_for_status()
    data = r.json()
    
    # Check if game is final for cache optimization
    is_final = False
    if check_final:
        game = data.get("game", {})
        status = game.get("gameStatusText", "")
        is_final = status.lower() == "final"
    
    cache_set(key, data, is_final)
    return data, False

def stable_hash(obj) -> str:
    return hashlib.sha256(
        json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()[:16]  # Shorter hash is fine for ETags

# ---------------- schedule helpers ----------------
@lru_cache(maxsize=1)
def load_schedule_json_cached():
    """Try scheduleLeagueV2_N.json until we find one with gameDates."""
    for v in SCHEDULE_VERSIONS:
        url = SCHEDULE_FMT.format(v=v)
        r = S.get(url, timeout=15)
        if r.ok:
            js = r.json()
            if js.get("leagueSchedule", {}).get("gameDates"):
                return js
    raise RuntimeError("Cannot load scheduleLeagueV2_* from CDN")

def get_schedule_cached():
    """Load schedule, cache it for 12 hours."""
    js = cache_get("schedule:json", ttl=12 * 3600)
    if js is not None:
        return js
    js = load_schedule_json_cached()
    cache_set("schedule:json", js)
    return js

def schedule_game_ids_for_date(schedule_json, date_iso, fuzzy_days=1):
    """Return list of gameIds for YYYY-MM-DD."""
    import datetime as dt
    base = dt.datetime.strptime(date_iso, "%Y-%m-%d").date()

    def parse_sched_date(raw):
        mmddyyyy = (raw or "").split(" ")[0]
        try:
            return dt.datetime.strptime(mmddyyyy, "%m/%d/%Y").date()
        except Exception:
            return None

    want = {(base + dt.timedelta(days=d)) for d in range(-fuzzy_days, fuzzy_days + 1)}
    out = []
    for gd in schedule_json.get("leagueSchedule", {}).get("gameDates", []):
        d = parse_sched_date(gd.get("gameDate"))
        if d in want:
            for g in gd.get("games", []):
                gid = g.get("gameId")
                if gid:
                    out.append(gid)

    seen, uniq = set(), []
    for gid in out:
        if gid not in seen:
            seen.add(gid)
            uniq.append(gid)
    return uniq

# ---------------- Concurrent fetching ----------------
def fetch_boxscore_for_game(game_id):
    """Fetch single boxscore - used for concurrent requests"""
    try:
        url = CDN_BOXSCORE.format(gid=game_id)
        data, from_cache = fetch_json_throttled(f"box:{game_id}", url, ttl=10, check_final=True)
        return {"gameId": game_id, "data": data, "error": None}
    except Exception as e:
        return {"gameId": game_id, "data": None, "error": str(e)}

def fetch_multiple_boxscores(game_ids):
    """Fetch multiple boxscores concurrently"""
    results = []
    futures = {executor.submit(fetch_boxscore_for_game, gid): gid for gid in game_ids}
    
    for future in as_completed(futures, timeout=15):
        try:
            result = future.result()
            results.append(result)
        except Exception as e:
            gid = futures[future]
            results.append({"gameId": gid, "data": None, "error": str(e)})
    
    return results

# ===================== ROUTES =====================

@app.get("/health")
def health():
    return jsonify({"ok": True, "cache_enabled": True, "compression": True})

@app.get("/scoreboard")
def scoreboard():
    """Today's live scoreboard or gameIds for a specific date."""
    date_iso = request.args.get("date")
    if date_iso:
        try:
            sched = get_schedule_cached()
            gids = schedule_game_ids_for_date(sched, date_iso, fuzzy_days=1)
            resp = make_response(jsonify({"date": date_iso, "gameIds": gids}))
            resp.headers["Cache-Control"] = "public, max-age=60"
            return resp
        except Exception as e:
            return jsonify({"date": date_iso, "gameIds": [], "error": str(e)}), 200

    data, from_cache = fetch_json_throttled("scoreboard:today", CDN_SCOREBOARD_TODAY, ttl=12)
    resp = make_response(jsonify(data))
    resp.headers["Cache-Control"] = "public, max-age=10, stale-while-revalidate=30"
    return resp

@app.get("/game/<game_id>/boxscore")
def boxscore(game_id):
    """Raw boxscore with smart caching for final games."""
    url = CDN_BOXSCORE.format(gid=game_id)
    try:
        data, from_cache = fetch_json_throttled(f"box:{game_id}", url, ttl=10, check_final=True)
        resp = make_response(jsonify(data))
        
        # Final games can be cached longer
        game = data.get("game", {})
        is_final = game.get("gameStatusText", "").lower() == "final"
        
        if is_final:
            resp.headers["Cache-Control"] = "public, max-age=3600"  # 1 hour
        else:
            resp.headers["Cache-Control"] = "public, max-age=8, stale-while-revalidate=20"
        
        return resp
    except Exception as e:
        return jsonify({"error": "upstream_boxscore_failed", "gameId": game_id, "detail": str(e)}), 502

@app.get("/game/<game_id>/pbp")
def pbp(game_id):
    """Raw play-by-play with smart caching."""
    url = CDN_PBP.format(gid=game_id)
    try:
        data, from_cache = fetch_json_throttled(f"pbp:{game_id}", url, ttl=10, check_final=True)
        resp = make_response(jsonify(data))
        resp.headers["Cache-Control"] = "public, max-age=8, stale-while-revalidate=20"
        return resp
    except Exception as e:
        return jsonify({"error": "upstream_pbp_failed", "gameId": game_id, "detail": str(e)}), 502

# NEW: Batch endpoint for fetching multiple games at once
@app.get("/games/batch")
def batch_games():
    """
    Fetch multiple boxscores concurrently.
    Usage: /games/batch?ids=0022400001,0022400002,0022400003
    """
    ids_param = request.args.get("ids", "")
    if not ids_param:
        return jsonify({"error": "No game IDs provided", "games": []}), 400
    
    game_ids = [gid.strip() for gid in ids_param.split(",") if gid.strip()]
    
    if len(game_ids) > 15:
        return jsonify({"error": "Too many IDs (max 15)", "games": []}), 400
    
    results = fetch_multiple_boxscores(game_ids)
    
    resp = make_response(jsonify({"games": results}))
    resp.headers["Cache-Control"] = "public, max-age=8"
    return resp

# Asset redirects with cache headers
@app.get("/assets/team-logo/<int:team_id>")
def team_logo(team_id):
    resp = redirect(TEAM_LOGO.format(teamId=team_id), code=302)
    resp.headers["Cache-Control"] = "public, max-age=86400"  # 24 hours
    return resp

@app.get("/assets/player-headshot/<int:player_id>")
def player_headshot(player_id):
    resp = redirect(PLAYER_HEADSHOT.format(playerId=player_id), code=302)
    resp.headers["Cache-Control"] = "public, max-age=86400"  # 24 hours
    return resp

# Optimized poll endpoint
@app.get("/poll/game/<game_id>")
def poll_game(game_id):
    """
    Slim payload with ETag/304 support.
    Final games return longer cache headers.
    """
    try:
        url = CDN_BOXSCORE.format(gid=game_id)
        box, from_cache = fetch_json_throttled(f"box:{game_id}", url, ttl=10, check_final=True)
    except Exception as e:
        return jsonify({"error": "upstream_boxscore_failed", "gameId": game_id, "detail": str(e)}), 502

    game = (box or {}).get("game") or {}

    if not isinstance(game, dict) or not game:
        slim = {"gameId": game_id, "status": None, "scores": None, "players": {"home": [], "away": []}}
        etag = stable_hash(slim)
        resp = make_response(jsonify(slim), 200)
        resp.headers["ETag"] = etag
        resp.headers["Cache-Control"] = "public, max-age=8"
        return resp

    h = game.get("homeTeam") or {}
    a = game.get("awayTeam") or {}

    period_raw = game.get("period")
    period_current = period_raw.get("current") if isinstance(period_raw, dict) else period_raw

    def player_snap(team):
        out = []
        for p in (team.get("players") or []):
            stats = p.get("statistics") or {}
            out.append({
                "playerId": p.get("personId"),
                "jerseyNum": p.get("jerseyNum"),
                "name": p.get("name"),
                "pts": stats.get("points"),
                "oncourt": p.get("oncourt"),  # Added for lineup tracking
            })
        return out

    status_text = game.get("gameStatusText", "")
    is_final = status_text.lower() == "final"

    slim = {
        "gameId": game_id,
        "status": {
            "gameStatusText": status_text,
            "gameClock": game.get("gameClock"),
            "period": period_current,
        },
        "scores": {
            "home": {"teamId": h.get("teamId"), "triCode": h.get("teamTricode"), "score": h.get("score")},
            "away": {"teamId": a.get("teamId"), "triCode": a.get("teamTricode"), "score": a.get("score")},
        },
        "players": {"home": player_snap(h), "away": player_snap(a)},
    }

    etag = stable_hash(slim)
    
    inm = request.headers.get("If-None-Match")
    if inm and inm == etag:
        return ("", 304)

    resp = make_response(jsonify(slim), 200)
    resp.headers["ETag"] = etag
    
    if is_final:
        resp.headers["Cache-Control"] = "public, max-age=3600"
    else:
        resp.headers["Cache-Control"] = "public, max-age=8, stale-while-revalidate=20"
    
    return resp

# Cleanup task - run periodically to prevent memory bloat
def cleanup_cache():
    while True:
        time.sleep(300)  # Every 5 minutes
        CACHE.cleanup(max_age=7200)  # Remove entries older than 2 hours

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_cache, daemon=True)
cleanup_thread.start()

# ---------------- boot ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
