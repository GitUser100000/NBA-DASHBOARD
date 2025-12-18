import React, { useMemo } from 'react';
import { parseDuration } from '../../utils/helpers';

export default React.memo(function MyScoreboard({ scoreBoardData }) {
  // Memoize clock parsing
  const formattedClock = useMemo(() => {
    if (!scoreBoardData?.gameClock) return '';
    const parsed = parseDuration(scoreBoardData.gameClock);
    // Remove hours if 00
    return parsed.startsWith('00:') ? parsed.slice(3) : parsed;
  }, [scoreBoardData?.gameClock]);

  // Format period display
  const periodDisplay = useMemo(() => {
    const period = scoreBoardData?.period;
    if (!period) return '';
    if (period <= 4) return `Q${period}`;
    return `OT${period - 4}`;
  }, [scoreBoardData?.period]);

  const isFinal = scoreBoardData?.status?.toLowerCase() === 'final';

  return (
    <div className="scoreboard-container">
      <h2>
        {scoreBoardData?.homeScore ?? 0}
        <span style={{ 
          margin: '0 0.5em', 
          opacity: 0.5,
          fontWeight: 400 
        }}>—</span>
        {scoreBoardData?.awayScore ?? 0}
      </h2>
      {!isFinal && formattedClock && (
        <h3 style={{ opacity: 0.9 }}>{formattedClock}</h3>
      )}
      {!isFinal && periodDisplay && (
        <h3 style={{ opacity: 0.8 }}>{periodDisplay}</h3>
      )}
      <h3 style={{ 
        marginTop: '0.5rem',
        fontWeight: 600,
        letterSpacing: '0.05em'
      }}>
        {scoreBoardData?.status}
      </h3>
    </div>
  );
});
