import React, { useMemo } from 'react';
import { ArrowRight, TrendingUp as GainIcon, TrendingDown as LossIcon } from 'lucide-react';
import { CompanyCard } from '../company/CompanyCard';
import { StockRegistry } from '../../services/stocks/StockRegistry';

interface SnapshotItem {
  index: string;
  value: string;
  change: string;
  isPositive: boolean;
  whatChanged: string;
  whyMatters: string;
}

const marketSnapshots: SnapshotItem[] = [
  {
    index: "NIFTY 50",
    value: "22,821.40",
    change: "+1.15%",
    isPositive: true,
    whatChanged: "Nifty gained 260 points driven by a rally in metal and banking sectors.",
    whyMatters: "Signal strength shows steady institutional capital inflow entering Indian equities."
  },
  {
    index: "SENSEX",
    value: "75,074.50",
    change: "+1.08%",
    isPositive: true,
    whatChanged: "Sensex closed at record high following favorable manufacturing index data.",
    whyMatters: "Indicates strong domestic industrial output, reinforcing high business quality."
  },
  {
    index: "NIFTY BANK",
    value: "49,235.80",
    change: "-0.22%",
    isPositive: false,
    whatChanged: "Bank index slid slightly due to minor profit booking in public sector lenders.",
    whyMatters: "Suggests a short-term consolidation phase in financial sector multiples."
  },
  {
    index: "INDIA VIX",
    value: "13.45",
    change: "-4.20%",
    isPositive: true,
    whatChanged: "Volatility index dropped significantly following stable global cues.",
    whyMatters: "Lower market fear signals an ideal window for high quality stock accumulations."
  }
];

const attentionItems = [
  { ticker: "RELIANCE", trigger: "ROCE improved", explanation: "Capital efficiency improving with digital services margin expansion." },
  { ticker: "TATASTEEL", trigger: "Global margins expansion", explanation: "Global steel price rebound directly boosts export earnings." },
  { ticker: "INFY", trigger: "Free cash flow breakout", explanation: "95% operating income conversion to free cash flow supports higher dividends." },
  { ticker: "HDFCBANK", trigger: "Net interest margin recovery", explanation: "Cost of funds stabilizing, driving higher earnings velocity." },
  { ticker: "HAL", trigger: "Defense order pipeline breakout", explanation: "Strong multi-year order book provides high revenue visibility." }
];

const topMovers = [
  { ticker: "SUZLON", price: "₹45.10", change: "+4.90%", isPositive: true },
  { ticker: "BHEL", price: "₹278.40", change: "+5.10%", isPositive: true },
  { ticker: "RECLTD", price: "₹512.40", change: "+4.20%", isPositive: true },
  { ticker: "INFY", price: "₹1,420.50", change: "-2.40%", isPositive: false }
];

const watchlistSummary = [
  { ticker: "TCS", name: "Tata Consultancy", price: "₹3,850.00", change: "+0.85%", isPositive: true },
  { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", price: "₹1,510.20", change: "-0.50%", isPositive: false },
  { ticker: "LT", name: "Larsen & Toubro Ltd.", price: "₹3,540.00", change: "+1.20%", isPositive: true },
  { ticker: "MARUTI", name: "Maruti Suzuki", price: "₹12,420.00", change: "+1.50%", isPositive: true },
  { ticker: "IREDA", name: "IREDA Ltd.", price: "₹185.40", change: "+4.80%", isPositive: true }
];

export const DashboardHub: React.FC = () => {
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good Morning";
    if (hours < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

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
    <div className="w-full space-y-12 pb-16 text-white max-w-7xl mx-auto antialiased">
      {/* SECTION 1: Greeting */}
      <section className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
          {greeting}, Samvidh
        </h1>
        <p className="text-xs text-gray-400">
          Here is how the Indian equity markets look right now.
        </p>
      </section>

      {/* SECTION 2: Market Snapshot (4 Cards only) */}
      <section className="space-y-4">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block">
          Market Snapshot
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {marketSnapshots.map((item) => (
            <div 
              key={item.index} 
              className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white/80">{item.index}</span>
                  <span className={`text-[10px] font-mono font-bold ${
                    item.isPositive ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {item.change}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-white mb-3">
                  {item.value}
                </div>
                <div className="space-y-2 text-[11px] text-white/60 leading-normal">
                  <p><strong>Changed:</strong> {item.whatChanged}</p>
                  <p><strong>Why matters:</strong> {item.whyMatters}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: What Deserves My Attention (5 Cards) */}
      <section className="space-y-4">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block">
          What Deserves My Attention
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attentionItems.map((item) => {
            const info = StockRegistry.getStock(item.ticker);
            return (
              <CompanyCard
                key={item.ticker}
                ticker={item.ticker}
                name={info?.companyName || item.ticker}
                sector={info?.sector || "Conglomerate"}
                marketCap={info?.marketCap.formatted || "₹50,000 Cr"}
                score={info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : 80}
                whyItMatters={`${item.trigger}: ${item.explanation}`}
                onClick={() => handleCompanyClick(item.ticker)}
              />
            );
          })}
        </div>
      </section>

      {/* SECTION 4 & 5 Grid: Top Movers & Watchlist Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SECTION 4: Top Movers (Simple Table) */}
        <section className="space-y-4">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block">
            Top Movers
          </span>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-medium">
                  <th className="p-4">Ticker</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.map((m) => (
                  <tr 
                    key={m.ticker} 
                    onClick={() => handleCompanyClick(m.ticker)}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-white">{m.ticker}</td>
                    <td className="p-4 text-white/80">{m.price}</td>
                    <td className={`p-4 text-right font-mono font-bold ${
                      m.isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {m.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 5: Watchlist Summary (5 Holdings + View All) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              Watchlist Summary
            </span>
            <button 
              onClick={() => handleNavigate("watchlist")}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-transparent border-none cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-medium">
                  <th className="p-4">Ticker</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {watchlistSummary.map((w) => (
                  <tr 
                    key={w.ticker}
                    onClick={() => handleCompanyClick(w.ticker)}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-white">{w.ticker}</td>
                    <td className="p-4 text-white/70 max-w-[150px] truncate">{w.name}</td>
                    <td className="p-4 text-white/80">{w.price}</td>
                    <td className={`p-4 text-right font-mono font-bold ${
                      w.isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {w.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardHub;
