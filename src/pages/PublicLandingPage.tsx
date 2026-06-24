import { ArrowUpRight, ArrowRight, Bookmark, Search, Sparkles, Check, Users, BarChart3, Shield } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import ScoreRing, { getScoreColor, getScoreLabel, MiniSparkline } from "../components/ui/ScoreRing";
import { useStockData } from "../hooks/useStockData";
import { productNavigate } from "../components/product/ProductUI";
import { fChange, fPrice } from "../lib/format";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Area, AreaChart } from "recharts";

const factors = [
  { icon: '◇', name: 'Quality', key: 'quality', desc: 'High returns, strong balance sheet' },
  { icon: '↗', name: 'Growth', key: 'growth', desc: 'Sustainable earnings growth' },
  { icon: '◎', name: 'Valuation', key: 'valuation', desc: 'Attractive valuation vs peers' },
  { icon: '⬡', name: 'Momentum', key: 'momentum', desc: 'Strong price momentum' },
  { icon: 'ϟ', name: 'Risk', key: 'risk', desc: 'Low financial risk, stable model' },
];

function generateChartData(points = 20) {
  const data: { t: string; v: number }[] = [];
  let v = 24500;
  for (let i = 0; i < points; i++) {
    v += (Math.random() - 0.45) * 100;
    data.push({ t: `${9 + Math.floor(i / 4)}:${((i % 4) * 15).toString().padStart(2, '0')}`, v: Math.round(v) });
  }
  return data;
}

function generate5YData() {
  const d: { name: string; stock: number; index: number }[] = [];
  let s = 100, idx = 100;
  for (let i = 0; i < 60; i++) {
    s *= 1 + (Math.random() - 0.48) * 0.03;
    idx *= 1 + (Math.random() - 0.48) * 0.02;
    d.push({ name: `M${i + 1}`, stock: Math.round(s * 100) / 100, index: Math.round(idx * 100) / 100 });
  }
  return d;
}

const chartData = generateChartData();
const perf5Y = generate5YData();

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center border-r border-[#f2f2f2] last:border-r-0">
      <div className="text-[18px] font-[700]" style={{ color }}>{value}</div>
      <div className="text-[10px] text-[#888] mt-0.5">{label}</div>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-[#555]">
      <div className="w-4 h-4 rounded-full bg-[#ebf7f1] flex items-center justify-center">
        <Check size={10} className="text-[#1a7f4b]" />
      </div>
      {text}
    </div>
  );
}

