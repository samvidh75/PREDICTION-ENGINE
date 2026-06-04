import React, { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { validateMarketConfig } from '../core/MarketConfig';

interface MarketHydratorProps {
  children: ReactNode;
  enableLiveIndicator?: boolean;
}

/**
 * MarketHydrator - Wraps dashboard with live telemetry capabilities
 * Shows pulsing connection indicator that transitions from Slate to Cyan
 */
const MarketHydrator: React.FC<MarketHydratorProps> = ({
  children,
  enableLiveIndicator = true,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Validate configuration on mount
    validateMarketConfig();
    setIsInitialized(true);

    // Simulate connection establishment
    // In production, this would connect to WebSocket
    const connectionTimer = setTimeout(() => {
      setIsConnected(true);
    }, 1000);

    return () => clearTimeout(connectionTimer);
  }, []);

  return (
    <div className="relative">
      {/* Live Telemetry Indicator */}
      {enableLiveIndicator && isInitialized && (
        <div className="fixed top-[88px] right-8 z-40 flex items-center gap-2">
          {/* Pulsing Circle */}
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: isConnected ? '#06B6D4' : '#64748B', // Cyan to Slate
            }}
            animate={{
              scale: isConnected ? [1, 1.3, 1] : 1,
              opacity: isConnected ? [1, 0.5, 1] : 0.6,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Status Label */}
          <span className="font-mono text-[10px] font-medium text-[#525252] uppercase tracking-wider">
            {isConnected ? 'Live Telemetry' : 'Connecting...'}
          </span>
        </div>
      )}

      {/* Dashboard Content */}
      {children}
    </div>
  );
};

export default MarketHydrator;
