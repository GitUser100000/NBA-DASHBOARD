export function MyPlayerStatCard({ stats }) {
  const round = (num) => {
    return Math.round(num * 100);
  }
  return (
    <div className="player-stats">
      <table>
        <tr>
          <th>PTS</th>
          <th>REB</th>
          <th>AST</th>
          <th>STL</th>
          <th>BLK</th>
          <th>BPM</th>
          <th>MIN</th>
          <th>PFS</th>
          <th>TOV</th>
        </tr>
        <tr>
          <td>{stats.pts}</td>
          <td>{stats.reb}</td>
          <td>{stats.ast}</td>
          <td>{stats.stl}</td>
          <td>{stats.blk}</td>
          <td>{stats.plusMinus}</td>
          <td>{"TEMP"}</td>
          <td>{stats.pf}</td>
          <td>{stats.tov}</td>
        </tr>
        <tr>
          <th>FGA</th>
          <th>FGM</th>
          <th>FG%</th>
          <th>3PA</th>
          <th>3PM</th>
          <th>3P%</th>
          <th>FTA</th>
          <th>FTM</th>
          <th>FT%</th>
        </tr>
        <tbody>
        <tr>
          <td>{stats.fga}</td>
          <td>{stats.fgm}</td>
          <td>{round(stats.fgPct)}</td>
          <td>{stats.tpa}</td>
          <td>{stats.tpm}</td>
          <td>{round(stats.tpPct)}</td>
          <td>{stats.fta}</td>
          <td>{stats.ftm}</td>
          <td>{round(stats.ftPct)}</td>
        </tr>
        </tbody>
      </table>
    </div>
  );
};