import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDashboardData, getUpdatedDashboard } from "../api/data";
import MyDashboardHeader from "../components/MyDashBoardHeader";
import MyScoreboard from "../components/MyScoreboard";
import MyPlayerList from "../components/MyPlayerList";

export default function GameDashboard() {
  const { gameId } = useParams();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  // Initial load
  useEffect(() => {
    if (!gameId) return;
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setErr(false);
        console.log("[GameDashboard] Initial load start", { gameId });

        const data = await getDashboardData(gameId);

        if (!ignore) {
          console.log("[GameDashboard] Initial load success", data);
          setDashboardData(data ?? null);
        }
      } catch (e) {
        if (!ignore) {
          console.error("[GameDashboard] Initial load error", e);
          setErr(true);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          console.log("[GameDashboard] Initial load done");
        }
      }
    })();

    return () => {
      ignore = true;
      console.log("[GameDashboard] Initial load cleanup (unmounted or gameId changed)");
    };
  }, [gameId]);

  // Poll every 15s AFTER each request finishes (no overlaps)
  useEffect(() => {
    if (!gameId || !dashboardData) {
      if (!gameId) console.log("[Poll] Skipped: no gameId");
      if (!dashboardData) console.log("[Poll] Skipped: no dashboardData yet");
      return;
    }

    let stopped = false;
    let timerId = null;
    let inFlight = false;

    const tick = async () => {
      if (stopped || inFlight) {
        console.log("[Poll] Tick ignored", { stopped, inFlight });
        return;
      }
      inFlight = true;
      console.log("[Poll] Tick start", {
        gameId,
        hasDashboard: !!dashboardData,
      });

      try {
        // Ignoring ETags for now: pass undefined
        const res = await getUpdatedDashboard(dashboardData, gameId, undefined);
        if (stopped) {
          console.log("[Poll] Response received after stop, ignoring");
          return;
        }

        console.log("[Poll] Response", {
          status: res?.status,
          changed: res?.changed,
          final: res?.final,
          etag: res?.etag,
        });

        if (res?.status === 200 && res?.changed) {
          console.log("[Poll] Applying dashboard update");
          setDashboardData(res.dashboard);
        }

        if (res?.final) {
          console.log("[Poll] Game is final — stopping polling");
          return;
        }

        // Schedule next run
        timerId = setTimeout(() => {
          console.log("[Poll] Scheduling next tick in 15s");
          tick();
        }, 15000);
      } catch (e) {
        if (!stopped) {
          console.error("[Poll] Error during tick", e);
          // optional: setErr(true);
        }
      } finally {
        inFlight = false;
      }
    };

    console.log("[Poll] Effect start (will tick now)", { gameId });
    tick();

    return () => {
      stopped = true;
      if (timerId) {
        clearTimeout(timerId);
        console.log("[Poll] Cleanup: cleared pending timeout");
      }
      console.log("[Poll] Effect cleanup (unmounted or dependencies changed)");
    };
  }, [gameId, dashboardData]);

  if (!gameId) return <p>No Game Selected</p>;
  if (loading) return <p>Loading...</p>;
  if (err) return <p>There was an error fetching the dashboard data</p>;
  if (!dashboardData) return <p>No Dashboard Data Available</p>;

  const homeTeam = dashboardData?.teams?.home ?? {};
  const awayTeam = dashboardData?.teams?.away ?? {};

  const headerData = {
    homeTeam: homeTeam?.triCode ?? "",
    awayTeam: awayTeam?.triCode ?? "",
    homeLogo: homeTeam?.logo ?? "",
    awayLogo: awayTeam?.logo ?? "",
    location: dashboardData?.meta?.arena?.city ?? "",
    state: dashboardData?.meta?.arena?.state ?? ""
  };

  const scoreboardData = {
    homeScore: homeTeam?.score ?? "",
    awayScore: awayTeam?.score ?? "",
    gameClock: dashboardData?.meta?.gameClock ?? "",
    period: dashboardData?.meta?.period ?? "",
    status: dashboardData?.meta?.statusText ?? ""
  };

  const playerListData = {
    homePlayerList: homeTeam?.players ?? {},
    awayPlayerList: awayTeam?.players ?? {}
  }

  console.log("[Render] Header data", headerData);
  return (
    <div>
      <MyDashboardHeader headerData={headerData}/>
      <div className="dashboard-content">
        <MyPlayerList playerlist={playerListData.homePlayerList}/>
        <MyScoreboard scoreBoardData={scoreboardData}/>
        {/*<MyPBPContainer />*/}
        <MyPlayerList playerlist={playerListData.awayPlayerList}/>
      </div>
    </div>
  );
};

// {meta: {…}, teams: {…}, playByPlay: Array(556)}
// meta
// : 
// {gameId: '0022400548', statusText: 'Final', gameClock: 'PT00M00.00S', period: 4, attendance: 14386, …}
// playByPlay
// : 
// (556) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
// teams
// : 
// away
// : 
// {teamId: 1610612750, triCode: 'MIN', score: 120, logo: 'http://127.0.0.1:8000/assets/team-logo/1610612750', periods: Array(4), …}
// home
// : 
// {teamId: 1610612764, triCode: 'WAS', score: 106, logo: 'http://127.0.0.1:8000/assets/team-logo/1610612764', periods: Array(4), …}
// [[Prototype]]
// : 
// Object
// [[Prototype]]
// : 
// Object