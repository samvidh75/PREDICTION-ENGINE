import { useState } from "react";
import { ArrowUpRight, ArrowRight, Check, Search, ShoppingCart, Share2, Sparkles, Users, BarChart3, Shield } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import ScoreRing, { getScoreColor, getScoreLabel, MiniSparkline } from "../components/ui/ScoreRing";
import TradePanel from "../components/trade/TradePanel";
import GradientMesh from "../components/ui/GradientMesh";
import { useStockData } from "../hooks/useStockData";
import { productNavigate } from "../components/product/ProductUI";
import { shareStock } from "../lib/referral";
import { trackUserAction } from "../lib/analytics";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const deltas = [3,18,-5,12,-8,22,-3,15,6,-4,19,-7,11,-2,16,4,-9,23,-1,14];
function chartData(points = 20) {
  const d: { t: string; v: number }[] = []; let v = 24500;
  for (let i = 0; i < points; i++) { v += deltas[i % deltas.length]; d.push({ t: `${9+Math.floor(i/4)}:${((i%4)*15).toString().padStart(2,'0')}`, v: Math.round(v) }); }
  return d;
}
const cd = chartData();

const sDrift = [0.015,0.022,0.018,0.025,0.012,0.020,0.016,0.028,0.014,0.024,0.019,0.026,0.013,0.021,0.017,0.027,0.015,0.023,0.018,0.029,0.016,0.024,0.020,0.030,0.017,0.025,0.021,0.031,0.018,0.026,0.022,0.028,0.019,0.027,0.023,0.029,0.020,0.028,0.024,0.030,0.021,0.029,0.025,0.031,0.022,0.030,0.026,0.032,0.023,0.031,0.027,0.033,0.024,0.032,0.028,0.034,0.025,0.033,0.029,0.035];
const iDrift = [0.008,0.012,0.006,0.016,0.010,0.014,0.009,0.018,0.011,0.015,0.007,0.017,0.010,0.013,0.008,0.019,0.012,0.014,0.009,0.020,0.013,0.015,0.010,0.021,0.014,0.016,0.011,0.022,0.015,0.017,0.012,0.018,0.016,0.018,0.013,0.019,0.017,0.019,0.014,0.020,0.018,0.020,0.015,0.021,0.019,0.021,0.016,0.022,0.020,0.022,0.017,0.023,0.021,0.023,0.018,0.024,0.022,0.024,0.019,0.025];
function p5y() {
  const d: { n: string; s: number; i: number }[] = []; let s = 100, idx = 100;
  for (let i = 0; i < 60; i++) { s *= 1 + sDrift[i]; idx *= 1 + iDrift[i]; d.push({ n: `M${i+1}`, s: Math.round(s*100)/100, i: Math.round(idx*100)/100 }); }
  return d;
}
const p5 = p5y();

const factors = [
  { icon: '◇', name: 'Quality', key: 'quality', desc: 'High returns, strong balance sheet' },
  { icon: '↗', name: 'Growth', key: 'growth', desc: 'Sustainable earnings growth' },
  { icon: '◎', name: 'Valuation', key: 'valuation', desc: 'Attractive valuation vs peers' },
  { icon: '⬡', name: 'Momentum', key: 'momentum', desc: 'Strong price momentum' },
  { icon: 'ϟ', name: 'Risk', key: 'risk', desc: 'Low financial risk, stable model' },
];

