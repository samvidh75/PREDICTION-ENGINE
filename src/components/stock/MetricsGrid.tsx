import { fMarketCap } from "../../lib/format";

interface MetricsGridProps {
  fundamentals: {
    peRatio: number | null;
    pbRatio: number | null;
    roe: number | null;
    roce: number | null;
    dividendYield: number | null;
    eps: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    marketCap: number | null;
  } | null;
  price: {
    weekHigh52: number | null;
    weekLow52: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
  } | null;
  isPro: boolean;
  onUpgradeClick: () => void;
}

const SIGNAL_THRESHOLDS: Record<string, { positive: [number, number]; neutral: [number, number] }> = {
  pe:            { positive: [0, 20],    neutral: [20, 35] },
  roe:           { positive: [20, 100],  neutral: [12, 20] },
  pb:            { positive: [0, 2],     neutral: [2, 5] },
  debtEquity:    { positive: [0, 0.5],   neutral: [0.5, 1] },
  margin:        { positive: [20, 100],  neutral: [12, 20] },
  revenueGrowth: { positive: [15, 100],  neutral: [5, 15] },
  profitGrowth:  { positive: [15, 100],  neutral: [5, 15] },
  dividendYield: { positive: [2, 100],   neutral: [0.5, 2] },
  rsi:           { positive: [30, 50],   neutral: [50, 65] },
};

function getSignal(field: string, value: number | null): 'positive' | 'neutral' | 'negative' | null {
  if (value === null) return null;
  if (field === 'debtEquity') {
    if (value < 0.5) return 'positive';
    if (value < 1) return 'neutral';
    return 'negative';
  }
  const t = SIGNAL_THRESHOLDS[field];
  if (!t) return null;
  const [pMin, pMax] = t.positive;
  const [nMin, nMax] = t.neutral;
  if (value >= pMin && value <= pMax) return 'positive';
  if (value >= nMin && value <= nMax) return 'neutral';
  return 'negative';
}

const SIGNAL_COLORS = {
  positive: 'var(--green)',
  neutral: 'var(--amber)',
  negative: 'var(--red)',
};

function MetricTile({
  label, value, signal, isBlurred, onBlurClick,
}: {
  label: string;
  value: string | null;
  signal: 'positive' | 'neutral' | 'negative' | null;
  isBlurred?: boolean;
  onBlurClick?: () => void;
}) {
  return (
    <div
      onClick={isBlurred ? onBlurClick : undefined}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        position: 'relative',
        cursor: isBlurred ? 'pointer' : 'default',
        transition: 'border-color var(--t-fast)',
      }}
    >
      <div style={{
        fontSize: 'var(--sz-xs)', fontWeight: 700,
        color: 'var(--text-300)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 10, lineHeight: 1,
      }}>
        {label}
      </div>

      <div style={{
        fontSize: 'var(--sz-xl)', fontWeight: 700,
        letterSpacing: '-0.02em', color: 'var(--text-900)',
        lineHeight: 1,
        filter: isBlurred ? 'blur(6px)' : 'none',
        userSelect: isBlurred ? 'none' : 'auto',
      }}>
        {value ?? '\u2014'}
      </div>

      {signal && !isBlurred && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          width: 8, height: 8, borderRadius: '50%',
          background: SIGNAL_COLORS[signal],
        }} />
      )}

      {isBlurred && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 'var(--r-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(248,248,246,0.6)',
          backdropFilter: 'blur(0.5px)',
          gap: 6, flexDirection: 'column',
        }}>
          <span style={{ fontSize: 18 }}>{String.fromCodePoint(0x1F512)}</span>
          <span style={{ fontSize: 'var(--sz-xs)', color: 'var(--text-300)', fontWeight: 600 }}>Pro</span>
        </div>
      )}
    </div>
  );
}

export default function MetricsGrid({ fundamentals, price, isPro, onUpgradeClick }: MetricsGridProps) {
  const f = fundamentals;
  const p = price;

  const freeMetrics = [
    { label: 'Market Cap',     value: f?.marketCap ? fMarketCap(f.marketCap) : null,                                        signal: null },
    { label: 'P/E Ratio',      value: f?.peRatio != null ? `${f.peRatio.toFixed(1)}\u00D7` : null,                          signal: getSignal('pe', f?.peRatio ?? null) },
    { label: 'ROE',            value: f?.roe != null ? `${f.roe.toFixed(1)}%` : null,                                       signal: getSignal('roe', f?.roe ?? null) },
    { label: 'Revenue Growth', value: f?.revenueGrowth != null ? `${f.revenueGrowth.toFixed(1)}% YoY` : null,               signal: getSignal('revenueGrowth', f?.revenueGrowth ?? null) },
    { label: '52W High',       value: p?.weekHigh52 ? `\u20B9${p.weekHigh52.toLocaleString('en-IN')}` : null,              signal: null },
    { label: '52W Low',        value: p?.weekLow52 ? `\u20B9${p.weekLow52.toLocaleString('en-IN')}` : null,               signal: null },
    { label: 'EPS',            value: f?.eps != null ? `\u20B9${f.eps.toFixed(2)}` : null,                                 signal: null },
    { label: 'Div. Yield',     value: f?.dividendYield != null ? `${f.dividendYield.toFixed(2)}%` : null,                  signal: getSignal('dividendYield', f?.dividendYield ?? null) },
  ];

  const pv = (v: number | null | undefined, formatter?: (v: number) => string): string | null => {
    if (v == null) return null;
    return formatter ? formatter(v) : v.toString();
  };
  const proMetrics = [
    { label: 'P/B Ratio',     value: pv(f?.pbRatio, v => `${v.toFixed(2)}\u00D7`),                             signal: getSignal('pb', f?.pbRatio ?? null) },
    { label: 'ROCE',          value: pv(f?.roce, v => `${v.toFixed(1)}%`),                                     signal: null },
    { label: 'Debt/Equity',   value: pv(f?.debtToEquity, v => v.toFixed(2)),                                  signal: getSignal('debtEquity', f?.debtToEquity ?? null) },
    { label: 'Profit Growth', value: pv(f?.profitGrowth, v => `${v.toFixed(1)}% YoY`),                        signal: getSignal('profitGrowth', f?.profitGrowth ?? null) },
    { label: 'Current Ratio', value: pv(f?.currentRatio, v => v.toFixed(2)),                                  signal: null },
  ];

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '24px 24px 20px',
    }}>
      <div style={{
        fontSize: 'var(--sz-xs)', fontWeight: 700, color: 'var(--text-300)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16,
      }}>
        Key Metrics
      </div>

      <div
        className="metrics-grid"
        style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        {freeMetrics.map(m => (
          <MetricTile key={m.label} label={m.label} value={m.value} signal={m.signal} isBlurred={false} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 12px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{
          fontSize: 'var(--sz-xs)', color: 'var(--text-300)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
        }}>
          Pro metrics \u2014 additional data points
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div
        className="metrics-grid"
        style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        {proMetrics.map(m => (
          <MetricTile
            key={m.label}
            label={m.label}
            value={m.value}
            signal={m.signal}
            isBlurred={!isPro}
            onBlurClick={onUpgradeClick}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 900px) { .metrics-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 640px) { .metrics-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  );
}
