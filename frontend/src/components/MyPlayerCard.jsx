export default function MyPlayerCard({ player }) {
  return (
    <div>
      <img src={player.headshot}/>
      <div>{player.name}</div>
      <div>{player.jerseyNum}</div>
      <div>{player.starter === true ? "Starter" : "Bench"}</div>
    </div>
  )
}