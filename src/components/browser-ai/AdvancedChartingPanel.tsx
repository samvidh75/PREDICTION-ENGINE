/**
 * Advanced Charting Panel
 * Displays technical indicators: RSI, MACD, Bollinger Bands, Moving Averages
 */

import { useEffect, useState } from 'react';
import { technicalIndicatorsService, type TechnicalIndicators, type ChartSignal, type CandleData } from '../../utils/technicalIndicatorsService';

interface ChartingData {
  indicators: TechnicalIndicators | null;
  signal: ChartSignal | null;
  loading: boolean;
  unavailable: boolean;
}

export default function AdvancedChartingPanel({ symbol = "SMPH" }: { symbol?: string }) {
  const [chartData, setChartData] = useState<ChartingData>({
    indicators: null,
    signal: null,
    loading: true,
    unavailable: false,
  });
  const [expanded, setExpanded] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<'rsi' | 'macd' | 'bb' | 'ma'>('rsi');

  useEffect(() => {
    const loadChartData = async () => {
      try {
        // Real PSE daily prices — never simulated. If the API can't serve
        // history for this symbol, the panel shows an honest "unavailable"
        // state instead of fabricating candles.
        const candles = await fetchRealCandles(symbol);
        if (candles.length === 0) {
          setChartData({ indicators: null, signal: null, loading: false, unavailable: true });
          return;
        }

        const indicators = technicalIndicatorsService.calculateAllIndicators(candles);
        const signal = technicalIndicatorsService.generateSignal(indicators, candles.slice(-5));

        setChartData({ indicators, signal, loading: false, unavailable: false });
      } catch (error) {
        console.error('Failed to load chart data:', error);
        setChartData({ indicators: null, signal: null, loading: false, unavailable: true });
      }
    };

    loadChartData();
  }, [symbol]);

  if (chartData.loading) {
    return null;
  }

  if (chartData.unavailable || !chartData.indicators || !chartData.signal) {
    return (
      <div
        style={{
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          backgroundColor: '#fafafa',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>📈 Technical Analysis</div>
        <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
          Real PSE price data for {symbol} isn't available right now — indicators are not shown rather than simulated.
        </div>
      </div>
    );
  }

  const { indicators, signal } = chartData;

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        <div style={{ display: 'grid', gap: 2 }}>
          <span>📈 Technical Analysis — {symbol}</span>
          <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#666' }}>
            Computed from real PSE daily prices
          </span>
        </div>
        <span style={{ fontSize: '16px' }}>{expanded ? '▼' : '▶'}</span>
      </button>

      {!expanded && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          RSI: {indicators.rsi.toFixed(1)} | MACD: {indicators.macd.histogram > 0 ? '🟢' : '🔴'} | Trend: {indicators.trend}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          {/* Signal Summary */}
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: signal.type === 'buy' ? '#d4edda' : signal.type === 'sell' ? '#f8d7da' : '#fff3cd',
              border: `1px solid ${signal.type === 'buy' ? '#28a745' : signal.type === 'sell' ? '#dc3545' : '#ffc107'}`,
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                {signal.type === 'buy' ? '🟢 BUY SIGNAL' : signal.type === 'sell' ? '🔴 SELL SIGNAL' : '🟡 HOLD'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Confidence: {signal.confidence.toFixed(0)}%</div>
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
              {signal.reasons.map((reason, idx) => (
                <div key={idx}>{reason}</div>
              ))}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
              Support: ₱{signal.supportLevel.toFixed(2)} | Resistance: ₱{signal.resistanceLevel.toFixed(2)}
            </div>
          </div>

          {/* Indicator Tabs */}
          <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
            {(['rsi', 'macd', 'bb', 'ma'] as const).map((ind) => (
              <button
                key={ind}
                onClick={() => setSelectedIndicator(ind)}
                style={{
                  padding: '8px',
                  backgroundColor: selectedIndicator === ind ? '#0084ff' : '#e0e0e0',
                  color: selectedIndicator === ind ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              >
                {ind === 'rsi' ? 'RSI' : ind === 'macd' ? 'MACD' : ind === 'bb' ? 'BB' : 'MA'}
              </button>
            ))}
          </div>

          {/* RSI Indicator */}
          {selectedIndicator === 'rsi' && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>📊 RSI (14)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>RSI Value</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{indicators.rsi.toFixed(1)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Signal</div>
                  <div style={{ fontWeight: 'bold' }}>
                    {indicators.rsi > 70 ? '🔴 Overbought' : indicators.rsi < 30 ? '🟢 Oversold' : '🟡 Neutral'}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', position: 'relative' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${indicators.rsi}%`,
                        backgroundColor: indicators.rsi > 70 ? '#ea4335' : indicators.rsi < 30 ? '#34a853' : '#ffc107',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MACD Indicator */}
          {selectedIndicator === 'macd' && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>📈 MACD</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  fontSize: '11px',
                  marginBottom: '8px',
                }}
              >
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>MACD Line</div>
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: indicators.macd.line > 0 ? '#34a853' : '#ea4335',
                    }}
                  >
                    {indicators.macd.line.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Signal</div>
                  <div style={{ fontWeight: 'bold' }}>{indicators.macd.signal.toFixed(4)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Histogram</div>
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: indicators.macd.histogram > 0 ? '#34a853' : '#ea4335',
                    }}
                  >
                    {indicators.macd.histogram > 0 ? '🟢' : '🔴'} {Math.abs(indicators.macd.histogram).toFixed(4)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                {indicators.macd.histogram > 0 ? '🟢 Bullish momentum' : '🔴 Bearish momentum'}
              </div>
            </div>
          )}

          {/* Bollinger Bands */}
          {selectedIndicator === 'bb' && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>📊 Bollinger Bands (20, 2)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Upper Band</div>
                  <div style={{ fontWeight: 'bold', color: '#ea4335' }}>₱{indicators.bollingerBands.upper.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Middle (SMA)</div>
                  <div style={{ fontWeight: 'bold' }}>₱{indicators.bollingerBands.middle.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Lower Band</div>
                  <div style={{ fontWeight: 'bold', color: '#34a853' }}>₱{indicators.bollingerBands.lower.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                Band Width: {indicators.bollingerBands.bandwidth.toFixed(4)} | %B: {indicators.bollingerBands.percentB.toFixed(1)}%
                {indicators.bollingerBands.percentB < 20
                  ? ' - Price near lower band (potential bounce)'
                  : indicators.bollingerBands.percentB > 80
                    ? ' - Price near upper band (potential pullback)'
                    : ' - Price in middle of range'}
              </div>
            </div>
          )}

          {/* Moving Averages */}
          {selectedIndicator === 'ma' && (
            <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '6px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>📈 Moving Averages</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>SMA 20</div>
                  <div style={{ fontWeight: 'bold' }}>₱{indicators.movingAverages.sma20.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>SMA 50</div>
                  <div style={{ fontWeight: 'bold' }}>₱{indicators.movingAverages.sma50.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>EMA 12</div>
                  <div style={{ fontWeight: 'bold' }}>₱{indicators.movingAverages.ema12.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>EMA 26</div>
                  <div style={{ fontWeight: 'bold' }}>₱{indicators.movingAverages.ema26.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>
                Trend: {indicators.trend === 'bullish' ? '🟢 Bullish (above MA20)' : indicators.trend === 'bearish' ? '🔴 Bearish (below MA20)' : '🟡 Neutral'}
              </div>
            </div>
          )}

          {/* Trend & Strength */}
          <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px', marginBottom: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
              <div>
                <div style={{ color: '#0d47a1', marginBottom: '4px' }}>Current Trend</div>
                <div style={{ fontWeight: 'bold', color: '#1976d2', fontSize: '12px' }}>
                  {indicators.trend === 'bullish' ? '🟢 Bullish' : indicators.trend === 'bearish' ? '🔴 Bearish' : '🟡 Neutral'}
                </div>
              </div>
              <div>
                <div style={{ color: '#0d47a1', marginBottom: '4px' }}>Trend Strength</div>
                <div style={{ fontWeight: 'bold', color: '#1976d2', fontSize: '12px' }}>{indicators.strength}% Strong</div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div
            style={{
              padding: '10px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#856404',
            }}
          >
            ⚠️ <strong>Disclaimer:</strong> Technical indicators are for educational purposes only. Past performance is not indicative of future results. Always combine with fundamental analysis before trading.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Fetch real PSE daily price history for a symbol from the live API and
 * map it to CandleData. Falls back across timeframes (3M → 1Y → 1M) so a
 * thin or missing window degrades gracefully. Returns [] when no real data
 * exists — callers must render an honest unavailable state, never simulate.
 */
async function fetchRealCandles(symbol: string): Promise<CandleData[]> {
  const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
  if (!res.ok) return [];
  const payload = (await res.json()) as {
    // The real /api/stock/:symbol response returns ONE flat daily history —
    // priceChart: Array<{ date, close, volume }> — from EODHD. It does NOT
    // ship a pre-bucketed `priceHistory` map; that is only built client-side
    // by StockPage (see buildPriceHistoryFromFlatSeries). Read priceChart
    // directly so this panel renders the actual price series instead of
    // falling through to an empty/unavailable state. The priceHistory branch
    // is kept as a defensive fallback in case a future endpoint adds buckets.
    priceChart?: Array<{ date?: string; time?: string; label?: string; price?: number; close?: number; volume?: number }>;
    priceHistory?: Record<
      string,
      Array<{ label?: string; time?: string; date?: string; price?: number; open?: number; high?: number; low?: number; close?: number; volume?: number }>
    >;
  };
  const bucketed = payload?.priceHistory;
  const series =
    (bucketed && (bucketed['3M'] ?? bucketed['1Y'] ?? bucketed['1M'])) ??
    payload?.priceChart ??
    [];
  return toCandles(series);
}

/** Map a real price-history series to CandleData (ms timestamps, OHLC with flat price/close fallback). Exported for tests. */
export function toCandles(
  series: Array<{ label?: string; time?: string; date?: string; price?: number; open?: number; high?: number; low?: number; close?: number; volume?: number }>,
): CandleData[] {
  return series
    .map((item) => {
      const timeValue = item.time ?? item.date ?? item.label;
      let timestamp =
        typeof timeValue === 'number'
          ? timeValue
          : timeValue
            ? Date.parse(String(timeValue))
            : NaN;
      if (Number.isNaN(timestamp)) timestamp = 0;
      // The real daily feed (EODHD free tier) carries only close + volume.
      // When no distinct OHLC is present, represent the day as a *flat* candle
      // (open = high = low = close) — an honest price line, never a fabricated
      // intraday range. Using 0 would draw a misleading candle that crashes
      // from zero and yields invalid high/low (high < close).
      const close = item.close ?? item.price ?? 0;
      const open = item.open ?? close;
      const high = item.high ?? close;
      const low = item.low ?? close;
      const volume = item.volume ?? 0;
      return { timestamp, open, high, low, close, volume };
    })
    .filter((c) => c.close > 0 && c.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}