function LegendDot({ c, l, v }: { c: string; l: string; v: string }) {
  return <div className="flex items-center gap-1.5 text-[13px] font-[300]"><div className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-[#64748d]">{l}</span><span className="font-[400] text-[#0d253d]">{v}</span></div>;
}

export default function PublicLandingPage() {
  const { data, loading } = useStockData("HDFCBANK");
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeSymbol, setTradeSymbol] = useState("");
  const [tradePrice, setTradePrice] = useState<number | null>(null);
  const openTrade = (sym: string, pr: number | null) => { setTradeSymbol(sym); setTradePrice(pr); setTradeOpen(true); };

  const prices = data?.historical?.closes ?? [];
  const gfs = (key: string) => {
    const f = data?.fundamentals;
    const v: Record<string, number> = {
      quality: f?.roe ? Math.min(95, Math.round(f.roe*3+40)) : 72,
      growth: f?.revenueGrowth ? Math.min(95, Math.round(f.revenueGrowth*2+50)) : 68,
      valuation: f?.peRatio ? Math.min(95, Math.round(1500/f.peRatio)) : 65,
      momentum: 70 + Math.round((prices.length>1 ? ((prices[prices.length-1]-prices[0])/prices[0])*100 : 0)*0.5),
      risk: f?.debtToEquity ? Math.max(20, 90-Math.round(f.debtToEquity*5)) : 75,
    }; return v[key] ?? 65;
  };

  return (
    <AppShell active="research">
      {/* Gradient Mesh Hero */}
      <div className="relative overflow-hidden">
        <GradientMesh />
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-[80px] pb-[64px] text-center">
          <div className="inline-flex items-center gap-1.5 bg-[#b9b9f9] text-[#4434d4] text-[10px] font-[400] tracking-[0.1px] px-3 py-1 rounded-[9999px] mb-6 uppercase">
            <Sparkles size={12} /> AI-Powered Stock Intelligence
          </div>
          <h1 className="text-[56px] font-[300] text-[#0d253d] leading-[1.03] tracking-[-1.4px] mb-4">
            Understand businesses.<br />Invest better.
          </h1>
          <p className="text-[16px] font-[300] text-[#64748d] leading-[1.4] max-w-[540px] mx-auto mb-8">
            AI and deep financial research to help you understand Indian businesses before you buy stocks.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => productNavigate("signup")}
              className="bg-[#533afd] text-white text-[16px] font-[400] rounded-[9999px] px-[16px] py-[8px] hover:bg-[#4434d4] transition-colors active:scale-[0.97] flex items-center gap-2">
              Start Free Trial <ArrowUpRight size={16} />
            </button>
            <button onClick={() => productNavigate("scanner")}
              className="bg-white text-[#533afd] text-[16px] font-[400] rounded-[9999px] px-[16px] py-[8px] border border-[#533afd] hover:bg-[#f6f9fc] transition-colors active:scale-[0.97] flex items-center gap-2">
              Explore Scanner <Search size={16} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-5 mt-8 text-[13px] text-[#64748d]">
            {['No credit card required', 'Cancel anytime', 'Trusted by 2M+ investors'].map(t => (
              <div key={t} className="flex items-center gap-1.5"><Check size={12} className="text-[#533afd]" />{t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas Soft Band — Stock Preview */}
      <div className="bg-[#f6f9fc] border-y border-[#e3e8ee]">
        <div className="max-w-[1200px] mx-auto px-6 py-[64px]">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-[400] text-[#533afd] tracking-[0.1px] uppercase mb-2">Live Preview</p>
              <h2 className="text-[32px] font-[300] text-[#0d253d] leading-[1.1] tracking-[-0.64px] mb-3">See the score in action</h2>
              <p className="text-[15px] font-[300] text-[#64748d] leading-[1.4] mb-5">
                Every stock gets a proprietary AI score across 5 dimensions. Updated daily with fresh data.
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => productNavigate("stock", "HDFCBANK")}
                  className="bg-[#533afd] text-white text-[16px] font-[400] rounded-[9999px] px-[16px] py-[8px] hover:bg-[#4434d4] active:scale-[0.97] flex items-center gap-2">
                  View Full Research <ArrowRight size={14} />
                </button>
                <button onClick={() => { openTrade("HDFCBANK", data?.price?.current ?? null); trackUserAction('buy_click', 'HDFCBANK'); }}
                  className="bg-white text-[#533afd] text-[14px] font-[400] rounded-[9999px] px-[14px] py-[8px] border border-[#533afd] active:scale-[0.97] flex items-center gap-1.5">
                  <ShoppingCart size={13} /> Buy
                </button>
                <button onClick={() => { shareStock("HDFCBANK", data?.price?.companyName ?? "HDFC Bank"); trackUserAction('share', 'HDFCBANK'); }}
                  className="bg-white text-[#64748d] text-[13px] font-[400] rounded-[9999px] px-[12px] py-[8px] border border-[#e3e8ee] active:scale-[0.97] flex items-center gap-1.5">
                  <Share2 size={12} /> Share
                </button>
              </div>
            </div>
            <div className="bg-white rounded-[12px] p-[32px] shadow-[rgba(0,55,112,0.08)_0_1px_3px] border border-[#e3e8ee]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[36px] h-[36px] rounded-[8px] bg-[#533afd] flex items-center justify-center text-white text-[12px] font-[400]">H</div>
                <div>
                  <div className="text-[16px] font-[400] text-[#0d253d] tracking-[-0.2px]">HDFCBANK</div>
                  <div className="text-[12px] font-[300] text-[#64748d]">{data?.price?.companyName ?? 'HDFC Bank Ltd.'}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                {loading ? <div className="w-[88px] h-[88px] rounded-full bg-[#f6f9fc] animate-pulse flex-shrink-0" />
                  : <ScoreRing score={78} size={88} />}
                <div className="flex-1 flex flex-col gap-[6px]">
                  {['quality','growth','valuation','momentum','risk'].map(k => {
                    const v = gfs(k);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[11px] font-[300] text-[#64748d] w-[60px] flex-shrink-0">{k.charAt(0).toUpperCase()+k.slice(1)}</span>
                        <div className="flex-1 h-[3px] bg-[#f6f9fc] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${v??0}%`, background: v ? getScoreColor(v) : '#f6f9fc' }} />
                        </div>
                        <span className="text-[11px] font-[400] text-[#0d253d] w-[20px] text-right">{v ?? '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#e3e8ee]">
                <span className="text-[12px] font-[300] text-[#64748d]">StockStory Score</span>
                <button onClick={() => productNavigate("stock", "HDFCBANK")}
                  className="text-[12px] font-[400] text-[#533afd] flex items-center gap-1 active:scale-[0.97]">View Full Research <ArrowRight size={12} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Cream Band — AI Insight */}
      <div className="bg-[#f5e9d4] border-b border-[#e3e8ee]">
        <div className="max-w-[1200px] mx-auto px-6 py-[64px] text-center">
          <p className="text-[10px] font-[400] text-[#533afd] tracking-[0.1px] uppercase mb-2">AI Insight</p>
          <h2 className="text-[32px] font-[300] text-[#0d253d] leading-[1.1] tracking-[-0.64px] mb-6">Today's research highlight</h2>
          <div className="bg-white rounded-[12px] p-[32px] max-w-[560px] mx-auto text-left shadow-[rgba(0,55,112,0.08)_0_1px_3px] border border-[#e3e8ee]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[12px] font-[400] text-[#533afd]"><Sparkles size={14} /> AI Insight</div>
              <span className="text-[11px] font-[300] text-[#64748d]">Generated today</span>
            </div>
            <h3 className="text-[18px] font-[300] text-[#0d253d] leading-[1.4] mb-2">HDFCBANK: Compounding moat remains intact</h3>
            <p className="text-[13px] font-[300] text-[#64748d] leading-[1.4] tracking-[-0.39px] mb-4">
              Strong deposit franchise, improving CASA mix, and digital scale advantage support sustained ROA expansion.
            </p>
            <div className="flex items-center gap-2">
              <span className="bg-[#f6f9fc] text-[#533afd] text-[10px] font-[400] px-2.5 py-1 rounded-[9999px]">AI Confidence: High</span>
              <button onClick={() => productNavigate("stock", "HDFCBANK")} className="ml-auto text-[12px] font-[400] text-[#533afd] flex items-center gap-1 active:scale-[0.97]">Read Full Thesis <ArrowRight size={12} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Band — Market + Performance */}
      <div className="bg-white border-b border-[#e3e8ee]">
        <div className="max-w-[1200px] mx-auto px-6 py-[64px]">
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-[#f6f9fc] rounded-[12px] p-[32px] border border-[#e3e8ee]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="text-[16px] font-[300] text-[#0d253d] tracking-[-0.2px]">Market Overview</span><span className="text-[9px] font-[400] text-[#533afd] bg-white px-2 py-0.5 rounded-[9999px]">Live</span></div>
                <div className="flex gap-1">
                  {['1D','1W','1M','YTD','1Y'].map(p => (
                    <button key={p} className={`text-[9px] font-[400] px-2 py-0.5 rounded-[4px] active:scale-[0.97] ${p==='1D'?'bg-[#0d253d] text-white':'text-[#64748d]'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={cd}>
                  <defs><linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#533afd" stopOpacity={0.08}/><stop offset="95%" stopColor="#533afd" stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="v" stroke="#533afd" strokeWidth={1.5} fill="url(#ig)" dot={false} />
                  <XAxis dataKey="t" hide /><YAxis hide domain={['dataMin-50','dataMax+50']} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-[8px] text-[#64748d] mt-1 mb-3">
                {['9:15 AM','11:00 AM','12:30 PM','2:00 PM','3:30 PM'].map(t => <span key={t}>{t}</span>)}
              </div>
              <div className="grid grid-cols-4 border-t border-[#e3e8ee] pt-3">
                {[['Advances','1,856','#1a7f4b'],['Declines','1,089','#c0392b'],['Unchanged','136'],['Breadth','+767','#1a7f4b']].map(([l,v,c]) => (
                  <div key={l} className="text-center"><div className="text-[15px] font-[400]" style={{color:c??'#0d253d'}}>{v}</div><div className="text-[8px] text-[#64748d] mt-0.5">{l}</div></div>
                ))}
              </div>
            </div>
            <div className="bg-[#f6f9fc] rounded-[12px] p-[32px] border border-[#e3e8ee]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[16px] font-[300] text-[#0d253d] tracking-[-0.2px]">5Y Performance</span>
                <span className="text-[11px] text-[#64748d]">vs NIFTY 50</span>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={p5}>
                  <Line type="monotone" dataKey="s" stroke="#533afd" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="i" stroke="#e3e8ee" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <XAxis dataKey="n" hide /><YAxis hide domain={['dataMin-10','dataMax+10']} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <LegendDot c="#533afd" l="HDFCBANK" v="+221.4%" />
                <LegendDot c="#e3e8ee" l="NIFTY 50" v="+98.7%" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Soft Band — 5 Factors */}
      <div className="bg-[#f6f9fc] border-b border-[#e3e8ee]">
        <div className="max-w-[1200px] mx-auto px-6 py-[64px] text-center">
          <p className="text-[10px] font-[400] text-[#533afd] tracking-[0.1px] uppercase mb-2">5 Research Factors</p>
          <h2 className="text-[32px] font-[300] text-[#0d253d] leading-[1.1] tracking-[-0.64px] mb-2">Research every Nifty 50 company</h2>
          <p className="text-[15px] font-[300] text-[#64748d] mb-8 max-w-[460px] mx-auto">5 proprietary scores. 1000+ data points. Updated every single day.</p>
          <div className="grid grid-cols-5 gap-4">
            {factors.map((f, i) => {
              const v = gfs(f.key);
              return (
                <div key={f.name} className="bg-white rounded-[12px] p-[24px] text-left border border-[#e3e8ee] shadow-[rgba(0,55,112,0.08)_0_1px_3px]">
                  <div className="text-[11px] font-[400] text-[#533afd] mb-1">{f.icon} {f.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[26px] font-[300] text-[#0d253d] tracking-[-0.26px]">{v ?? '—'}</span>
                    <span className="text-[10px] text-[#64748d]">/100</span>
                  </div>
                  <p className="text-[11px] text-[#64748d] leading-[1.4] mb-3">{f.desc}</p>
                  <MiniSparkline data={prices.length>0 ? prices.slice(-(16+i), prices.length-i||undefined) : []} color="#533afd" width={55} height={24} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dark Navy Band — Social proof */}
      <div className="bg-[#0d253d] border-b border-[#1c1e54]">
        <div className="max-w-[1200px] mx-auto px-6 py-[64px]">
          <div className="text-center mb-8">
            <h2 className="text-[32px] font-[300] text-white leading-[1.1] tracking-[-0.64px] mb-2">Trusted by investors</h2>
            <p className="text-[15px] font-[300] text-[#64748d]">2M+ users, 10M+ reports, 250M+ data points</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1c1e54] rounded-[12px] p-[32px] text-center border border-[#273951]">
              <Users size={22} className="text-[#533afd] mx-auto mb-3" />
              <p className="text-[13px] text-[#94a3b8] mb-3 leading-[1.5]">"StockStory changed how I research companies. The AI summaries save hours."</p>
              <div className="text-[12px] font-[400] text-white">Rajesh Kumar</div>
              <div className="text-[10px] text-[#64748d]">Premium Member · 2 yrs</div>
            </div>
            <div className="bg-[#1c1e54] rounded-[12px] p-[32px] text-center border border-[#273951]">
              <div className="flex justify-center gap-0.5 mb-2">{[...Array(5)].map((_,i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="#f59e0b"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              ))}</div>
              <p className="text-[15px] font-[400] text-white mb-1">India's Highest Rated</p>
              <p className="text-[11px] text-[#64748d] mb-3">Financial Research Platform</p>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#64748d] bg-[#273951] px-3 py-1 rounded-[9999px]"><Shield size={11} /> G2 Leader 2024-25</span>
            </div>
            <div className="bg-[#1c1e54] rounded-[12px] p-[32px] text-center border border-[#273951]">
              <BarChart3 size={22} className="text-[#533afd] mx-auto mb-3" />
              <div className="grid grid-cols-1 gap-3">
                {[['2M+','Users'],['10M+','Research Reports'],['250M+','Data Points']].map(([val,lab]) => (
                  <div key={lab}><div className="text-[22px] font-[300] text-white tracking-[-0.2px]">{val}</div><div className="text-[10px] text-[#64748d]">{lab}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Band — Infrastructure */}
      <div className="bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-[64px]">
          <div className="grid grid-cols-5 gap-6 text-center">
            {([
              [BarChart3,'1000+ Data Sources','Financial statements, market data'],
              [Sparkles,'AI Research Engine','LLM-powered analysis and pattern recognition'],
              [Users,'Human + AI Quality','Automated checks + expert review'],
              [Shield,'Enterprise Grade','SOC 2 compliant, encrypted at rest'],
              [BarChart3,'99.9% Uptime','Reliable infrastructure, real-time pipeline'],
            ] as const).map(([IconEl,title,desc],i) => (
              <div key={i}>
                <div className="w-10 h-10 rounded-[8px] bg-[#f6f9fc] flex items-center justify-center mx-auto mb-3 border border-[#e3e8ee]">
                  <IconEl size={16} className="text-[#533afd]" />
                </div>
                <div className="text-[13px] font-[400] text-[#0d253d] mb-1">{title}</div>
                <div className="text-[10px] text-[#64748d] leading-[1.4]">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#e3e8ee]">
        <div className="max-w-[1200px] mx-auto px-6 py-[64px]">
          <div className="flex items-center justify-between text-[11px] text-[#64748d]">
            <span>© 2026 StockStory India. All rights reserved.</span>
            <div className="flex gap-4">
              <span>Privacy</span><span>Terms</span><span>Disclosures</span>
            </div>
          </div>
        </div>
      </div>

      <TradePanel open={tradeOpen} onClose={() => setTradeOpen(false)} symbol={tradeSymbol||"HDFCBANK"}
        companyName={data?.price?.companyName ?? "HDFC Bank Ltd."} price={tradePrice} score={78} />
    </AppShell>
  );
}
