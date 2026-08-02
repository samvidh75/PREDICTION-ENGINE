import { useState, useEffect, useCallback } from 'react';
import { colors, space, radius, typography } from '../../design/tokens';
import { formatNumber } from '../../services/ui/dataFormatting';

interface PrecisionHolding {
  ticker: string;
  currentShares: number;
  totalInvestedValue: number;
  avgBuyPrice: number;
  currentPrice: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  peRatio: number | null;
  debtToEquity: number | null;
  rsi14: number | null;
  sma50: number | null;
  sma200: number | null;
  sector: string | null;
  trendState: string | null;
  dataMode: string | null;
}

interface PrecisionSummary {
  holdingsCount: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number | null;
}

interface PrecisionResponse {
  userId: string;
  generatedAt: string;
  summary: PrecisionSummary;
  holdings: PrecisionHolding[];
}

interface PrecisionPortfolioTableProps {
  userId: string;
}

const cellStyle: React.CSSProperties = {
  padding: `${space[2]} ${space[3]}`,
  fontSize: 11,
  fontFamily: typography.fontFamily,
  borderBottom: `1px solid ${colors.hairline}`,
  whiteSpace: 'nowrap',
};

const headerStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
  color: colors.textSecondary,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  fontSize: 9,
  position: 'sticky' as const,
  top: 0,
  background: colors.surface,
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
};

function formatPrice(v: number | null, decimals = 2): string {
  if (v === null || v === undefined) return '—';
  return `₱${v.toFixed(decimals)}`;
}

