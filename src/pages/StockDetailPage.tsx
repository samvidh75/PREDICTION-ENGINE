import { useParams } from "react-router-dom";
import { useQuote } from "../hooks/useQuote";
import { colors } from "../design/tokens";

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const { quote, loading, error } = useQuote({
    symbol: symbol || '',
    refreshInterval: 5000,
    enabled: !!symbol
  });

  if (!symbol) {
    return (
      <div style={{ padding: '40px', color: colors.textPrimary }}>
        <p>Symbol not provided</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: colors.textPrimary }}>
        <p>Loading quote for {symbol}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', color: colors.textPrimary }}>
        <p style={{ color: '#ff4444' }}>Error: {error.message}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Refresh
        </button>
      </div>
    );
  }

  if (!quote) {
    return (
      <div style={{ padding: '40px', color: colors.textPrimary }}>
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
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 24px',
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700' }}>
          {quote.symbol || symbol}
        </h1>
        <p style={{ margin: '0', color: colors.textSecondary, fontSize: '14px' }}>
          {quote.source && `From ${quote.source}`}
          {quote.cached && ' (cached)'}
        </p>
      </div>

      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '8px' }}>
            ₹{displayPrice}
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '600',
            color: changeColor
          }}>
            {quote.changePercent >= 0 ? '+' : ''}{displayChange}%
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '20px'
        }}>
          <div>
            <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '12px' }}>
              VOLUME
            </p>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
              {displayVolume}M
            </p>
          </div>

          {quote.bid && quote.ask && (
            <div>
              <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '12px' }}>
                BID-ASK SPREAD
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                ₹{quote.bid.toFixed(2)} - ₹{quote.ask.toFixed(2)}
              </p>
            </div>
          )}

          {quote.high && (
            <div>
              <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '12px' }}>
                52-WEEK HIGH
              </p>
              <p style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                ₹{quote.high.toFixed(2)}
              </p>
            </div>
          )}

          {quote.low && (
            <div>
              <p style={{ margin: '0 0 4px 0', color: colors.textSecondary, fontSize: '12px' }}>
                52-WEEK LOW
              </p>
              <p style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
                ₹{quote.low.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 24px',
          backgroundColor: colors.primary || '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Refresh Quote
      </button>
    </div>
  );
}
