import React, { useMemo } from 'react';
import MyGoToGameButton from './MyGoToGameButton';

export default React.memo(function MyGameCard({ gameData }) {
  // Memoize display values
  const displayData = useMemo(() => {
    if (!gameData || !gameData.home || !gameData.away) {
      return null;
    }
    
    const isFinal = gameData.statusText?.toLowerCase() === 'final';
    const isLive = gameData.period > 0 && !isFinal;
    
    return {
      title: `${gameData.home.triCode} vs ${gameData.away.triCode}`,
      score: `${gameData.home.score} - ${gameData.away.score}`,
      status: isFinal ? 'Final' : isLive ? `Q${gameData.period}` : gameData.statusText,
      location: [gameData.arena, gameData.city].filter(Boolean).join(' • '),
      isFinal,
      isLive
    };
  }, [gameData]);

  if (!displayData) {
    return (
      <div className="game-card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '180px',
          color: 'var(--text-muted)'
        }}>
          Loading game data...
        </div>
      </div>
    );
  }

  return (
    <div className="game-card">
      <h3>{displayData.title}</h3>
      <div className="game-info">
        <div className="score">{displayData.score}</div>
        <div className="game-details">
          <div className="status" style={{
            background: displayData.isLive 
              ? 'rgba(34, 197, 94, 0.15)' 
              : 'var(--accent-glow)',
            color: displayData.isLive 
              ? '#22c55e' 
              : 'var(--accent-primary)'
          }}>
            {displayData.isLive && (
              <span style={{ 
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                marginRight: '6px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            )}
            {displayData.status}
          </div>
          {displayData.location && (
            <div className="location">{displayData.location}</div>
          )}
        </div>
      </div>
      <MyGoToGameButton gameId={gameData.gameId} />
    </div>
  );
});
