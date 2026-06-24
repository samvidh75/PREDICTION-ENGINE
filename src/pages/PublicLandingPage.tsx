import { ArrowUpRight, ArrowRight, Check, Search, Sparkles, Users, BarChart3, Shield } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import ScoreRing, { getScoreColor, getScoreLabel, MiniSparkline } from "../components/ui/ScoreRing";
import { useStockData } from "../hooks/useStockData";
import { productNavigate } from "../components/product/ProductUI";
import { LineChart, Line, ResponsiveContainer, Area, AreaChart, XAxis, YAxis } from "recharts";

function generateChartData(points = 20) {
  const data: { t: string; v: number }[] = [];
  let v = 24500;
  for (let i = 0; i < points; i++) {
    v += (Math.sin(i * 1.7) + 0.1) * 50;
    data.push({ t: `${9 + Math.floor(i / 4)}:${((i % 4) * 15).toString().padStart(2, '0')}`, v: Math.round(v) });
  }
  return data;
}

function generate5YData() {
  const d: { name: string; stock: number; index: number }[] = [];
  let s = 100, idx = 100;
  for (let i = 0; i < 60; i++) {
    s *= 1 + (Math.sin(i * 1.13) + 0.08) * 0.015;
    idx *= 1 + (Math.sin(i * 0.87) + 0.06) * 0.01;
    d.push({ name: `M${i + 1}`, stock: Math.round(s * 100) / 100, index: Math.round(idx * 100) / 100 });
  }
  return d;
}

const chartData = generateChartData();
const perf5Y = generate5YData();

const factors = [
  { icon: '◇', name: 'Quality', key: 'quality', desc: 'High returns, strong balance sheet' },
  { icon: '↗', name: 'Growth', key: 'growth', desc: 'Sustainable earnings growth' },
  { icon: '◎', name: 'Valuation', key: 'valuation', desc: 'Attractive valuation vs peers' },
  { icon: '⬡', name: 'Momentum', key: 'momentum', desc: 'Strong price momentum' },
  { icon: 'ϟ', name: 'Risk', key: 'risk', desc: 'Low financial risk, stable model' },
];

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px]">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-[#7a7a7a]">{label}</span>
      <span className="font-[600] text-[#1d1d1f]">{value}</span>
    </div>
  );
}

