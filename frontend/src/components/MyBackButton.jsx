import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default React.memo(function MyBackButton() {
  const navigate = useNavigate();
  
  const handleClick = useCallback(() => {
    navigate('/GamePickerPage');
  }, [navigate]);

  return (
    <button className="back-button" onClick={handleClick}>
      Back to Games
    </button>
  );
});
