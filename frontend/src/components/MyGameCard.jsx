import React, { useMemo, useState, useCallback } from 'react';
import MyGoToGameButton from './MyGoToGameButton';

// Team logo with fallback
const TeamLogo = React.memo(function TeamLogo({ src, alt, triCode }) {
  const [error, setError] = useState(false);
  
  const handleError = useCallback(() => setError(true), []);
  
  if (error || !src) {
    return (
      <div className="game-card-logo-fallback">
        {triCode || '?'}
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className="game-card-logo"
      onError={handleError}
      loading="lazy"
    />
  );
});

export default React.memo(function MyGameCard({ gameData }) {
  const displayData = useMemo(() => {
    if (!gameData || !gameData.home || !gameData.away) {
      return null;
    }
    
    const isFinal = gameData.statusText?.toLowerCase() === 'final';
    const isLive = gameData.period > 0 && !isFinal;
    
    return {
      home: gameData.home,
      away: gameData.away,
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
      {/* Team matchup with logos */}
      <div className="game-card-matchup">
        <div className="game-card-team">
          <TeamLogo 
            src={displayData.home.logo} 
            alt={displayData.home.triCode}
            triCode={displayData.home.triCode}
          />
          <span className="game-card-tricode">{displayData.home.triCode}</span>
        </div>
        
        <div className="game-card-vs">VS</div>
        
        <div className="game-card-team">
          <TeamLogo 
            src={displayData.away.logo} 
            alt={displayData.away.triCode}
            triCode={displayData.away.triCode}
          />
          <span className="game-card-tricode">{displayData.away.triCode}</span>
        </div>
      </div>

      {/* Score section */}
      <div className="game-card-score-section">
        <div className="game-card-scores">
          <span className="game-card-score-num">{displayData.home.score}</span>
          <span className="game-card-score-divider">—</span>
          <span className="game-card-score-num">{displayData.away.score}</span>
        </div>
        
        <div className="game-card-status" style={{
          background: displayData.isLive 
            ? 'rgba(34, 197, 94, 0.15)' 
            : 'var(--accent-glow)',
          color: displayData.isLive 
            ? '#22c55e' 
            : 'var(--accent-primary)'
        }}>
          {displayData.isLive && (
            <span className="live-dot" />
          )}
          {displayData.status}
        </div>
      </div>

      {/* Location */}
      {displayData.location && (
        <div className="game-card-location">{displayData.location}</div>
      )}

      <MyGoToGameButton gameId={gameData.gameId} />
    </div>
  );
});
