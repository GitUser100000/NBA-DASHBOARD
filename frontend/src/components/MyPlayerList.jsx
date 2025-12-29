import React, { useMemo } from 'react';
import MyPlayerCard from './MyPlayerCard';
import { MyPlayerStatCard } from './MyPlayerStatCard';

// Memoized player row to prevent unnecessary re-renders
const PlayerRow = React.memo(function PlayerRow({ player }) {
  return (
    <div className="player">
      <MyPlayerCard player={player} />
      <MyPlayerStatCard stats={player.stats} />
    </div>
  );
});

export default React.memo(function MyPlayerList({ playerlist = [], teamLabel = '' }) { 
  const isOnCourt = (p) => (p.onCourt ?? p.oncourt) === true;

  // Memoize player sorting
  const { playersOnCourt, playersOnBench } = useMemo(() => {
    const onCourt = playerlist.filter(isOnCourt);
    const onBench = playerlist.filter(p => !isOnCourt(p));
    
    // Sort by position
    const positionOrder = { 'PG': 1, 'SG': 2, 'SF': 3, 'PF': 4, 'C': 5 };
    const sortByPosition = (players) => {
      return [...players].sort((a, b) => {
        const posA = positionOrder[a.position?.toUpperCase()] || 6;
        const posB = positionOrder[b.position?.toUpperCase()] || 6;
        return posA - posB;
      });
    };
    
    return {
      playersOnCourt: sortByPosition(onCourt),
      playersOnBench: sortByPosition(onBench)
    };
  }, [playerlist]);

  return (
    <div className="player-list">
      <h2>On Court {teamLabel && `(${teamLabel})`}</h2>
      <ul>
        {playersOnCourt.map((p) => (
          <PlayerRow key={p.playerId || p.id} player={p} />
        ))}
      </ul>
      <h2>Bench</h2>
      <ul>
        {playersOnBench.map((p) => (
          <PlayerRow key={p.playerId || p.id} player={p} />
        ))}
      </ul>
    </div>
  );
});
