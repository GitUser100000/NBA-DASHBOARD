// dataService.js
import {
  getTodayScoreboard,
  getGameIdsForDate,
  getBoxscore,
  getPlayByPlay,
  getTeamLogoUrl,
  getPlayerHeadshotUrl,
  pollGame
} from "./api";

// ---------- Home cards ----------
// dateISO: 'YYYY-MM-DD' or undefined for "today"
export async function getGameCardData(dateISO) {
  // CASE A: Today → single fast call
  if (!dateISO) {
    const sb = await getTodayScoreboard();
    const games = sb?.scoreboard?.games ?? [];
    return games.map(g => ({
      gameId: g.gameId,
      statusText: g.gameStatusText,        // "Final" or "7:30 PM ET"
      gameClock: g.gameClock,              // e.g. "PT05M31.00S"
      period: g.period,                    // number (if live)
      startDate: sb?.scoreboard?.gameDate, // YYYY-MM-DD
      arena: g?.arena?.name ?? null,
      city: g?.arena?.city ?? null,

      home: {
        teamId: g.homeTeam.teamId,
        triCode: g.homeTeam.teamTricode,
        score: g.homeTeam.score,
        logo: getTeamLogoUrl(g.homeTeam.teamId),
      },
      away: {
        teamId: g.awayTeam.teamId,
        triCode: g.awayTeam.teamTricode,
        score: g.awayTeam.score,
        logo: getTeamLogoUrl(g.awayTeam.teamId),
      },
    }));
  }

  // CASE B: Not today → get gameIds via schedule, then fetch boxscores
  const { gameIds = [] } = await getGameIdsForDate(dateISO);
  if (!gameIds.length) return [];

  const boxes = await Promise.allSettled(gameIds.map(id => getBoxscore(id)));

  return boxes
    .filter(b => b.status === "fulfilled")
    .map(b => b.value?.game)
    .filter(Boolean)
    .map(game => {
      const h = game.homeTeam ?? {};
      const a = game.awayTeam ?? {};
      return {
        gameId: game.gameId,
        statusText: game.gameStatusText,    // "Final" or tip time
        gameClock: game.gameClock ?? null,
        period: (typeof game.period === "object" ? game.period?.current : game.period) ?? null,
        startDate: dateISO,
        arena: game?.arena?.arenaName ?? null,
        city: game?.arena?.arenaCity ?? null,

        home: {
          teamId: h.teamId,
          triCode: h.teamTricode,
          score: h.score,
          logo: getTeamLogoUrl(h.teamId),
        },
        away: {
          teamId: a.teamId,
          triCode: a.teamTricode,
          score: a.score,
          logo: getTeamLogoUrl(a.teamId),
        },
      };
    });
}

// ---------- Game dashboard (one-shot build) ----------
export async function getDashboardData(gameId) {
  // Grab raw boxscore + pbp
  const [box, pbp] = await Promise.all([
    getBoxscore(gameId),
    getPlayByPlay(gameId).catch(() => null), // PBP might be empty pregame
  ]);

  const g = box?.game ?? {};
  const h = g.homeTeam ?? {};
  const a = g.awayTeam ?? {};
  const actions = pbp?.game?.actions ?? [];

  const normalizePlayers = team =>
    (team.players ?? []).map(p => {
      const s = p.statistics ?? {};
      return {
        playerId: p.personId,
        jerseyNum: p.jerseyNum,
        name: p.name,
        position: p.position,
        starter: p.starter === "1",
        oncourt: p.oncourt === "1",
        stats: {
          pts: s.points,
          reb: s.reboundsTotal ?? (s.rebounds || null),
          ast: s.assists,
          stl: s.steals,
          blk: s.blocks,
          tov: s.turnovers,
          pf: s.foulsPersonal,
          fgm: s.fieldGoalsMade, fga: s.fieldGoalsAttempted, fgPct: s.fieldGoalsPercentage,
          ftm: s.freeThrowsMade, fta: s.freeThrowsAttempted, ftPct: s.freeThrowsPercentage,
          tpm: s.threePointersMade, tpa: s.threePointersAttempted, tpPct: s.threePointersPercentage,
          plusMinus: s.plusMinusPoints,
          minutes: s.minutes ?? s.minutesCalculated,
        },
        headshot: getPlayerHeadshotUrl(p.personId),
      };
    });

  const periodCurrent =
    typeof g.period === "object" ? g.period?.current : g.period;

  return {
    meta: {
      gameId,
      statusText: g.gameStatusText,
      gameClock: g.gameClock,
      period: periodCurrent,
      attendance: g.attendance,
      arena: {
        name: g?.arena?.arenaName,
        city: g?.arena?.arenaCity,
        state: g?.arena?.arenaState,
        tz: g?.arena?.arenaTimezone,
      },
    },
    teams: {
      home: {
        teamId: h.teamId,
        triCode: h.teamTricode,
        score: h.score,
        logo: getTeamLogoUrl(h.teamId),
        periods: h.periods ?? [],
        totals: h.statistics ?? {},
        players: normalizePlayers(h),
      },
      away: {
        teamId: a.teamId,
        triCode: a.teamTricode,
        score: a.score,
        logo: getTeamLogoUrl(a.teamId),
        periods: a.periods ?? [],
        totals: a.statistics ?? {},
        players: normalizePlayers(a),
      },
    },
    // Raw PBP so you can build lineups/timeline if you want
    playByPlay: actions,
  };
}

