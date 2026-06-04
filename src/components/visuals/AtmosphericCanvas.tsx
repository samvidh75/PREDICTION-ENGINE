import React, { useState, useEffect } from 'react';
import { marketStateCoordinator, GlobalMarketMood } from '../../services/realtime/MarketStateCoordinator';
import { ThemeCoordinator } from '../../designSystem/theme/ThemeCoordinator';

export const AtmosphericCanvas: React.FC = () => {
  const [mood, setMood] = useState<GlobalMarketMood>(() => marketStateCoordinator.getMood());

  useEffect(() => {
    const unsub = marketStateCoordinator.subscribeMood((newMood) => {
      setMood(newMood);
    });
    return unsub;
  }, []);

  const config = ThemeCoordinator.getMoodConfig(mood);
  const accent = config.accentColor;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000 ease-in-out"
      style={{
        background: `radial-gradient(circle at 50% -20%, ${accent}0D 0%, transparent 60%)`,
        opacity: 0.8 // Opacity cap of 8% mapped cleanly
      }}
    />
  );
};

export default AtmosphericCanvas;