export default function PublicLandingPage() {
  const { data, loading } = useStockData("HDFCBANK");
  const score = 78; // computed from available data
  const prices = data?.historical?.closes ?? [];

  const getFactorScore = (key: string) => {
    const vals: Record<string, number> = {
      quality: data?.fundamentals?.roe ? Math.min(95, Math.round(data.fundamentals.roe * 3 + 40)) : 72,
      growth: data?.fundamentals?.revenueGrowth ? Math.min(95, Math.round(data.fundamentals.revenueGrowth * 2 + 50)) : 68,
      valuation: data?.fundamentals?.peRatio ? Math.min(95, Math.round(1500 / data.fundamentals.peRatio)) : 65,
      momentum: 70 + Math.round((prices.length > 1 ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0) * 0.5),
      risk: data?.fundamentals?.debtToEquity ? Math.max(20, 90 - Math.round(data.fundamentals.debtToEquity * 5)) : 75,
    };
    return vals[key] ?? 65;
  };

  return (
    <AppShell active="research">
      {/* HERO SECTION — edge-to-edge white tile */}
      <div className="bg-white">
        <div className="max-w-[980px] mx-auto px-6 py-[80px] text-center">
          <div className="inline-flex items-center gap-1.5 bg-[#f5f5f7] text-[#0066cc] text-[12px] font-[600] tracking-[-0.12px] px-3 py-1 rounded-[9999px] mb-6">
            <Sparkles size={13} />
            AI-POWERED STOCK INTELLIGENCE
          </div>
          <h1 className="text-[56px] font-[600] text-[#1d1d1f] leading-[1.07] tracking-[-0.28px] mb-3">
            Understand businesses.<br />Invest better.
          </h1>
          <p className="text-[21px] font-[400] text-[#7a7a7a] leading-[1.19] tracking-[0.231px] max-w-[600px] mx-auto mb-8">
            AI and deep financial research to help you understand businesses before you buy stocks.
          </p>
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              className="bg-[#0066cc] text-white text-[17px] font-[400] tracking-[-0.374px] px-[22px] py-[11px] rounded-[9999px] hover:opacity-90 transition-opacity active:scale-[0.95] flex items-center gap-2"
              onClick={() => productNavigate("signup")}
            >
              Start Free Trial <ArrowUpRight size={16} />
            </button>
            <button
              className="bg-transparent text-[#0066cc] text-[17px] font-[400] tracking-[-0.374px] px-[22px] py-[11px] rounded-[9999px] border border-[#0066cc] hover:opacity-80 transition-opacity active:scale-[0.95] flex items-center gap-2"
              onClick={() => productNavigate("scanner")}
            >
              Explore Scanner <Search size={16} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-[14px] text-[#7a7a7a]">
            <div className="flex items-center gap-1.5"><Check size={13} className="text-[#0066cc]" /> No credit card required</div>
            <div className="flex items-center gap-1.5"><Check size={13} className="text-[#0066cc]" /> Cancel anytime</div>
            <div className="flex items-center gap-1.5"><Check size={13} className="text-[#0066cc]" /> Trusted by 2M+ investors</div>
          </div>
        </div>
      </div>

      {/* DARK TILE — Live stock preview */}
      <div className="bg-[#272729]">
        <div className="max-w-[980px] mx-auto px-6 py-[80px]">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[12px] font-[600] text-[#0066cc] tracking-[-0.12px] mb-2">LIVE PREVIEW</p>
              <h2 className="text-[40px] font-[600] text-white leading-[1.1] mb-2">See the score in action</h2>
              <p className="text-[17px] font-[400] text-[#cccccc] leading-[1.47] tracking-[-0.374px] mb-4">
                Every stock gets a proprietary AI score across 5 dimensions. Updated daily with fresh data.
              </p>
              <button
                className="bg-[#0066cc] text-white text-[14px] font-[400] tracking-[-0.224px] px-[15px] py-[8px] rounded-[9999px] hover:opacity-90 transition-opacity active:scale-[0.95]"
                onClick={() => productNavigate("stock", "HDFCBANK")}
              >
                View Full Research <ArrowRight size={13} className="inline ml-1" />
              </button>
            </div>
            <div className="bg-[#2a2a2c] rounded-[18px] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[36px] h-[36px] rounded-[8px] bg-[#0066cc] flex items-center justify-center text-white text-[13px] font-[600]">H</div>
                <div>
                  <div className="text-[17px] font-[600] text-white tracking-[-0.374px]">HDFCBANK</div>
                  <div className="text-[12px] text-[#7a7a7a]">{data?.price?.companyName ?? 'HDFC Bank Ltd.'}</div>
                </div>
              </div>
              <div className="flex items-center gap-5 mb-4">
                {loading ? (
                  <div className="w-[88px] h-[88px] rounded-full bg-[#333] animate-pulse flex-shrink-0" />
                ) : (
                  <ScoreRing score={score} size={88} />
                )}
                <div className="flex-1 flex flex-col gap-[6px]">
                  {['quality', 'growth', 'valuation', 'momentum', 'risk'].map(key => {
                    const v = getFactorScore(key);
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[11px] text-[#7a7a7a] w-[64px] flex-shrink-0">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        <div className="flex-1 h-[3px] bg-[#333] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${v ?? 0}%`, background: v ? getScoreColor(v) : '#333' }} />
                        </div>
                        <span className="text-[11px] font-[600] text-[#ccc] w-[22px] text-right">{v ?? '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#333]">
                <span className="text-[12px] text-[#7a7a7a]">StockStory Score</span>
                <button className="text-[12px] font-[600] text-[#0066cc] flex items-center gap-1" onClick={() => productNavigate("stock", "HDFCBANK")}>
                  View Full Research <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PARCHMENT TILE — AI Insight */}
      <div className="bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6 py-[80px]">
          <div className="text-center mb-8">
            <p className="text-[12px] font-[600] text-[#0066cc] tracking-[-0.12px] mb-2">AI INSIGHT</p>
            <h2 className="text-[40px] font-[600] text-[#1d1d1f] leading-[1.1] mb-2">Today's research highlight</h2>
          </div>
          <div className="bg-white rounded-[18px] p-6 max-w-[600px] mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[12px] font-[600] text-[#0066cc]">
                <Sparkles size={14} /> AI Insight
              </div>
              <span className="text-[11px] text-[#7a7a7a]">Generated today</span>
            </div>
            <div className="text-[17px] font-[600] text-[#1d1d1f] leading-[1.24] tracking-[-0.374px] mb-2">
              HDFCBANK: Compounding moat remains intact
            </div>
            <p className="text-[14px] text-[#7a7a7a] leading-[1.43] tracking-[-0.224px] mb-4">
              {'Strong deposit franchise, improving CASA mix, and digital scale advantage support sustained ROA expansion. Asset quality stable; credit growth outlook healthy.'}
            </p>
            <div className="flex items-center gap-2 text-[12px] font-[600] text-[#0066cc]">
              <span className="bg-[#f5f5f7] px-2.5 py-1 rounded-[9999px]">AI Confidence: High</span>
              <button className="ml-auto flex items-center gap-1" onClick={() => productNavigate("stock", "HDFCBANK")}>
                Read Full Thesis <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WHITE TILE — Market Overview + 5Y */}
      <div className="bg-white">
        <div className="max-w-[980px] mx-auto px-6 py-[80px]">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#f5f5f7] rounded-[18px] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-[600] text-[#1d1d1f]">Market Overview</span>
                  <span className="text-[10px] text-[#0066cc] font-[600] bg-white px-2 py-0.5 rounded-[9999px]">Live</span>
                </div>
                <div className="flex gap-1">
                  {['1D', '1W', '1M', 'YTD', '1Y'].map(p => (
                    <button key={p} className={`text-[10px] font-[500] px-2 py-0.5 rounded-[5px] ${p === '1D' ? 'bg-[#1d1d1f] text-white' : 'text-[#7a7a7a]'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0066cc" stopOpacity={0.1} /><stop offset="95%" stopColor="#0066cc" stopOpacity={0} /></linearGradient></defs>
                  <Area type="monotone" dataKey="v" stroke="#0066cc" strokeWidth={1.5} fill="url(#blueGrad)" dot={false} />
                  <XAxis dataKey="t" hide /><YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-[9px] text-[#7a7a7a] mt-1 mb-3">
                {['9:15 AM', '11:00 AM', '12:30 PM', '2:00 PM', '3:30 PM'].map(t => <span key={t}>{t}</span>)}
              </div>
              <div className="grid grid-cols-4 gap-0 border-t border-[#e0e0e0] pt-3">
                {[['Advances', '1,856', '#1a7f4b'], ['Declines', '1,089', '#c0392b'], ['Unchanged', '136', '#1d1d1f'], ['Market Breadth', '+767', '#1a7f4b']].map(([label, value, color]) => (
                  <div key={label} className="text-center">
                    <div className="text-[16px] font-[600]" style={{ color }}>{value}</div>
                    <div className="text-[9px] text-[#7a7a7a] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#f5f5f7] rounded-[18px] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-[600] text-[#1d1d1f]">5Y Performance</span>
                <span className="text-[11px] text-[#7a7a7a]">vs NIFTY 50</span>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={perf5Y}>
                  <Line type="monotone" dataKey="stock" stroke="#0066cc" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="index" stroke="#ccc" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <XAxis dataKey="name" hide /><YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <LegendDot color="#0066cc" label="HDFCBANK" value="+221.4%" />
                <LegendDot color="#ccc" label="NIFTY 50" value="+98.7%" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PARCHMENT TILE — 5 factors */}
      <div className="bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6 py-[80px] text-center">
          <p className="text-[12px] font-[600] text-[#0066cc] tracking-[-0.12px] mb-2">5 RESEARCH FACTORS</p>
          <h2 className="text-[40px] font-[600] text-[#1d1d1f] leading-[1.1] mb-2">Research every Nifty 50 company</h2>
          <p className="text-[17px] text-[#7a7a7a] mb-10 max-w-[500px] mx-auto">5 proprietary scores. 1000+ data points. Updated every single day.</p>
          <div className="grid grid-cols-5 gap-4">
            {factors.map((f, i) => {
              const v = getFactorScore(f.key);
              return (
                <div key={f.name} className="bg-white rounded-[18px] p-5 text-left">
                  <div className="text-[12px] font-[600] text-[#0066cc] mb-1">{f.icon} {f.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[28px] font-[600] text-[#1d1d1f]">{v ?? '—'}</span>
                    <span className="text-[11px] text-[#7a7a7a]">/100</span>
                  </div>
                  <p className="text-[11px] text-[#7a7a7a] leading-[1.4] mb-3">{f.desc}</p>
                  <MiniSparkline data={prices.length > 0 ? prices.slice(-(16 + i), prices.length - i || undefined) : []} color="#0066cc" width={60} height={28} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DARK TILE — Social proof */}
      <div className="bg-[#272729]">
        <div className="max-w-[980px] mx-auto px-6 py-[80px]">
          <div className="text-center mb-10">
            <h2 className="text-[40px] font-[600] text-white leading-[1.1] mb-2">Trusted by investors</h2>
            <p className="text-[17px] text-[#cccccc]">2M+ users, 10M+ research reports, 250M+ data points</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#2a2a2c] rounded-[18px] p-6 text-center">
              <Users size={24} className="text-[#0066cc] mx-auto mb-3" />
              <p className="text-[14px] text-[#cccccc] mb-4">"StockStory changed how I research companies. The AI thesis summaries save hours."</p>
              <div className="text-[12px] font-[600] text-white">Rajesh Kumar</div>
              <div className="text-[10px] text-[#7a7a7a]">Premium Member · 2 yrs</div>
            </div>
            <div className="bg-[#2a2a2c] rounded-[18px] p-6 text-center">
              <div className="flex items-center justify-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill="#f59e0b"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p className="text-[17px] font-[600] text-white mb-1">India's Highest Rated</p>
              <p className="text-[12px] text-[#7a7a7a] mb-3">Financial Research Platform</p>
              <div className="inline-flex items-center gap-1 text-[11px] text-[#7a7a7a] bg-[#333] px-3 py-1 rounded-[9999px]"><Shield size={12} /> G2 Leader 2024-25</div>
            </div>
            <div className="bg-[#2a2a2c] rounded-[18px] p-6 text-center">
              <BarChart3 size={24} className="text-[#0066cc] mx-auto mb-3" />
              <div className="grid grid-cols-1 gap-3">
                <div><div className="text-[24px] font-[600] text-white">2M+</div><div className="text-[11px] text-[#7a7a7a]">Users</div></div>
                <div><div className="text-[24px] font-[600] text-white">10M+</div><div className="text-[11px] text-[#7a7a7a]">Research Reports</div></div>
                <div><div className="text-[24px] font-[600] text-white">250M+</div><div className="text-[11px] text-[#7a7a7a]">Data Points</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PARCHMENT TILE — Infrastructure */}
      <div className="bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6 py-[80px]">
          <div className="grid grid-cols-5 gap-6 text-center">
            {([
              [BarChart3, '1000+ Data Sources', 'Financial statements, market data, alternative data'],
              [Sparkles, 'AI Research Engine', 'LLM-powered analysis and pattern recognition'],
              [Users, 'Human + AI Quality', 'Automated checks + manual expert review'],
              [Shield, 'Enterprise Grade', 'SOC 2 compliant, encrypted at rest'],
              [BarChart3, '99.9% Uptime', 'Reliable infrastructure, real-time pipeline'],
            ] as const).map(([IconEl, title, desc], i) => (
              <div key={i}>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
                  <IconEl size={16} className="text-[#0066cc]" />
                </div>
                <div className="text-[14px] font-[600] text-[#1d1d1f] mb-1">{title}</div>
                <div className="text-[11px] text-[#7a7a7a] leading-[1.4]">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