// ---------- Immutable live update from /poll ----------
/**
 * Immutably merge slim /poll payload into a dashboard object.
 * Returns a NEW dashboard object when something changed.
 *
 * @param {object} dashboard - object from getDashboardData(gameId)
 * @param {string} gameId
 * @param {string|undefined} prevEtag
 * @returns {{ etag: string|undefined, dashboard: object, changed: boolean, final: boolean, status: number }}
 */
export async function getUpdatedDashboard(dashboard, gameId, prevEtag) {
  if (!dashboard || !dashboard.teams) {
    const res = await pollGame(gameId, prevEtag);
    return { etag: res.etag, dashboard, changed: false, final: false, status: res.status };
  }

  const res = await pollGame(gameId, prevEtag);

  // No change
  if (res.status === 304) {
    return { etag: prevEtag, dashboard, changed: false, final: false, status: 304 };
  }
  // Error or empty data
  if (res.status !== 200 || !res.data) {
    return { etag: res.etag, dashboard, changed: false, final: false, status: res.status };
  }

  const slim = res.data;
  let changed = false;

  // Clone shells
  let next = { ...dashboard, meta: { ...dashboard.meta }, teams: { ...dashboard.teams } };

  // ---- status / clock / period ----
  if (slim.status) {
    const m = { ...next.meta };
    if (slim.status.gameStatusText !== undefined && m.statusText !== slim.status.gameStatusText) {
      m.statusText = slim.status.gameStatusText; changed = true;
    }
    if (slim.status.gameClock !== undefined && m.gameClock !== slim.status.gameClock) {
      m.gameClock = slim.status.gameClock; changed = true;
    }
    if (slim.status.period !== undefined && m.period !== slim.status.period) {
      m.period = slim.status.period; changed = true;
    }
    next.meta = m;
  }

  // ---- team scores ----
  const home = { ...next.teams.home };
  const away = { ...next.teams.away };
  if (slim.scores?.home?.score !== undefined && home.score !== slim.scores.home.score) {
    home.score = slim.scores.home.score; changed = true;
  }
  if (slim.scores?.away?.score !== undefined && away.score !== slim.scores.away.score) {
    away.score = slim.scores.away.score; changed = true;
  }

  // ---- player points ----
  const ptsHome = new Map((slim.players?.home || []).map(p => [p.playerId, p.pts]));
  const ptsAway = new Map((slim.players?.away || []).map(p => [p.playerId, p.pts]));

  const updPlayers = (playersArr, ptsMap) =>
    (playersArr || []).map(p => {
      const newPts = ptsMap.get(p.playerId);
      if (newPts === undefined || (p.stats?.pts ?? null) === newPts) return p;
      changed = true;
      return { ...p, stats: { ...p.stats, pts: newPts } };
    });

  home.players = updPlayers(home.players, ptsHome);
  away.players = updPlayers(away.players, ptsAway);

  next.teams = { home, away };

  const final = slim.status?.gameStatusText === "Final";

  return { etag: res.etag, dashboard: next, changed, final, status: 200 };
}
