import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronRight,
  AlertCircle,
  Gauge,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type FactorKey = "quality" | "growth" | "valuation" | "momentum" | "stability" | "risk";
type StockPreview = {
  symbol: string;
  name: string;
  sector: string;
  price: string;
  change: number;
  score: number;
  confidence: "High" | "Medium";
  factors: Record<FactorKey, number>;
};

const stocks: StockPreview[] = [
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Technology", price: "₹3,842.70", change: 1.28, score: 84, confidence: "High", factors: { quality: 92, growth: 77, valuation: 68, momentum: 82, stability: 91, risk: 87 } },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financial Services", price: "₹1,724.40", change: 0.74, score: 79, confidence: "High", factors: { quality: 86, growth: 74, valuation: 72, momentum: 69, stability: 88, risk: 82 } },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy & Retail", price: "₹2,931.10", change: -0.36, score: 75, confidence: "High", factors: { quality: 79, growth: 72, valuation: 64, momentum: 71, stability: 84, risk: 77 } },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Healthcare", price: "₹1,691.25", change: 1.92, score: 72, confidence: "Medium", factors: { quality: 81, growth: 69, valuation: 61, momentum: 78, stability: 74, risk: 71 } },
];

const indices = [
  ["NIFTY 50", "24,856.50", "+0.62%"],
  ["SENSEX", "81,332.72", "+0.58%"],
  ["NIFTY BANK", "51,295.90", "+0.41%"],
  ["INDIA VIX", "12.84", "−2.10%"],
];

const factorLabels: Record<FactorKey, string> = {
  quality: "Quality",
  growth: "Growth",
  valuation: "Valuation",
  momentum: "Momentum",
  stability: "Stability",
  risk: "Safety",
};

function ScoreRing({ score, size = 84 }: { score: number; size?: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 80 ? "#0f9f6e" : score >= 70 ? "#2563eb" : "#92400E";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-label={`Score ${score} out of 100`}>
      <svg className="-rotate-90" width={size} height={size} viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#e8edf4" strokeWidth="7" />
        <circle cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
      </svg>
      <div className="absolute text-center"><div className="text-xl font-bold text-slate-950">{score}</div><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Score</div></div>
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-slate-600">{label}</span><span className="font-bold text-slate-900">{value}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export default function StockStoryUIV2() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"scanner" | "quality" | "momentum">("scanner");
  const [selected, setSelected] = useState(stocks[0]);
  const visibleStocks = useMemo(() => {
    const matching = stocks.filter(stock => `${stock.symbol} ${stock.name} ${stock.sector}`.toLowerCase().includes(query.toLowerCase()));
    if (filter === "quality") return [...matching].sort((a, b) => b.factors.quality - a.factors.quality);
    if (filter === "momentum") return [...matching].sort((a, b) => b.factors.momentum - a.factors.momentum);
    return matching;
  }, [filter, query]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2.5" aria-label="StockStory home"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white"><LineChart size={18} /></span><span className="text-lg font-black tracking-tight">StockStory</span></a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 md:flex"><a className="text-slate-950" href="#scanner">Scanner</a><a href="#research">Research</a><a href="#portfolio">Portfolio</a></nav>
          <div className="ml-auto hidden w-full max-w-md items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 sm:flex"><Search size={16} className="text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent px-2.5 py-2.5 text-sm outline-none" placeholder="Search NSE stocks, sectors or themes" aria-label="Search stocks" /></div>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600" aria-label="Notifications"><Bell size={17} /></button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">SM</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {indices.map(([name, value, change]) => <div key={name} className="px-5 py-3.5"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{name}</div><div className="mt-1 flex items-baseline gap-2"><span className="font-bold">{value}</span><span className={change.startsWith("+") ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-rose-600"}>{change}</span></div></div>)}
          </div>
        </section>

        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600"><Sparkles size={14} /> Unified intelligence</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Indian equity scanner</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">A clean research workspace for comparing business quality, valuation, momentum and risk in one explainable score.</p></div>
          <div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist">
            {(["scanner", "quality", "momentum"] as const).map(item => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${filter === item ? "bg-slate-950 text-white shadow" : "text-slate-500 hover:text-slate-900"}`} role="tab" aria-selected={filter === item}>{item}</button>)}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.85fr)]">
          <section id="scanner" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold">Top research candidates</h2><p className="mt-0.5 text-xs text-slate-400">Illustrative interface preview · not live market advice</p></div><button className="flex items-center gap-1 text-xs font-bold text-blue-600">View methodology <ArrowUpRight size={14} /></button></div>
            <div className="divide-y divide-slate-100">
              {visibleStocks.map(stock => (
                <button key={stock.symbol} onClick={() => setSelected(stock)} className={`grid w-full gap-4 px-5 py-5 text-left transition hover:bg-slate-50 sm:grid-cols-[minmax(210px,1fr)_120px_100px] sm:items-center ${selected.symbol === stock.symbol ? "bg-blue-50/60" : ""}`}>
                  <div className="flex items-center gap-4"><ScoreRing score={stock.score} size={72} /><div><div className="flex items-center gap-2"><span className="font-black">{stock.symbol}</span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{stock.confidence}</span></div><div className="mt-1 text-sm font-medium text-slate-600">{stock.name}</div><div className="mt-1 text-xs text-slate-400">{stock.sector}</div></div></div>
                  <div><div className="text-sm font-bold">{stock.price}</div><div className={`mt-1 flex items-center gap-1 text-xs font-bold ${stock.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{stock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{Math.abs(stock.change).toFixed(2)}%</div></div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end"><div className="hidden text-right lg:block"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quality</div><div className="font-black">{stock.factors.quality}</div></div><ChevronRight size={18} className="text-slate-300" /></div>
                </button>
              ))}
              {visibleStocks.length === 0 && <div className="px-5 py-16 text-center text-sm text-slate-500">No matching companies found.</div>}
            </div>
          </section>

          <aside className="space-y-6">
            <section id="research" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Research snapshot</div><h2 className="mt-1 text-xl font-black">{selected.symbol}</h2><p className="text-xs text-slate-500">{selected.name}</p></div><ScoreRing score={selected.score} size={92} /></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{(Object.keys(factorLabels) as FactorKey[]).map(key => <FactorBar key={key} label={factorLabels[key]} value={selected.factors[key]} />)}</div>
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-600" /><div><div className="text-sm font-bold text-blue-950">Signal is supported by quality</div><p className="mt-1 text-xs leading-5 text-blue-800/75">The score is led by capital efficiency and stability. Valuation is the primary factor to review before acting.</p></div></div></div>
            </section>

            <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-300/50">
              <div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Engine transparency</div><h2 className="mt-1 font-bold">How the score is weighted</h2></div><Gauge className="text-blue-300" size={22} /></div>
              <div className="mt-5 grid grid-cols-3 gap-2">{[["Quality", "22%"], ["Growth", "20%"], ["Value", "18%"], ["Safety", "15%"], ["Momentum", "13%"], ["Stability", "12%"]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/7 px-3 py-3"><div className="text-lg font-black">{value}</div><div className="mt-0.5 text-[10px] font-semibold text-slate-400">{label}</div></div>)}</div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950"><BarChart3 size={15} /> Open full factor audit</button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex gap-3"><AlertCircle className="mt-0.5 shrink-0 text-slate-600" size={18} /><p className="text-xs leading-5 text-slate-900"><strong>Preview data:</strong> values on this standalone design page are illustrative and must be connected to the live research API before release.</p></div></section>
          </aside>
        </div>
      </main>
    </div>
  );
}
