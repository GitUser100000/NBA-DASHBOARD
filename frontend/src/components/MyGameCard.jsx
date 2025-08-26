import { useState, useEffect } from 'react';
import MyGoToGameButton from './MyGoToGameButton';

export default function MyGameCard({ gameData }) {

  // debug
  useEffect(() => {
    console.log("MyGameCard data:", gameData);
  }, [gameData]);

  if (!gameData || !gameData.home || !gameData.away) {
    return <div className="game-card">Loading game data…</div>;
  }

const gamePeriod = gameData.statusText === 'Final' ? <p>{`${gameData.statusText}`}</p> : <p>{`${gameData.period}`}</p>;

  return (
    <div className="game-card">
      <h3>{`${gameData.home.triCode} V ${gameData.away.triCode}`}</h3>
      <p>{`${gameData.home.score} - ${gameData.away.score}`}</p>
      <MyGoToGameButton gameId={gameData.gameId}/>
      {gamePeriod}
      <p>{gameData.arena} - {gameData.city}</p>
    </div>
  );
}