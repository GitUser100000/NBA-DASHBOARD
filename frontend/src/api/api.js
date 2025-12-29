// api.js
import axios from "axios";

// Development uses local server, production uses VITE_API_URL env var
const isDevelopment = import.meta.env.DEV;

export const SERVER_BASE_URL = isDevelopment 
  ? "http://127.0.0.1:8000" 
  : import.meta.env.VITE_API_URL || "https://nba-dashboard-594w.onrender.com";

// Reuse a configured axios instance
const http = axios.create({
  baseURL: SERVER_BASE_URL,
  timeout: 15000,
});

// ---------- SCOREBOARD ----------

// GET /scoreboard  (today's live scoreboard JSON from CDN)
export async function getTodayScoreboard() {
  const { data } = await http.get("/scoreboard");
  return data; // { meta, scoreboard: { gameDate, games: [...], ... } }
}

// GET /scoreboard?date=YYYY-MM-DD -> { date, gameIds: [...] } via schedule
export async function getGameIdsForDate(dateISO /* 'YYYY-MM-DD' */) {
  const { data } = await http.get("/scoreboard", { params: { date: dateISO } });
  return data; // { date, gameIds: [...] }
}

// ---------- GAME DATA ----------

// GET /game/:gameId/boxscore  (raw boxscore JSON)
export async function getBoxscore(gameId) {
  const { data } = await http.get(`/game/${gameId}/boxscore`);
  return data; // { game: {...}, meta: {...} }
}

// GET /game/:gameId/pbp  (raw play-by-play JSON)
export async function getPlayByPlay(gameId) {
  const { data } = await http.get(`/game/${gameId}/pbp`);
  return data; // { game: { actions: [...] }, meta: {...} }
}

// ---------- POLL (ETag-aware) ----------
// GET /poll/game/:gameId  -> slim snapshot with ETag (304 when unchanged)
export async function pollGame(gameId, prevEtag /* string or undefined */) {
  const headers = prevEtag ? { "If-None-Match": prevEtag } : {};
  try {
    const res = await http.get(`/poll/game/${gameId}`, { headers, validateStatus: () => true });
    if (res.status === 304) {
      return { status: 304, etag: prevEtag, data: null };
    }
    if (res.status >= 200 && res.status < 300) {
      return { status: 200, etag: res.headers.etag, data: res.data };
    }
    // 502 (upstream failure) or other – surface minimal error
    return { status: res.status, etag: res.headers.etag, data: res.data };
  } catch (err) {
    // Network/timeout
    return { status: 0, etag: prevEtag, data: null, error: err?.message || String(err) };
  }
}

// ---------- ASSETS (redirect helpers) ----------
// These routes 302 to the actual CDN assets, so you can use them directly in <img src="...">

export function getTeamLogoUrl(teamId) {
  return `${SERVER_BASE_URL}/assets/team-logo/${teamId}`;
}

export function getPlayerHeadshotUrl(playerId, size = "260x190") {
  // server proxies 260x190; if you want 1040x760, add another server route or call CDN directly
  return `${SERVER_BASE_URL}/assets/player-headshot/${playerId}`;
}

// ---------- HEALTH ----------

export async function pingHealth() {
  const { data } = await http.get("/health");
  return data; // { ok: true }
}
