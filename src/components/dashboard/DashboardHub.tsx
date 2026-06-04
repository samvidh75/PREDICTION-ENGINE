import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Compass, 
  Bell, 
  Bookmark, 
  History, 
  ArrowRight,
  TrendingUp as GainIcon,
  TrendingDown as LossIcon
} from 'lucide-react';

interface SnapshotItem {
  index: string;
  value: string;
  change: string;
  isPositive: boolean;
  whatChanged: string;
  whyMatters: string;
  whatWatch: string;
}

const marketSnapshots: SnapshotItem[] = [
  {
    index: "NIFTY 50",
    value: "22,821.40",
    change: "+1.15%",
    isPositive: true,
    whatChanged: "Nifty gained 260 points driven by a rally in metal and banking sectors.",
    whyMatters: "Signal strength shows steady institutional capital inflow entering Indian equities.",
    whatWatch: "Quarterly margin updates of top 5 index heavyweights tomorrow."
  },
  {
    index: "SENSEX",
    value: "75,074.50",
    change: "+1.08%",
    isPositive: true,
    whatChanged: "Sensex closed at record high following favorable manufacturing index data.",
    whyMatters: "Indicates strong domestic industrial output, reinforcing high business quality.",
    whatWatch: "Inflation print releases scheduled for next Tuesday."
  },
  {
    index: "NIFTY BANK",
    value: "49,235.80",
    change: "-0.22%",
    isPositive: false,
    whatChanged: "Bank index slid slightly due to minor profit booking in public sector lenders.",
    whyMatters: "Suggests a short-term consolidation phase in financial sector multiples.",
    whatWatch: "Credit growth trajectory announcements from private banks."
  }
];

const topMovers = [
  { ticker: "TATASTEEL", name: "Tata Steel Ltd.", price: "₹174.20", change: "+4.85%", isPositive: true, whatChanged: "Steel prices rose globally.", whyMatters: "Direct margins improvement next quarter.", whatWatch: "Global supply contracts updates." },
  { ticker: "INFY", name: "Infosys Ltd.", price: "₹1,420.50", change: "-2.40%", isPositive: false, whatChanged: "Guidance narrowed by North American clients.", whyMatters: "Softens near-term revenue growth velocity.", whatWatch: "New deal wins velocity in BFSI segment." },
  { ticker: "RELIANCE", name: "Reliance Industries", price: "₹2,845.00", change: "+1.95%", isPositive: true, whatChanged: "Telecom subscriber additions accelerated.", whyMatters: "Boosts long-term business quality stable flows.", whatWatch: "Retail division margins optimization." }
];

