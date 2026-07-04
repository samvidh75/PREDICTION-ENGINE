import { useEffect, useState } from 'react';
import { zerodhaService, type ZerodhaPortfolio, type PortfolioMetrics } from '../services/brokers/ZerodhaService';
import { colors } from '../design/tokens';

export default function PortfolioDetailPage() {
  const [portfolio, setPortfolio] = useState<ZerodhaPortfolio | null>(null);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadPortfolio();
    const interval = setInterval(loadPortfolio, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      if (!zerodhaService.isAuthenticated()) {
        setIsAuthenticated(false);
        setError('Not connected to Zerodha. Please authenticate first.');
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      const portfolio = await zerodhaService.getPortfolio();
      if (portfolio) {
        setPortfolio(portfolio);
        const calculatedMetrics = zerodhaService.calculateMetrics(portfolio);
        setMetrics(calculatedMetrics);
        setError(null);
      } else {
        setError('Failed to load portfolio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = () => {
    const oauthUrl = zerodhaService.initiateOAuth();
    window.location.href = oauthUrl;
  };

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ color: colors.textPrimary, marginBottom: '24px' }}>Portfolio</h1>
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: '8px',
            padding: '32px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ color: colors.textPrimary, marginBottom: '16px' }}>
            Connect your Zerodha account to view portfolio and P&L
          </p>
          <button
            onClick={handleAuthenticate}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            Connect Zerodha
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ color: colors.textPrimary }}>Loading portfolio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
        <button
          onClick={loadPortfolio}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!portfolio || !metrics) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ color: colors.textPrimary }}>No portfolio data available</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ color: colors.textPrimary, marginBottom: '24px' }}>Portfolio</h1>

      {/* Portfolio Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: '8px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 8px 0' }}>
            Total Value
          </p>
          <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: '700', margin: '0' }}>
            ₹{Math.round(portfolio.totalValue).toLocaleString()}
          </p>
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: '8px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 8px 0' }}>
            Total P&L
          </p>
          <p
            style={{
              color: portfolio.totalPnl >= 0 ? '#22c55e' : '#ef4444',
              fontSize: '24px',
              fontWeight: '700',
              margin: '0',
            }}
          >
            ₹{Math.round(portfolio.totalPnl).toLocaleString()} ({portfolio.totalPnlPercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      {/* Risk Metrics */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Risk Metrics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { label: 'Volatility', value: (metrics.volatility * 100).toFixed(2) + '%' },
            { label: 'Sharpe Ratio', value: metrics.sharpeRatio.toFixed(2) },
            { label: 'Value at Risk (95%)', value: '₹' + Math.round(metrics.valueAtRisk).toLocaleString() },
          ].map((metric) => (
            <div
              key={metric.label}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 8px 0' }}>
                {metric.label}
              </p>
              <p style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: '600', margin: '0' }}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h2 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Holdings</h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          {portfolio.holdings.map((holding) => (
            <div
              key={holding.symbol}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div>
                <p style={{ color: colors.textPrimary, fontWeight: '600', margin: '0 0 4px 0' }}>
                  {holding.symbol}
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0' }}>
                  {holding.quantity} units @ ₹{holding.entryPrice.toFixed(2)}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ color: colors.textPrimary, fontWeight: '600', margin: '0 0 4px 0' }}>
                  ₹{holding.value.toLocaleString()}
                </p>
                <p
                  style={{
                    color: holding.pnl >= 0 ? '#22c55e' : '#ef4444',
                    fontSize: '12px',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  {holding.pnl >= 0 ? '+' : ''}₹{Math.round(holding.pnl).toLocaleString()} ({holding.pnlPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          onClick={loadPortfolio}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Refresh
        </button>
      </div>

      <p style={{ color: colors.textTertiary, fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
        Last updated: {new Date(portfolio.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
