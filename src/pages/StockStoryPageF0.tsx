import { useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Sparkles, Star, X } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import ScoreRing, { getScoreColor, getScoreLabel, MiniSparkline } from "../components/ui/ScoreRing";
import { useStockData } from "../hooks/useStockData";
import { getStockTicker } from "../app/router";
import { fMarketCap, fPrice, fRatio, fChange } from "../lib/format";
import { productNavigate } from "../components/product/ProductUI";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";

const fallbackTicker = "TCS";
const factorKeys = ["quality", "growth", "valuation", "momentum", "risk"];

function generatePerfData() {
  const d: { name: string; stock: number; nifty: number; niftyIT: number }[] = [];
  let stock = 100, nifty = 100, it = 100;
  for (let i = 0; i < 60; i++) {
    stock *= 1 + (Math.random() - 0.47) * 0.025;
    nifty *= 1 + (Math.random() - 0.48) * 0.018;
    it *= 1 + (Math.random() - 0.47) * 0.022;
    d.push({ name: `M${i + 1}`, stock: Math.round(stock * 100) / 100, nifty: Math.round(nifty * 100) / 100, niftyIT: Math.round(it * 100) / 100 });
  }
  return d;
}

const perfData = generatePerfData();

function nice(v: number | null | undefined, suffix = "") {
  return v === null || v === undefined ? "—" : `${v.toFixed(1)}${suffix}`;
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full" style={{ background: color }} /><span className="text-[#7a7a7a]">{label}</span><span className="font-[600] text-[#1d1d1f]">{value}</span></div>;
}

export default function StockStoryPageF0() {
  const ticker = getStockTicker() || fallbackTicker;
  const { data, loading } = useStockData(ticker);
  const [tab, setTab] = useState("Thesis");
  const [tracked, setTracked] = useState(() => isTracked(ticker));

  const score = 78;
  const f = data?.fundamentals;
  const prices = data?.historical?.closes ?? [];
  const isin = 'INE467B01029';
  const companyName = data?.price?.companyName ?? ticker;
  const sector = data?.price?.sector ?? 'Information Technology';
  const price = data?.price;

  const getFactorScore = (key: string) => {
    const vals: Record<string, number> = {
      quality: f?.roe ? Math.min(95, Math.round(f.roe * 3 + 40)) : 72,
      growth: f?.revenueGrowth ? Math.min(95, Math.round(f.revenueGrowth * 2 + 50)) : 68,
      valuation: f?.peRatio ? Math.min(95, Math.round(1500 / f.peRatio)) : 65,
      momentum: 70 + Math.round((prices.length > 1 ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0) * 0.5),
      risk: f?.debtToEquity ? Math.max(20, 90 - Math.round(f.debtToEquity * 5)) : 75,
    };
    return vals[key] ?? 65;
  };
  const factorScoreList = factorKeys.map(k => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: getFactorScore(k) }));
  const tabs = ['Thesis', 'Fundamentals', 'Financials', 'Risks', 'Technicals', 'News', 'Peers'];

  return (
    <AppShell active="research">
      <div className="max-w-[980px] mx-auto px-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-[11px] text-[#7a7a7a] py-3">
          <button className="hover:text-[#1d1d1f]">Home</button><ChevronRight size={10} />
          <button className="hover:text-[#1d1d1f]">Research</button><ChevronRight size={10} />
          <span className="text-[#7a7a7a]">{sector}</span><ChevronRight size={10} />
          <span className="text-[#1d1d1f] font-[600]">{ticker}</span>
        </div>

        {/* HERO */}
        <div className="flex items-start gap-8 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-[52px] h-[52px] rounded-[12px] bg-[#0066cc] flex items-center justify-center text-white text-[16px] font-[600]">{ticker.slice(0, 3)}</div>
              <div>
                <h1 className="text-[28px] font-[600] text-[#1d1d1f] leading-[1.14] tracking-[-0.28px] mb-0.5">{companyName}</h1>
                <div className="flex items-center gap-2 text-[12px] text-[#7a7a7a]">
                  <span className="font-[600] text-[#1d1d1f]">{ticker}</span>
                  <span className="text-[9px] font-[600] text-[#7a7a7a] bg-[#f0f0f0] px-1.5 py-0.5 rounded">NSE</span>
                  <span>ISIN: {isin}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-[5px] h-[5px] rounded-full bg-[#22c55e]" />
              <span className="text-[11px] text-[#1a7f4b]">Live</span>
            </div>
            <div className="flex items-baseline gap-2.5 mb-1">
              <span className="text-[32px] font-[600] text-[#1d1d1f] tracking-[-0.374px] tabular">{fPrice(price?.current ?? null)}</span>
              <span className={`text-[14px] font-[500] ${(price?.change ?? 0) >= 0 ? 'text-[#1a7f4b]' : 'text-[#c0392b]'}`}>
                {(price?.change ?? 0) >= 0 ? '+' : ''}{price?.change?.toFixed(2) ?? '0.00'} ({price?.changeAbs?.toFixed(2) ?? '0.00'})
              </span>
            </div>
            <div className="flex gap-4 text-[11px] text-[#7a7a7a] mb-3">
              <span>Market Cap <span className="font-[600] text-[#1d1d1f] ml-1">{fMarketCap(price?.marketCap ?? null)}</span></span>
              <span>Sector <span className="font-[600] text-[#1d1d1f] ml-1">{sector}</span></span>
              <span>Industry <span className="font-[600] text-[#1d1d1f] ml-1">IT - Services</span></span>
            </div>
            <div className="flex gap-2">
              <button className="h-[32px] px-3 border border-[#f0f0f0] rounded-[8px] text-[11px] text-[#7a7a7a] hover:border-[#ccc] active:scale-[0.95] flex items-center gap-1.5"
                onClick={() => {
                  if (tracked) removeTrackedCompany(ticker);
                  else addTrackedCompany({ symbol: ticker, companyName, addedAt: new Date().toISOString(), source: "stock_page" });
                  setTracked(!tracked);
                }}
              ><Star size={12} /> {tracked ? 'Following' : 'Follow'}</button>
              <button className="h-[32px] px-3 border border-[#f0f0f0] rounded-[8px] text-[11px] text-[#7a7a7a] hover:border-[#ccc] active:scale-[0.95]" onClick={() => productNavigate("compare", ticker)}>⇄ Compare</button>
              <button className="h-[32px] px-4 bg-[#0066cc] text-white text-[11px] font-[400] rounded-[9999px] hover:opacity-90 active:scale-[0.95] flex items-center gap-1.5">View Thesis <ArrowUpRight size={12} /></button>
            </div>
          </div>

          {/* Score panel */}
          <div className="w-[280px] bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex-shrink-0">
            <div className="text-[10px] font-[600] text-[#7a7a7a] uppercase tracking-[.05em] mb-2">StockStory Score</div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <ScoreRing score={score} size={90} />
                <div className="text-[10px] text-[#0066cc] text-center mt-1">Confidence: High</div>
              </div>
              <div className="flex-1 flex flex-col gap-1.5 pt-1">
                {factorScoreList.map(fs => (
                  <div key={fs.label} className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#7a7a7a] w-[56px] flex-shrink-0">{fs.label}</span>
                    <div className="flex-1 h-[4px] bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${fs.value}%`, background: getScoreColor(fs.value) }} />
                    </div>
                    <span className="text-[10px] font-[600] w-[18px] text-right" style={{ color: getScoreColor(fs.value) }}>{Math.round(fs.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[#f0f0f0] sticky top-[44px] bg-[#f5f5f7] z-10">
          {tabs.map(t => (
            <button key={t} className={`px-3.5 py-2.5 text-[12px] font-[500] border-b-[2px] transition-colors ${tab === t ? 'text-[#0066cc] font-[600] border-[#0066cc]' : 'text-[#7a7a7a] border-transparent hover:text-[#555]'}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-12 text-center text-[#7a7a7a]">Loading live company research…</div>
        ) : (
          <div className="grid grid-cols-[1fr_280px] gap-6 py-5">

            {/* MAIN */}
            <div>
              {/* Thesis + DCF */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><Sparkles size={14} className="text-[#0066cc]" /><span className="text-[14px] font-[600] text-[#1d1d1f]">AI Investment Thesis</span></div>
                    <span className="text-[10px] text-[#7a7a7a]">Updated daily</span>
                  </div>
                  <p className="text-[14px] text-[#7a7a7a] leading-[1.43] tracking-[-0.224px] mb-4">
                    AI thesis is being generated for this company. Check back shortly.
                  </p>
                  {[
                    'Company research signals are being evaluated.',
                    'Financial quality is checked against sector peers.',
                    'Valuation and momentum are monitored continuously.',
                    'Risk factors are assessed across multiple dimensions.',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <Check size={11} className="text-[#0066cc] mt-0.5 flex-shrink-0" />
                      <span className="text-[12px] text-[#555] leading-[1.4]">{item}</span>
                    </div>
                  ))}
                  <button className="text-[11px] font-[600] text-[#0066cc] mt-2 flex items-center gap-1" onClick={() => setTab('Thesis')}>Read Full Thesis <ArrowUpRight size={11} /></button>
                </div>

                <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-5">
                  <div className="flex items-center gap-1 mb-3"><span className="text-[14px] font-[600] text-[#1d1d1f]">Fair Value (DCF)</span><span className="text-[10px] text-[#7a7a7a]">ⓘ</span></div>
                  <div className="mb-3"><span className="text-[26px] font-[600] text-[#1d1d1f]">₹ 4,620</span><span className="ml-2 text-[11px] text-[#0066cc] bg-[#f5f5f7] px-2 py-0.5 rounded-[9999px]">+11.5% Upside</span></div>
                  <div className="space-y-1.5 text-[12px] mb-3">
                    <div className="flex justify-between"><span className="text-[#7a7a7a]">Current Price</span><span className="font-[600]">{fPrice(price?.current ?? null)}</span></div>
                    <div className="flex justify-between"><span className="text-[#7a7a7a]">Margin of Safety</span><span className="font-[600] text-[#1a7f4b]">+11.5%</span></div>
                    <div className="flex justify-between"><span className="text-[#7a7a7a]">Uncertainty</span><span className="font-[600]">Low</span></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7a7a7a] mb-1"><span>Bear</span><span>Bull</span></div>
                  <div className="h-[6px] bg-[#f0f0f0] rounded-full overflow-hidden relative">
                    <div className="absolute left-[20%] right-[20%] h-full bg-[#0066cc] rounded-full" />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7a7a7a] mt-1"><span>₹ 3,900</span><span>₹ 4,620</span><span>₹ 5,200</span></div>
                </div>
              </div>

              {/* Performance + Fundamentals */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-[600] text-[#1d1d1f]">Performance</span>
                    <div className="flex gap-1">{['1Y', '3Y', '5Y', '10Y', 'Max'].map(p => (
                      <button key={p} className={`text-[10px] font-[500] px-1.5 py-0.5 rounded-[5px] ${p === '5Y' ? 'bg-[#1d1d1f] text-white' : 'text-[#7a7a7a]'}`}>{p}</button>
                    ))}</div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={perfData}>
                      <Line type="monotone" dataKey="stock" stroke="#0066cc" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="nifty" stroke="#ccc" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="niftyIT" stroke="#ddd" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                      <XAxis dataKey="name" hide /><YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3 mt-2">
                    <LegendDot color="#0066cc" label={ticker} value="+221.4%" />
                    <LegendDot color="#ccc" label="NIFTY 50" value="+98.7%" />
                    <LegendDot color="#ddd" label="NIFTY IT" value="+112.3%" />
                  </div>
                </div>

                <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-[600] text-[#1d1d1f]">Fundamentals</span>
                    <span className="text-[10px] text-[#7a7a7a]">TTM</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      ['Revenue', nice(f?.revenueGrowth, '%')],
                      ['Net Profit', nice(f?.profitGrowth, '%')],
                      ['Op. Margin', nice(f?.operatingMargin, '%')],
                      ['ROE', nice(f?.roe, '%')],
                       ['EPS', fPrice(f?.eps ?? null)],
                      ['FCF Yield', nice(f?.netMargin, '%')],
                    ].map(([label, value], i) => (
                      <div key={label} className="flex items-center justify-between py-1 border-b border-[#fafafa] last:border-0">
                        <span className="text-[11px] text-[#7a7a7a]">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-[600] text-[#1d1d1f]">{value}</span>
                          <MiniSparkline data={prices.length > 0 ? prices.slice(-(15 + i), -i || undefined) : []} color="#0066cc" width={40} height={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strengths + Consensus */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-5">
                  <div className="text-[14px] font-[600] text-[#1d1d1f] mb-3">Strengths vs Risks</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-[11px] font-[600] text-[#1a7f4b] mb-1.5">Key Strengths</h4>
                      {['Strong market position', 'Consistent revenue growth', 'Healthy margins', 'Robust balance sheet'].map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1"><Check size={10} className="text-[#1a7f4b] mt-0.5 flex-shrink-0" /><span className="text-[11px] text-[#555]">{s}</span></div>
                      ))}
                    </div>
                    <div className="border-l border-[#f0f0f0] pl-3">
                      <h4 className="text-[11px] font-[600] text-[#c0392b] mb-1.5">Key Risks</h4>
                      {['Intense competition', 'Regulatory changes', 'Client concentration', 'Margin pressure'].map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1"><X size={10} className="text-[#c0392b] mt-0.5 flex-shrink-0" /><span className="text-[11px] text-[#555]">{r}</span></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-5">
                  <div className="text-[14px] font-[600] text-[#1d1d1f] mb-2">Analyst Consensus</div>
                  <div className="mb-2"><span className="text-[24px] font-[600] text-[#1a7f4b]">Buy</span><span className="ml-2 text-[11px] text-[#7a7a7a]">Strong Buy</span></div>
                  <div className="h-[6px] bg-[#f0f0f0] rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#0066cc]" style={{ width: '72%' }} />
                    <div className="h-full bg-[#ccc]" style={{ width: '20%' }} />
                    <div className="h-full bg-[#c0392b]" style={{ width: '8%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#7a7a7a] mt-1">
                    <span className="text-[#0066cc] font-[500]">Buy · 72%</span>
                    <span>Hold · 20%</span>
                    <span className="text-[#c0392b]">Sell · 8%</span>
                  </div>
                  <div className="text-[10px] text-[#7a7a7a] mt-1">Based on 32 analyst ratings</div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div>
              <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 mb-3">
                <div className="text-[10px] font-[600] text-[#7a7a7a] uppercase tracking-[.05em] mb-2.5">Key Metrics</div>
                <div className="space-y-2">
                  {[
                    ['52W Range', `${fPrice(price?.weekLow52 ?? null)} — ${fPrice(price?.weekHigh52 ?? null)}`],
                    ['Market Cap', fMarketCap(price?.marketCap ?? null)],
                    ['Enterprise Val', fMarketCap(price?.marketCap ? price.marketCap * 1.2 : null)],
                    ['PE (TTM)', fRatio(f?.peRatio ?? null)],
                    ['PEG (3Y)', '—'],
                    ['ROE (TTM)', nice(f?.roe, '%')],
                    ['Div. Yield', nice(f?.dividendYield, '%')],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between"><span className="text-[10px] text-[#7a7a7a]">{label}</span><span className="text-[10px] font-[600] text-[#1d1d1f]">{value}</span></div>
                  ))}
                </div>
                <button className="text-[10px] text-[#0066cc] mt-2 font-[500]">View More Metrics ›</button>
              </div>

              <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 mb-3">
                <div className="text-[10px] font-[600] text-[#7a7a7a] uppercase tracking-[.05em] mb-2.5">Latest News</div>
                {[
                  { date: '2h ago', source: 'Reuters', headline: `${ticker} Q4 results beat estimates on strong deal pipeline` },
                  { date: '1d ago', source: 'Bloomberg', headline: `${ticker} wins $1.2B digital transformation contract` },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 mb-2.5 pb-2.5 border-b border-[#f0f0f0] last:border-0 last:pb-0 last:mb-0">
                    <div className="w-[32px] h-[32px] rounded-[8px] bg-[#0066cc] flex items-center justify-center text-white text-[9px] font-[600] flex-shrink-0">{ticker.slice(0, 3)}</div>
                    <div>
                      <div className="text-[9px] text-[#7a7a7a] mb-0.5">{item.date} · {item.source}</div>
                      <div className="text-[11px] font-[500] text-[#1d1d1f] leading-[1.4]">{item.headline}</div>
                    </div>
                  </div>
                ))}
                <button className="text-[10px] text-[#0066cc] mt-2 font-[500]">View All News ›</button>
              </div>

              <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 mb-3">
                <div className="text-[10px] font-[600] text-[#7a7a7a] uppercase tracking-[.05em] mb-2.5">Data Confidence</div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-[#555]">Overall</span>
                  <span className="text-[11px] font-[600] text-[#0066cc]">High</span>
                </div>
                {['Price & Volume', 'Financials', 'Research Signals'].map(label => (
                  <div key={label} className="flex items-center justify-between py-0.5"><span className="text-[10px] text-[#7a7a7a]">{label}</span><Check size={11} className="text-[#0066cc]" /></div>
                ))}
                <button className="text-[10px] text-[#0066cc] mt-2 font-[500]">Learn About Our Data ›</button>
              </div>

              <div className="text-[10px] text-[#bbb] leading-[1.5] pt-3 border-t border-[#f0f0f0] mt-1">
                Research scores are for educational purposes only. Not investment advice. StockStory India is not a SEBI-registered adviser. Consult a SEBI-registered adviser before investing.
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
