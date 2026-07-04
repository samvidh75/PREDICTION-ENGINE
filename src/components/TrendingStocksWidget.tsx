import { useTrendingStocks } from '../hooks/useTrendingStocks';
import { colors } from '../design/tokens';

export default function TrendingStocksWidget() {
  const { trending, loading, error, isConnected, reconnect } = useTrendingStocks();

  if (error && !isConnected) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: colors.surface,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: colors.textPrimary, fontWeight: '600', marginBottom: '12px' }}>
            Trending Stocks
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
            WebSocket connection unavailable
          </p>
          <button
            onClick={reconnect}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.primary || '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: colors.surface,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginTop: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Trending Stocks
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
              marginLeft: '8px',
            }}
          />
        </h2>
        <span style={{ fontSize: '12px', color: colors.textSecondary }}>
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {loading ? (
        <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '20px 0' }}>
          Loading trending stocks...
        </p>
      ) : trending.length === 0 ? (
        <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '20px 0' }}>
          No trending stocks at this moment
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {trending.slice(0, 10).map((stock, idx) => (
            <div
              key={stock.symbol}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: colors.canvas,
                borderRadius: '6px',
                borderLeft: `3px solid ${idx < 3 ? '#fbbf24' : colors.border}`,
              }}
            >
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '14px' }}>
                  {idx + 1}. {stock.symbol}
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: colors.textSecondary }}>
                  Vol: {stock.volume.toFixed(1)}M • Up {stock.inMinutesUp}min
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '14px' }}>
                  ₹{stock.price.toFixed(2)}
                </p>
                <p
                  style={{
                    margin: '0',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: stock.changePercent >= 0 ? '#22c55e' : '#ef4444',
                  }}
                >
                  {stock.changePercent >= 0 ? '+' : ''}
                  {stock.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '16px', margin: 0 }}>
        Note: WebSocket trending requires backend server running on {new URL(import.meta.env.VITE_WS_URL || 'ws://localhost:3001/api/ws/trending').hostname}
      </p>
    </div>
  );
}