function FilterRow({ icon, label, value, chevron }: { icon: string; label: string; value: string; chevron?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#f2f2f2] cursor-pointer hover:bg-[#fafafa] px-2 -mx-2 rounded-[6px] transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{icon}</span>
        <span className="text-[12px] font-[500] text-[#555]">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-[#888]">{value.split(' ')[0]}</span>
        {chevron && <span className="text-[10px] text-[#ccc]">›</span>}
      </div>
    </div>
  );
}

function Legend({ color, solid, label, value }: { color: string; solid?: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className={`w-3 h-[2px] ${solid ? '' : ''}`} style={{ background: color, borderTop: solid ? 'none' : `1px dashed ${color}` }} />
      <span className="text-[#888]">{label}</span>
      <span className="font-[700] text-[#2d2d2d]">{value}</span>
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

export default function PublicLandingPage() {
  const { pipeline, loading } = useStockData("HDFCBANK");
  const pred = pipeline?.prediction;
  const score = pred?.rankingScore ?? null;
  const factorScores = pred?.factorScores ?? [];
  const prices = pipeline?.technicals?.closePrices ?? [];

  const getFactorScore = (key: string) => {
    const f = factorScores.find(x => x.group === key);
    return f?.value ?? null;
  };

  return (
    <AppShell active="research">
      <div className="max-w-[1280px] mx-auto px-6">

        {/* SECTION 1: 3-column hero */}
        <div className="grid grid-cols-[2fr_2fr_2fr] gap-5 py-8">

          {/* LEFT COLUMN */}
          <div className="flex flex-col justify-between min-h-[480px]">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#ebf7f1] text-[#1a7f4b] text-[11px] font-[700] px-3 py-1.5 rounded-full mb-5 tracking-[0.04em]">
                <span className="text-[#22c55e]">✦</span>
                AI-POWERED STOCK INTELLIGENCE
              </div>
              <h1 className="text-[52px] font-[800] text-[#0a0a0a] leading-[1.05] tracking-[-2px] mb-4">
                Understand<br />businesses.<br />Invest better.
              </h1>
              <p className="text-[15px] text-[#888] leading-[1.65] max-w-[320px] mb-7">
                StockStory India uses AI and deep financial research to help you understand businesses before you buy stocks.
              </p>
              <div className="flex items-center gap-3 mb-6">
                <button className="h-[44px] px-6 bg-[#0a0a0a] text-white text-[15px] font-[600] rounded-[10px] flex items-center gap-2 hover:bg-[#222]" onClick={() => productNavigate("signup")}>
                  Start Free Trial <ArrowUpRight size={16} />
                </button>
                <button className="h-[44px] px-5 bg-white text-[#2d2d2d] text-[15px] font-[500] rounded-[10px] border border-[#e8e8e8] flex items-center gap-2 hover:border-[#ccc]" onClick={() => productNavigate("scanner")}>
                  Explore Scanner <Search size={15} />
                </button>
              </div>
              <div className="flex items-center gap-5">
                <TrustItem text="No credit card required" />
                <TrustItem text="Cancel anytime, no lock-ins" />
                <TrustItem text="Trusted by 2M+ investors" />
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN */}
          <div className="flex flex-col gap-4">
            {/* Stock preview card */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[36px] h-[36px] rounded-[8px] bg-[#cc2936] flex items-center justify-center text-white text-[13px] font-[800]">H</div>
                <div>
                  <div className="text-[15px] font-[800] text-[#0a0a0a] tracking-[-0.3px]">HDFCBANK</div>
                  <div className="text-[11px] text-[#888]">{pipeline?.companyName ?? 'HDFC Bank Ltd.'}</div>
                </div>
                <Bookmark size={16} className="ml-auto text-[#ccc] cursor-pointer" />
              </div>
              <div className="flex items-center gap-5 mb-4">
                {loading ? (
                  <div className="w-[88px] h-[88px] rounded-full bg-[#f0f0f0] animate-pulse flex-shrink-0" />
                ) : (
                  <ScoreRing score={score} size={88} label={score !== null ? getScoreLabel(score) : undefined} />
                )}
                <div className="flex-1 flex flex-col gap-[7px]">
                  {['quality', 'growth', 'valuation', 'momentum', 'risk'].map(key => {
                    const v = getFactorScore(key);
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[12px] text-[#888] w-[64px] flex-shrink-0">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        <div className="flex-1 h-[4px] bg-[#f0f0f0] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${v ?? 0}%`, background: v ? getScoreColor(v) : '#f0f0f0' }} />
                        </div>
                        <span className="text-[12px] font-[700] text-[#2d2d2d] w-[22px] text-right">{v ?? '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#f2f2f2]">
                <span className="text-[13px] font-[600] text-[#2d2d2d]">StockStory Score</span>
                <button className="text-[13px] font-[600] text-[#1a7f4b] flex items-center gap-1" onClick={() => productNavigate("stock", "HDFCBANK")}>
                  View Full Research <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* AI Insight card */}
            <div className="bg-[#111111] rounded-[12px] p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[11px] font-[600] text-[#888]">
                  <span className="text-[#22c55e]">✦</span> AI Insight
                </div>
                <span className="text-[10px] text-[#555]">Generated today · 9:30 AM</span>
              </div>
              <div className="text-[15px] font-[700] text-white leading-[1.35] mb-2">
                HDFCBANK: Compounding moat remains intact
              </div>
              <div className="text-[13px] text-[rgba(255,255,255,0.6)] leading-[1.6] mb-4">
                {pred?.explanation ?? 'Strong deposit franchise, improving CASA mix, and digital scale advantage support sustained ROA expansion. Asset quality stable; credit growth outlook healthy.'}
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-[600] text-[#22c55e] bg-[rgba(34,197,94,0.1)] px-3 py-1 rounded-full">
                  AI Confidence: High
                </span>
                <button className="text-[12px] font-[600] text-[#888] flex items-center gap-1 hover:text-white" onClick={() => productNavigate("stock", "HDFCBANK")}>
                  Read Full Thesis <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4">
            {/* Market Overview card */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[14px] font-[700] text-[#0a0a0a]">Market Overview</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  <span className="text-[11px] font-[600] text-[#1a7f4b]">Live</span>
                </div>
                <div className="ml-auto flex gap-1">
                  {['1D', '1W', '1M', 'YTD', '1Y'].map(p => (
                    <button key={p} className={`text-[10px] font-[600] px-2 py-0.5 rounded ${p === '1D' ? 'bg-[#0a0a0a] text-white' : 'text-[#888]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a7f4b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1a7f4b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#1a7f4b" strokeWidth={1.5} fill="url(#greenGrad)" dot={false} />
                    <XAxis dataKey="t" hide />
                    <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[80px] bg-[#f5f5f5] rounded-[6px]" />
              )}
              <div className="flex justify-between text-[9px] text-[#888] mt-1 mb-3">
                {['9:15 AM', '11:00 AM', '12:30 PM', '2:00 PM', '3:30 PM'].map(t => <span key={t}>{t}</span>)}
              </div>
              <div className="grid grid-cols-4 gap-0 border-t border-[#f2f2f2] pt-3">
                <StatCell label="Advances" value="1,856" color="#1a7f4b" />
                <StatCell label="Declines" value="1,089" color="#c0392b" />
                <StatCell label="Unchanged" value="136" color="#0a0a0a" />
                <StatCell label="Market Breadth" value="+767" color="#1a7f4b" />
              </div>
            </div>

            {/* 5Y Performance card */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-[700] text-[#0a0a0a]">5Y Performance</span>
                <span className="text-[12px] text-[#888]">vs NIFTY 50</span>
              </div>
              {perf5Y.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={perf5Y}>
                    <Line type="monotone" dataKey="stock" stroke="#1a7f4b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="index" stroke="#ccc" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[120px] bg-[#f5f5f5] rounded-[6px]" />
              )}
              <div className="flex gap-4 mt-2">
                <Legend color="#1a7f4b" solid label="HDFCBANK" value="+221.4%" />
                <Legend color="#ccc" label="NIFTY 50" value="+98.7%" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Research every Nifty 50 company */}
        <div className="bg-[#f0f0ec] rounded-[14px] p-8 mt-4 mb-4">
          <h2 className="text-[22px] font-[700] text-center mb-1">Research every Nifty 50 company</h2>
          <p className="text-[14px] text-[#888] text-center mb-6">5 proprietary scores. 1000+ data points. Updated every single day.</p>
          <div className="grid grid-cols-5 gap-0 border border-[#e8e8e8] rounded-[10px] bg-white overflow-hidden">
            {factors.map((f, i) => {
              const v = getFactorScore(f.key);
              return (
                <div key={f.name} className={`p-5 ${i < 4 ? 'border-r border-[#e8e8e8]' : ''}`}>
                  <div className="text-[13px] font-[600] text-[#888] mb-1">{f.icon} {f.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[28px] font-[800] text-[#0a0a0a]">{v ?? '—'}</span>
                    <span className="text-[12px] text-[#bbb]">/100</span>
                  </div>
                  <p className="text-[12px] text-[#888] leading-[1.4] mb-3">{f.desc}</p>
                  <MiniSparkline data={prices.length > 0 ? prices.slice(-(16 + i), prices.length - i || undefined) : []} color="#1a7f4b" width={60} height={28} />
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Social proof */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#ebf7f1] flex items-center justify-center mb-3">
              <Users size={20} className="text-[#1a7f4b]" />
            </div>
            <p className="text-[13px] text-[#888] mb-4">Trusted by millions of investors worldwide</p>
            <div className="grid grid-cols-3 gap-4 w-full">
              <div><div className="text-[20px] font-[800] text-[#0a0a0a]">2M+</div><div className="text-[10px] text-[#888]">Users</div></div>
              <div><div className="text-[20px] font-[800] text-[#0a0a0a]">10M+</div><div className="text-[10px] text-[#888]">Research Reports</div></div>
              <div><div className="text-[20px] font-[800] text-[#0a0a0a]">250M+</div><div className="text-[10px] text-[#888]">Data Points</div></div>
            </div>
          </div>
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6">
            <div className="text-[28px] mb-2">"</div>
            <p className="text-[13px] text-[#555] leading-[1.6] mb-3">
              StockStory completely changed how I research companies. The AI thesis summaries save me hours of reading through quarterly reports.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1a56db] flex items-center justify-center text-white text-[11px] font-[700]">R</div>
              <div>
                <div className="text-[12px] font-[700] text-[#0a0a0a]">Rajesh Kumar</div>
                <div className="text-[10px] text-[#888]">Premium Member · 2 yrs</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 flex flex-col items-center text-center">
            <div className="flex items-center gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill="#f59e0b"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>
            <p className="text-[15px] font-[700] text-[#0a0a0a] mb-1">India's Highest Rated</p>
            <p className="text-[12px] text-[#888] mb-3">Financial Research Platform</p>
            <div className="inline-flex items-center gap-1 text-[11px] font-[600] text-[#555] bg-[#f5f5f5] px-3 py-1 rounded-full">
              <Shield size={12} /> G2 Leader 2024-25
            </div>
          </div>
        </div>

        {/* SECTION 4: Infrastructure strip */}
        <div className="grid grid-cols-5 gap-0 border-b border-[#e8e8e8] pb-6 mb-6">
          {([
            [BarChart3, '1000+ Data Sources', 'Financial statements, market data, alternative data'],
            [Sparkles, 'AI Research Engine', 'LLM-powered analysis and pattern recognition'],
            [Users, 'Human + AI Quality', 'Automated checks + manual expert review'],
            [Shield, 'Enterprise Grade Security', 'SOC 2 compliant, encrypted at rest'],
            [BarChart3, '99.9% Uptime', 'Reliable infrastructure, real-time data pipeline'],
          ] as const).map(([IconEl, title, desc], i) => (
            <div key={i} className="text-center px-3">
              <div className="w-10 h-10 rounded-full bg-[#ebf7f1] flex items-center justify-center mx-auto mb-2">
                <IconEl size={16} className="text-[#1a7f4b]" />
              </div>
              <div className="text-[13px] font-[700] text-[#0a0a0a] mb-1">{title}</div>
              <div className="text-[11px] text-[#888] leading-[1.4]">{desc}</div>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
