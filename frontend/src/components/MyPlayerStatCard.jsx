import React, { useMemo } from 'react';

export const MyPlayerStatCard = React.memo(function MyPlayerStatCard({ stats }) {
  // Memoize percentage calculations
  const formattedStats = useMemo(() => {
    const round = (num) => {
      if (num === null || num === undefined || isNaN(num)) return '—';
      return Math.round(num * 100);
    };
    
    const formatStat = (val) => {
      if (val === null || val === undefined) return '—';
      return val;
    };
    
    return {
      pts: formatStat(stats?.pts),
      reb: formatStat(stats?.reb),
      ast: formatStat(stats?.ast),
      stl: formatStat(stats?.stl),
      blk: formatStat(stats?.blk),
      plusMinus: formatStat(stats?.plusMinus),
      pf: formatStat(stats?.pf),
      tov: formatStat(stats?.tov),
      fga: formatStat(stats?.fga),
      fgm: formatStat(stats?.fgm),
      fgPct: round(stats?.fgPct),
      tpa: formatStat(stats?.tpa),
      tpm: formatStat(stats?.tpm),
      tpPct: round(stats?.tpPct),
      fta: formatStat(stats?.fta),
      ftm: formatStat(stats?.ftm),
      ftPct: round(stats?.ftPct),
    };
  }, [stats]);

  if (!stats) {
    return (
      <div className="player-stats">
        <div style={{ 
          padding: 'var(--space-md)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          textAlign: 'center'
        }}>
          No stats available
        </div>
      </div>
    );
  }

  return (
    <div className="player-stats">
      <table>
        <thead>
          <tr>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>STL</th>
            <th>BLK</th>
            <th>+/-</th>
            <th>PF</th>
            <th>TO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{formattedStats.pts}</td>
            <td>{formattedStats.reb}</td>
            <td>{formattedStats.ast}</td>
            <td>{formattedStats.stl}</td>
            <td>{formattedStats.blk}</td>
            <td>{formattedStats.plusMinus}</td>
            <td>{formattedStats.pf}</td>
            <td>{formattedStats.tov}</td>
          </tr>
        </tbody>
        <thead>
          <tr>
            <th>FGM</th>
            <th>FGA</th>
            <th>FG%</th>
            <th>3PM</th>
            <th>3PA</th>
            <th>3P%</th>
            <th>FTM</th>
            <th>FTA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{formattedStats.fgm}</td>
            <td>{formattedStats.fga}</td>
            <td>{formattedStats.fgPct}</td>
            <td>{formattedStats.tpm}</td>
            <td>{formattedStats.tpa}</td>
            <td>{formattedStats.tpPct}</td>
            <td>{formattedStats.ftm}</td>
            <td>{formattedStats.fta}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
