from flask import Flask, request, jsonify
from flask_cors import CORS
from nba_api.stats import endpoints
from nba_api.stats.library.http import NBAStatsHTTP  
from datetime import datetime
import requests, time

app = Flask(__name__)

# CORS(app, resources={
#     r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}
# })
CORS(app)

NBA_OFFICIAL_BASE_URL = 'https://cdn.nba.com'

STATS_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "Accept": "application/json, text/plain, */*",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
}

def _empty_scoreboard():
    # include keys your UI uses
    return {
        "GameHeader": [],
        "LineScore": [],
        "Available": [],
        "SeriesStandings": [],
        "LastMeeting": [],
        "EastConfStandingsByDay": [],
        "WestConfStandingsByDay": [],
        "TeamLeaders": [],
        "WinProbability": [],
        "TicketLinks": [],
    }

def _rows_from(rs):
    if not rs:
        return []
    headers = rs.get("headers", [])
    return [dict(zip(headers, row)) for row in rs.get("rowSet", [])]

def _extract_safe_from_resultsets(result_sets):
    """Builds a safe scoreboard dict from a resultSets list (missing tables -> [])."""
    sets = {rs.get("name"): rs for rs in result_sets or []}
    return {
        "GameHeader": _rows_from(sets.get("GameHeader")),
        "LineScore": _rows_from(sets.get("LineScore")),
        "Available": _rows_from(sets.get("Available")),
        "SeriesStandings": _rows_from(sets.get("SeriesStandings")),
        "LastMeeting": _rows_from(sets.get("LastMeeting")),
        "EastConfStandingsByDay": _rows_from(sets.get("EastConfStandingsByDay")),
        "WestConfStandingsByDay": _rows_from(sets.get("WestConfStandingsByDay")),
        "TeamLeaders": _rows_from(sets.get("TeamLeaders")),
        "WinProbability": _rows_from(sets.get("WinProbability")),
        "TicketLinks": _rows_from(sets.get("TicketLinks")),
    }

def _extract_safe(sb: endpoints.ScoreboardV2):
    """Safe extractor using nba_api object (no KeyError even if sets are missing)."""
    raw = sb.get_dict()  # raw payload with "resultSets"
    return _extract_safe_from_resultsets(raw.get("resultSets"))

def _scoreboard_via_http(nba_date: str) -> dict:
    """Fallback within nba_api using its HTTP client; returns the same safe shape."""
    http = NBAStatsHTTP()
    # Ensure robust headers (NBA CDN sometimes needs them)
    http.headers.update(STATS_HEADERS)
    resp = http.send_api_request(
        endpoint='scoreboardv2',
        parameters={"GameDate": nba_date, "LeagueID": "00", "DayOffset": "0"},
        proxy=None,
        timeout=10
    )
    j = resp.get_json()
    return _extract_safe_from_resultsets(j.get("resultSets"))

@app.route('/games', methods=['GET'])
def games():
    raw_date = request.args.get("date", "")
    if not raw_date:
        return jsonify(_empty_scoreboard()), 200

    try:
        nba_date = datetime.strptime(raw_date, "%d-%m-%Y").strftime("%m/%d/%Y")
    except ValueError:
        return jsonify(_empty_scoreboard()), 200

    # 1) Try high-level endpoint
    try:
        sb = endpoints.ScoreboardV2(
            game_date=nba_date,
            headers=STATS_HEADERS,
            timeout=10
        )
        data = _extract_safe(sb)  # uses sb.get_dict()
        # Optional: if BOTH GameHeader and LineScore are empty, try fallback anyway
        if not data["GameHeader"] and not data["LineScore"]:
            raise RuntimeError("Empty result from ScoreboardV2; retry via HTTP")
        return jsonify(data), 200

    # 2) On ANY error, try NBAStatsHTTP fallback
    except Exception as e1:
        app.logger.warning("ScoreboardV2 failed (%s): %s  -> trying HTTP fallback",
                           nba_date, repr(e1))
        try:
            data = _scoreboard_via_http(nba_date)
            return jsonify(data), 200
        except Exception as e2:
            app.logger.exception("HTTP fallback failed for %s: %s", nba_date, repr(e2))
            return jsonify(_empty_scoreboard()), 200


# @app.route('/games', methods=['GET'])
# def games():
#     raw_date = request.args.get("date", "")
#     print("received date param:", raw_date)

#     # Validate presence
#     if not raw_date:
#         return jsonify({
#             "error": "Please provide a date (DD-MM-YYYY)",
#             "date_received": raw_date,
#             "data": _empty_scoreboard()
#         }), 200   # 200 so frontend can render "No Games"

#     # Validate format DD-MM-YYYY and convert to MM/DD/YYYY for nba_api
#     try:
#         dt = datetime.strptime(raw_date, "%d-%m-%Y")
#         nba_date = dt.strftime("%m/%d/%Y")
#     except ValueError:
#         return jsonify({
#             "error": "Invalid date format. Use DD-MM-YYYY",
#             "date_received": raw_date,
#             "data": _empty_scoreboard()
#         }), 200

#     # Call nba_api and return the NORMALIZED DICT on success
#     try:
#         scoreboard = endpoints.ScoreboardV2(game_date=nba_date)
#         # This is your original “big JSON object”:
#         return jsonify(scoreboard.get_normalized_dict()), 200
#     except Exception as e:
#         # Keep your detailed error object, but don't 502 the UI
#         return jsonify({
#             "error": "nba_api failed",
#             "type": e.__class__.__name__,
#             "message": str(e),
#             "date_received": raw_date,
#             "nba_date": nba_date,
#             "data": _empty_scoreboard()
#         }), 200
  

@app.route('/box-score/<game_id>')
def box_score(game_id):
  try:
    box_score = endpoints.BoxScoreTraditionalV2(game_id=game_id)
    return jsonify(box_score.get_normalized_dict())
  except Exception as e:
        # show useful info so you know why it failed
        return jsonify({
            "error": "nba_api failed",
            "type": e.__class__.__name__,
            "message": str(e),
        }), 502

@app.route('/team-info/<team_id>')
def team_info(team_id):
  team = endpoints.TeamInfoCommon(team_id=team_id)
  return jsonify(team.get_normalized_dict())

@app.route('/player-info/<player_id>')
def player_info(player_id):
  id_endpoint = f'{NBA_OFFICIAL_BASE_URL}/headshots/nba/latest/1040x760/{player_id}.png'
  return id_endpoint

if __name__ == "__main__":
  app.run(host="0.0.0.0", port=8000, debug=True)



# {
#   "GameHeader": [
#     {
#       "GAME_ID": "0022500001",
#       "GAME_DATE_EST": "2025-10-20T00:00:00",
#       "GAME_STATUS_TEXT": "Final",
#       "HOME_TEAM_ID": 1610612747,
#       "VISITOR_TEAM_ID": 1610612744
#     },
#     {
#       "GAME_ID": "0022500002",
#       "GAME_DATE_EST": "2025-10-20T00:00:00",
#       "GAME_STATUS_TEXT": "7:30 PM ET",
#       "HOME_TEAM_ID": 1610612742,
#       "VISITOR_TEAM_ID": 1610612761
#     }
#   ],
#   "LineScore": [...],
#   "TeamLeaders": [...],
#   "LastMeeting": [...]
# }

# print(dir(endpoints))