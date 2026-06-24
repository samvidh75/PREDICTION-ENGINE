import { useEffect, useState } from "react";
import { Bell, ChevronUp, Search, Sparkles } from "lucide-react";
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

  const getFactorVal = (key: string) => {
    const f = factorScores.find(x => x.group === key);
    return f?.value ?? 0;
  };

  const initials = result.symbol.slice(0, 2);
  const colors = ['#0066cc', '#0071e3', '#1a56db', '#5856d6', '#af52de', '#ff2d55', '#ff9500', '#ffcc02', '#34c759', '#007aff'];

  return (
    <div
      className="grid grid-cols-[40px_2fr_1fr_80px_80px_80px_120px_80px] items-center px-4 py-2.5 border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer transition-colors text-[14px]"
      onClick={() => productNavigate("stock", result.symbol)}
    >
      <span className="text-[12px] font-[600] text-[#7a7a7a]">{rank}</span>
      <div className="flex items-center gap-2.5">
        <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center text-white text-[10px] font-[600]" style={{ background: colors[rank % colors.length] }}>
          {initials}
        </div>
        <div>
          <div className="text-[14px] font-[600] text-[#1d1d1f]">{result.symbol}</div>
          <div className="text-[11px] text-[#7a7a7a]">{result.companyName ?? '—'}</div>
        </div>
      </div>
      <span className="text-[11px] text-[#7a7a7a]">{result.sector ?? '—'}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[15px] font-[600]" style={{ color: score ? getScoreColor(score) : '#bbb' }}>{score ?? '—'}</span>
        <MiniSparkline data={result.technicals.closePrices.slice(-20)} color="#0066cc" width={40} height={18} />
      </div>
      <span className="text-[12px] font-[600] text-[#1d1d1f] tabular">{fPrice(result.price.current)}</span>
      <span className={`text-[12px] font-[500] ${result.price.change !== null && result.price.change >= 0 ? 'text-[#1a7f4b]' : 'text-[#c0392b]'}`}>
        {result.price.change !== null ? fChange(result.price.change) + '%' : '—'}
      </span>
      <div className="flex gap-1 items-center">
        {['Q', 'G', 'V', 'M', 'R'].map((letter, i) => {
          const keys = ['quality', 'growth', 'valuation', 'momentum', 'risk'];
          const val = getFactorVal(keys[i]);
          return (
            <div key={letter} className="flex flex-col items-center gap-[1px]">
              <span className="text-[8px] font-[600] text-[#7a7a7a]">{letter}</span>
              <div className="w-[14px] h-[2px] rounded-full bg-[#f0f0f0]">
                <div className="h-full rounded-full" style={{ width: `${val}%`, background: getScoreColor(val) }} />
              </div>
              <span className="text-[7px] font-[500]" style={{ color: getScoreColor(val) }}>{Math.round(val)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-[600]" style={{ color: signal.color }}>{signal.text}</span>
        <ConfidenceRing pct={result.dataCompleteness} size={24} />
      </div>
    </div>
  );
}

function ScannerRowSkeleton({ rank }: { rank: number }) {
  return (
    <div className="grid grid-cols-[40px_2fr_1fr_80px_80px_80px_120px_80px] items-center px-4 py-2.5 border-b border-[#f0f0f0]">
      <span className="text-[12px] text-[#7a7a7a]">{rank}</span>
      <div className="flex items-center gap-2.5">
        <div className="w-[28px] h-[28px] rounded-[8px] bg-[#f0f0f0] animate-pulse" />
        <div><div className="w-14 h-3 bg-[#f0f0f0] animate-pulse rounded mb-1" /><div className="w-20 h-2.5 bg-[#f0f0f0] animate-pulse rounded" /></div>
      </div>
      <div className="w-12 h-2.5 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-12 h-4 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-12 h-3 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-12 h-3 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-16 h-3 bg-[#f0f0f0] animate-pulse rounded" />
      <div className="w-14 h-3 bg-[#f0f0f0] animate-pulse rounded" />
    </div>
  );
}

export default function PublicRankingsPage() {
  const [rows, setRows] = useState<Record<string, PipelineResult | null>>({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all(symbols.map(async (s) => [s, await runCompanyDataPipeline(s)] as const))
      .then((items) => { if (active) setRows(Object.fromEntries(items)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const loadedResults = Object.values(rows).filter((r): r is PipelineResult => r !== null);
  const visibleSymbols = symbols
    .filter(s => {
      const r = rows[s];
      return `${s} ${r?.companyName ?? ''} ${r?.sector ?? ''}`.toLowerCase().includes(query.trim().toLowerCase());
    })
    .sort((a, b) => (rows[b]?.prediction?.rankingScore ?? -Infinity) - (rows[a]?.prediction?.rankingScore ?? -Infinity));

  const highConviction = loadedResults.filter(r => (r.prediction?.rankingScore ?? 0) >= 80).length;
  const sectorScores: SectorInfo[] = Array.from(new Set(loadedResults.map(r => r.sector).filter(Boolean) as string[]))
    .map(sector => {
      const values = loadedResults.filter(r => r.sector === sector).map(r => r.prediction?.rankingScore).filter((v): v is number => v !== null && v !== undefined);
      return { name: sector, score: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <AppShell active="scanner">
      <div className="flex h-[calc(100vh-84px)]">

        {/* LEFT PANEL */}
        <div className="w-[220px] flex-shrink-0 bg-white border-r border-[#f0f0f0] overflow-y-auto p-5">
          <h2 className="text-[17px] font-[600] text-[#1d1d1f] tracking-[-0.374px] mb-1">AI Stock Scanner</h2>
          <p className="text-[12px] text-[#7a7a7a] leading-[1.43] tracking-[-0.224px] mb-3">
            Find high-quality stocks using AI and factor intelligence.
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-[600] text-[#0066cc] bg-[#f5f5f7] px-2.5 py-1 rounded-[9999px] mb-4">✦ AI-POWERED</span>
          <button className="w-full h-[32px] flex items-center gap-2 text-[11px] text-[#7a7a7a] border border-[#f0f0f0] rounded-[8px] px-3 mb-4 hover:border-[#ccc]">🗂 Saved Screens</button>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-[600] text-[#7a7a7a] tracking-[0.05em] uppercase">Filters</span>
            <button className="text-[10px] text-[#0066cc]">Reset All</button>
          </div>

          <FilterRow icon="🌐" label="Universe" value="NSE & BSE" />
          <div className="mb-3">
            <div className="text-[11px] text-[#7a7a7a] mb-2 flex items-center justify-between">
              <span>Score Range</span>
              <ChevronUp size={11} className="text-[#bbb]" />
            </div>
            <input type="range" min="0" max="100" defaultValue={50} className="w-full accent-[#0066cc]" />
            <div className="flex justify-between text-[9px] text-[#bbb] mt-1"><span>50</span><span>100</span></div>
          </div>
          <FilterRow icon="🏢" label="Sector" value="All Sectors" />
          <FilterRow icon="⭐" label="Quality" value="ROE > 15%" />
          <FilterRow icon="📈" label="Growth" value="CAGR > 10%" />
          <FilterRow icon="💰" label="Valuation" value="PE < 25" />
          <FilterRow icon="⚡" label="Momentum" value="> 20DMA" />
          <FilterRow icon="🏛" label="Market Cap" value="Lg & Mid" />
          <FilterRow icon="🛡" label="Risk" value="Drawdown <25%" />

          <button className="w-full h-[36px] bg-[#0066cc] text-white text-[13px] font-[400] rounded-[9999px] flex items-center justify-center gap-2 mt-4 hover:opacity-90 active:scale-[0.95]">Run Scan ✦</button>
          <button className="w-full text-[11px] text-[#7a7a7a] mt-2 text-center">🗂 Save as New Screen</button>
        </div>

        {/* MAIN PANEL */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-2 flex-1 h-[32px] bg-[#f5f5f7] border border-[#f0f0f0] rounded-[9999px] px-3">
              <Search size={12} className="text-[#7a7a7a]" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search companies..."
                className="flex-1 bg-transparent text-[12px] outline-none text-[#1d1d1f] placeholder:text-[#bbb]" />
            </div>
            <select className="text-[11px] text-[#7a7a7a] border border-[#f0f0f0] rounded-[8px] px-2 py-1">
              <option>AI Score</option>
            </select>
            <button className="text-[11px] text-[#7a7a7a] border border-[#f0f0f0] rounded-[8px] px-2.5 py-1">↓ Export</button>
          </div>

          <div className="flex gap-2 px-4 py-2 border-b border-[#f0f0f0] flex-wrap">
            {['AI Score ≥ 50', 'Market: NSE & BSE', 'Market Cap: Large'].map(label => (
              <span key={label} className="text-[10px] text-[#7a7a7a] bg-[#f5f5f7] border border-[#f0f0f0] rounded-[9999px] px-2 py-1">{label} ×</span>
            ))}
            <button className="text-[10px] text-[#c0392b]">Clear All</button>
          </div>

          <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#f0f0f0]">
            {[
              ['Total Companies', '1,258'],
              ['High Conviction', String(highConviction), '#0066cc'],
              ['Watchlist Matches', '24'],
              ['Live', 'Just now', '#0066cc'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center gap-2 pr-4 border-r border-[#f0f0f0] last:border-r-0">
                <span className="text-[9px] text-[#7a7a7a] uppercase tracking-[0.05em]">{label}</span>
                <span className="text-[13px] font-[600]" style={{ color: color ?? '#1d1d1f' }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[40px_2fr_1fr_80px_80px_80px_120px_80px] px-4 py-1.5 border-b border-[#f0f0f0] text-[9px] font-[600] text-[#7a7a7a] uppercase tracking-[0.05em]">
            {['Rank', 'Company', 'Sector', 'Score', 'Price', '1D', 'Factors', 'Signal'].map(h => <span key={h}>{h}</span>)}
          </div>

          {visibleSymbols.map((s, i) => {
            const r = rows[s];
            if (!r) return <ScannerRowSkeleton key={s} rank={i + 1} />;
            return <ScannerRow key={s} result={r} rank={i + 1} />;
          })}

          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f0f0f0] mt-auto text-[11px] text-[#7a7a7a]">
            <span>Showing 1 to {visibleSymbols.length} of 1,258</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, '...', 210].map((p, i) => (
                <button key={i} className={`w-6 h-6 text-[10px] font-[500] rounded-[5px] ${p === 1 ? 'bg-[#1d1d1f] text-white' : 'text-[#7a7a7a]'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-[220px] flex-shrink-0 bg-white border-l border-[#f0f0f0] overflow-y-auto p-5">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2"><Sparkles size={14} className="text-[#0066cc]" /><span className="text-[14px] font-[600] text-[#1d1d1f]">AI Insights</span></div>
            {[
              { icon: '↗', title: 'Improving Earnings Quality', desc: 'Companies with consistent revenue growth and margin expansion score higher.' },
              { icon: '%', title: 'Relative Valuation Edge', desc: 'Stocks below historical PE bands with strong fundamentals rank higher.' },
              { icon: '⌁', title: 'Momentum Strength', desc: 'Price momentum across multiple timeframes boosts scores for quality names.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-2.5 mb-3 pb-3 border-b border-[#f0f0f0] last:border-0">
                <div className="w-7 h-7 rounded-[8px] bg-[#f5f5f7] flex-shrink-0 flex items-center justify-center text-[11px]">{item.icon}</div>
                <div>
                  <div className="text-[11px] font-[600] text-[#1d1d1f] mb-0.5">{item.title}</div>
                  <div className="text-[10px] text-[#7a7a7a] leading-[1.4]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-5">
            <div className="text-[11px] font-[600] text-[#1d1d1f] mb-0.5">Top Sectors</div>
            <div className="text-[10px] text-[#7a7a7a] mb-2">by Avg AI Score</div>
            {sectorScores.map(s => (
              <div key={s.name} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-[#7a7a7a] w-[60px] truncate">{s.name}</span>
                <div className="flex-1 h-[3px] bg-[#f0f0f0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0066cc] rounded-full" style={{ width: `${s.score}%` }} />
                </div>
                <span className="text-[10px] font-[600] text-[#1d1d1f] w-[16px] text-right">{s.score}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-[600] text-[#1d1d1f]">Make it Yours</span>
              <Bell size={14} className="text-[#7a7a7a]" />
            </div>
            <p className="text-[10px] text-[#7a7a7a] mb-3">Save this scan and get alerts on matching stocks.</p>
            <button className="w-full h-[32px] border border-[#f0f0f0] rounded-[8px] text-[11px] text-[#7a7a7a] hover:border-[#ccc]">🗂 Save This Scan</button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}

function FilterRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#f0f0f0] cursor-pointer hover:bg-[#fafafa] px-1 -mx-1 rounded-[6px] transition-colors">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px]">{icon}</span>
        <span className="text-[10px] text-[#7a7a7a]">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-[#bbb]">{value}</span>
        <span className="text-[8px] text-[#ccc]">›</span>
      </div>
    </div>
  );
}
