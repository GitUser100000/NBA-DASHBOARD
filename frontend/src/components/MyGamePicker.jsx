import { useState, useEffect } from 'react';
import { getGameCardData } from '../api/data';
import MyGameCard from './MyGameCard';

export default function MyGamePicker({ date, setGameId }) {
  const [games, setGames] = useState([]);
  const [ loading, setLoading ] = useState(false);

  useEffect(() => {
  const fetchGames = async () => {
    try {
      setLoading(true);
      const list = await getGameCardData(date); 
      console.log("Fetched games:", list);
      setGames(list);
    } catch (err) {
      console.error("Error fetching games:", err);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };
  fetchGames();
}, [date]);

  return (
    <div className="game-card-list">
      {games && games.length > 0 ? (
        games.map((game) => (
          <MyGameCard key={game.gameId} gameData={game} setGameId={setGameId}/>
        ))
      ) : (
        <p>No Games To Display</p>
      )}
    </div>
  );
}