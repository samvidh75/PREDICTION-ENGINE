import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { NIFTY50_SYMBOLS } from '../services/universe/StockUniverse';
import type { StockData } from '../hooks/useStockData';
import { UnifiedPredictionEngine } from '../prediction-engine/UnifiedPredictionEngine';
import type { EngineOutput } from '../prediction-engine/UnifiedPredictionEngine';
import { fChange } from '../lib/format';
import { navigate } from '../components/product/routeConfig';

/* ─── constants ───────────────────────────────────────────────────────────── */

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

/* ─── types ───────────────────────────────────────────────────────────────── */

type ScanRow = { data: StockData; prediction: EngineOutput };

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const displayNames: Record<string, string> = {
  RELIANCE: 'Reliance Industries', TCS: 'Tata Consultancy Services',
  HDFCBANK: 'HDFC Bank',           INFY: 'Infosys',
  ICICIBANK: 'ICICI Bank',         SUNPHARMA: 'Sun Pharma',
  HINDUNILVR: 'Hindustan Unilever', SBIN: 'State Bank of India',
  ITC: 'ITC Limited',              BHARTIARTL: 'Bharti Airtel',
};

const inputFor = (data: StockData) => ({
  peRatio: data.fundamentals.peRatio, pbRatio: data.fundamentals.pbRatio,
  roe: data.fundamentals.roe,         roce: data.fundamentals.roce,
  debtToEquity: data.fundamentals.debtToEquity, currentRatio: data.fundamentals.currentRatio,
  revenueGrowth: data.fundamentals.revenueGrowth, profitGrowth: data.fundamentals.profitGrowth,
  dividendYield: data.fundamentals.dividendYield, closes: data.historical.closes,
});

