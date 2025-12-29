import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Memoized team logo with fallback
const TeamLogo = React.memo(function TeamLogo({ src, alt }) {
  const [error, setError] = useState(false);
  
  const handleError = useCallback(() => {
    setError(true);
  }, []);
  
  if (error) {
    return (
      <div style={{
        width: '140px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-muted)',
        fontSize: '2rem'
      }}>
        🏀
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt}
      className="team-logo"
      onError={handleError}
      loading="eager"
    />
  );
});

export default React.memo(function MyDashboardHeader({ headerData }) {
  const navigate = useNavigate();
  
  const handleBack = useCallback(() => {
    navigate('/GamePickerPage');
  }, [navigate]);
  
  return (
    <div className="dashboard-header-wrapper">
      <button className="dashboard-back-btn" onClick={handleBack}>
        ← Back
      </button>
      <div className="dashboard">
        <TeamLogo 
          src={headerData?.homeLogo} 
          alt={`${headerData?.homeTeam} logo`}
        />
        <div id="title">
          <h1>
            {headerData?.homeTeam || '—'} 
            <span style={{ 
              margin: '0 0.5rem',
              opacity: 0.5,
              fontWeight: 400
            }}>vs</span>
            {headerData?.awayTeam || '—'}
          </h1>
        </div>
        <TeamLogo 
          src={headerData?.awayLogo} 
          alt={`${headerData?.awayTeam} logo`}
        />
      </div>
      {(headerData?.location || headerData?.state) && (
        <p className="dashboard-location">
          📍 {[headerData?.location, headerData?.state].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
});
