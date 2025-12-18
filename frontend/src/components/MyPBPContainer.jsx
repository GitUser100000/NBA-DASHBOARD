import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { parseDuration } from '../../utils/helpers';

// Memoized individual event component
const PBPEvent = React.memo(function PBPEvent({ event, homeTeamId }) {
  const getEventIcon = useCallback((actionType, descriptor) => {
    const type = actionType?.toLowerCase() || '';
    const desc = descriptor?.toLowerCase() || '';
    
    if (type === '2pt' || type === '3pt') {
      return { icon: '🏀', class: 'score' };
    }
    if (type === 'freethrow') {
      return desc.includes('miss') 
        ? { icon: '✗', class: 'miss' }
        : { icon: '🎯', class: 'score' };
    }
    if (type === 'rebound') {
      return { icon: '📥', class: 'rebound' };
    }
    if (type === 'turnover') {
      return { icon: '↻', class: 'turnover' };
    }
    if (type === 'foul') {
      return { icon: '⚠', class: 'foul' };
    }
    if (type === 'timeout') {
      return { icon: '⏸', class: 'timeout' };
    }
    if (type === 'substitution') {
      return { icon: '🔄', class: 'substitution' };
    }
    if (type === 'period') {
      return { icon: '⏱', class: 'period' };
    }
    if (type === 'jumpball') {
      return { icon: '⬆', class: 'period' };
    }
    if (desc.includes('miss') || type.includes('miss')) {
      return { icon: '✗', class: 'miss' };
    }
    return { icon: '•', class: 'period' };
  }, []);

  const { icon, class: iconClass } = getEventIcon(event.actionType, event.descriptor);
  const isHome = event.teamId === homeTeamId;
  const teamClass = event.teamId ? (isHome ? 'home' : 'away') : '';
  
  const clock = event.clock ? parseDuration(event.clock).slice(3) : ''; // Remove hours
  
  return (
    <div className="pbp-event">
      <span className="pbp-event-time">{clock}</span>
      <span className={`pbp-event-icon ${iconClass}`}>{icon}</span>
      <div className="pbp-event-content">
        <div className="pbp-event-desc">
          {event.teamTricode && (
            <span className={`pbp-event-team ${teamClass}`}>
              {event.teamTricode}
            </span>
          )}
          {event.description}
        </div>
        {(event.scoreHome !== undefined || event.scoreAway !== undefined) && (
          <div className="pbp-event-score">
            {event.scoreHome} - {event.scoreAway}
          </div>
        )}
      </div>
    </div>
  );
});

// Filter button component
const FilterButton = React.memo(function FilterButton({ period, activePeriod, onClick }) {
  const label = period === 0 ? 'All' : period > 4 ? `OT${period - 4}` : `Q${period}`;
  return (
    <button
      className={`pbp-filter-btn ${activePeriod === period ? 'active' : ''}`}
      onClick={() => onClick(period)}
    >
      {label}
    </button>
  );
});

export default function MyPBPContainer({ playByPlay = [], homeTeamId, autoScroll = true }) {
  const [activePeriod, setActivePeriod] = useState(0);
  const listRef = useRef(null);
  const prevLengthRef = useRef(0);
  
  // Get unique periods from the data
  const periods = useMemo(() => {
    const uniquePeriods = [...new Set(playByPlay.map(e => e.period).filter(Boolean))];
    return uniquePeriods.sort((a, b) => a - b);
  }, [playByPlay]);
  
  // Filter events by action types that are interesting
  const filteredEvents = useMemo(() => {
    // Filter out noise (keep scoring, fouls, timeouts, periods, turnovers, etc.)
    const interestingTypes = [
      '2pt', '3pt', 'freethrow', 'foul', 'turnover', 'timeout',
      'period', 'jumpball', 'rebound', 'violation', 'ejection'
    ];
    
    let events = playByPlay.filter(e => {
      const type = e.actionType?.toLowerCase() || '';
      // Include made shots, fouls, turnovers, etc.
      // Exclude empty descriptions and game-level events without team context
      if (!e.description) return false;
      
      // Include scoring plays
      if (e.isFieldGoal === 1) return true;
      if (type === 'freethrow') return true;
      
      // Include important game events
      if (interestingTypes.some(t => type.includes(t))) return true;
      
      return false;
    });
    
    // Filter by period if selected
    if (activePeriod > 0) {
      events = events.filter(e => e.period === activePeriod);
    }
    
    // Sort by order number (newest first for easier viewing)
    return events.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
  }, [playByPlay, activePeriod]);
  
  // Auto-scroll to top when new events come in
  useEffect(() => {
    if (autoScroll && listRef.current && filteredEvents.length > prevLengthRef.current) {
      listRef.current.scrollTop = 0;
    }
    prevLengthRef.current = filteredEvents.length;
  }, [filteredEvents.length, autoScroll]);
  
  const handlePeriodChange = useCallback((period) => {
    setActivePeriod(period);
  }, []);
  
  if (!playByPlay || playByPlay.length === 0) {
    return (
      <div className="pbp-container">
        <div className="pbp-header">
          <h3>Play-by-Play</h3>
        </div>
        <div className="pbp-list" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem'
        }}>
          No play-by-play data available
        </div>
      </div>
    );
  }
  
  return (
    <div className="pbp-container">
      <div className="pbp-header">
        <h3>Play-by-Play</h3>
        <div className="pbp-filters">
          <FilterButton
            period={0}
            activePeriod={activePeriod}
            onClick={handlePeriodChange}
          />
          {periods.map(p => (
            <FilterButton
              key={p}
              period={p}
              activePeriod={activePeriod}
              onClick={handlePeriodChange}
            />
          ))}
        </div>
      </div>
      <div className="pbp-list" ref={listRef}>
        {filteredEvents.length === 0 ? (
          <div style={{ 
            padding: 'var(--space-xl)',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            No events for this period
          </div>
        ) : (
          filteredEvents.map((event, idx) => (
            <PBPEvent
              key={event.actionNumber || idx}
              event={event}
              homeTeamId={homeTeamId}
            />
          ))
        )}
      </div>
    </div>
  );
}

