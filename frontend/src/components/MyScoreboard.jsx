
export default function MyScoreboard({ scoreBoardData }) {
  return (
    <div>
      <div>{scoreBoardData.homeScore} &emsp; {scoreBoardData.awayScore}</div>
      {scoreBoardData.gameClock}{/*Temp */} <br />
      {scoreBoardData.period}<br />
      {scoreBoardData.status}
    </div>
  );
}