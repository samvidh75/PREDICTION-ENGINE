const SIGNAL_THRESHOLDS: Record<string, { positive: [number, number]; neutral: [number, number] }> = {
  pe:            { positive:[0,20],    neutral:[20,35]  },
  roe:           { positive:[20,100],  neutral:[12,20]  },
  pb:            { positive:[0,2],     neutral:[2,5]    },
  evEbitda:      { positive:[0,12],    neutral:[12,20]  },
  roic:          { positive:[15,100],  neutral:[8,15]   },
  debtEquity:    { positive:[0,0.5],   neutral:[0.5,1]  },
  margin:        { positive:[20,100],  neutral:[12,20]  },
  revenueGrowth: { positive:[15,100],  neutral:[5,15]   },
  profitGrowth:  { positive:[15,100],  neutral:[5,15]   },
  dividendYield: { positive:[2,100],   neutral:[0.5,2]  },
  rsi:           { positive:[30,50],   neutral:[50,65]  },
};

const getSignal = (field: string, value: number | null): 'positive' | 'neutral' | 'negative' | null => {
  if (value === null || value === undefined) return null;
  if (field === 'debtEquity') {
    if (value < 0.5) return 'positive';
    if (value < 1)   return 'neutral';
    return 'negative';
  }
  const t = SIGNAL_THRESHOLDS[field];
  if (!t) return null;
  const [pMin, pMax] = t.positive;
  const [nMin, nMax] = t.neutral;
  if (value >= pMin && value <= pMax) return 'positive';
  if (value >= nMin && value <= nMax) return 'neutral';
  return 'negative';
};

const SIGNAL_COLORS: Record<string, string> = {
  positive: 'var(--green)',
  neutral:  'var(--amber)',
  negative: 'var(--red)',
};

interface MetricTileProps {
  label: string;
  value: string | null;
  signal: string | null;
  isBlurred: boolean;
  onBlurClick?: () => void;
}

