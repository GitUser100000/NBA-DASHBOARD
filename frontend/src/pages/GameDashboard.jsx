import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDashboardData } from "../api/data";
import MyDashboardHeader from "../components/MyDashBoardHeader";

export default function GameDashboard() {
  const [ dashboardData, setDashboardData ] = useState({});
  const { gameId } = useParams(); 

  useEffect(() => {
    const loadGameData = async (gameId) => {
      try {
        const dashboardData = await getDashboardData(gameId);
        if (dashboardData) {
          setDashboardData(dashboardData);
          console.log(dashboardData);
        } else {
          console.log("Empty Game Data");
        }
      } catch (err) {
        console.log("There was an error fetching the dashboard: ", err);
      };
    };
    loadGameData(gameId);
  }, [gameId]);

  const homeTeam = dashboardData.teams.home;
  const awayTeam = dashboardData.teams.away;

  const headerData = {
    homeTeam: homeTeam.triCode,
    awayTeam: awayTeam.triCode,
    homeLogo: homeTeam.logo,
    awayLogo: awayTeam.logo,
    location: dashboardData.meta.arena.city,
    state: dashboardData.meta.arena.state
  };

  return (
    <>
      <MyDashboardHeader headerData={headerData}/>
      {/* <MyPlayerList playerlist="temp"/>
      <MyScoreboard score="temp"/>
      <MyPBPContainer />
      <MyPlayerList playerlist="temp"/> */}
    </>
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