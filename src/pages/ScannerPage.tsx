import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { NIFTY50_SYMBOLS } from '../services/universe/StockUniverse';
import type { StockData } from '../hooks/useStockData';
import { UnifiedPredictionEngine } from '../prediction-engine/UnifiedPredictionEngine';
import type { EngineOutput } from '../prediction-engine/UnifiedPredictionEngine';
import { fChange } from '../lib/format';
import { navigate } from '../components/product/routeConfig';
import ProUpgradeModal from '../components/ProUpgradeModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { colors, typography, spacing, radius, shadow } from '../styles';

/* ─── types ───────────────────────────────────────────────────────────────── */

type ScanRow = { data: StockData; prediction: EngineOutput };

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const displayNames: Record<string, string> = {
  RELIANCE: 'Reliance Industries', TCS: 'Tata Consultancy Services',
  HDFCBANK: 'HDFC Bank',          INFY: 'Infosys',
  ICICIBANK: 'ICICI Bank',        SUNPHARMA: 'Sun Pharma',
  HINDUNILVR: 'Hindustan Unilever', SBIN: 'State Bank of India',
  ITC: 'ITC Limited',             BHARTIARTL: 'Bharti Airtel',
};

const inputFor = (data: StockData) => ({
  peRatio: data.fundamentals.peRatio, pbRatio: data.fundamentals.pbRatio,
  roe: data.fundamentals.roe,         roce: data.fundamentals.roce,
  debtToEquity: data.fundamentals.debtToEquity, currentRatio: data.fundamentals.currentRatio,
  revenueGrowth: data.fundamentals.revenueGrowth, profitGrowth: data.fundamentals.profitGrowth,
  dividendYield: data.fundamentals.dividendYield, closes: data.historical.closes,
});

function getConviction(score: number | null): { label: string; color: string; bg: string } {
  if (score === null) return { label: 'No data',        color: colors.text.tertiary, bg: colors.bg.secondary };
  if (score >= 75)    return { label: 'High conviction', color: colors.on.success,   bg: colors.tint.success  };
  if (score >= 50)    return { label: 'Neutral',         color: colors.on.warning,   bg: colors.tint.warning  };
  return               { label: 'Risk rising',           color: colors.on.error,     bg: colors.tint.error    };
}

const PRESETS = [
  'Quality compounders', 'Undervalued quality', 'Improving momentum',
  'Low debt leaders',    'Earnings acceleration', 'Dividend stability',
];

