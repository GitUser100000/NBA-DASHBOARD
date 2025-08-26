# test_nba_cdn_smoke.py
import time
import datetime as dt
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# -------------------- Config --------------------
SLEEP = 0.5
TODAY = dt.date.today()

# Several known in-season dates to almost guarantee matches
PAST_DATES = [
    dt.date(2024, 12, 25),
    dt.date(2025, 1, 15),
    dt.date(2025, 3, 10),
]

# Try multiple schedule versions; the suffix (_12, _11, ...) changes periodically
SCHEDULE_CANDIDATES = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

UA = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/115.0.0.0 Safari/537.36"),
    "Accept": "application/json,text/plain,*/*",
    "Origin": "https://www.nba.com",
    "Referer": "https://www.nba.com/",
}

# -------------------- CDN Endpoints --------------------
SCOREBOARD_TODAY = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
BOX_LIVE        = "https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gid}.json"
PBP_LIVE        = "https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{gid}.json"
SCHEDULE_FMT    = "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_{v}.json"

TEAM_LOGO       = "https://cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg"
PLAYER_HEADSHOT = "https://cdn.nba.com/headshots/nba/latest/{size}/{playerId}.png"  # sizes: 260x190, 1040x760

# -------------------- HTTP session with retries --------------------
def browser_session():
    s = requests.Session()
    s.headers.update(UA)
    retry = Retry(
        total=5,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "HEAD"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s

S = browser_session()

# -------------------- Helpers --------------------
def head_ok(url: str) -> bool:
    try:
        r = S.head(url, timeout=8, allow_redirects=True)
        if 200 <= r.status_code < 300:
            return True
        r = S.get(url, timeout=8, stream=True)
        return 200 <= r.status_code < 300
    except Exception:
        return False

def load_schedule_json():
    """Try multiple scheduleLeagueV2 versions until one returns gameDates."""
    last_err = None
    for v in SCHEDULE_CANDIDATES:
        url = SCHEDULE_FMT.format(v=v)
        try:
            r = S.get(url, timeout=20); r.raise_for_status()
            js = r.json()
            if js.get("leagueSchedule", {}).get("gameDates"):
                return js, url
        except Exception as e:
            last_err = e
    if last_err:
        raise last_err
    raise RuntimeError("No schedule file found among candidates.")

def parse_schedule_date(raw: str):
    """
    scheduleLeagueV2 uses 'MM/DD/YYYY HH:MM:SS'. Return a date() or None.
    """
    if not raw:
        return None
    try:
        mmddyyyy = raw.split(" ")[0]  # "10/04/2024"
        return dt.datetime.strptime(mmddyyyy, "%m/%d/%Y").date()
    except Exception:
        return None

def get_game_ids_for_date(schedule_json, date_iso: str):
    """
    Exact match (no fuzz): return gameIds for YYYY-MM-DD by normalizing schedule dates.
    """
    target = dt.datetime.strptime(date_iso, "%Y-%m-%d").date()
    dates = schedule_json.get("leagueSchedule", {}).get("gameDates", [])
    out = []
    for gd in dates:
        d = parse_schedule_date(gd.get("gameDate", ""))
        if d == target:
            out.extend([g.get("gameId") for g in gd.get("games", []) if g.get("gameId")])
    return out

def get_game_ids_for_date_fuzzy(schedule_json, date_iso: str, span_days=1):
    """
    Fuzzy match: look at target day ± span_days (to cover timezone/tip-off edge cases).
    """
    base = dt.datetime.strptime(date_iso, "%Y-%m-%d").date()
    all_ids = []
    for delta in range(-span_days, span_days + 1):
        day = (base + dt.timedelta(days=delta)).isoformat()
        all_ids.extend(get_game_ids_for_date(schedule_json, day))
    # unique while preserving order
    seen, out = set(), []
    for gid in all_ids:
        if gid and gid not in seen:
            seen.add(gid); out.append(gid)
    return out

def get_today_scoreboard():
    r = S.get(SCOREBOARD_TODAY, timeout=12); r.raise_for_status()
    return r.json().get("scoreboard", {}).get("games", [])

def get_boxscore_live(game_id: str):
    r = S.get(BOX_LIVE.format(gid=game_id), timeout=12); r.raise_for_status()
    return r.json().get("game", {})

def get_pbp_live(game_id: str):
    r = S.get(PBP_LIVE.format(gid=game_id), timeout=12); r.raise_for_status()
    return r.json().get("game", {}).get("actions", [])

# -------------------- Runner --------------------
if __name__ == "__main__":
    print("=== NBA CDN smoke test (all-in-one) ===")

    # [0] Load schedule (tries multiple versions)
    print("\n[0] Loading season schedule (version fallback)")
    schedule = None
    schedule_url = None
    try:
        schedule, schedule_url = load_schedule_json()
        print(f"  loaded: {schedule_url}")
    except Exception as e:
        print("  ERROR loading schedule:", e)

    # [1] Past date(s) check (with fuzzy ±1 day)
    print("\n[1] Past date(s) check (fuzzy ±1 day)")
    past_gids_all = []
    if schedule:
        for d in PAST_DATES:
            try:
                gids = get_game_ids_for_date_fuzzy(schedule, d.isoformat(), span_days=1)
                past_gids_all.extend(gids)
                print(f"  {d.isoformat()} -> {len(gids)} game(s)")
            except Exception as e:
                print(f"  {d.isoformat()} -> ERROR: {e}")
            time.sleep(SLEEP)
        if past_gids_all:
            print(f"  example past gameId: {past_gids_all[0]}")
        else:
            print("  no gameIds found in schedule for the provided dates (try adding more dates)")
    else:
        print("  skipped (no schedule)")

    # [2] Today live scoreboard (0 is normal in offseason/off-day)
    print(f"\n[2] Scoreboard TODAY {TODAY.isoformat()}")
    today_games = []
    try:
        today_games = get_today_scoreboard()
        print(f"  games: {len(today_games)}")
        if today_games:
            g = today_games[0]
            print(f"  example: {g['awayTeam']['teamTricode']} @ {g['homeTeam']['teamTricode']}  "
                  f"status={g.get('gameStatusText')}  id={g['gameId']}")
        else:
            print("  (no games today is normal in off-days/off-season)")
    except Exception as e:
        print("  ERROR:", e)
    time.sleep(SLEEP)

    # [3] Pick a gameId
    print("\n[3] Pick a gameId")
    chosen_gid = None
    if past_gids_all:
        chosen_gid = past_gids_all[0]
        print(f"  using past gameId: {chosen_gid}")
    elif today_games:
        chosen_gid = today_games[0].get("gameId")
        print(f"  using today gameId: {chosen_gid}")
    else:
        print("  no gameId available (add more past dates if needed)")

    # [4] Box score
    print("\n[4] Box score for chosen game")
    if chosen_gid:
        try:
            box = get_boxscore_live(chosen_gid)
            home, away = box.get("homeTeam", {}), box.get("awayTeam", {})
            print(f"  {away.get('teamTricode','?')} {away.get('score','?')} - "
                  f"{home.get('teamTricode','?')} {home.get('score','?')}  (gameId={chosen_gid})")

            # sample player line
            players = (home.get("players") or []) + (away.get("players") or [])
            if players:
                p = players[0]; line = p.get("statistics", {})
                print(f"  player: {p.get('name')}  #{p.get('jerseyNum')}  "
                      f"PTS={line.get('points')}  REB={line.get('rebounds')}  AST={line.get('assists')}")
            else:
                print("  (no players array yet—pregame or schedule-only)")

            # team logos
            for t in [home, away]:
                if not t: continue
                logo = TEAM_LOGO.format(teamId=t.get("teamId"))
                print(f"  logo {t.get('teamTricode')}: ok={head_ok(logo)}  {logo}")
        except Exception as e:
            print("  ERROR:", e)
    else:
        print("  skipped (no gameId)")

    # [5] Play-by-Play (first 3)
    print("\n[5] Play-by-Play (first 3 events)")
    if chosen_gid:
        try:
            acts = get_pbp_live(chosen_gid)
            print(f"  events: {len(acts)}")
            for a in acts[:3]:
                print(f"   - {a.get('clock')} {a.get('teamTricode')}: {a.get('description')}")
        except Exception as e:
            print("  ERROR:", e)
    else:
        print("  skipped (no gameId)")

    # [6] Asset checks (headshots)
    print("\n[6] Player headshots (examples)")
    for pid in (201939, 2544):  # Curry, LeBron
        url = PLAYER_HEADSHOT.format(size="260x190", playerId=pid)
        print(f"  {pid} photo ok={head_ok(url)}  {url}")

    print("\n=== Done ===")
