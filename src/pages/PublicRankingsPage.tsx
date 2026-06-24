import { useEffect, useState } from "react";
import { Bell, ChevronUp, Search } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { getScoreColor, getScoreLabel, getSignalFromScore, MiniSparkline, ConfidenceRing } from "../components/ui/ScoreRing";
import { runCompanyDataPipeline, PipelineResult } from "../services/data/CompanyDataPipeline";
import { fChange, fPrice } from "../lib/format";
import { productNavigate } from "../components/product/ProductUI";

const symbols = [
  "TCS", "HDFCBANK", "RELIANCE", "INFY", "ICICIBANK",
  "SUNPHARMA", "BHARTIARTL", "ITC", "LT", "SBIN",
];

interface SectorInfo { name: string; score: number }

function ScannerRow({ result, rank }: { result: PipelineResult; rank: number }) {
  const p = result.prediction;
  const score = p?.rankingScore ?? null;
  const factorScores = p?.factorScores ?? [];
  const signal = getSignalFromScore(score);

  const openResearch = () => productNavigate("stock", result.symbol);

  const getFactorVal = (key: string) => {
    const f = factorScores.find(x => x.group === key);
    return f?.value ?? 0;
  };

  const initials = result.symbol.slice(0, 2);
  const avatarColors = ['#cc2936', '#1a56db', '#0d5c34', '#b45309', '#6b21a8', '#0891b2', '#be185d', '#4f46e5', '#059669', '#d97706'];

  return (
    <div
      className="grid grid-cols-[48px_2fr_1fr_100px_90px_100px_100px_80px] items-center px-4 py-3 border-b border-[#fafafa] hover:bg-[#fafafa] cursor-pointer transition-colors"
      onClick={openResearch}
    >
      <span className="text-[14px] font-[700] text-[#888]">{rank}</span>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[7px] flex items-center justify-center text-white text-[11px] font-[800]" style={{ background: avatarColors[rank % avatarColors.length] }}>
          {initials}
        </div>
        <div>
          <div className="text-[14px] font-[700] text-[#0a0a0a]">{result.symbol}</div>
          <div className="text-[12px] text-[#888]">{result.companyName ?? '—'}</div>
        </div>
      </div>
      <span className="text-[12px] text-[#888]">{result.sector ?? '—'}</span>
      <div className="flex items-center gap-2">
        <div className="min-w-[56px] text-center px-3 py-1 rounded-[8px]"
          style={{
            background: score ? `${getScoreColor(score)}15` : '#f5f5f5',
          }}>
          <div className="text-[18px] font-[800]" style={{ color: score ? getScoreColor(score) : '#bbb' }}>
            {score ?? '—'}
          </div>
          <div className="text-[9px] font-[700] tracking-[.03em]" style={{ color: score ? getScoreColor(score) : '#bbb' }}>
            {score ? getScoreLabel(score) : 'N/A'}
          </div>
        </div>
        <MiniSparkline data={result.technicals.closePrices.slice(-20)} color="#1a7f4b" width={50} height={22} />
      </div>
      <span className="text-[13px] font-[700] text-[#0a0a0a] tabular">{fPrice(result.price.current)}</span>
      <span className={`text-[13px] font-[600] ${result.price.change !== null && result.price.change >= 0 ? 'text-[#1a7f4b]' : 'text-[#c0392b]'}`}>
        {result.price.change !== null ? fChange(result.price.change) + '%' : '—'}
      </span>
      <div className="flex gap-1.5 items-center">
        {['Q', 'G', 'V', 'M', 'R'].map((letter, i) => {
          const keys = ['quality', 'growth', 'valuation', 'momentum', 'risk'];
          const val = getFactorVal(keys[i]);
          return (
            <div key={letter} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-[700] text-[#888]">{letter}</span>
              <div className="w-[18px] h-[3px] rounded-full bg-[#f0f0f0]">
                <div className="h-full rounded-full" style={{ width: `${val}%`, background: getScoreColor(val) }} />
              </div>
              <span className="text-[9px] font-[600]" style={{ color: getScoreColor(val) }}>{Math.round(val)}</span>
            </div>
          );
        })}
      </div>
      <span className={`text-[12px] font-[700]`} style={{ color: signal.color }}>{signal.text}</span>
      <div className="flex items-center gap-1.5">
        <ConfidenceRing pct={result.dataCompleteness} size={32} />
        <span className="text-[13px] font-[700] text-[#2d2d2d]">{Math.round(result.dataCompleteness)}%</span>
      </div>
    </div>
  );
}

function ScannerRowSkeleton({ rank }: { rank: number }) {
  return (
    <div className="grid grid-cols-[48px_2fr_1fr_100px_90px_100px_100px_80px] items-center px-4 py-3 border-b border-[#fafafa]">
      <span className="text-[14px] font-[700] text-[#888]">{rank}</span>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[7px] bg-[#f0f0f0] animate-pulse" />
        <div>
          <div className="w-16 h-4 bg-[#f0f0f0] animate-pulse rounded mb-1" />
          <div className="w-24 h-3 bg-[#f0f0f0] animate-pulse rounded" />
        </div>
      </div>
      <div className="w-16 h-3 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-14 h-8 bg-[#f0f0f0] animate-pulse rounded-[8px]" />
      <div className="w-14 h-4 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-14 h-4 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map(i => <div key={i} className="w-[18px] h-[20px] bg-[#f0f0f0] animate-pulse rounded-sm" />)}
      </div>
      <div className="w-12 h-3 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-10 h-4 bg-[#f0f0f0] animate-pulse rounded" />
    </div>
  );
}

export default function PublicRankingsPage() {
  const [rows, setRows] = useState<Record<string, PipelineResult | null>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all(
      symbols.map(async (s) => [s, await runCompanyDataPipeline(s)] as const),
    ).then((items) => {
      if (active) setRows(Object.fromEntries(items));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const loadedResults = Object.values(rows).filter((r): r is PipelineResult => r !== null);

  const visibleSymbols = symbols
    .filter((symbol) => {
      const result = rows[symbol];
      const haystack = `${symbol} ${result?.companyName ?? ''} ${result?.sector ?? ''}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((left, right) => (rows[right]?.prediction?.rankingScore ?? -Infinity) - (rows[left]?.prediction?.rankingScore ?? -Infinity));

  const highConviction = loadedResults.filter(r => (r.prediction?.rankingScore ?? 0) >= 80).length;

  const sectorScores: SectorInfo[] = Array.from(
    new Set(loadedResults.map(r => r.sector).filter(Boolean) as string[]),
  ).map(sector => {
    const values = loadedResults
      .filter(r => r.sector === sector)
      .map(r => r.prediction?.rankingScore)
      .filter((v): v is number => v !== null && v !== undefined);
    return { name: sector, score: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0 };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <AppShell active="scanner">
      <div className="flex h-[calc(100vh-104px)]">

        {/* LEFT PANEL */}
        <div className="w-[240px] flex-shrink-0 bg-white border-r border-[#e8e8e8] overflow-y-auto p-5">
          <h2 className="text-[16px] font-[800] text-[#0a0a0a] mb-1">AI Stock Scanner</h2>
          <p className="text-[12px] text-[#888] leading-[1.55] mb-3">
            Find high-quality, high-conviction stocks using AI & factor intelligence.
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-[700] text-[#1a7f4b] bg-[#ebf7f1] px-2.5 py-1 rounded-full mb-4 tracking-[0.04em]">
            ✦ AI-POWERED
          </span>
          <button className="w-full h-[34px] flex items-center gap-2 text-[12px] font-[600] text-[#555] border border-[#e8e8e8] rounded-[8px] px-3 mb-5 hover:border-[#ccc]">
            🗂 Saved Screens
          </button>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-[700] text-[#888] tracking-[0.07em] uppercase">Filters</span>
            <button className="text-[11px] font-[600] text-[#1a7f4b]">Reset All</button>
          </div>

          <FilterRow icon="🌐" label="Universe" value="India – NSE & BSE" sub="1,258 companies" action="Edit ›" />
          <div className="mb-4">
            <div className="text-[11px] font-[600] text-[#555] mb-2 flex items-center justify-between">
              <span>Score Range</span>
              <ChevronUp size={13} className="text-[#888]" />
            </div>
            <input type="range" min="0" max="100" defaultValue={50} className="w-full accent-[#0a0a0a]" />
            <div className="flex justify-between text-[10px] text-[#888] mt-1"><span>50</span><span>100</span></div>
          </div>
          <FilterRow icon="🏢" label="Sector" value="All Sectors" action="›" />
          <FilterRow icon="⭐" label="Quality" value="ROE > 15%, D/E < …" action="›" />
          <FilterRow icon="📈" label="Growth" value="Revenue CAGR > 10%" action="›" />
          <FilterRow icon="💰" label="Valuation" value="PE < 25, PEG < 1.5" action="›" />
          <FilterRow icon="⚡" label="Momentum" value="Price > 20DMA" action="›" />
          <FilterRow icon="🏛" label="Market Cap" value="Large & Mid Cap" action="›" />
          <FilterRow icon="🛡" label="Risk" value="Max Drawdown < 25%" action="›" />

          <button className="w-full h-[42px] bg-[#0a0a0a] text-white text-[14px] font-[700] rounded-[10px] flex items-center justify-center gap-2 mt-5 hover:bg-[#222]">
            Run Scan ✦
          </button>
          <button className="w-full text-[13px] text-[#888] mt-3 flex items-center justify-center gap-2">
            🗂 Save as New Screen
          </button>
        </div>

        {/* MAIN PANEL */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="grid grid-cols-4 border-b border-[#e8e8e8] flex-shrink-0">
            <StatBox label="Total Companies" value="1,258" sub="Searched universe" />
            <StatBox label="High Conviction" value={String(highConviction)} valueColor="#1a7f4b" sub="Score ≥ 80" />
            <StatBox label="Watchlist Matches" value="24" sub="In your watchlist" />
            <StatBox label="Live Updates" value="Just now" valueColor="#1a7f4b" valueFontSize="15px" sub="Real-time data" />
          </div>

          <div className="flex items-center gap-3 p-3 border-b border-[#f2f2f2]">
            <div className="flex items-center gap-2 flex-1 h-[34px] bg-[#f5f5f5] border border-[#e8e8e8] rounded-[8px] px-3">
              <Search size={13} className="text-[#888]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for a company e.g. TCS, HDFCBANK"
                className="flex-1 bg-transparent text-[13px] outline-none text-[#0a0a0a] placeholder:text-[#bbb]"
              />
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#555]">
              <span>Sort by</span>
              <select className="text-[13px] text-[#0a0a0a] font-[500] border border-[#e8e8e8] rounded-[7px] px-2 py-1">
                <option>AI Score (High to Low)</option>
              </select>
            </div>
            <button className="h-[34px] px-3 border border-[#e8e8e8] rounded-[7px] text-[13px] text-[#555] flex items-center gap-1">
              ↓ Export
            </button>
            <button className="h-[34px] px-2 border border-[#e8e8e8] rounded-[7px] text-[13px] text-[#555]">⋯</button>
          </div>

          <div className="flex gap-2 px-4 py-2.5 border-b border-[#f2f2f2] flex-wrap">
            <Chip label="AI Score ≥ 50" removable />
            <Chip label="Market: NSE & BSE" removable />
            <Chip label="Market Cap: Large, Mid" removable />
            <button className="text-[12px] text-[#c0392b] font-[500]">Clear All</button>
          </div>

          <div className="grid grid-cols-[48px_2fr_1fr_100px_90px_100px_100px_80px] px-4 py-2 border-b border-[#f2f2f2]">
            {['Rank', 'Company', 'Sector', 'AI Score ⓘ', 'Price (₹)', '1D Change', 'Factors', 'AI Signal'].map(h => (
              <span key={h} className="text-[10px] font-[700] text-[#888] uppercase tracking-[0.05em]">{h}</span>
            ))}
          </div>

          {visibleSymbols.map((s, i) => {
            const result = rows[s];
            if (!result) return <ScannerRowSkeleton key={s} rank={i + 1} />;
            return <ScannerRow key={s} result={result} rank={i + 1} />;
          })}

          <div className="flex items-center justify-between px-4 py-3 border-t border-[#f2f2f2] mt-auto text-[13px] text-[#888]">
            <span>Showing 1 to {visibleSymbols.length} of 1,258 results</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, '...', 210].map((p, i) => (
                <button key={i} className={`w-7 h-7 text-[12px] font-[600] rounded-[6px] ${p === 1 ? 'bg-[#0a0a0a] text-white' : 'text-[#888] hover:bg-[#f0f0f0]'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select className="border border-[#e8e8e8] rounded px-2 py-0.5 text-[12px]">
                <option>10</option>
              </select>
              <span>rows</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[240px] flex-shrink-0 bg-white border-l border-[#e8e8e8] overflow-y-auto p-5">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#22c55e]">✦</span>
              <span className="text-[14px] font-[700] text-[#0a0a0a]">AI Insights</span>
            </div>
            <p className="text-[12px] text-[#888] mb-4">Why these stocks rank high today</p>
            {[
              { icon: '↗', title: 'Improving Earnings Quality', desc: 'Companies showing consistent revenue growth and margin expansion are scoring higher this week.' },
              { icon: '%', title: 'Relative Valuation Edge', desc: 'Stocks trading below historical PE bands with strong fundamentals rank higher.' },
              { icon: '⌁', title: 'Momentum Strength', desc: 'Price momentum across multiple timeframes boosting scores for quality names.' },
              { icon: '⬡', title: 'Low Risk Profile', desc: 'Companies with low debt, high interest coverage and stable cash flows preferred.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-2.5 mb-3 pb-3 border-b border-[#f2f2f2] last:border-0">
                <div className="w-7 h-7 rounded-[7px] bg-[#ebf7f1] flex-shrink-0 flex items-center justify-center text-[13px]">{item.icon}</div>
                <div>
                  <div className="text-[12px] font-[600] text-[#2d2d2d] mb-0.5">{item.title}</div>
                  <div className="text-[11px] text-[#888] leading-[1.45]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[12px] font-[700] text-[#0a0a0a] mb-0.5">Top Sectors in Scan</div>
            <div className="text-[11px] text-[#888] mb-3">by Avg AI Score</div>
            {sectorScores.map(s => (
              <div key={s.name} className="flex items-center gap-2 mb-2">
                <span className="text-[12px] text-[#555] w-[72px] flex-shrink-0 truncate">{s.name}</span>
                <div className="flex-1 h-[4px] bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1a7f4b] rounded-full" style={{ width: `${s.score}%` }} />
                </div>
                <span className="text-[11px] font-[700] text-[#2d2d2d] w-[20px] text-right">{s.score}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-[#e8e8e8]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-[700] text-[#0a0a0a]">Make it Yours</span>
              <Bell size={16} className="text-[#888]" />
            </div>
            <p className="text-[12px] text-[#888] mb-3">
              Save this scan and get alerts on matching stocks.
            </p>
            <button className="w-full h-[36px] border border-[#e8e8e8] rounded-[8px] text-[13px] font-[600] text-[#555] flex items-center justify-center gap-2 hover:border-[#ccc]">
              🗂 Save This Scan
            </button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}

function StatBox({ label, value, sub, valueColor, valueFontSize }: { label: string; value: string; sub: string; valueColor?: string; valueFontSize?: string }) {
  return (
    <div className="px-5 py-3 border-r border-[#e8e8e8] last:border-r-0">
      <div className="text-[10px] font-[600] text-[#888] uppercase tracking-[0.05em] mb-0.5">{label}</div>
      <div className="text-[20px] font-[800]" style={{ color: valueColor ?? '#0a0a0a', fontSize: valueFontSize ?? '20px' }}>{value}</div>
      <div className="text-[10px] text-[#bbb] mt-0.5">{sub}</div>
    </div>
  );
}

function FilterRow({ icon, label, value, sub, action }: { icon: string; label: string; value: string; sub?: string; action?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f2f2f2] cursor-pointer hover:bg-[#fafafa] px-2 -mx-2 rounded-[6px] transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{icon}</span>
        <div>
          <span className="text-[12px] font-[500] text-[#555]">{label}</span>
          {sub && <div className="text-[10px] text-[#bbb]">{sub}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-[#888]">{value}</span>
        {action && <span className="text-[10px] text-[#ccc]">{action}</span>}
      </div>
    </div>
  );
}

function Chip({ label, removable }: { label: string; removable?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-[500] text-[#555] bg-[#f5f5f5] border border-[#e8e8e8] rounded-full px-2.5 py-1">
      {label}
      {removable && <span className="text-[#888] ml-0.5 cursor-pointer">×</span>}
    </span>
  );
}
