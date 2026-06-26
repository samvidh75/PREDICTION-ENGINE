import { useState } from 'react';
import { TimeframeButtons } from './TimeframeButtons';

interface PriceChartAdvancedProps {
  symbol: string;
  prices?: number[];
  timestamps?: string[];
}

export function PriceChartAdvanced({ symbol, prices = [], timestamps = [] }: PriceChartAdvancedProps) {
  const [timeframe, setTimeframe] = useState('1Y');

  const isUp = prices.length > 1 && (prices[prices.length - 1] >= prices[0]);
  const lineColor = isUp ? '#1A7F4B' : '#DC2626';
  const fillColor = isUp ? 'rgba(26,127,75,0.1)' : 'rgba(220,38,38,0.1)';

  const minP = Math.min(...prices) * 0.995;
  const maxP = Math.max(...prices) * 1.005;
  const range = maxP - minP || 1;

  const w = 600;
  const h = 220;
  const pts = prices.map((p, i) => {
    const x = (i / Math.max(prices.length - 1, 1)) * w;
    const y = h - ((p - minP) / range) * h * 0.85 - h * 0.075;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ padding: '0 0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1A1A1A' }}>Price Chart</h3>
        <TimeframeButtons selected={timeframe} onSelect={setTimeframe} />
      </div>
      {prices.length > 1 ? (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill={`url(#grad-${symbol})`} points={`0,${h} ${pts} ${w},${h}`} />
          <polyline fill="none" stroke={lineColor} strokeWidth="2" points={pts} />
        </svg>
      ) : (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 13 }}>
          Price history not available
        </div>
      )}
    </div>
  );
}
