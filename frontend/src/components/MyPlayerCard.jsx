import React, { useState, useCallback } from 'react';

export default React.memo(function MyPlayerCard({ player }) {
  const [imgError, setImgError] = useState(false);
  
  const handleImgError = useCallback(() => {
    setImgError(true);
  }, []);
  
  return (
    <div className="player-card">
      <div className="player-headshot">
        {!imgError ? (
          <img 
            src={player.headshot} 
            alt={player.name}
            onError={handleImgError}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'var(--text-muted)'
          }}>
            👤
          </div>
        )}
      </div>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-position">
          {player.position || '—'} • {player.starter ? "Starter" : "Bench"}
        </div>
        <div className="player-jersey-number">#{player.jerseyNum}</div>
      </div>
    </div>
  );
});
