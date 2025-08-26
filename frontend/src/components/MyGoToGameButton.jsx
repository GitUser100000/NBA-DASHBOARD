import { useNavigate } from "react-router-dom";

export default function MyGoToGameButton({ gameId }) {
  const navigate = useNavigate(); 
  
  const handleClick = () => {
    navigate(`/GameDashboard/${gameId}`);
  };

  return (
    <button onClick={handleClick}>Go to Game</button>
  );
};