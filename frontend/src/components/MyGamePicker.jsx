import React, { useState, useEffect, useCallback } from 'react';
import { getGameCardData } from '../api/data';
import MyGameCard from './MyGameCard';

export default function MyGamePicker({ date, setGameId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getGameCardData(date);
      setGames(list || []);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError("Failed to load games. Please try again.");
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  if (loading) {
    return (
      <div className="game-card-list">
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-2xl)',
          gap: 'var(--space-md)'
        }}>
          <div className="loading-spinner" />
          <p className="loading-text">Loading games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-card-list">
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-2xl)',
          gap: 'var(--space-md)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <p style={{ color: '#ef4444' }}>⚠️ {error}</p>
          <button 
            onClick={fetchGames}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-card-list">
      {games && games.length > 0 ? (
        games.map((game) => (
          <MyGameCard key={game.gameId} gameData={game} setGameId={setGameId} />
        ))
      ) : (
        <p>No games scheduled for this date</p>
      )}
    </div>
  );
}
