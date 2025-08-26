// test_all.js
// Node test runner that exercises your Flask API and prints FULL JSON for reference.
//
// Endpoints tested:
//  - GET /scoreboard
//  - GET /scoreboard?date=YYYY-MM-DD   (fallback date if needed)
//  - GET /game/:gameId/boxscore
//  - GET /game/:gameId/pbp
//  - GET /poll/game/:gameId   (and a second call expecting 304)
//
// Usage:
//   node test_all.js
//   node test_all.js 2025-01-15          # force a specific date
//   node test_all.js 2025-01-15 0022400554  # force specific gameId
//
// Make sure your Flask server is running at BASE.

import axios from "axios";

const BASE = "http://127.0.0.1:8000";

// optional CLI args
const argDate = process.argv[2];     // YYYY-MM-DD
const argGameId = process.argv[3];   // e.g., 0022400554

async function prettyPrint(label, data) {
  console.log(`\n=== ${label} (FULL JSON) ===`);
  console.log(JSON.stringify(data, null, 2));
}

async function getGameIdFromToday() {
  const sb = await axios.get(`${BASE}/scoreboard`, { timeout: 15000 });
  await prettyPrint("GET /scoreboard", sb.data);
  const games = sb.data?.scoreboard?.games ?? [];
  if (games.length) {
    console.log(`\n-> using first gameId from today: ${games[0].gameId}`);
    return games[0].gameId;
  }
  return null;
}

async function getGameIdFromDate(dateISO) {
  const res = await axios.get(`${BASE}/scoreboard`, {
    params: { date: dateISO },
    timeout: 15000,
  });
  await prettyPrint(`GET /scoreboard?date=${dateISO}`, res.data);
  const ids = res.data?.gameIds ?? [];
  if (ids.length) {
    console.log(`\n-> using first gameId from ${dateISO}: ${ids[0]}`);
    return ids[0];
  }
  return null;
}

async function main() {
  try {
    console.log(">>> NBA API end-to-end test starting...\nBASE =", BASE);

    // Decide a gameId
    let gameId = argGameId || null;

    if (!gameId) {
      // Try today first
      gameId = await getGameIdFromToday();

      // If no games today, try the provided date or a fallback list
      if (!gameId) {
        const datesToTry = argDate
          ? [argDate]
          : ["2025-01-15", "2025-03-10", "2024-12-25"]; // adjust as desired
        for (const d of datesToTry) {
          gameId = await getGameIdFromDate(d);
          if (gameId) break;
        }
      }
    }

    if (!gameId) {
      console.log("\nNo gameId available (off-season or schedule missing). Exiting.");
      return;
    }

    // 1) Boxscore (raw)
    const box = await axios.get(`${BASE}/game/${gameId}/boxscore`, { timeout: 20000 });
    await prettyPrint(`GET /game/${gameId}/boxscore`, box.data);
    const g = box.data?.game || {};
    console.log(
      `\nSummary: ${g?.awayTeam?.teamTricode} @ ${g?.homeTeam?.teamTricode}  ` +
      `${g?.awayTeam?.score} - ${g?.homeTeam?.score}  status=${g?.gameStatusText}  clock=${g?.gameClock}`
    );

    // 2) Play-by-Play (raw)
    const pbp = await axios.get(`${BASE}/game/${gameId}/pbp`, { timeout: 25000 });
    await prettyPrint(`GET /game/${gameId}/pbp`, pbp.data);
    const actions = pbp.data?.game?.actions || [];
    console.log(`\nPBP events: ${actions.length}`);

    // 3) Poll (slim) and verify 304
    const poll1 = await axios.get(`${BASE}/poll/game/${gameId}`, { timeout: 15000 });
    await prettyPrint(`GET /poll/game/${gameId}`, poll1.data);
    const etag = poll1.headers?.etag;
    console.log("ETag:", etag);

    // second poll with If-None-Match to check 304
    const poll2 = await axios.get(`${BASE}/poll/game/${gameId}`, {
      headers: etag ? { "If-None-Match": etag } : {},
      validateStatus: () => true, // let 304 pass without throwing
      timeout: 15000,
    });
    if (poll2.status === 304) {
      console.log("\nSecond poll -> 304 Not Modified (as expected)");
    } else {
      console.log(`\nSecond poll -> ${poll2.status} (printing payload)`);
      await prettyPrint(`GET /poll/game/${gameId} (2nd)`, poll2.data);
    }

    console.log("\n>>> Done. All endpoints exercised and JSON printed.");
  } catch (err) {
    if (err.response) {
      console.error(
        `\nHTTP ${err.response.status} from ${err.config?.url}\nPayload:\n`,
        JSON.stringify(err.response.data, null, 2)
      );
    } else {
      console.error("\nError during test:", err.message);
    }
  }
}

main();
