import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import CalibrationPlaceholder from './CalibrationPlaceholder';
import { PredictiveResult } from '../engine/hooks/usePredictiveWorker';

interface PredictiveHologramProps {
  result: PredictiveResult | null;
  isLoading?: boolean;
  width?: number;
  height?: number;
  compact?: boolean;
}

/**
 * PredictiveHologram - Volumetric probabilistic telemetry visualization
 * Maps predictive engine output to animated SVG overlay
 * Displays probability distribution and confidence metrics
 */
const PredictiveHologram: React.FC<PredictiveHologramProps> = ({
  result,
  isLoading = false,
  width = 400,
  height = 300,
  compact = false,
}) => {
  const { checkEntitlement } = useUser();

  if (!checkEntitlement('predictiveEngine')) {
    return <CalibrationPlaceholder />;
  }

  // Calculate SVG path for probability distribution curve
  const probabilityPath = useMemo(() => {
    if (!result) return '';

    const { probabilityDistribution } = result;
    const states: [string, number][] = [
      ['veryHealthy', probabilityDistribution.veryHealthy],
      ['healthy', probabilityDistribution.healthy],
      ['stable', probabilityDistribution.stable],
      ['weakening', probabilityDistribution.weakening],
      ['unhealthy', probabilityDistribution.unhealthy],
    ];

    const chartHeight = compact ? 80 : 120;
    const chartWidth = compact ? 300 : width - 40;
    const barWidth = chartWidth / 5;
    const maxValue = 0.7; // Max probability is typically around 60%

    let pathData = `M 0 ${chartHeight}`;

    for (let i = 0; i < states.length; i++) {
      const value = states[i][1];
      const x = (i + 0.5) * barWidth;
      const y = chartHeight - (value / maxValue) * chartHeight;
      pathData += ` L ${x} ${y}`;
    }

    pathData += ` L ${chartWidth} ${chartHeight}`;

    return pathData;
  }, [result, width, compact]);

  if (isLoading) {
    return (
      <div className={`flex flex-col gap-3 ${compact ? '' : 'p-4'}`}>
        <div className="text-[11px] font-mono text-[#525252] uppercase">
          Analyzing metrics...
        </div>
        <motion.div
          className={`bg-gradient-to-r from-[#06B6D4] to-[#D946EF] h-1 rounded-none`}
          animate={{ scaleX: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ originX: 0 }}
        />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-[11px] font-mono text-[#A3A3A3] uppercase">
        No analysis available
      </div>
    );
  }

  const { probabilityDistribution, riskMetrics, trendVector, confidenceScore } = result;

  // Determine bar colors based on status
  const getBarColor = (status: keyof typeof probabilityDistribution): string => {
    const healthStates = {
      veryHealthy: '#06B6D4',
      healthy: '#06B6D4',
      stable: '#A3A3A3',
      weakening: '#D946EF',
      unhealthy: '#D946EF',
    };
    return healthStates[status];
  };

  return (
    <div className={`flex flex-col gap-4 ${compact ? '' : 'bg-white border border-[#E5E5E5] rounded-none p-4'}`}>
      {/* Health classification range chart */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase tracking-wider">
          Health Classification Range
        </span>

        <svg
          viewBox={`0 0 ${compact ? 350 : width} ${compact ? 100 : height}`}
          className="w-full"
          style={{ height: compact ? 80 : 120 }}
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="20"
              patternUnits="userSpaceOnUse"
              opacity="0.1"
            >
              <path d={`M 40 0 L 0 0 0 20`} fill="none" stroke="#525252" strokeWidth="0.5" />
            </pattern>
          </defs>

          <rect
            width={compact ? 350 : width}
            height={compact ? 100 : height}
            fill="url(#grid)"
          />

          {/* Probability bars with animation */}
          {Object.entries(probabilityDistribution).map((entry, index) => {
            const [status, value] = entry as [
              keyof typeof probabilityDistribution,
              number
            ];
            const chartHeight = compact ? 80 : 120;
            const chartWidth = compact ? 350 : width - 40;
            const barWidth = chartWidth / 5;
            const spacing = 5;

            const x = index * barWidth + spacing / 2;
            const maxValue = 0.7;
            const barHeight = (value / maxValue) * chartHeight;
            const y = chartHeight - barHeight;

            return (
              <motion.rect
                key={status}
                x={x}
                y={y}
                width={barWidth - spacing}
                height={barHeight}
                fill={getBarColor(status)}
                opacity={0.8}
                initial={{ height: 0, y: chartHeight }}
                animate={{ height: barHeight, y: y }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
              />
            );
          })}

          {/* Confidence line */}
          <motion.line
            x1="0"
            y1={compact ? 80 * (1 - confidenceScore) : 120 * (1 - confidenceScore)}
            x2={compact ? 350 : width}
            y2={compact ? 80 * (1 - confidenceScore) : 120 * (1 - confidenceScore)}
            stroke="#06B6D4"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity={0.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          />
        </svg>

        {/* Legend */}
        <div className="grid grid-cols-5 gap-2 text-[9px] font-mono">
          {Object.entries(probabilityDistribution).map(([status, value]) => (
            <div key={status} className="flex flex-col gap-1">
              <div
                className="w-2 h-2 rounded-none"
                style={{ backgroundColor: getBarColor(status as any) }}
              />
              <span className="text-[#525252] uppercase truncate">
                {(value * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[#E5E5E5]">
        <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase tracking-wider">
          Risk Metrics
        </span>

        <div className="grid grid-cols-3 gap-3">
          {/* Volatility Index */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="font-mono text-[9px] text-[#A3A3A3] uppercase">Volatility</span>
            <span className="font-mono text-lg font-bold text-[#0A0A0A]">
              {riskMetrics.volatilityIndex}
            </span>
            <div className="w-full h-1 bg-[#F5F5F5] rounded-none overflow-hidden">
              <motion.div
                className="h-full bg-[#D946EF]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: riskMetrics.volatilityIndex / 100 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ originX: 0 }}
              />
            </div>
          </motion.div>

          {/* Liquidity Score */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="font-mono text-[9px] text-[#A3A3A3] uppercase">Liquidity</span>
            <span className="font-mono text-lg font-bold text-[#0A0A0A]">
              {riskMetrics.liquidityScore}
            </span>
            <div className="w-full h-1 bg-[#F5F5F5] rounded-none overflow-hidden">
              <motion.div
                className="h-full bg-[#06B6D4]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: riskMetrics.liquidityScore / 100 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ originX: 0 }}
              />
            </div>
          </motion.div>

          {/* Correlation Index */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="font-mono text-[9px] text-[#A3A3A3] uppercase">Correlation</span>
            <span className="font-mono text-lg font-bold text-[#0A0A0A]">
              {riskMetrics.correlationIndex}
            </span>
            <div className="w-full h-1 bg-[#F5F5F5] rounded-none overflow-hidden">
              <motion.div
                className="h-full bg-[#A3A3A3]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: riskMetrics.correlationIndex / 100 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ originX: 0 }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Market trend context */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5]">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase">
            Market Trend
          </span>
          <span
            className="font-mono text-sm font-bold uppercase"
            style={{
              color:
                trendVector.direction === 'UPTREND'
                  ? '#06B6D4'
                  : trendVector.direction === 'DOWNTREND'
                    ? '#D946EF'
                    : '#A3A3A3',
            }}
          >
            {trendVector.direction}
          </span>
        </div>

        <div className="flex flex-col gap-1 text-right">
          <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase">
            Momentum
          </span>
          <span className="font-mono text-sm font-bold text-[#0A0A0A]">
            {(trendVector.momentum * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default PredictiveHologram;
