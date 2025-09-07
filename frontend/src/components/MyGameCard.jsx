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
      <h3>{`${gameData.home.triCode} vs ${gameData.away.triCode}`}</h3>
      <div className="game-info">
        <div className="score">{`${gameData.home.score} - ${gameData.away.score}`}</div>
        <div className="game-details">
          <div className="status">{gameData.statusText === 'Final' ? gameData.statusText : `Q${gameData.period}`}</div>
          <div className="location">{gameData.arena} - {gameData.city}</div>
        </div>
      </div>
      <MyGoToGameButton gameId={gameData.gameId}/>
    </div>
  );
}