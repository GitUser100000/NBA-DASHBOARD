import React, { useEffect, useState } from "react";
import MyDatePicker from "../components/MyDatePicker";
import MyGamePicker from "../components/MyGamePicker";

export default function GamePickerPage() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const year = today.getFullYear();

  const formattedDate = `${day}-${month}-${year}`; // DD-MM-YYYY
  const [ date, setDate ] = useState(formattedDate);
  const [ gameId, setGameId ] = useState();
  return (
    <div className="game-picker-page">
      <h2>Pick a Game</h2>
      <MyDatePicker date={date} setDate={setDate}/>
      <MyGamePicker date={date} setGameId={setGameId}/>
    </div>
  );
}