import { parseDuration } from '../../utils/helpers'

export default function MyScoreboard({ scoreBoardData }) {
  return (
    <div className="scoreboard">
      <div className="scoreboard-container">
        <h2>{scoreBoardData.homeScore} &emsp; {scoreBoardData.awayScore}</h2>
        <h3>{parseDuration(scoreBoardData.gameClock)}{/*Temp */} <br /></h3>
        <h3>{scoreBoardData.period}<br /></h3>
        <h3>{scoreBoardData.status}</h3>
      </div>
    </div>
  );
}