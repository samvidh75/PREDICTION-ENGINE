import { colors } from '../design/tokens';

/**
 * Simple Stock Chart - Fallback/Placeholder
 * Shows stock price trends without external charting library
 * TODO: Replace with Lightweight Charts once installed
 */

export interface OHLC {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SimpleChartProps {
  symbol: string;
  ohlcData?: OHLC[];
  timeframe?: '1D' | '5D' | '1M' | '3M' | '1Y';
}

export default function SimpleStockChart({
  symbol,
  ohlcData = [],
  timeframe = '1M',
}: SimpleChartProps) {

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
        <small>
          💡 To enable full charting: npm install lightweight-charts @types/lightweight-charts
        </small>
      </div>
    );
  }

  const prices = ohlcData.map((d) => d.close);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || 1;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        borderRadius: '8px',
        padding: '24px',
        border: `1px solid ${colors.border}`,
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', color: colors.textPrimary, fontSize: '16px' }}>
        {symbol} Price Trend ({timeframe})
      </h3>

      {/* Simple Text Chart */}
      <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' }}>
        {ohlcData.slice(-20).map((candle, idx) => {
          const height = ((candle.close - minPrice) / range) * 100;
          const barChar = '█'.repeat(Math.max(1, Math.round(height / 5)));
          const color = candle.close >= candle.open ? '#22c55e' : '#ef4444';

          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <span style={{ width: '40px', fontSize: '11px', color: colors.textTertiary }}>
                {candle.time}
              </span>
              <span style={{ color, display: 'flex', alignItems: 'flex-end', height: '20px' }}>
                {barChar}
              </span>
              <span style={{ width: '50px', fontSize: '11px', color: colors.textSecondary }}>
                ₹{candle.close.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: colors.textTertiary }}>
        <p style={{ margin: 0 }}>
          📊 Simple text-based chart (showing last 20 days)
        </p>
        <p style={{ margin: '8px 0 0' }}>
          ✨ To unlock full charting with TradingView-style interactivity:
        </p>
        <code
          style={{
            display: 'block',
            backgroundColor: colors.canvas,
            padding: '8px 12px',
            borderRadius: '4px',
            marginTop: '8px',
            color: '#22c55e',
          }}
        >
          npm install lightweight-charts @types/lightweight-charts
        </code>
      </div>
    </div>
  );
}
