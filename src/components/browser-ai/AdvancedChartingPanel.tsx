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
}

export default function AdvancedChartingPanel() {
  const [chartData, setChartData] = useState<ChartingData>({ indicators: null, signal: null, loading: true });
  const [expanded, setExpanded] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<'rsi' | 'macd' | 'bb' | 'ma'>('rsi');

  useEffect(() => {
    const loadChartData = async () => {
      try {
        // Simulated candlestick data (would come from market data API in production)
        const mockCandles = generateMockCandles();

        const indicators = technicalIndicatorsService.calculateAllIndicators(mockCandles);
        const signal = technicalIndicatorsService.generateSignal(indicators, mockCandles.slice(-5));

        setChartData({ indicators, signal, loading: false });
      } catch (error) {
        console.error('Failed to load chart data:', error);
        setChartData({ indicators: null, signal: null, loading: false });
      }
    };

    loadChartData();
  }, []);

  if (chartData.loading || !chartData.indicators || !chartData.signal) {
    return null;
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
        <div>📈 Technical Analysis</div>
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
              Support: ₹{signal.supportLevel.toFixed(2)} | Resistance: ₹{signal.resistanceLevel.toFixed(2)}
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
                  <div style={{ fontWeight: 'bold', color: '#ea4335' }}>₹{indicators.bollingerBands.upper.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Middle (SMA)</div>
                  <div style={{ fontWeight: 'bold' }}>₹{indicators.bollingerBands.middle.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>Lower Band</div>
                  <div style={{ fontWeight: 'bold', color: '#34a853' }}>₹{indicators.bollingerBands.lower.toFixed(2)}</div>
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
                  <div style={{ fontWeight: 'bold' }}>₹{indicators.movingAverages.sma20.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>SMA 50</div>
                  <div style={{ fontWeight: 'bold' }}>₹{indicators.movingAverages.sma50.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>EMA 12</div>
                  <div style={{ fontWeight: 'bold' }}>₹{indicators.movingAverages.ema12.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color: '#666', marginBottom: '4px' }}>EMA 26</div>
                  <div style={{ fontWeight: 'bold' }}>₹{indicators.movingAverages.ema26.toFixed(2)}</div>
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
 * Generate mock candlestick data for demonstration
 */
function generateMockCandles(): CandleData[] {
  const candles: CandleData[] = [];
  let basePrice = 3500;

  for (let i = 0; i < 60; i++) {
    const timestamp = Date.now() - (60 - i) * 24 * 60 * 60 * 1000;
    const change = (Math.random() - 0.5) * 100;
    const open = basePrice + change;
    const close = basePrice + change + (Math.random() - 0.5) * 50;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close;
  }

  return candles;
}