function formatPct(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function PrecisionPortfolioTable({ userId }: PrecisionPortfolioTableProps) {
  const [data, setData] = useState<PrecisionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrecision = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/portfolio/precision/${userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PrecisionResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio precision data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchPrecision(); }, [fetchPrecision]);

  if (loading) {
    return (
      <div style={{ padding: space[8], textAlign: 'center', color: colors.textTertiary, fontSize: 12 }}>
        Loading 3rd-decimal precision portfolio...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: space[8], textAlign: 'center' }}>
        <p style={{ color: colors.accentRed, fontSize: 12, margin: 0 }}>{error}</p>
        <button
          onClick={fetchPrecision}
          style={{
            marginTop: space[4], padding: `${space[2]} ${space[4]}`,
            background: colors.accentBlue, color: '#fff', border: 'none',
            borderRadius: radius.md, cursor: 'pointer', fontSize: 11,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <div style={{ padding: space[8], textAlign: 'center', color: colors.textTertiary, fontSize: 12 }}>
        No holdings found. Add positions to your portfolio to see 3rd-decimal precision analytics.
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.surface,
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: `1px solid ${colors.hairline}`,
        borderRadius: radius.xl,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: `${space[4]} ${space[5]}`, borderBottom: `1px solid ${colors.hairline}` }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.accentBlue }}>
          Precision Portfolio · 3rd-Decimal Engine
        </h3>
        <p style={{ margin: `${space[1]} 0 0 0`, fontSize: 10, color: colors.textTertiary }}>
          Values computed via slm_math_runtime.py · {data.summary.holdingsCount} holdings
          {data.holdings.some(h => h.dataMode === 'DETERMINISTIC_SAFE_ANCHOR') ? ' · ⚠️ Some entries using SHA-256 safe anchor' : ''}
        </p>
      </div>

      <div style={{ display: 'flex', gap: space[6], padding: `${space[4]} ${space[5]}`, borderBottom: `1px solid ${colors.hairline}`, flexWrap: 'wrap' }}>
        <SummaryStat label="Invested" value={formatPrice(data.summary.totalInvested)} />
        <SummaryStat label="Current Value" value={formatPrice(data.summary.totalCurrentValue)} />
        <SummaryStat label="Unrealized P&L" value={formatPct(data.summary.totalUnrealizedPnl)} valueColor={data.summary.totalUnrealizedPnl >= 0 ? colors.accentGreen : colors.accentRed} />
        <SummaryStat label="Net P&L" value={formatPrice(data.summary.totalUnrealizedPnl)} valueColor={data.summary.totalUnrealizedPnl >= 0 ? colors.accentGreen : colors.accentRed} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr>
              <th style={headerStyle}>Ticker</th>
              <th style={headerStyle}>Sector</th>
              <th style={headerStyle}>Shares</th>
              <th style={headerStyle}>Avg Buy</th>
              <th style={headerStyle}>LTP</th>
              <th style={headerStyle}>Invested</th>
              <th style={headerStyle}>Current Value</th>
              <th style={headerStyle}>P&L</th>
              <th style={headerStyle}>P&L %</th>
              <th style={headerStyle}>P/E</th>
              <th style={headerStyle}>D/E</th>
              <th style={headerStyle}>RSI-14</th>
              <th style={headerStyle}>SMA-50</th>
              <th style={headerStyle}>Trend</th>
              <th style={headerStyle}>Data</th>
            </tr>
          </thead>
          <tbody>
            {data.holdings.map((h) => (
              <tr key={h.ticker}>
                <td style={{ ...cellStyle, fontWeight: 700, color: colors.textPrimary }}>{h.ticker}</td>
                <td style={{ ...cellStyle, color: colors.textSecondary, fontSize: 10 }}>{h.sector || '—'}</td>
                <td style={cellStyle}>{h.currentShares}</td>
                <td style={cellStyle}>{formatPrice(h.avgBuyPrice)}</td>
                <td style={{ ...cellStyle, fontWeight: h.currentPrice !== null ? 600 : 400 }}>
                  {formatPrice(h.currentPrice, 3)}
                </td>
                <td style={cellStyle}>{formatPrice(h.totalInvestedValue)}</td>
                <td style={cellStyle}>{formatPrice(h.currentValue)}</td>
                <td style={{ ...cellStyle, color: h.unrealizedPnl !== null ? (h.unrealizedPnl >= 0 ? colors.accentGreen : colors.accentRed) : colors.textTertiary }}>
                  {formatPrice(h.unrealizedPnl)}
                </td>
                <td style={{ ...cellStyle, color: h.unrealizedPnlPct !== null ? (h.unrealizedPnlPct >= 0 ? colors.accentGreen : colors.accentRed) : colors.textTertiary }}>
                  {formatPct(h.unrealizedPnlPct)}
                </td>
                <td style={cellStyle}>{h.peRatio !== null ? h.peRatio.toFixed(1) : '—'}</td>
                <td style={cellStyle}>{h.debtToEquity !== null ? h.debtToEquity.toFixed(2) : '—'}</td>
                <td style={{ ...cellStyle, color: h.rsi14 !== null ? (h.rsi14 > 70 ? colors.accentRed : h.rsi14 < 30 ? colors.accentGreen : colors.textPrimary) : colors.textTertiary }}>
                  {h.rsi14 !== null ? h.rsi14.toFixed(1) : '—'}
                </td>
                <td style={cellStyle}>{formatPrice(h.sma50)}</td>
                <td style={{ ...cellStyle, color: h.trendState === 'BULLISH' ? colors.accentGreen : h.trendState === 'BEARISH' ? colors.accentRed : colors.textTertiary }}>
                  {h.trendState || '—'}
                </td>
                <td style={{ ...cellStyle, fontSize: 9, color: colors.textTertiary }}>
                  {h.dataMode === 'DETERMINISTIC_SAFE_ANCHOR' ? 'SHA-256' : h.dataMode === 'YAHOO_MIRROR' ? 'Mirror' : h.dataMode === 'POSTGRES_CACHE' ? 'DB' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 9, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ margin: `${space[1]} 0 0 0`, fontSize: 14, fontWeight: 700, color: valueColor || colors.textPrimary }}>
        {value}
      </p>
    </div>
  );
}
