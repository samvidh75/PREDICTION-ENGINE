import { useEffect, useRef, useState } from 'react';
import { colors } from '../design/tokens';

/**
 * Stock Price Chart Component
 * Displays candlestick charts with technical indicators
 * Uses Lightweight Charts library (free, TradingView-inspired)
 *
 * Features:
 * - Multiple timeframes (1D, 5D, 1M, 3M, 1Y)
 * - Candlestick charts
 * - Technical indicators (SMA, EMA, RSI, MACD)
 * - Interactive (zoom, pan, hover)
 * - Real-time updates
 */

export interface OHLC {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartProps {
  symbol: string;
  ohlcData?: OHLC[];
  timeframe?: '1D' | '5D' | '1M' | '3M' | '1Y';
  showIndicators?: boolean;
  height?: number;
}

export default function StockChart({
  symbol,
  ohlcData,
  timeframe = '1M',
  showIndicators = true,
  height = 400,
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(
    new Set(['SMA20'])
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChart = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!containerRef.current || !ohlcData || ohlcData.length === 0) {
          setIsLoading(false);
          return;
        }

        // Clear container
        containerRef.current.innerHTML = '';

        // Dynamically import Lightweight Charts
        const module = await import('lightweight-charts');
        const { createChart } = module;

        // Container may have unmounted (or ref changed) during the async import.
        if (!containerRef.current) {
          setIsLoading(false);
          return;
        }

        // Create chart
        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height,
          layout: {
            background: { color: colors.canvas || '#1a1a1a' },
            textColor: colors.textPrimary || '#fff',
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        } as any);

        // Add candlestick series
        const candlestickSeries = (chart as any).addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });

        // Convert OHLC data to chart format
        const chartData = ohlcData.map((candle) => ({
          time: candle.time as any,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        candlestickSeries.setData(chartData);

        // Add moving average if selected
        if (selectedIndicators.has('SMA20') && showIndicators) {
          const smaSeries = (chart as any).addLineSeries({
            color: '#3b82f6',
            lineWidth: 2,
          });

          const smaData = calculateSMA(ohlcData, 20);
          smaSeries.setData(smaData);
        }

        // Add EMA if selected
        if (selectedIndicators.has('EMA12') && showIndicators) {
          const emaSeries = (chart as any).addLineSeries({
            color: '#f59e0b',
            lineWidth: 2,
          });

          const emaData = calculateEMA(ohlcData, 12);
          emaSeries.setData(emaData);
        }

        // Fit content
        chart.timeScale().fitContent();

        // Handle resize
        const resizeHandler = () => {
          if (containerRef.current) {
            chart.applyOptions({
              width: containerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', resizeHandler);

        setIsLoading(false);

        return () => {
          window.removeEventListener('resize', resizeHandler);
          chart.remove();
        };
      } catch (err) {
        console.error('[StockChart] Failed to load chart:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
        setIsLoading(false);
      }
    };

    loadChart();
  }, [ohlcData, symbol, height, selectedIndicators, showIndicators]);

  const toggleIndicator = (indicator: string) => {
    const newIndicators = new Set(selectedIndicators);
    if (newIndicators.has(indicator)) {
      newIndicators.delete(indicator);
    } else {
      newIndicators.add(indicator);
    }
    setSelectedIndicators(newIndicators);
  };

  if (!ohlcData || ohlcData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: '8px',
          padding: '24px',
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
          color: colors.textSecondary,
        }}
      >
        <p>No chart data available for {symbol}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: colors.surface,
        borderRadius: '8px',
        padding: '16px',
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>
          {symbol} Price Chart ({timeframe})
        </h3>

        {showIndicators && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {['SMA20', 'EMA12', 'RSI', 'MACD'].map((indicator) => (
              <button
                key={indicator}
                onClick={() => toggleIndicator(indicator)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: selectedIndicators.has(indicator)
                    ? colors.primary || '#3b82f6'
                    : colors.canvas,
                  color: selectedIndicators.has(indicator) ? '#fff' : colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                {indicator}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Container */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
          Loading chart...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>Error: {error}</div>
      )}

      {!isLoading && !error && <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />}

      {/* Footer Info */}
      <div style={{ fontSize: '12px', color: colors.textTertiary }}>
        <p style={{ margin: 0 }}>💡 Tip: Scroll to zoom, click-drag to pan, hover for details</p>
      </div>
    </div>
  );
}

/**
 * Calculate Simple Moving Average (SMA)
 */
function calculateSMA(data: OHLC[], period: number): Array<{ time: string; value: number }> {
  const sma: Array<{ time: string; value: number }> = [];

  for (let i = period - 1; i < data.length; i++) {
    const sum = data
      .slice(i - period + 1, i + 1)
      .reduce((acc, candle) => acc + candle.close, 0);

    sma.push({
      time: data[i].time,
      value: sum / period,
    });
  }

  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
function calculateEMA(
  data: OHLC[],
  period: number
): Array<{ time: string; value: number }> {
  const ema: Array<{ time: string; value: number }> = [];
  const multiplier = 2 / (period + 1);

  let prevEMA =
    data.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;

  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i].close - prevEMA) * multiplier + prevEMA;
    ema.push({
      time: data[i].time,
      value: currentEMA,
    });
    prevEMA = currentEMA;
  }

  return ema;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(data: OHLC[], period: number = 14): number[] {
  const rsi: number[] = [];
  const changes: number[] = [];

  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i];
    else losses += Math.abs(changes[i]);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgGain / (avgLoss || 1);
  rsi.push(100 - 100 / (1 + rs));

  for (let i = period; i < changes.length; i++) {
    if (changes[i] > 0) {
      avgGain = (avgGain * (period - 1) + changes[i]) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
    }

    rs = avgGain / (avgLoss || 1);
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}
