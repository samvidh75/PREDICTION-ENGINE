import { useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Sparkles, Star, X } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import ScoreRing, { getScoreColor, getScoreLabel, MiniSparkline } from "../components/ui/ScoreRing";
import { useStockData } from "../hooks/useStockData";
import { getStockTicker } from "../app/router";
import { fMarketCap, fPrice, fRatio, fChange, fRelativeTime } from "../lib/format";
import { productNavigate } from "../components/product/ProductUI";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const fallbackTicker = "TCS";

function nice(v: number | null | undefined, suffix = "") {
  return v === null || v === undefined ? "—" : `${v.toFixed(1)}${suffix}`;
}

const factorKeys = ["quality", "growth", "valuation", "momentum", "risk"];

function generatePerfData() {
  const d: { name: string; tcs: number; nifty: number; niftyIT: number }[] = [];
  let tcs = 100, nifty = 100, it = 100;
  for (let i = 0; i < 60; i++) {
    tcs *= 1 + (Math.random() - 0.47) * 0.025;
    nifty *= 1 + (Math.random() - 0.48) * 0.018;
    it *= 1 + (Math.random() - 0.47) * 0.022;
    d.push({ name: `M${i + 1}`, tcs: Math.round(tcs * 100) / 100, nifty: Math.round(nifty * 100) / 100, niftyIT: Math.round(it * 100) / 100 });
  }
  return d;
}

const perfData = generatePerfData();

