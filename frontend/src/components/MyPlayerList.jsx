import MyPlayerCard from './MyPlayerCard';
import { MyPlayerStatCard } from './MyPlayerStatCard';

export default function MyPlayerList({ playerlist = []}) { 
  const isOnCourt = (p) => (p.onCourt ?? p.oncourt) === true;

  const playersOnCourt = playerlist.filter(isOnCourt);
  const playersOnBench = playerlist.filter(p => !isOnCourt(p));

  const positionSort = (players) => {
    const positionsList = ['PG', 'SG', 'SF', 'PF', 'C', 'NULL']; // use 'NULL' not null
    const sortedPlayers = [];

    for (const position of positionsList) {
      const isPosition =
        position === 'NULL'
          ? (p) => p.position == null            // matches null or undefined
          : (p) => String(p.position || '').toUpperCase() === position;

      sortedPlayers.push(...players.filter(isPosition));
    }

    return sortedPlayers;
  };

  return (
    <div className="player-list">
      <h2>On Court</h2>
      <ul>
      {playersOnCourt.map((p) => {
        return (
          <div className="player">
            <MyPlayerCard key={p.id} player={p}/>
            <MyPlayerStatCard key={p.id} stats={p.stats} />
          </div>
          )
      })}
      </ul>
      <h2>Bench</h2>
      <ul>
      {playersOnBench.map((p) => {
        return (
          <div className="player">
            <MyPlayerCard key={p.id} player={p}/>
            <MyPlayerStatCard key={p.id} stats={p.stats} />
          </div>
          )
      })}
      </ul>
    </div>
  );
};