function getConviction(score: number | null): { label: string; color: string; bg: string } {
  if (score === null) return { label: 'No data',         color: '#AEAEB2', bg: '#F5F5F7' };
  if (score >= 75)    return { label: 'High conviction',  color: '#1D7A3D', bg: '#E8F5EE' };
  if (score >= 50)    return { label: 'Neutral',          color: '#B45309', bg: '#FEF3C7' };
  return               { label: 'Risk rising',            color: '#D93025', bg: '#FDE8E6' };
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

  const PER_PAGE  = 15;
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

  return (
    <div style={{ fontFamily: FONT, color: '#1D1D1F' }}>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontSize: '40px',
            fontWeight: 600,
            color: '#1D1D1F',
            margin: '0 0 8px',
            letterSpacing: '-0.003em',
            lineHeight: 1.08,
            fontFamily: FONT,
          }}>
            Stock Scanner
          </h1>
          <p style={{ fontSize: '17px', color: '#6E6E73', margin: 0, fontFamily: FONT, letterSpacing: '-0.022em' }}>
            Nifty 50 — scored across quality, valuation, growth, risk &amp; momentum
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #D2D2D7',
            background: '#FFFFFF',
            color: '#1D1D1F',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: FONT,
            letterSpacing: '-0.016em',
            flexShrink: 0,
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F7')}
          onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* ── Preset chips ───────────────────────────────────────────────────── */}
      <div
        className="no-scrollbar"
        style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '20px' }}
      >
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setActivePreset(activePreset === p ? null : p)}
            style={{
              height: '30px',
              padding: '0 14px',
              borderRadius: '9999px',
              border: activePreset === p ? '1px solid #1D1D1F' : '1px solid #D2D2D7',
              background: activePreset === p ? '#1D1D1F' : 'transparent',
              color: activePreset === p ? '#FFFFFF' : '#6E6E73',
              fontSize: '13px',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 150ms ease',
              fontFamily: FONT,
              letterSpacing: '-0.01em',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#AEAEB2', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search company or symbol…"
            style={{
              width: '100%',
              height: '40px',
              paddingLeft: '36px',
              paddingRight: '12px',
              border: '1px solid #D2D2D7',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#1D1D1F',
              fontSize: '14px',
              outline: 'none',
              fontFamily: FONT,
              letterSpacing: '-0.016em',
              boxSizing: 'border-box',
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#0066CC')}
            onBlur={e => (e.currentTarget.style.borderColor = '#D2D2D7')}
          />
        </div>
        <select
          value={classFilter}
          onChange={e => { setClassFilter(e.target.value); setPage(1); }}
          style={{
            height: '40px',
            padding: '0 12px',
            border: '1px solid #D2D2D7',
            borderRadius: '8px',
            background: '#FFFFFF',
            color: '#1D1D1F',
            fontSize: '14px',
            outline: 'none',
            minWidth: '150px',
            fontFamily: FONT,
            letterSpacing: '-0.016em',
          }}
        >
          {CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Loading bar */}
      {loading && (
        <div style={{
          height: '3px',
          background: '#F5F5F7',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.round((loaded / NIFTY50_SYMBOLS.length) * 100)}%`,
            background: '#1D1D1F',
            borderRadius: '2px',
            transition: 'width 300ms ease',
          }} />
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{
        border: '1px solid #D2D2D7',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
          <thead>
            <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #D2D2D7' }}>
              {[
                { label: '#',           width: '44px',  align: 'left'  },
                { label: 'Company',     width: 'auto',  align: 'left'  },
                { label: 'Score',       width: '90px',  align: 'right' },
                { label: 'Conviction',  width: '140px', align: 'left'  },
                { label: '',            width: '100px', align: 'right' },
              ].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: '10px 14px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#AEAEB2',
                    textAlign: h.align as 'left' | 'right',
                    width: h.width,
                    fontFamily: FONT,
                  }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, idx) => {
              const score = row.prediction.composite;
              const cv    = getConviction(score);
              const name  = row.data.price.companyName || displayNames[row.data.symbol] || row.data.symbol;
              const chg   = row.data.price.change ?? 0;
              const rank  = (page - 1) * PER_PAGE + idx + 1;
              return (
                <tr
                  key={row.data.symbol}
                  onClick={() => navigate('stock', row.data.symbol)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid #F5F5F7',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F5F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 14px', fontSize: '13px', color: '#AEAEB2', width: '44px', fontVariantNumeric: 'tabular-nums' }}>
                    {rank}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.016em' }}>{row.data.symbol}</div>
                    <div style={{ fontSize: '12px', color: '#6E6E73', marginTop: '1px' }}>{name}</div>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', width: '90px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 600, color: cv.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                      {score ?? '—'}
                    </span>
                    {score !== null && <span style={{ fontSize: '11px', color: '#AEAEB2', marginLeft: '1px' }}>/100</span>}
                    <div style={{ fontSize: '12px', fontWeight: 500, color: chg >= 0 ? '#1D7A3D' : '#D93025', fontVariantNumeric: 'tabular-nums' }}>
                      {fChange(chg)}
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px', width: '140px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: cv.bg,
                      color: cv.color,
                      fontSize: '12px',
                      fontWeight: 600,
                      fontFamily: FONT,
                    }}>
                      {cv.label}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', width: '100px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); navigate('stock', row.data.symbol); }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid #D2D2D7',
                        background: 'transparent',
                        color: '#1D1D1F',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: FONT,
                        letterSpacing: '-0.01em',
                        transition: 'background 100ms ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#E8E8ED')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      Research
                    </button>
                  </td>
                </tr>
              );
            })}

            {loading && visible.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#AEAEB2', fontSize: '15px', fontFamily: FONT }}>
                  {loaded === 0
                    ? 'Loading Nifty 50 data…'
                    : `Scanning ${loaded} / ${NIFTY50_SYMBOLS.length} stocks…`}
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#AEAEB2', fontSize: '15px', fontFamily: FONT }}>
                  No data yet. Try again in a moment.
                </td>
              </tr>
            )}
            {!loading && rows.length > 0 && visible.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#AEAEB2', fontSize: '15px', fontFamily: FONT }}>
                  No results for current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {pageCount > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #D2D2D7',
              background: 'transparent',
              color: page === 1 ? '#AEAEB2' : '#1D1D1F',
              fontSize: '14px',
              fontWeight: 500,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontFamily: FONT,
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: '14px', color: '#6E6E73', fontFamily: FONT, minWidth: '80px', textAlign: 'center' }}>
            {page} of {pageCount}
          </span>
          <button
            disabled={page === pageCount}
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #D2D2D7',
              background: 'transparent',
              color: page === pageCount ? '#AEAEB2' : '#1D1D1F',
              fontSize: '14px',
              fontWeight: 500,
              cursor: page === pageCount ? 'not-allowed' : 'pointer',
              fontFamily: FONT,
              opacity: page === pageCount ? 0.5 : 1,
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Status footer */}
      {loading && loaded > 0 && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#AEAEB2', marginTop: '16px', fontFamily: FONT }}>
          Scanning… {loaded} / {NIFTY50_SYMBOLS.length} loaded
        </p>
      )}

    </div>
  );
}
