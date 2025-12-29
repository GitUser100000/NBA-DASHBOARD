import React, { useCallback } from 'react';
import { useNavigate } from "react-router-dom";

export default React.memo(function MyGoToGameButton({ gameId }) {
  const navigate = useNavigate(); 
  
  const handleClick = useCallback(() => {
    if (gameId) {
      navigate(`/GameDashboard/${gameId}`);
    }
  }, [navigate, gameId]);

  return (
    <button 
      className="go-to-game-button" 
      onClick={handleClick}
      disabled={!gameId}
    >
      View Game
    </button>
  );
});
