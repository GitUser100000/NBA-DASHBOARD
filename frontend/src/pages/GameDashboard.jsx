import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDashboardData, getUpdatedDashboard } from "../api/data";
import MyDashboardHeader from "../components/MyDashboardHeader";
import MyScoreboard from "../components/MyScoreboard";
import MyPlayerList from "../components/MyPlayerList";
import MyPBPContainer from "../components/MyPBPContainer";

// Loading component
const LoadingState = () => (
  <div className="loading-container">
    <div className="loading-spinner" />
    <p className="loading-text">Loading game data...</p>
  </div>
);

// Error component
const ErrorState = ({ onRetry }) => (
  <div className="error-container">
    <h3>⚠️ Error Loading Game</h3>
    <p>There was an error fetching the dashboard data.</p>
    <button className="back-button" onClick={onRetry}>
      Try Again
    </button>
  </div>
);

// No data component
const NoDataState = ({ onBack }) => (
  <div className="error-container">
    <h3>No Data Available</h3>
    <p>No dashboard data available for this game.</p>
    <button className="back-button" onClick={onBack}>
      Back to Games
    </button>
  </div>
);

export default function GameDashboard() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  // Memoized retry handler
  const handleRetry = useCallback(() => {
    setErr(false);
    setLoading(true);
    setDashboardData(null);
  }, []);

  // Memoized back handler
  const handleBack = useCallback(() => {
    navigate('/GamePickerPage');
  }, [navigate]);

  // Initial load
  useEffect(() => {
    if (!gameId) return;
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setErr(false);

        const data = await getDashboardData(gameId);

        if (!ignore) {
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
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [gameId]);

  // Poll every 15s AFTER each request finishes (no overlaps)
  useEffect(() => {
    if (!gameId || !dashboardData) return;

    let stopped = false;
    let timerId = null;
    let inFlight = false;

    const tick = async () => {
      if (stopped || inFlight) return;
      inFlight = true;

      try {
        const res = await getUpdatedDashboard(dashboardData, gameId, undefined);
        if (stopped) return;

        if (res?.status === 200 && res?.changed) {
          setDashboardData(res.dashboard);
        }

        if (res?.final) {
          // Game is final — stop polling
          return;
        }

        // Schedule next run
        timerId = setTimeout(tick, 15000);
      } catch (e) {
        if (!stopped) {
          console.error("[Poll] Error during tick", e);
        }
      } finally {
        inFlight = false;
      }
    };

    tick();

    return () => {
      stopped = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [gameId, dashboardData]);

  // Memoized derived data
  const { headerData, scoreboardData, playerListData, pbpData, homeTeamId } = useMemo(() => {
    if (!dashboardData) {
      return { headerData: null, scoreboardData: null, playerListData: null, pbpData: [], homeTeamId: null };
    }

    const homeTeam = dashboardData?.teams?.home ?? {};
    const awayTeam = dashboardData?.teams?.away ?? {};

    return {
      headerData: {
        homeTeam: homeTeam?.triCode ?? "",
        awayTeam: awayTeam?.triCode ?? "",
        homeLogo: homeTeam?.logo ?? "",
        awayLogo: awayTeam?.logo ?? "",
        location: dashboardData?.meta?.arena?.city ?? "",
        state: dashboardData?.meta?.arena?.state ?? ""
      },
      scoreboardData: {
        homeScore: homeTeam?.score ?? 0,
        awayScore: awayTeam?.score ?? 0,
        gameClock: dashboardData?.meta?.gameClock ?? "",
        period: dashboardData?.meta?.period ?? "",
        status: dashboardData?.meta?.statusText ?? ""
      },
      playerListData: {
        homePlayerList: homeTeam?.players ?? [],
        awayPlayerList: awayTeam?.players ?? []
      },
      pbpData: dashboardData?.playByPlay ?? [],
      homeTeamId: homeTeam?.teamId
    };
  }, [dashboardData]);

  // Render states
  if (!gameId) {
    return (
      <div className="error-container">
        <h3>No Game Selected</h3>
        <button className="back-button" onClick={handleBack}>
          Back to Games
        </button>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (err) return <ErrorState onRetry={handleRetry} />;
  if (!dashboardData) return <NoDataState onBack={handleBack} />;

  return (
    <div>
      <MyDashboardHeader headerData={headerData} />
      <div className="dashboard-content">
        <MyPlayerList 
          playerlist={playerListData.homePlayerList} 
          teamLabel="Home"
        />
        <div className="scoreboard">
          <MyScoreboard scoreBoardData={scoreboardData} />
          <MyPBPContainer 
            playByPlay={pbpData} 
            homeTeamId={homeTeamId}
          />
        </div>
        <MyPlayerList 
          playerlist={playerListData.awayPlayerList}
          teamLabel="Away" 
        />
      </div>
    </div>
  );
}