const CLASS_OPTIONS = [
  { value: 'All',       label: 'All ratings'    },
  { value: 'EXCELLENT', label: 'High conviction' },
  { value: 'HEALTHY',   label: 'Conviction'      },
  { value: 'STABLE',    label: 'Neutral'         },
  { value: 'WEAKENING', label: 'Watch'           },
  { value: 'AT_RISK',   label: 'Risk rising'     },
];

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function ScannerPage() {
  const [rows,         setRows]        = useState<ScanRow[]>([]);
  const [loading,      setLoading]     = useState(false);
  const [loaded,       setLoaded]      = useState(0);
  const [query,        setQuery]       = useState('');
  const [page,         setPage]        = useState(1);
  const [classFilter,  setClassFilter] = useState('All');
  const [activePreset, setActivePreset]= useState<string | null>(null);
  const [proOpen,      setProOpen]     = useState(false);

  const runScan = useCallback(async () => {
    setLoading(true); setRows([]); setLoaded(0);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const next: ScanRow[] = [];
    for (let start = 0; start < NIFTY50_SYMBOLS.length; start += 5) {
      const batch = NIFTY50_SYMBOLS.slice(start, start + 5);
      const results = await Promise.all(batch.map(async symbol => {
        try {
          const res = await fetch(`/api/stock/${symbol}`, { signal: controller.signal, cache: 'no-cache' });
          await new Promise(r => setTimeout(r, 200));
          if (!res.ok) return null;
          const text = await res.text();
          if (!text || text.length < 10) return null;
          const data = JSON.parse(text) as StockData;
          if (!data.symbol && !data.price?.companyName) return null;
          return { data, prediction: UnifiedPredictionEngine.predict(inputFor(data)) };
        } catch { return null; }
      }));
      next.push(...results.filter((r): r is ScanRow => r !== null));
      setRows([...next]);
      setLoaded(Math.min(start + batch.length, NIFTY50_SYMBOLS.length));
    }
    clearTimeout(timeout);
    setLoading(false);
    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  useEffect(() => { void runScan(); }, [runScan]);

  const ranked = useMemo(() => {
    let f = rows;
    if (query) {
      const q = query.toLowerCase();
      f = f.filter(r => r.data.symbol.toLowerCase().includes(q) || (r.data.price.companyName || '').toLowerCase().includes(q));
    }
    if (classFilter !== 'All') f = f.filter(r => r.prediction.classification === classFilter);
    return [...f].sort((a, b) => (b.prediction.composite ?? -1) - (a.prediction.composite ?? -1));
  }, [rows, query, classFilter]);

  const PER_PAGE  = 10;
  const visible   = ranked.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageCount = Math.max(1, Math.ceil(ranked.length / PER_PAGE));

  const exportCSV = () => {
    const csv = ['Rank,Symbol,Company,Rating,Conviction,Change',
      ...ranked.map((r, i) => [i + 1, r.data.symbol,
        `"${r.data.price.companyName || displayNames[r.data.symbol] || r.data.symbol}"`,
        r.prediction.composite ?? '', getConviction(r.prediction.composite).label, fChange(r.data.price.change),
      ].join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'stockstory-scan.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const cell: React.CSSProperties = { padding: `${spacing.base} ${spacing.base}`, verticalAlign: 'middle' };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg.primary }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
        <div>
          <h1 style={{ ...typography.sectionTitle, color: colors.text.primary, margin: 0 }}>Scanner</h1>
          <p style={{ ...typography.secondaryText, color: colors.text.secondary, marginTop: spacing.xs }}>
            Nifty 50 — scored across quality, valuation, growth, risk {'&'} momentum
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* ── Preset chips ─────────────────────────────────────────────────── */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: spacing.sm, overflowX: 'auto', paddingBottom: spacing.lg }}>
        {PRESETS.map(p => (
          <button key={p} onClick={() => setActivePreset(activePreset === p ? null : p)} style={{
            height: '32px', padding: `0 ${spacing.base}`, borderRadius: '9999px',
            border:      activePreset === p ? `1px solid ${colors.primary}` : `1px solid ${colors.bg.tertiary}`,
            background:  activePreset === p ? colors.tint.primary           : colors.bg.primary,
            color:       activePreset === p ? colors.primary                : colors.text.secondary,
            fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
            flexShrink: 0, transition: 'all 200ms ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}>{p}</button>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: spacing.sm, paddingBottom: spacing.base, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.text.tertiary, pointerEvents: 'none' }} />
          <Input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search company or symbol…" style={{ paddingLeft: '36px' }} />
        </div>
        <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }} style={{
          height: '44px', padding: `0 ${spacing.base}`,
          border: `1px solid ${colors.bg.tertiary}`, borderRadius: radius.sm,
          background: colors.bg.primary, color: colors.text.primary,
          fontSize: '16px', outline: 'none', minWidth: '160px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          {CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Desktop table ─────────────────────────────────────────────────── */}
      <div className="hidden md:block" style={{ borderRadius: radius.md, border: `1px solid ${colors.bg.tertiary}`, overflow: 'hidden', boxShadow: shadow.card, marginBottom: spacing.base }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: colors.bg.secondary, borderBottom: `1px solid ${colors.bg.tertiary}` }}>
              {['#', 'Company', 'Rating', 'Conviction', ''].map((h, i) => (
                <th key={i} style={{ ...cell, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.text.tertiary, textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, idx) => {
              const score = row.prediction.composite;
              const cv    = getConviction(score);
              const name  = row.data.price.companyName || displayNames[row.data.symbol] || row.data.symbol;
              const chg   = row.data.price.change ?? 0;
              return (
                <tr key={row.data.symbol} onClick={() => navigate('stock', row.data.symbol)}
                  style={{ cursor: 'pointer', borderBottom: `1px solid ${colors.bg.tertiary}`, transition: 'background 150ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = colors.bg.secondary)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...cell, ...typography.caption, color: colors.text.tertiary, width: '40px' }}>{(page - 1) * PER_PAGE + idx + 1}</td>
                  <td style={cell}>
                    <div style={{ ...typography.bodyEmphasis, color: colors.text.primary }}>{row.data.symbol}</div>
                    <div style={{ ...typography.caption, color: colors.text.secondary, marginTop: '2px' }}>{name}</div>
                  </td>
                  <td style={{ ...cell, textAlign: 'right', width: '110px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: cv.color }}>{score ?? '—'}</span>
                    <span style={{ ...typography.caption, color: colors.text.tertiary, marginLeft: '2px' }}>/100</span>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: chg >= 0 ? colors.on.success : colors.on.error }}>{fChange(chg)}</div>
                  </td>
                  <td style={{ ...cell, width: '160px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', background: cv.bg, color: cv.color, fontSize: '12px', fontWeight: 600 }}>
                      {cv.label}
                    </span>
                  </td>
                  <td style={{ ...cell, textAlign: 'right', width: '100px' }}>
                    <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); navigate('stock', row.data.symbol); }}>Research</Button>
                  </td>
                </tr>
              );
            })}
            {loading && visible.length === 0 && (
              <tr><td colSpan={5} style={{ padding: spacing.xxl, textAlign: 'center', ...typography.secondaryText, color: colors.text.tertiary }}>
                {loaded === 0 ? 'Loading Nifty 50 data…' : `Loading ${loaded} / ${NIFTY50_SYMBOLS.length} stocks…`}
              </td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} style={{ padding: spacing.xxl, textAlign: 'center', ...typography.secondaryText, color: colors.text.tertiary }}>No data yet. Try again in a moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ─────────────────────────────────────────────────── */}
      <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, paddingBottom: spacing.lg }}>
        {loading && ranked.length === 0 && (
          <div style={{ padding: spacing.xxl, textAlign: 'center', ...typography.secondaryText, color: colors.text.tertiary }}>Scanning Nifty 50…</div>
        )}
        {visible.map((row, idx) => {
          const score = row.prediction.composite;
          const cv    = getConviction(score);
          const name  = row.data.price.companyName || displayNames[row.data.symbol] || row.data.symbol;
          const chg   = row.data.price.change ?? 0;
          return (
            <Card key={row.data.symbol} onClick={() => navigate('stock', row.data.symbol)} padding="md">
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <span style={{ ...typography.caption, color: colors.text.tertiary, minWidth: '20px', paddingTop: '2px' }}>{(page - 1) * PER_PAGE + idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ ...typography.bodyEmphasis, color: colors.text.primary }}>{row.data.symbol}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: chg >= 0 ? colors.on.success : colors.on.error, marginLeft: spacing.sm }}>{fChange(chg)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '20px', fontWeight: 600, color: cv.color, fontVariantNumeric: 'tabular-nums' }}>{score ?? '—'}</span>
                      <span style={{ ...typography.caption, color: colors.text.tertiary }}>/100</span>
                    </div>
                  </div>
                  <div style={{ ...typography.caption, color: colors.text.secondary, marginTop: '2px' }}>{name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
                    <span style={{ padding: '3px 10px', borderRadius: '9999px', background: cv.bg, color: cv.color, fontSize: '12px', fontWeight: 600 }}>{cv.label}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); navigate('stock', row.data.symbol); }}>Research</Button>
                      <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); navigate('compare', row.data.symbol); }}>Compare</Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, padding: `${spacing.base} 0` }}>
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <span style={{ ...typography.secondaryText, color: colors.text.secondary, minWidth: '80px', textAlign: 'center' }}>{page} / {pageCount}</span>
          <Button variant="secondary" size="sm" disabled={page === pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Next</Button>
        </div>
      )}

      {!loading && rows.length >= 5 && (
        <div style={{ textAlign: 'center', padding: `${spacing.sm} 0 ${spacing.lg}` }}>
          <Button variant="ghost" size="sm" onClick={() => setProOpen(true)}>Unlock all results with Pro →</Button>
        </div>
      )}

      <ProUpgradeModal open={proOpen} onClose={() => setProOpen(false)} location="scanner" />
    </div>
  );
}