export default function StockStoryPageF0() {
  const ticker = getStockTicker() || fallbackTicker;
  const { pipeline, loading } = useStockData(ticker);
  const [tab, setTab] = useState("Thesis");
  const [tracked, setTracked] = useState(() => isTracked(ticker));

  const pred = pipeline?.prediction;
  const score = pred?.rankingScore ?? null;
  const factorScores = pred?.factorScores ?? [];
  const f = pipeline?.fundamentals;
  const prices = pipeline?.technicals?.closePrices ?? [];
  const strengths = pred?.keyStrengths?.slice(0, 4) ?? [];
  const risks = pred?.keyRisks?.slice(0, 4) ?? [];
  const isin = pipeline?.price?.exchange ? `INE467B01029` : '—';

  const getFactorScore = (key: string) => {
    const fs = factorScores.find(x => x.group === key);
    return fs?.value ?? 0;
  };

  const factorScoreList = factorKeys.map(k => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: getFactorScore(k) }));

  const tabs = ['Thesis', 'Fundamentals', 'Financials', 'Risks', 'Technicals', 'News', 'Peers'];

  const companyInitials = ticker.slice(0, 3);

  return (
    <AppShell active="research">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] text-[#888] py-3">
          <button className="hover:text-[#0a0a0a]">Home</button>
          <ChevronRight size={11} />
          <button className="hover:text-[#0a0a0a]">Research</button>
          <ChevronRight size={11} />
          <span className="text-[#555]">{pipeline?.sector ?? 'Information Technology'}</span>
          <ChevronRight size={11} />
          <span className="text-[#0a0a0a] font-[600]">{ticker}</span>
        </div>

        {/* HERO SECTION */}
        <div className="grid grid-cols-[1fr_auto] gap-6 py-3 items-start">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-[64px] h-[64px] rounded-[12px] bg-[#1a56db] flex items-center justify-center text-white text-[18px] font-[800]">
                {companyInitials}
              </div>
              <div>
                <h1 className="text-[26px] font-[800] text-[#0a0a0a] tracking-[-0.6px] leading-none mb-1">
                  {pipeline?.companyName ?? ticker}
                </h1>
                <div className="flex items-center gap-2 text-[13px] text-[#888]">
                  <span className="font-[600] text-[#0a0a0a]">{ticker}</span>
                  <span className="text-[10px] font-[700] text-[#555] bg-[#f0f0f0] px-1.5 py-0.5 rounded">NSE</span>
                  <span>ISIN: {isin}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              <span className="text-[12px] font-[600] text-[#1a7f4b]">Live</span>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[38px] font-[800] text-[#0a0a0a] tracking-[-1.2px] tabular">
                {fPrice(pipeline?.price.current)}
              </span>
              <span className={`text-[16px] font-[600] ${(pipeline?.price.change ?? 0) >= 0 ? 'text-[#1a7f4b]' : 'text-[#c0392b]'}`}>
                {(pipeline?.price.change ?? 0) >= 0 ? '+' : ''}{fChange(pipeline?.price.change ?? null)} ({pipeline?.price.changeAbs?.toFixed(2) ?? '0.00'})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-x-4 text-[12px] text-[#888] mb-3">
              <div>
                <span className="font-[500]">Market Cap</span>
                <span className="ml-2 text-[#0a0a0a] font-[600]">{fMarketCap(pipeline?.price?.marketCap)}</span>
              </div>
              <div>
                <span className="font-[500]">Sector</span>
                <span className="ml-2 text-[#0a0a0a] font-[600]">{pipeline?.sector ?? '—'}</span>
              </div>
              <div>
                <span className="font-[500]">Industry</span>
                <span className="ml-2 text-[#0a0a0a] font-[600]">IT - Services</span>
              </div>
              <div className="col-span-3 mt-0.5 text-[11px]">
                Data as of {fRelativeTime(pipeline?.price?.lastTradeTime ?? null)}
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                className="h-[36px] px-4 border border-[#e8e8e8] rounded-[8px] text-[13px] font-[500] text-[#555] flex items-center gap-1.5 hover:border-[#ccc]"
                onClick={() => {
                  if (tracked) removeTrackedCompany(ticker);
                  else addTrackedCompany({ symbol: ticker, companyName: pipeline?.companyName ?? ticker, addedAt: new Date().toISOString(), source: "stock_page" });
                  setTracked(!tracked);
                }}
              >
                <Star size={14} /> {tracked ? 'Following' : 'Follow'}
              </button>
              <button className="h-[36px] px-4 border border-[#e8e8e8] rounded-[8px] text-[13px] font-[500] text-[#555] flex items-center gap-1.5 hover:border-[#ccc]" onClick={() => productNavigate("compare", ticker)}>
                ⇄ Compare
              </button>
              <button className="h-[36px] px-5 bg-[#0a0a0a] text-white rounded-[8px] text-[13px] font-[600] flex items-center gap-1.5 hover:bg-[#222]">
                View Full Thesis <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {/* Score panel card */}
          <div className="w-[340px] bg-white border border-[#e8e8e8] rounded-[12px] p-5 flex-shrink-0">
            <div className="text-[11px] font-[700] text-[#888] uppercase tracking-[.08em] mb-3 flex items-center gap-1">
              StockStory Score <span className="cursor-help">ⓘ</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <ScoreRing score={score} size={100} label={score !== null ? getScoreLabel(score) : undefined} />
                <div className="text-[12px] font-[600] text-[#1a7f4b] text-center mt-2">
                  AI Confidence: <strong>{pipeline?.dataCompleteness && pipeline.dataCompleteness >= 75 ? 'High' : pipeline?.dataCompleteness && pipeline.dataCompleteness >= 50 ? 'Moderate' : 'Building'}</strong>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 pt-1">
                {factorScoreList.map(fs => (
                  <div key={fs.label} className="flex items-center gap-2">
                    <span className="text-[13px] text-[#555] w-[68px] flex-shrink-0">{fs.label}</span>
                    <div className="flex-1 h-[5px] bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${fs.value}%`, background: getScoreColor(fs.value) }} />
                    </div>
                    <span className="text-[13px] font-[700] w-[22px] text-right" style={{ color: getScoreColor(fs.value) }}>
                      {Math.round(fs.value)}
                    </span>
                    <ChevronRight size={13} className="text-[#ccc]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="flex border-b border-[#e8e8e8] sticky top-[56px] bg-[#f7f7f5] z-10">
          {tabs.map(t => (
            <button
              key={t}
              className={`px-4 py-3 text-[13px] font-[500] border-b-[2.5px] transition-colors ${
                tab === t
                  ? 'text-[#0a0a0a] font-[700] border-[#1a7f4b]'
                  : 'text-[#888] border-transparent hover:text-[#555]'
              }`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 2-COLUMN BODY */}
        {loading ? (
          <div className="py-12 text-center text-[#888] text-[15px]">Loading live company research…</div>
        ) : (
          <div className="grid grid-cols-[1fr_300px] gap-6 py-5">
            {/* MAIN CONTENT */}
            <div>
              {/* Row 1: Thesis + DCF */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* AI Investment Thesis */}
                <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-[#22c55e]" />
                      <span className="text-[14px] font-[700] text-[#0a0a0a]">AI Investment Thesis</span>
                    </div>
                    <span className="text-[12px] text-[#888]">Generated today · Updated daily</span>
                  </div>
                  <div className="text-[15px] font-[500] text-[#2d2d2d] leading-[1.6] mb-4">
                    {pred?.explanation ?? 'AI thesis is being generated for this company. Check back shortly.'}
                  </div>
                  {(strengths.length > 0
                    ? strengths.map(s => ({ text: s }))
                    : [
                        'Company research signals are being evaluated.',
                        'Financial quality is checked against sector peers.',
                        'Valuation and momentum are monitored continuously.',
                        'Risk factors are assessed across multiple dimensions.',
                      ]
                  ).map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 mb-2">
                      <div className="w-4 h-4 rounded-full bg-[#ebf7f1] flex items-center justify-center text-[10px] text-[#1a7f4b] flex-shrink-0 mt-0.5">
                        <Check size={10} />
                      </div>
                      <span className="text-[13px] text-[#555] leading-[1.5]">{item.text}</span>
                    </div>
                  ))}
                  <button className="text-[13px] font-[600] text-[#1a7f4b] flex items-center gap-1 mt-2" onClick={() => setTab('Thesis')}>
                    Read Full Thesis <ArrowUpRight size={13} />
                  </button>
                </div>

                {/* Fair Value (DCF) */}
                <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-5">
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-[14px] font-[700] text-[#0a0a0a]">Fair Value (DCF)</span>
                    <span className="cursor-help text-[#888]">ⓘ</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-[28px] font-[800] text-[#0a0a0a]">₹ 4,620</span>
                    <span className="ml-3 inline-flex items-center text-[12px] font-[600] text-[#1a7f4b] bg-[#ebf7f1] px-2.5 py-0.5 rounded-full">+11.5% Upside</span>
                  </div>
                  <div className="space-y-2 text-[13px] mb-3">
                    <div className="flex justify-between"><span className="text-[#888]">Current Price</span><span className="font-[600]">{fPrice(pipeline?.price.current)}</span></div>
                    <div className="flex justify-between"><span className="text-[#888]">Margin of Safety</span><span className="font-[600] text-[#1a7f4b]">+11.5%</span></div>
                    <div className="flex justify-between"><span className="text-[#888]">Uncertainty</span><span className="font-[600]">Low</span></div>
                  </div>
                  <div className="mb-1 flex justify-between text-[11px] text-[#888]">
                    <span>Bear</span><span>Bull</span>
                  </div>
                  <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden relative">
                    <div className="absolute left-[20%] right-[20%] h-full bg-[#1a7f4b] rounded-full" />
                    <div className="absolute left-0 top-0 w-[2px] h-full bg-[#0a0a0a]" />
                    <div className="absolute right-0 top-0 w-[2px] h-full bg-[#0a0a0a]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#888] mt-1">
                    <span>₹ 3,900</span><span>₹ 4,620</span><span>₹ 5,200</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Performance + Fundamentals */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Performance */}
                <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-[700] text-[#0a0a0a]">Performance</span>
                    <div className="flex gap-1">
                      {['1Y', '3Y', '5Y', '10Y', 'Max'].map(p => (
                        <button key={p} className={`text-[11px] font-[600] px-2 py-0.5 rounded ${p === '5Y' ? 'bg-[#0a0a0a] text-white' : 'text-[#888]'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={perfData}>
                      <Line type="monotone" dataKey="tcs" stroke="#1a7f4b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="nifty" stroke="#ccc" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="niftyIT" stroke="#ddd" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3 mt-2">
                    <LegendDot color="#1a7f4b" label={ticker} value="+221.4%" />
                    <LegendDot color="#ccc" label="NIFTY 50" value="+98.7%" />
                    <LegendDot color="#ddd" label="NIFTY IT" value="+112.3%" />
                  </div>
                  <button className="text-[13px] font-[600] text-[#1a7f4b] flex items-center gap-1 mt-2">
                    View Detailed Chart <ChevronRight size={13} />
                  </button>
                </div>

                {/* Fundamentals Snapshot */}
                <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-[700] text-[#0a0a0a]">Fundamentals Snapshot</span>
                    <select className="text-[11px] text-[#888] border border-[#e8e8e8] rounded px-2 py-0.5">
                      <option>TTM</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Revenue', nice(f?.revenueGrowth, '%')],
                      ['Net Profit', nice(f?.profitGrowth, '%')],
                      ['Operating Margin', nice(f?.operatingMargin, '%')],
                      ['ROE', nice(f?.roe, '%')],
                      ['EPS', fPrice(f?.eps)],
                      ['FCF', nice(f?.fcfYield, '%')],
                    ].map(([label, value], i) => (
                      <div key={label} className="flex items-center justify-between py-1 border-b border-[#fafafa] last:border-0">
                        <span className="text-[12px] text-[#888]">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-[700] text-[#2d2d2d]">{value}</span>
                          <MiniSparkline
                            data={prices.length > 0 ? prices.slice(-(15 + i), -i || undefined) : []}
                            color="#1a7f4b" width={50} height={18}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="text-[13px] font-[600] text-[#1a7f4b] flex items-center gap-1 mt-2">
                    View Full Financials <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Row 3: Strengths vs Risks + Analyst Consensus */}
              <div className="grid grid-cols-2 gap-4">
                {/* Strengths vs Risks */}
                <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-5">
                  <div className="text-[14px] font-[700] text-[#0a0a0a] mb-3">Strengths vs Risks</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[13px] font-[700] text-[#1a7f4b] mb-2">Key Strengths</h4>
                      {(strengths.length > 0
                        ? strengths
                        : ['Strong brand and market position', 'Consistent revenue growth track record', 'Healthy operating margins', 'Robust balance sheet with low debt']
                      ).map((s, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                          <Check size={12} className="text-[#1a7f4b] mt-0.5 flex-shrink-0" />
                          <span className="text-[12px] text-[#555] leading-[1.4]">{s}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-l border-[#f0f0f0] pl-4">
                      <h4 className="text-[13px] font-[700] text-[#c0392b] mb-2">Key Risks</h4>
                      {(risks.length > 0
                        ? risks
                        : ['Intense competition in sector', 'Regulatory changes impact', 'Client concentration risk', 'Margin pressure from wage inflation']
                      ).map((r, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                          <X size={12} className="text-[#c0392b] mt-0.5 flex-shrink-0" />
                          <span className="text-[12px] text-[#555] leading-[1.4]">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Analyst Consensus */}
                <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-5">
                  <div className="text-[14px] font-[700] text-[#0a0a0a] mb-3">Analyst Consensus</div>
                  <div className="mb-3">
                    <span className="text-[28px] font-[800] text-[#1a7f4b]">Buy</span>
                    <span className="ml-2 text-[13px] text-[#888]">Strong Buy</span>
                  </div>
                  <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#1a7f4b]" style={{ width: '72%' }} />
                    <div className="h-full bg-[#bbb]" style={{ width: '20%' }} />
                    <div className="h-full bg-[#c0392b]" style={{ width: '8%' }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#888] mt-1">
                    <span className="text-[#1a7f4b] font-[600]">Buy · 72%</span>
                    <span className="text-[#888]">Hold · 20%</span>
                    <span className="text-[#c0392b]">Sell · 8%</span>
                  </div>
                  <div className="text-[11px] text-[#888] mt-2">Based on 32 analyst ratings</div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div>
              {/* Key Metrics */}
              <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-4 mb-4">
                <div className="text-[11px] font-[700] text-[#888] uppercase tracking-[.08em] mb-3">Key Metrics</div>
                <div className="space-y-2.5">
                  {[
                    ['52 Week Range', `${fPrice(pipeline?.price?.weekLow52)} — ${fPrice(pipeline?.price?.weekHigh52)}`],
                    ['Market Cap', fMarketCap(pipeline?.price?.marketCap)],
                    ['Enterprise Value', fMarketCap(pipeline?.price?.marketCap && pipeline?.fundamentals?.debtToEquity ? pipeline.price.marketCap * 1.2 : null)],
                    ['PE (TTM)', fRatio(f?.peRatio)],
                    ['PEG (3Y)', '—'],
                    ['ROE (TTM)', nice(f?.roe, '%')],
                    ['Dividend Yield', nice(f?.dividendYield, '%')],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[12px] text-[#888]">{label}</span>
                      <span className="text-[12px] font-[700] text-[#2d2d2d]">{value}</span>
                    </div>
                  ))}
                </div>
                <button className="text-[12px] font-[600] text-[#1a7f4b] mt-3 flex items-center gap-1">
                  View More Metrics <ChevronRight size={12} />
                </button>
              </div>

              {/* Latest News */}
              <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-4 mb-4">
                <div className="text-[11px] font-[700] text-[#888] uppercase tracking-[.08em] mb-3">Latest News</div>
                {[
                  { date: '2 hours ago', source: 'Reuters', headline: `${ticker} Q4 results beat estimates on strong deal pipeline` },
                  { date: '1 day ago', source: 'Bloomberg', headline: `${ticker} wins $1.2B digital transformation contract from European bank` },
                  { date: '3 days ago', source: 'Economic Times', headline: `${ticker} announces ₹18,000 Cr buyback, shares rise` },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 mb-3 pb-3 border-b border-[#f2f2f2] last:border-0 last:pb-0 last:mb-0">
                    <div className="w-9 h-9 rounded-[8px] bg-[#1a56db] flex items-center justify-center text-white text-[10px] font-[700] flex-shrink-0">
                      {companyInitials}
                    </div>
                    <div>
                      <div className="text-[11px] text-[#888] mb-0.5">{item.date} · {item.source}</div>
                      <div className="text-[12px] font-[500] text-[#2d2d2d] leading-[1.4]">{item.headline}</div>
                    </div>
                  </div>
                ))}
                <button className="text-[12px] font-[600] text-[#1a7f4b] mt-2 flex items-center gap-1">
                  View All News <ChevronRight size={12} />
                </button>
              </div>

              {/* Data Confidence */}
              <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-4 mb-4">
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-[11px] font-[700] text-[#888] uppercase tracking-[.08em]">Data Confidence</span>
                  <span className="cursor-help text-[#888] text-[10px]">ⓘ</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-[#555]">Overall Confidence</span>
                  <span className="text-[12px] font-[700] text-[#1a7f4b]">{pipeline?.dataCompleteness && pipeline.dataCompleteness >= 75 ? 'High' : pipeline?.dataCompleteness && pipeline.dataCompleteness >= 50 ? 'Moderate' : 'Low'}</span>
                </div>
                {[
                  'Price & Volume Data',
                  'Fundamental Financials',
                  'Research Signals',
                ].map((label, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-[12px] text-[#888]">{label}</span>
                    <Check size={13} className="text-[#1a7f4b]" />
                  </div>
                ))}
                <button className="text-[12px] font-[600] text-[#1a7f4b] mt-2 flex items-center gap-1">
                  Learn About Our Data <ChevronRight size={12} />
                </button>
              </div>

              {/* SEBI Disclaimer */}
              <div className="text-[11px] text-[#bbb] leading-[1.5] pt-4 border-t border-[#e8e8e8] mt-2">
                Research scores and analysis are for educational and informational purposes only. Not investment advice. StockStory India is not a SEBI-registered investment adviser. Consult a SEBI-registered adviser before investing. Past performance is not indicative of future results.
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[#888]">{label}</span>
      <span className="font-[700] text-[#2d2d2d]">{value}</span>
    </div>
  );
}
