import { useParams } from "react-router-dom";
import { useState } from "react";
import { useQuote } from "../hooks/useQuote";
import { useOHLCData } from "../hooks/useOHLCData";
import StockChart from "../components/StockChart";
import { colors } from "../design/tokens";

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const [timeframe, setTimeframe] = useState<'1D' | '5D' | '1M' | '3M' | '1Y'>('1M');

  const { quote, loading, error } = useQuote({
    symbol: symbol || '',
    refreshInterval: 5000,
    enabled: !!symbol
  });

  const { data: ohlcData, loading: chartLoading } = useOHLCData({
    symbol: symbol || '',
    timeframe,
    enabled: !!symbol,
    refreshInterval: 60000
  });

  if (!symbol) {
    return (
      <div style={{ padding: '16px', color: colors.textPrimary }}>
        <p>Symbol not provided</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', color: colors.textPrimary }}>
        <p>Loading quote for {symbol}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', color: colors.textPrimary }}>
        <p style={{ color: '#ff4444' }}>Error: {error.message}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '8px 16px' }}>
          Refresh
        </button>
      </div>
    );
  }

  if (!quote) {
    return (
      <div style={{ padding: '16px', color: colors.textPrimary }}>
        <p>No data available for {symbol}</p>
      </div>
    );
  }

  const changeColor = quote.changePercent >= 0 ? '#22c55e' : '#ef4444';
  const displayPrice = typeof quote.price === 'number' ? quote.price.toFixed(2) : 'N/A';
  const displayChange = typeof quote.changePercent === 'number' ? quote.changePercent.toFixed(2) : 'N/A';
  const displayVolume = typeof quote.volume === 'number' ? (quote.volume / 1e6).toFixed(1) : 'N/A';

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '16px',
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: '700' }}>
          {quote.symbol || symbol}
        </h1>
        <p style={{ margin: '0', color: colors.textSecondary, fontSize: '12px' }}>
          {quote.source && `From ${quote.source}`}
          {quote.cached && ' (cached)'}
        </p>
      </div>

      {/* Price Card */}
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: 'clamp(32px, 10vw, 56px)', fontWeight: '700', marginBottom: '8px', lineHeight: '1' }}>
            ₹{displayPrice}
          </div>
          <div style={{
            fontSize: 'clamp(16px, 4vw, 24px)',
            fontWeight: '600',
            color: changeColor
          }}>
            {quote.changePercent >= 0 ? '+' : ''}{displayChange}%
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '16px'
        }}>
          <div>
            <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '11px', textTransform: 'uppercase' }}>
              VOLUME
            </p>
            <p style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
              {displayVolume}M
            </p>
          </div>

          {quote.bid && quote.ask && (
            <div>
              <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '11px', textTransform: 'uppercase' }}>
                BID-ASK
              </p>
              <p style={{ margin: '0', fontSize: '12px', fontWeight: '600' }}>
                ₹{quote.bid.toFixed(0)} - {quote.ask.toFixed(0)}
              </p>
            </div>
          )}

          {quote.high && (
            <div>
              <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '11px', textTransform: 'uppercase' }}>
                HIGH
              </p>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
                ₹{quote.high.toFixed(0)}
              </p>
            </div>
          )}

          {quote.low && (
            <div>
              <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '11px', textTransform: 'uppercase' }}>
                LOW
              </p>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
                ₹{quote.low.toFixed(0)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <h2 style={{ margin: '0', fontSize: 'clamp(16px, 5vw, 20px)', fontWeight: '600' }}>Price Chart</h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['1D', '5D', '1M', '3M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: timeframe === tf ? (colors.primary || '#3b82f6') : colors.canvas,
                  color: timeframe === tf ? '#fff' : colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {chartLoading ? (
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            Loading chart...
          </div>
        ) : (
          <StockChart
            symbol={symbol || ''}
            ohlcData={ohlcData || []}
            timeframe={timeframe}
            height={Math.max(300, Math.min(500, window.innerHeight / 2))}
          />
        )}
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '10px 20px',
          backgroundColor: colors.primary || '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Refresh Quote
      </button>
    </div>
  );
}
