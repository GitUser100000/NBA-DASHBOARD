# test_endpoints.py
import time, json, requests, os
from pathlib import Path

BASE = "http://127.0.0.1:8000"
OUT = Path("./_api_dumps"); OUT.mkdir(exist_ok=True)

def dump(name: str, obj: dict):
    """Write full JSON to disk and return a message for the console."""
    p = OUT / f"{name}.json"
    with p.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    return f"(full JSON saved to {p})"

def find_paths(obj, targets={"points","score","gameClock","gameStatusText"}, path="$", found=None, depth=0, max_hits=50):
    """
    Recursively walk the object and record paths to target keys.
    Prints up to max_hits matches. Handy to *discover* structure.
    """
    if found is None: found = []
    if len(found) >= max_hits: return found
    if isinstance(obj, dict):
        for k, v in obj.items():
            new_path = f"{path}['{k}']"
            if k in targets:
                val_preview = v if not isinstance(v, (dict, list)) else "(object)"
                found.append((new_path, val_preview))
                if len(found) >= max_hits: return found
            find_paths(v, targets, new_path, found, depth+1, max_hits)
    elif isinstance(obj, list):
        for i, v in enumerate(obj[:1000]):  # cap to avoid massive walks
            new_path = f"{path}[{i}]"
            find_paths(v, targets, new_path, found, depth+1, max_hits)
    return found

def main():
    # 1) Today’s scoreboard (may be 0 off-season)
    r = requests.get(f"{BASE}/scoreboard", timeout=15)
    r.raise_for_status()
    sb = r.json()
    print("[scoreboard] keys:", list(sb.keys()))
    games = sb.get("scoreboard", {}).get("games", [])
    print("  games today:", len(games))
    print(" ", dump("scoreboard_today", sb))

    gid = None
    if games:
        gid = games[0]["gameId"]
        print("  using gameId from today:", gid)
    else:
        # Fallback: pick a known in-season date (adjust if you like)
        date = "2025-01-15"
        r2 = requests.get(f"{BASE}/scoreboard?date={date}", timeout=15)
        r2.raise_for_status()
        gids = r2.json().get("gameIds", [])
        print(f"  schedule {date} -> {len(gids)} games")
        if gids:
            gid = gids[0]
            print("  using gameId from schedule:", gid)
        else:
            print("No gameId available (off-season or schedule missing). Stopping.")
            return

    # 2) Box score (raw)
    r = requests.get(f"{BASE}/game/{gid}/boxscore", timeout=15)
    r.raise_for_status()
    box = r.json()
    print("[boxscore] keys:", list(box.keys()))
    print(" ", dump(f"boxscore_{gid}", box))

    game = box.get("game", {})
    ht = game.get("homeTeam", {}) or {}
    at = game.get("awayTeam", {}) or {}
    print(f"  matchup: {at.get('teamTricode')} @ {ht.get('teamTricode')}")
    print(f"  score  : {at.get('score')} - {ht.get('score')}")
    print("  home players:", len(ht.get("players", []) or []), " | away players:", len(at.get("players", []) or []))

    # Print starters with points/REB/AST so you see exact paths/keys
    def show_starters(team, label):
        print(f"  {label} starters:")
        starters = [p for p in (team.get("players") or []) if p.get("starter") == "1"]
        for p in starters:
            stats = p.get("statistics") or {}
            print(f"    #{p.get('jerseyNum'):>2} {p.get('name'):<20}  PTS={stats.get('points')}  REB={stats.get('reboundsTotal')}  AST={stats.get('assists')}")
    show_starters(at, "AWAY")
    show_starters(ht, "HOME")

    # Auto-find paths for key fields in boxscore JSON
    print("\n  PATHS to interesting fields in boxscore (points, score, gameClock, gameStatusText):")
    for path, val in find_paths(box, targets={"points","score","gameClock","gameStatusText"}):
        print("   ", path, "=>", val)

    # 3) Poll (ETag/304 test)
    r = requests.get(f"{BASE}/poll/game/{gid}", timeout=15)
    if r.status_code == 200:
        slim = r.json()
        etag = r.headers.get("ETag")
        print("\n[poll] status:", slim.get("status"))
        print("  ETag:", etag)
        print(" ", dump(f"poll_{gid}", slim))
        # Demonstrate 304
        time.sleep(1.2)
        r2 = requests.get(f"{BASE}/poll/game/{gid}", headers={"If-None-Match": etag}, timeout=15)
        if r2.status_code == 304:
            print("  [poll] 304 Not Modified as expected")
        else:
            print("  [poll] changed -> 200")
            print(" ", dump(f"poll_{gid}_second", r2.json()))
    else:
        print("[poll] error:", r.status_code, r.text)

    # 4) Play-by-play (raw)
    r = requests.get(f"{BASE}/game/{gid}/pbp", timeout=20)
    r.raise_for_status()
    pbp = r.json()
    actions = (pbp.get("game") or {}).get("actions", []) or []
    print(f"\n[pbp] events: {len(actions)}")
    print(" ", dump(f"pbp_{gid}", pbp))
    # Show first 3 events inline so you see shape immediately
    print("  first 3 events:")
    for a in actions[:3]:
        print("   -", json.dumps(a, indent=2))

if __name__ == "__main__":
    main()
