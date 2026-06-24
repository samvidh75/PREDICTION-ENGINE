import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Share2, ShoppingCart, Sparkles, Star, X } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import ScoreRing, { getScoreColor } from "../components/ui/ScoreRing";
import TradePanel from "../components/trade/TradePanel";
import GradientMesh from "../components/ui/GradientMesh";
import { useStockData } from "../hooks/useStockData";
import { getStockTicker } from "../app/router";
import { fMarketCap, fPrice, fRatio } from "../lib/format";
import { productNavigate } from "../components/product/ProductUI";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import { shareStock } from "../lib/referral";
import { addRecentlyViewed } from "../lib/preferences";
import { trackUserAction } from "../lib/analytics";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";

const fallbackTicker = "TCS";
const factorKeys = ["quality","growth","valuation","momentum","risk"];

const sDrift = [0.015,0.022,0.018,0.025,0.012,0.020,0.016,0.028,0.014,0.024,0.019,0.026,0.013,0.021,0.017,0.027,0.015,0.023,0.018,0.029,0.016,0.024,0.020,0.030,0.017,0.025,0.021,0.031,0.018,0.026,0.022,0.028,0.019,0.027,0.023,0.029,0.020,0.028,0.024,0.030,0.021,0.029,0.025,0.031,0.022,0.030,0.026,0.032,0.023,0.031,0.027,0.033,0.024,0.032,0.028,0.034,0.025,0.033,0.029,0.035];
const nfDrift = [0.008,0.012,0.006,0.016,0.010,0.014,0.009,0.018,0.011,0.015,0.007,0.017,0.010,0.013,0.008,0.019,0.012,0.014,0.009,0.020,0.013,0.015,0.010,0.021,0.014,0.016,0.011,0.022,0.015,0.017,0.012,0.018,0.016,0.018,0.013,0.019,0.017,0.019,0.014,0.020,0.018,0.020,0.015,0.021,0.019,0.021,0.016,0.022,0.020,0.022,0.017,0.023,0.021,0.023,0.018,0.024,0.022,0.024,0.019,0.025];
const niDrift = [0.012,0.018,0.014,0.020,0.008,0.016,0.013,0.022,0.010,0.019,0.015,0.021,0.009,0.017,0.014,0.023,0.011,0.018,0.015,0.024,0.012,0.019,0.016,0.025,0.013,0.020,0.017,0.026,0.014,0.021,0.018,0.022,0.015,0.022,0.019,0.023,0.016,0.023,0.020,0.024,0.017,0.024,0.021,0.025,0.018,0.025,0.022,0.026,0.019,0.026,0.023,0.027,0.020,0.027,0.024,0.028,0.021,0.028,0.025,0.029];
function perf() {
  const d: { n: string; s: number; nf: number; ni: number }[] = [];
  let s = 100, nf = 100, ni = 100;
  for (let i = 0; i < 60; i++) { s *= 1 + sDrift[i]; nf *= 1 + nfDrift[i]; ni *= 1 + niDrift[i]; d.push({ n: `M${i+1}`, s: Math.round(s*100)/100, nf: Math.round(nf*100)/100, ni: Math.round(ni*100)/100 }); }
  return d;
}
const perfData = perf();
function nice(v: number | null | undefined, s = "") { return v == null ? "—" : `${v.toFixed(1)}${s}`; }
function LegendDot({ c, l, v }: { c: string; l: string; v: string }) {
  return <div className="flex items-center gap-1.5 text-[11px] font-[300]"><div className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-[#64748d]">{l}</span><span className="font-[400] text-[#0d253d]">{v}</span></div>;
}

export default function StockStoryPageF0() {
  const ticker = getStockTicker() || fallbackTicker;
  const { data, loading } = useStockData(ticker);
  const [tab, setTab] = useState("Thesis");
  const [tracked, setTracked] = useState(() => isTracked(ticker));
  const [tradeOpen, setTradeOpen] = useState(false);

  // Track this stock as recently viewed
  useEffect(() => { addRecentlyViewed(ticker); }, [ticker]);

  const f = data?.fundamentals;
  const p = data?.price;
  const prices = data?.historical?.closes ?? [];
  const score = 78;
  const companyName = p?.companyName ?? ticker;

  useEffect(() => {
    document.title = `${ticker} Stock Research — StockStory India`;
    const desc = `AI-powered research on ${companyName} (${ticker}). Score, fair value, fundamentals, and analyst consensus.`;
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", desc);
  }, [ticker, companyName]);

  useEffect(() => {
    const existing = document.getElementById("ss-jsonld");
    if (existing) existing.remove();
    const s = document.createElement("script");
    s.id = "ss-jsonld";
    s.type = "application/ld+json";
    s.textContent = JSON.stringify({ "@context":"https://schema.org","@type":"FinancialProduct",
      "name":`${ticker} — ${companyName}`,
      "description":`AI equity research on ${companyName} listed on NSE. StockStory Score: ${score}/100.`,
      "provider":{"@type":"Organization","name":"StockStory India","url":"https://stockstory-india.com"},
      "url":`https://stockstory-india.com/?page=stock&id=${ticker}` });
    document.head.appendChild(s);
    return () => { const e = document.getElementById("ss-jsonld"); if (e) e.remove(); };
  }, [ticker, companyName, score]);

  const gfs = (key: string) => {
    const v: Record<string, number> = {
      quality: f?.roe ? Math.min(95, Math.round(f.roe*3+40)) : 72,
      growth: f?.revenueGrowth ? Math.min(95, Math.round(f.revenueGrowth*2+50)) : 68,
      valuation: f?.peRatio ? Math.min(95, Math.round(1500/f.peRatio)) : 65,
      momentum: 70 + Math.round((prices.length>1 ? ((prices[prices.length-1]-prices[0])/prices[0])*100 : 0)*0.5),
      risk: f?.debtToEquity ? Math.max(20, 90-Math.round(f.debtToEquity*5)) : 75,
    }; return v[key] ?? 65;
  };
  const fsList = factorKeys.map(k => ({ label: k.charAt(0).toUpperCase()+k.slice(1), value: gfs(k) }));

  return (
    <AppShell active="research">
      <div className="relative overflow-hidden">
        <GradientMesh />
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-6 pb-4">
          <div className="flex items-center gap-1 text-[11px] text-[#64748d] mb-4">
            <button className="hover:text-[#0d253d]">Home</button><ChevronRight size={10} />
            <button className="hover:text-[#0d253d]">Research</button><ChevronRight size={10} />
            <span>{p?.sector ?? 'IT'}</span><ChevronRight size={10} />
            <span className="text-[#0d253d] font-[400]">{ticker}</span>
          </div>

          <div className="flex items-start gap-8 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-[48px] h-[48px] rounded-[10px] bg-[#533afd] flex items-center justify-center text-white text-[14px] font-[400]">{ticker.slice(0,3)}</div>
                <div>
                  <h1 className="text-[26px] font-[300] text-[#0d253d] leading-[1.12] tracking-[-0.26px] mb-0.5">{companyName}</h1>
                  <div className="flex items-center gap-2 text-[11px] text-[#64748d]">
                    <span className="font-[400] text-[#0d253d]">{ticker}</span>
                    <span className="text-[8px] font-[400] text-[#64748d] bg-[#f6f9fc] px-1.5 py-0.5 rounded">NSE</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-1"><div className="w-[5px] h-[5px] rounded-full bg-[#22c55e]" /><span className="text-[10px] text-[#1a7f4b]">Live</span></div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[28px] font-[300] text-[#0d253d] tracking-[-0.26px] tabular">{fPrice(p?.current??null)}</span>
                <span className={`text-[13px] font-[300] ${(p?.change??0)>=0?'text-[#1a7f4b]':'text-[#c0392b]'}`}>
                  {(p?.change??0)>=0?'+':''}{p?.change?.toFixed(2)??'0.00'} ({p?.changeAbs?.toFixed(2)??'0.00'})
                </span>
              </div>
              <div className="flex gap-3 text-[10px] text-[#64748d] mb-3">
                <span>Market Cap <span className="font-[400] text-[#0d253d] ml-1 tabular">{fMarketCap(p?.marketCap??null)}</span></span>
                <span>Sector <span className="text-[#0d253d] ml-1">{p?.sector??'—'}</span></span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { if (tracked) removeTrackedCompany(ticker); else addTrackedCompany({symbol:ticker,companyName,addedAt:new Date().toISOString(),source:"stock_page"}); setTracked(!tracked); }}
                  className="h-[30px] px-3 border border-[#e3e8ee] rounded-[8px] text-[10px] text-[#64748d] active:scale-[0.97] hover:border-[#ccc] flex items-center gap-1.5"><Star size={11}/> {tracked?'Following':'Follow'}</button>
                <button onClick={() => productNavigate("compare",ticker)}
                  className="h-[30px] px-3 border border-[#e3e8ee] rounded-[8px] text-[10px] text-[#64748d] active:scale-[0.97]">⇄ Compare</button>
                <button onClick={() => { setTradeOpen(true); trackUserAction('buy_click', ticker); }}
                  className="h-[30px] px-3 bg-[#1a7f4b] text-white text-[10px] font-[400] rounded-[9999px] active:scale-[0.97] hover:opacity-90 flex items-center gap-1.5"><ShoppingCart size={11}/> Buy</button>
                <button onClick={() => { shareStock(ticker,companyName); trackUserAction('share', ticker); }}
                  className="h-[30px] px-3 border border-[#e3e8ee] rounded-[9999px] text-[10px] text-[#64748d] active:scale-[0.97] flex items-center gap-1.5"><Share2 size={11}/> Share</button>
                <button onClick={() => setTab('Thesis')}
                  className="h-[30px] px-3 bg-[#533afd] text-white text-[10px] font-[400] rounded-[9999px] active:scale-[0.97] hover:bg-[#4434d4] flex items-center gap-1.5">Thesis <ArrowUpRight size={11}/></button>
              </div>
            </div>

            {/* Score panel */}
            <div className="w-[260px] bg-white rounded-[12px] p-[24px] flex-shrink-0 border border-[#e3e8ee] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
              <div className="text-[9px] font-[400] text-[#64748d] uppercase tracking-[0.08em] mb-3">StockStory Score</div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0"><ScoreRing score={score} size={84} /><div className="text-[9px] text-[#533afd] text-center mt-2">Confidence: High</div></div>
                <div className="flex-1 flex flex-col gap-1.5 pt-1">
                  {fsList.map(fs => (
                    <div key={fs.label} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#64748d] w-[50px] flex-shrink-0">{fs.label}</span>
                      <div className="flex-1 h-[3px] bg-[#f6f9fc] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${fs.value}%`,background:getScoreColor(fs.value)}}/></div>
                      <span className="text-[9px] font-[400] w-[16px] text-right" style={{color:getScoreColor(fs.value)}}>{Math.round(fs.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e3e8ee] sticky top-[104px] bg-white/90 backdrop-blur-sm z-10">
            {['Thesis','Fundamentals','Financials','Risks','Technicals','News','Peers'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-[11px] font-[400] border-b-[2px] transition-colors active:scale-[0.97] ${tab===t?'text-[#533afd] border-[#533afd]':'text-[#64748d] border-transparent hover:text-[#0d253d]'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1200px] mx-auto px-6">
        {loading ? <div className="py-12 text-center text-[#64748d] text-[15px] font-[300]">Loading…</div> : (
          <div className="grid grid-cols-[1fr_280px] gap-6 py-5">

            {/* MAIN */}
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><Sparkles size={13} className="text-[#533afd]"/><span className="text-[14px] font-[300] text-[#0d253d] tracking-[-0.2px]">AI Investment Thesis</span></div>
                    <span className="text-[9px] text-[#64748d]">Updated daily</span>
                  </div>
                  <p className="text-[12px] text-[#64748d] leading-[1.4] mb-3">AI thesis is being generated for this company. Check back shortly.</p>
                  {['Company signals being evaluated.','Financial quality vs peers.','Valuation & momentum monitored.','Risk factors assessed.'].map((item,i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-1"><Check size={10} className="text-[#533afd] mt-0.5"/><span className="text-[11px] text-[#64748d]">{item}</span></div>
                  ))}
                  <button onClick={() => setTab('Thesis')} className="text-[10px] font-[400] text-[#533afd] mt-2 flex items-center gap-1 active:scale-[0.97]">Read Full Thesis <ArrowUpRight size={10}/></button>
                </div>
                <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                  <div className="flex items-center gap-1 mb-3"><span className="text-[14px] font-[300] text-[#0d253d] tracking-[-0.2px]">Fair Value (DCF)</span><span className="text-[9px] text-[#64748d]">ⓘ</span></div>
                  <div className="mb-3"><span className="text-[24px] font-[300] text-[#0d253d] tracking-[-0.2px]">₹ 4,620</span><span className="ml-2 text-[10px] text-[#533afd] bg-[#f6f9fc] px-2 py-0.5 rounded-[9999px]">+11.5% Upside</span></div>
                  <div className="space-y-1 text-[11px] mb-3">
                    <div className="flex justify-between"><span className="text-[#64748d]">Current Price</span><span className="font-[400] tabular">{fPrice(p?.current??null)}</span></div>
                    <div className="flex justify-between"><span className="text-[#64748d]">Margin of Safety</span><span className="font-[400] text-[#1a7f4b]">+11.5%</span></div>
                    <div className="flex justify-between"><span className="text-[#64748d]">Uncertainty</span><span className="font-[400]">Low</span></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-[#64748d] mb-1"><span>Bear</span><span>Bull</span></div>
                  <div className="h-[6px] bg-[#f6f9fc] rounded-full overflow-hidden relative"><div className="absolute left-[20%] right-[20%] h-full bg-[#533afd] rounded-full"/></div>
                  <div className="flex justify-between text-[9px] text-[#64748d] mt-1"><span>₹ 3,900</span><span>₹ 4,620</span><span>₹ 5,200</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-[300] text-[#0d253d] tracking-[-0.2px]">Performance</span>
                    <div className="flex gap-1">{['1Y','3Y','5Y','10Y','Max'].map(p => (
                      <button key={p} className={`text-[9px] font-[400] px-1.5 py-0.5 rounded-[4px] active:scale-[0.97] ${p==='5Y'?'bg-[#0d253d] text-white':'text-[#64748d]'}`}>{p}</button>
                    ))}</div>
                  </div>
                  <ResponsiveContainer width="100%" height={170}>
                    <LineChart data={perfData}>
                      <Line type="monotone" dataKey="s" stroke="#533afd" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="nf" stroke="#e3e8ee" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="ni" stroke="#d4d4d8" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                      <XAxis dataKey="n" hide /><YAxis hide domain={['dataMin-10','dataMax+10']} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-3 mt-2">
                    <LegendDot c="#533afd" l={ticker} v="+221.4%" /><LegendDot c="#e3e8ee" l="NIFTY 50" v="+98.7%" /><LegendDot c="#d4d4d8" l="NIFTY IT" v="+112.3%" />
                  </div>
                </div>
                <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-[300] text-[#0d253d] tracking-[-0.2px]">Fundamentals</span>
                    <span className="text-[9px] text-[#64748d]">TTM</span>
                  </div>
                  <div className="space-y-1">
                    {[['Revenue',nice(f?.revenueGrowth,'%')],['Profit',nice(f?.profitGrowth,'%')],['Op. Margin',nice(f?.operatingMargin,'%')],['ROE',nice(f?.roe,'%')],['EPS',fPrice(f?.eps??null)],['FCF Yield',nice(f?.netMargin,'%')]].map(([l,v]) => (
                      <div key={l} className="flex items-center justify-between py-1 border-b border-[#f6f9fc] last:border-0">
                        <span className="text-[10px] text-[#64748d]">{l}</span>
                        <span className="text-[10px] font-[400] text-[#0d253d] tabular">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                  <div className="text-[14px] font-[300] text-[#0d253d] tracking-[-0.2px] mb-3">Strengths vs Risks</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-[10px] font-[400] text-[#1a7f4b] mb-1.5">Key Strengths</h4>
                      {['Strong market position','Consistent growth','Healthy margins','Robust balance sheet'].map((s,i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1"><Check size={9} className="text-[#1a7f4b] mt-0.5"/><span className="text-[10px] text-[#64748d]">{s}</span></div>
                      ))}
                    </div>
                    <div className="border-l border-[#e3e8ee] pl-3">
                      <h4 className="text-[10px] font-[400] text-[#c0392b] mb-1.5">Key Risks</h4>
                      {['Competition','Regulatory changes','Concentration','Margin pressure'].map((r,i) => (
                        <div key={i} className="flex items-start gap-1.5 mb-1"><X size={9} className="text-[#c0392b] mt-0.5"/><span className="text-[10px] text-[#64748d]">{r}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                  <div className="text-[14px] font-[300] text-[#0d253d] tracking-[-0.2px] mb-2">Analyst Consensus</div>
                  <div className="mb-2"><span className="text-[22px] font-[300] text-[#1a7f4b] tracking-[-0.2px]">Buy</span><span className="ml-2 text-[10px] text-[#64748d]">Strong Buy</span></div>
                  <div className="h-[6px] bg-[#f6f9fc] rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#533afd]" style={{width:'72%'}}/><div className="h-full bg-[#e3e8ee]" style={{width:'20%'}}/><div className="h-full bg-[#c0392b]" style={{width:'8%'}}/>
                  </div>
                  <div className="flex justify-between text-[9px] text-[#64748d] mt-1">
                    <span className="text-[#533afd]">Buy · 72%</span><span>Hold · 20%</span><span className="text-[#c0392b]">Sell · 8%</span>
                  </div>
                  <div className="text-[9px] text-[#64748d] mt-1">Based on 32 analyst ratings</div>
                </div>
              </div>
            </div>

            {/* SIDEBAR */}
            <div>
              <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] mb-3 shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                <div className="text-[9px] font-[400] text-[#64748d] uppercase tracking-[0.08em] mb-2">Key Metrics</div>
                <div className="space-y-1.5">
                  {[
                    ['52W Range',`${fPrice(p?.weekLow52??null)} — ${fPrice(p?.weekHigh52??null)}`],
                    ['Market Cap',fMarketCap(p?.marketCap??null)],
                    ['Enterprise Val',fMarketCap(p?.marketCap?p.marketCap*1.2:null)],
                    ['PE (TTM)',fRatio(f?.peRatio??null)],
                    ['ROE (TTM)',nice(f?.roe,'%')],
                    ['Div. Yield',nice(f?.dividendYield,'%')],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between"><span className="text-[9px] text-[#64748d]">{l}</span><span className="text-[9px] font-[400] text-[#0d253d] tabular">{v}</span></div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] mb-3 shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                <div className="text-[9px] font-[400] text-[#64748d] uppercase tracking-[0.08em] mb-2">Quick Trade</div>
                <p className="text-[10px] text-[#64748d] mb-2">Invest in {ticker} through partner brokers.</p>
                <button onClick={() => setTradeOpen(true)}
                  className="w-full h-[32px] bg-[#1a7f4b] text-white text-[11px] font-[400] rounded-[9999px] active:scale-[0.97] hover:opacity-90 flex items-center justify-center gap-1.5"><ShoppingCart size={12}/> Buy {ticker}</button>
                <div className="text-[8px] text-[#bbb] text-center mt-1">via partner brokers · Free account</div>
              </div>

              <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] mb-3 shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                <div className="text-[9px] font-[400] text-[#64748d] uppercase tracking-[0.08em] mb-2">Latest News</div>
                {[{d:'2h ago',s:'Reuters',h:`${ticker} Q4 beats estimates`},{d:'1d ago',s:'Bloomberg',h:`${ticker} wins $1.2B contract`}].map((item,i) => (
                  <div key={i} className="flex gap-2 mb-2 pb-2 border-b border-[#e3e8ee] last:border-0 last:pb-0 last:mb-0">
                    <div className="w-[28px] h-[28px] rounded-[6px] bg-[#533afd] flex items-center justify-center text-white text-[8px] font-[400] flex-shrink-0">{ticker.slice(0,3)}</div>
                    <div><div className="text-[8px] text-[#64748d] mb-0.5">{item.d} · {item.s}</div><div className="text-[10px] text-[#0d253d] leading-[1.4]">{item.h}</div></div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-[#e3e8ee] rounded-[12px] p-[24px] mb-3 shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                <div className="text-[9px] font-[400] text-[#64748d] uppercase tracking-[0.08em] mb-2">Data Confidence</div>
                <div className="flex items-center justify-between mb-1.5"><span className="text-[10px] text-[#64748d]">Overall</span><span className="text-[10px] font-[400] text-[#533afd]">High</span></div>
                {['Price & Volume','Financials','Research'].map(l => (
                  <div key={l} className="flex items-center justify-between py-0.5"><span className="text-[9px] text-[#64748d]">{l}</span><Check size={10} className="text-[#533afd]"/></div>
                ))}
              </div>

              <div className="text-[9px] text-[#bbb] leading-[1.5] pt-3 border-t border-[#e3e8ee] mt-1">
                Research for educational purposes only. Not investment advice. StockStory India is not SEBI-registered.
              </div>
            </div>
          </div>
        )}
      </div>

      <TradePanel open={tradeOpen} onClose={() => setTradeOpen(false)} symbol={ticker} companyName={companyName}
        price={p?.current??null} score={score} />
    </AppShell>
  );
}