const MetricTile = ({ label, value, signal, isBlurred, onBlurClick }: MetricTileProps) => (
  <div
    onClick={isBlurred ? onBlurClick : undefined}
    style={{
      background:'var(--surface)',
      border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)',
      padding:'16px 18px',
      position:'relative',
      cursor: isBlurred ? 'pointer' : 'default',
      transition:'border-color 150ms ease',
    }}
    onMouseOver={e => { if (!isBlurred) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
  >
    <div style={{
      fontSize:'var(--sz-xs)', fontWeight:700,
      color:'var(--text-300)', textTransform:'uppercase',
      letterSpacing:'0.06em', marginBottom:10, lineHeight:1,
    }}>
      {label}
    </div>

    <div style={{
      fontSize:'var(--sz-xl)',
      fontWeight:700,
      letterSpacing:'-0.02em',
      color:'var(--text-900)',
      lineHeight:1,
      filter: isBlurred ? 'blur(6px)' : 'none',
      userSelect: isBlurred ? 'none' : 'auto',
    }}>
      {value ?? '—'}
    </div>

    {signal && !isBlurred && (
      <div style={{
        position:'absolute', top:14, right:14,
        width:8, height:8, borderRadius:'50%',
        background: SIGNAL_COLORS[signal] || 'var(--text-300)',
      }} />
    )}

    {isBlurred && (
      <div style={{
        position:'absolute', inset:0,
        borderRadius:'var(--r-lg)',
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(248,248,246,0.6)',
        backdropFilter:'blur(0.5px)',
        gap:6, flexDirection:'column',
      }}>
        <span style={{ fontSize:18 }}>🔒</span>
        <span style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', fontWeight:600 }}>Pro</span>
      </div>
    )}
  </div>
);

export const formatMarketCap = (crores: number | null | undefined): string => {
  if (!crores) return '—';
  if (crores >= 100_000) return `₹${(crores / 100_000).toFixed(1)}L Cr`;
  if (crores >= 1_000)   return `₹${(crores / 1_000).toFixed(1)}K Cr`;
  return `₹${crores.toFixed(0)} Cr`;
};

interface SnapshotData {
  marketCap?: number | null;
  peRatio?: number | null;
  roe?: number | null;
  revenueGrowth?: number | null;
  rsi?: number | null;
  pbRatio?: number | null;
  evEbitda?: number | null;
  roic?: number | null;
  debtEquity?: number | null;
  operatingMargin?: number | null;
  profitGrowth?: number | null;
  dividendYield?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  score?: number | null;
}

interface QuoteData {
  high52w?: number | null;
  low52w?: number | null;
  open?: number | null;
}

interface MetricsGridProps {
  snapshot: SnapshotData | null;
  quote: QuoteData | null;
  isPro: boolean;
  onUpgradeClick: () => void;
}

export const MetricsGrid = ({ snapshot, quote, isPro, onUpgradeClick }: MetricsGridProps) => {
  const s = snapshot;
  const q = quote;

  const freeMetrics = [
    { label:'Market Cap',      value: formatMarketCap(s?.marketCap),                                 signal: null },
    { label:'P/E Ratio',       value: s?.peRatio   ? `${s.peRatio.toFixed(1)}×`   : null,            signal: getSignal('pe', s?.peRatio ?? null) },
    { label:'ROE',             value: s?.roe        ? `${s.roe.toFixed(1)}%`        : null,            signal: getSignal('roe', s?.roe ?? null) },
    { label:'Revenue Growth',  value: s?.revenueGrowth ? `${s.revenueGrowth.toFixed(1)}% YoY` : null, signal: getSignal('revenueGrowth', s?.revenueGrowth ?? null) },
    { label:'RSI (14)',        value: s?.rsi        ? s.rsi.toFixed(1)              : null,            signal: getSignal('rsi', s?.rsi ?? null) },
    { label:'52W High',        value: q?.high52w    ? `₹${q.high52w.toLocaleString('en-IN')}` : null, signal: null },
    { label:'52W Low',         value: q?.low52w     ? `₹${q.low52w.toLocaleString('en-IN')}`  : null, signal: null },
    { label:'Open',            value: q?.open       ? `₹${q.open.toFixed(2)}`       : null,            signal: null },
  ];

  const proMetrics = [
    { label:'P/B Ratio',       value: s?.pbRatio    ? `${s.pbRatio.toFixed(2)}×`  : null, signal: getSignal('pb', s?.pbRatio ?? null) },
    { label:'EV/EBITDA',       value: s?.evEbitda   ? `${s.evEbitda.toFixed(1)}×`  : null, signal: getSignal('evEbitda', s?.evEbitda ?? null) },
    { label:'ROIC',            value: s?.roic       ? `${s.roic.toFixed(1)}%`       : null, signal: getSignal('roic', s?.roic ?? null) },
    { label:'Debt/Equity',     value: s?.debtEquity !== undefined && s?.debtEquity !== null ? s.debtEquity.toFixed(2) : null, signal: getSignal('debtEquity', s?.debtEquity ?? null) },
    { label:'Op. Margin',      value: s?.operatingMargin ? `${s.operatingMargin.toFixed(1)}%` : null, signal: getSignal('margin', s?.operatingMargin ?? null) },
    { label:'Profit Growth',   value: s?.profitGrowth ? `${s.profitGrowth.toFixed(1)}% YoY` : null, signal: getSignal('profitGrowth', s?.profitGrowth ?? null) },
    { label:'Div. Yield',      value: s?.dividendYield ? `${s.dividendYield.toFixed(2)}%` : null, signal: getSignal('dividendYield', s?.dividendYield ?? null) },
    { label:'MACD Signal',     value: s?.macd !== undefined && s?.macd !== null ? ((s.macd as number) > (s?.macdSignal ?? 0) ? 'Bullish ▲' : 'Bearish ▼') : null,
                                signal: s?.macd !== undefined && s?.macd !== null ? ((s.macd as number) > (s?.macdSignal ?? 0) ? 'positive' : 'negative') : null },
  ];

  return (
    <div style={{ margin:'12px 0' }}>
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:'var(--r-lg)', padding:'24px 24px 20px',
      }}>
        <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>
          Key Metrics
        </div>

        <div style={{
          display:'grid', gap:10,
          gridTemplateColumns:'repeat(4, 1fr)',
        }}
        className="metrics-grid">
          {freeMetrics.map(m => (
            <MetricTile key={m.label} label={m.label} value={m.value} signal={m.signal} isBlurred={false} />
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0 12px' }}>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
          <span style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', fontWeight:700,
            textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>
            Pro metrics — 8 additional data points
          </span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>

        <div style={{
          display:'grid', gap:10,
          gridTemplateColumns:'repeat(4, 1fr)',
        }}
        className="metrics-grid">
          {proMetrics.map(m => (
            <MetricTile key={m.label} label={m.label} value={m.value} signal={m.signal}
              isBlurred={!isPro} onBlurClick={onUpgradeClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsGrid;
