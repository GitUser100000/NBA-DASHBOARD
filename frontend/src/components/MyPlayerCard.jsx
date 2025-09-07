export default function MyPlayerCard({ player }) {
  return (
    <div className="player-card">
      <div className="player-headshot">
        <img src={player.headshot}/>
      </div>
      <div className="player-info">
        <div>{player.name}</div>
        <div>{player.starter === true ? "Starter" : "Bench"}</div>
        <div className="player-jersey-number">{player.jerseyNum}</div>
      </div>
    </div>
  )
}