const watchlistActivity = [
  { ticker: "TCS", name: "Tata Consultancy Services", price: "₹3,850.00", change: "+0.85%", changeReason: "FII ownership increased by 0.4% this week.", significance: "Replaces random retail selling with long-term capital support.", recommendation: "Review latest shareholding pattern document." },
  { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", price: "₹1,510.20", change: "-0.50%", changeReason: "Promoter pledge details reported zero leverage change.", significance: "Maintains its pristine Financial Health status.", recommendation: "Check interest coverage stability indicators." }
];

const discoveryOpportunities = [
  { title: "High Quality Businesses", desc: "12 companies reporting steady ROE > 22% over last 5 years.", ticker: "LT" },
  { title: "Momentum Leaders", desc: "8 mid-caps showing strong relative strength index breakout.", ticker: "HAL" },
  { title: "Sector Leaders", desc: "Energy conglomerates with capital reallocation efficiency.", ticker: "NTPC" }
];

const recentAlerts = [
  { level: "high", title: "Promoter Stake Exit", ticker: "ADANIENT", desc: "Promoters reduced holding by 1.5% in open market.", action: "Investigate if capital was reallocated or exited." },
  { level: "info", title: "Margin Expansion Alert", ticker: "MARUTI", desc: "Operating margin crossed 5-quarter average threshold.", action: "Audit if pricing power or lower raw material cost drove gains." }
];

export const DashboardHub: React.FC = () => {
  const handleCompanyClick = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const handleNavigate = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <div className="w-full space-y-10 pb-16 text-white max-w-7xl mx-auto antialiased">
      {/* Good Morning / Header Card */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-r from-cyan-950/20 via-slate-950/40 to-[#0b0d11] p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <span className="text-[10px] tracking-[0.25em] font-mono text-cyan-400 font-semibold block mb-2">
          INVESTOR CONSOLE
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
          Good Morning, Samvidh
        </h1>
        <p className="text-xs md:text-sm text-gray-400 max-w-2xl leading-relaxed">
          The Indian markets show stable momentum. Standard diagnostic audits are up to date. You have 2 watchlist updates that require review.
        </p>
      </section>

      {/* Market Snapshot */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Market Snapshot</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {marketSnapshots.map((item, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-white/10 transition-all">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-white font-mono">{item.index}</span>
                  <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.isPositive ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
                  }`}>
                    {item.isPositive ? <GainIcon className="w-3.5 h-3.5" /> : <LossIcon className="w-3.5 h-3.5" />}
                    <span>{item.change}</span>
                  </div>
                </div>
                <span className="text-xl font-bold font-mono tracking-tight text-white block mb-4">{item.value}</span>
                
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">What Changed</span>
                    <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{item.whatChanged}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">Why It Matters</span>
                    <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{item.whyMatters}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">What to Watch</span>
                    <p className="text-xs text-gray-300 mt-0.5 leading-relaxed font-semibold text-cyan-400">{item.whatWatch}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Movers & Watchlist Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Movers */}
        <section className="space-y-4">
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest block">Top Movers</span>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
            {topMovers.map((m, idx) => (
              <div 
                key={idx} 
                onClick={() => handleCompanyClick(m.ticker)}
                className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5 gap-3"
              >
                <div>
                  <span className="text-xs font-bold text-white font-mono block">{m.ticker}</span>
                  <span className="text-[10px] text-gray-400 block">{m.name}</span>
                </div>
                <div className="flex flex-col md:items-end">
                  <span className="text-xs font-semibold text-white font-mono">{m.price}</span>
                  <span className={`text-[10px] font-semibold font-mono ${m.isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {m.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Watchlist Activity */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Watchlist Activity</span>
            <button onClick={() => handleNavigate("watchlist")} className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer">
              <span>View Watchlist</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-6">
            {watchlistActivity.map((w, idx) => (
              <div key={idx} className="space-y-3 pb-4 border-b border-white/5 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-center">
                  <div className="cursor-pointer" onClick={() => handleCompanyClick(w.ticker)}>
                    <span className="text-xs font-bold text-white font-mono block hover:underline">{w.ticker}</span>
                    <span className="text-[10px] text-gray-400">{w.name}</span>
                  </div>
                  <span className="text-xs font-mono text-white/80">{w.changeReason}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white/[0.02] p-3 rounded-lg border border-white/5">
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block font-mono">Significance</span>
                    <p className="text-gray-300 mt-0.5 leading-relaxed">{w.significance}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block font-mono">Suggested Step</span>
                    <p className="text-cyan-400 mt-0.5 leading-relaxed font-semibold cursor-pointer hover:underline" onClick={() => handleCompanyClick(w.ticker)}>
                      {w.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Discovery Opportunities & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Discovery Opportunities */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Discovery Opportunities</span>
            <button onClick={() => handleNavigate("discovery")} className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer">
              <span>Go to Discover</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {discoveryOpportunities.map((op, idx) => (
              <div 
                key={idx} 
                onClick={() => handleCompanyClick(op.ticker)}
                className="bg-white/[0.02] border border-white/5 p-4 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                <Compass className="w-5 h-5 text-cyan-400 mb-3" />
                <h3 className="text-xs font-bold text-white mb-1">{op.title}</h3>
                <p className="text-[10px] text-gray-400 leading-normal">{op.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Alerts */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Recent Alerts</span>
            <button onClick={() => handleNavigate("alerts")} className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer">
              <span>View All Alerts</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
            {recentAlerts.map((a, idx) => (
              <div key={idx} className="flex gap-4 items-start pb-3 border-b border-white/5 last:border-b-0 last:pb-0">
                <Bell className={`w-4 h-4 mt-0.5 ${a.level === 'high' ? 'text-amber-400' : 'text-cyan-400'}`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white font-mono">{a.title} ({a.ticker})</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{a.desc}</p>
                  <p className="text-[11px] text-cyan-400 mt-1 font-semibold cursor-pointer hover:underline" onClick={() => handleCompanyClick(a.ticker)}>
                    Action: {a.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Saved Research & Recent Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Saved Research */}
        <section className="space-y-4">
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest block">Saved Research</span>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-3">
            {[
              { ticker: "TATASTEEL", title: " टाटा Steel Q4 Margin Expansion Analysis", date: "Saved 2 days ago" },
              { ticker: "INFY", title: "Infosys Cash Allocation & Dividend Moat Review", date: "Saved 1 week ago" }
            ].map((s, idx) => (
              <div 
                key={idx} 
                onClick={() => handleCompanyClick(s.ticker)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
              >
                <Bookmark className="w-4 h-4 text-cyan-400" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-white block">{s.title}</span>
                  <span className="text-[9px] text-gray-500 block font-mono">{s.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Companies */}
        <section className="space-y-4">
          <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest block">Recent Companies</span>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-3">
            {[
              { ticker: "RELIANCE", name: "Reliance Industries", lastViewed: "Viewed 3 hours ago" },
              { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", lastViewed: "Viewed 5 hours ago" }
            ].map((r, idx) => (
              <div 
                key={idx} 
                onClick={() => handleCompanyClick(r.ticker)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <History className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-xs font-bold text-white font-mono block">{r.ticker}</span>
                    <span className="text-[10px] text-gray-400">{r.name}</span>
                  </div>
                </div>
                <span className="text-[9px] text-gray-500 font-mono">{r.lastViewed}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardHub;
