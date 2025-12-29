import React, { useEffect, useState, useMemo } from "react";
import MyDatePicker from "../components/MyDatePicker";
import MyGamePicker from "../components/MyGamePicker";

export default function GamePickerPage() {
  // Initialize with today's date in ISO format
  const today = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [date, setDate] = useState(today);
  const [gameId, setGameId] = useState();

  return (
    <div className="game-picker-page">
      <h2>NBA Games</h2>
      <p>Select a date to view games</p>
      <MyDatePicker date={date} setDate={setDate} />
      <MyGamePicker date={date} setGameId={setGameId} />
    </div>
  );
}
