import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PredictionPayload, HealthStatus } from '../types/market';
import PredictionEngine from '../services/PredictionEngine';

interface HealthometerWidgetProps {
  prediction: PredictionPayload | null;
  isLoading?: boolean;
  compact?: boolean;
}

const getHealthColor = (status: HealthStatus): string => {
  const colorMap: Record<HealthStatus, string> = {
    VERY_HEALTHY: '#06B6D4',
    HEALTHY: '#06B6D4',
    STABLE: '#A3A3A3',
    WEAKENING: '#D946EF',
    UNHEALTHY: '#D946EF',
  };
  return colorMap[status];
};

const getHealthGradient = (status: HealthStatus): string => {
  if (status === 'VERY_HEALTHY' || status === 'HEALTHY') {
    return 'from-[#06B6D4] to-[#0EA5E9]';
  } else if (status === 'WEAKENING' || status === 'UNHEALTHY') {
    return 'from-[#D946EF] to-[#EC4899]';
  }
  return 'from-[#A3A3A3] to-[#737373]';
};

/**
 * HealthometerWidget - Holographic telemetry display
 * Animates company health status with spring transitions
 */
const HealthometerWidget: React.FC<HealthometerWidgetProps> = ({
  prediction,
  isLoading = false,
  compact = false,
}) => {
  // Calculate percentage for animation
  const healthPercentage = useMemo(() => {
    if (!prediction) return 0;

    // Map confidence score to visual percentage
    return Math.round((prediction.confidenceScore || 0) * 100);
  }, [prediction]);

  if (isLoading) {
    return (
      <div className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-4'}>
        <div className="font-mono text-[11px] font-medium text-[#525252] uppercase">
          Telemetry Loading...
        </div>
        <div className="w-full h-2 bg-[#F5F5F5] rounded-none overflow-hidden">
          <motion.div
            className="h-full bg-[#A3A3A3]"
            animate={{ scaleX: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ originX: 0 }}
          />
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-[#0c0d0f] border border-amber-500/20 rounded-none p-4 font-mono">
        <span className="text-[11px] font-bold text-amber-500 uppercase block mb-1">
          Live market data is currently refreshing
        </span>
        <span className="text-[10px] text-gray-400 block">
          Displaying last verified intelligence snapshot.
        </span>
        <span className="text-[9px] text-gray-600 block mt-2">
          Timestamp: {new Date().toISOString()}
        </span>
      </div>
    );
  }

  const barGradient = getHealthGradient(prediction.healthStatus);

  return (
    <div className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-4'}>
      {/* Header with Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] font-medium text-[#525252] uppercase">
            Health Status
          </span>
          <span className="font-mono text-sm font-semibold text-[#0A0A0A] uppercase">
            {prediction.healthStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-[#0A0A0A]">
            {healthPercentage}%
          </span>
          <span className="font-mono text-[10px] text-[#A3A3A3] uppercase">
            Confidence
          </span>
        </div>
      </div>

      {/* Animated Progress Bar */}
      <div className="w-full h-2 bg-[#F5F5F5] rounded-none overflow-hidden border border-[#E5E5E5]">
        <motion.div
          className={`h-full bg-gradient-to-r ${barGradient}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: healthPercentage / 100 }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
            type: 'spring',
            stiffness: 100,
            damping: 20,
          }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Health Description */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E5E5]">
        <p className="text-xs text-[#525252] leading-relaxed">
          {PredictionEngine.getHealthStatusDescription(prediction.healthStatus)}
        </p>

        {/* Trend Indicator */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase">
            Trend:
          </span>
          <span
            className="font-mono text-[11px] font-semibold uppercase"
            style={{
              color:
                prediction.trendDirection === 'UPTREND'
                  ? '#06B6D4'
                  : prediction.trendDirection === 'DOWNTREND'
                    ? '#D946EF'
                    : '#A3A3A3',
            }}
          >
            {prediction.trendDirection}
          </span>
        </div>

        {/* Volatility Index */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase">
            Volatility:
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#0A0A0A]">
            {prediction.volatilityIndex}
          </span>
        </div>
      </div>

      {/* SEBI-Safe Disclaimer */}
      <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-none p-3 mt-2">
        <p className="text-[10px] text-[#525252] leading-relaxed italic">
          {prediction.disclaimerText}
        </p>
      </div>
    </div>
  );
};

export default HealthometerWidget;
