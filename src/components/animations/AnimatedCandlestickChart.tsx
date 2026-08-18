/**
 * AnimatedCandlestickChart — Professional SVG candlestick visualization
 * with smooth price action animations. Styled for institutional trading.
 *
 * Real candlestick OHLC data → SVG wick+body → Framer Motion entrance
 */

import { useState, useMemo } from "react";
import { motion, type Variants } from "framer-motion";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface AnimatedCandlestickChartProps {
  candles: Candle[];
  width?: number;
  height?: number;
  padding?: number;
}

export function AnimatedCandlestickChart({
  candles,
  width = 1000,
  height = 400,
  padding = 40,
}: AnimatedCandlestickChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { minPrice, maxPrice, candleWidth, chartWidth } = useMemo(() => {
    const prices = candles.flatMap((c) => [c.high, c.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const margin = (max - min) * 0.1;
    const cw = (width - padding * 2) / Math.max(candles.length, 1);
    return {
      minPrice: min - margin,
      maxPrice: max + margin,
      candleWidth: cw,
      chartWidth: width - padding * 2,
    };
  }, [candles, width, padding]);

  const priceToY = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return height - padding - ratio * (height - padding * 2);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.1,
      },
    },
  };

  const candleVariants: Variants = {
    hidden: { opacity: 0, scaleY: 0 },
    visible: {
      opacity: 1,
      scaleY: 1,
      transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const },
    },
  };

  return (
    <svg
      width={width}
      height={height}
      style={{
        background: "#FAFAF7",
        borderRadius: 8,
        border: "1px solid rgba(10,10,10,0.08)",
      }}
    >
      {/* Grid lines */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = padding + ((height - padding * 2) / 4) * i;
        return (
          <line
            key={`grid-${i}`}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="rgba(10,10,10,0.04)"
            strokeWidth="1"
          />
        );
      })}

      {/* Candlesticks */}
      <motion.g
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {candles.map((candle, idx) => {
          const x = padding + idx * candleWidth + candleWidth / 2;
          const openY = priceToY(candle.open);
          const closeY = priceToY(candle.close);
          const highY = priceToY(candle.high);
          const lowY = priceToY(candle.low);

          const isUp = candle.close >= candle.open;
          const bodyTop = isUp ? closeY : openY;
          const bodyHeight = Math.abs(closeY - openY) || 1;
          const bodyColor = isUp ? "#1A7F37" : "#D93025";
          const wickColor = isUp ? "#1A7F3799" : "#D9302599";

          return (
            <motion.g
              key={`candle-${idx}`}
              variants={candleVariants}
              onMouseEnter={() => setHoveredIndex(idx)}
              style={{
                cursor: "pointer",
                filter: hoveredIndex === idx ? "drop-shadow(0 2px 8px rgba(26,127,55,0.2))" : "none",
              }}
            >
              {/* Wick */}
              <line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={wickColor}
                strokeWidth="1"
              />

              {/* Body */}
              <rect
                x={x - candleWidth * 0.3}
                y={bodyTop}
                width={candleWidth * 0.6}
                height={bodyHeight}
                fill={bodyColor}
                stroke={bodyColor}
                strokeWidth="1"
                rx="1"
              />

              {/* Hover label */}
              {hoveredIndex === idx && (
                <motion.text
                  x={x}
                  y={bodyTop - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#0A0A0A"
                  fontWeight="600"
                  fontFamily="IBM Plex Mono"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: -5 }}
                >
                  ₱{candle.close.toFixed(2)}
                </motion.text>
              )}
            </motion.g>
          );
        })}
      </motion.g>

      {/* X-axis labels */}
      {candles.map((candle, idx) => {
        if (idx % Math.ceil(candles.length / 5) !== 0) return null;
        const x = padding + idx * candleWidth + candleWidth / 2;
        return (
          <text
            key={`label-${idx}`}
            x={x}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#6B6B66"
            fontFamily="IBM Plex Mono"
          >
            {candle.time}
          </text>
        );
      })}
    </svg>
  );
}
