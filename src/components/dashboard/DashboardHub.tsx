import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, Flame, Trophy, RefreshCw, Layers } from 'lucide-react';
import { CompanyCard } from '../company/CompanyCard';
import { StockRegistry } from '../../services/stocks/StockRegistry';
import { WatchlistEngine } from '../../services/portfolio/WatchlistEngine';
import { RecentSearchStore } from '../../services/search/RecentSearchStore';

interface SnapshotItem {
  index: string;
  value: string;
  change: string;
  isPositive: boolean;
}

const marketSnapshots: SnapshotItem[] = [
  { index: "NIFTY 50", value: "22,821.40", change: "+1.15%", isPositive: true },
  { index: "SENSEX", value: "75,074.50", change: "+1.08%", isPositive: true },
  { index: "BANK NIFTY", value: "49,235.80", change: "-0.22%", isPositive: false },
  { index: "INDIA VIX", value: "13.45", change: "-4.20%", isPositive: false }
];

interface Opportunity {
  ticker: string;
  whatChanged: string;
  whyMatters: string;
}

const todayOpportunities: Opportunity[] = [
  {
    ticker: "RELIANCE",
    whatChanged: "Operating margins consolidated in retail and digital business units.",
    whyMatters: "Strong performance in telecom offset commodity headwind, proving conglomerate business quality."
  },
  {
    ticker: "TATASTEEL",
    whatChanged: "Global export contracts renewed with improved pricing realizations.",
    whyMatters: "Capacity utilization spikes in domestic plants are translating into immediate free cash flow."
  },
  {
    ticker: "INFY",
    whatChanged: "Acquisition of leading European engineering firm cleared regulators.",
    whyMatters: "Accelerates high-margin engineering services segments and expands continental market share."
  },
  {
    ticker: "HDFCBANK",
    whatChanged: "Credit growth momentum sustained at 16% YoY with deposits rising 18%.",
    whyMatters: "Post-merger integration pain points are resolving faster than consensus street estimates."
  },
  {
    ticker: "HAL",
    whatChanged: "Secured export contract for upgraded trainer jets from Southeast Asia.",
    whyMatters: "Validates international competitiveness and unlocks a non-governmental revenue channel."
  }
];

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());

    const handleWatchlistChange = () => {
      setWatchlists([...WatchlistEngine.getWatchlists()]);
    };
    window.addEventListener("watchlistchange", handleWatchlistChange);
    return () => window.removeEventListener("watchlistchange", handleWatchlistChange);
  }, []);

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good Morning";
    if (hours < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const handleCompanyClick = (symbol: string) => {
    RecentSearchStore.addTicker(symbol);
    setRecentResearch(RecentSearchStore.getRecent());

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

  const isWatched = (ticker: string) => {
    return watchlists.some(w => w.tickers.includes(ticker));
  };

  const handleToggleWatchlist = (ticker: string) => {
    const defaultList = watchlists[0];
    if (!defaultList) return;
    if (isWatched(ticker)) {
      WatchlistEngine.removeTicker(defaultList.id, ticker);
    } else {
      WatchlistEngine.addTicker(defaultList.id, ticker);
    }
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach(w => {
      w.tickers.forEach(t => unique.add(t));
    });
    return Array.from(unique).slice(0, 5);
  }, [watchlists]);

  return (
    <div className="w-full space-y-12 pb-16 text-white max-w-7xl mx-auto antialiased">
      {/* 1. Time-based Greeting Header */}
      <section className="border-b border-white/5 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400 block mb-1">
            RESEARCH TERMINAL
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            {greeting}, Samvidh
          </h1>
          <p className="text-xs text-gray-400 font-medium">
            What deserves my attention?
          </p>
        </div>
      </section>

      {/* 2. Today’s Opportunities (Maximum 5 cards) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
            Today's Opportunities
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {todayOpportunities.map((op) => {
            const info = StockRegistry.getStock(op.ticker);
            const score = info?.telemetrySnapshot?.healthScore 
              ? Math.round(info.telemetrySnapshot.healthScore) 
              : 82;
            return (
              <CompanyCard
                key={op.ticker}
                ticker={op.ticker}
                name={info?.companyName || op.ticker}
                sector={info?.sector || "Conglomerate"}
                marketCap={info?.marketCap.formatted || "₹50,000 Cr"}
                score={score}
                whyItMatters={op.whyMatters}
                isWatched={isWatched(op.ticker)}
                onOpenBriefing={() => handleCompanyClick(op.ticker)}
                onToggleWatchlist={() => handleToggleWatchlist(op.ticker)}
              />
            );
          })}
        </div>
      </section>

      {/* Grid container for updates and research */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3. Watchlist Updates (Maximum 5 items) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Watchlist Updates
              </span>
            </div>
            <button 
              onClick={() => handleNavigate("watchlist")}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-transparent border-none cursor-pointer"
            >
              <span>View Watchlist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
            {followedTickers.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/30 space-y-3">
                <p>Your watchlist is empty.</p>
                <button
                  onClick={() => handleNavigate("discovery")}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] rounded-lg cursor-pointer"
                >
                  Discover Stocks
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 font-medium">
                    <th className="p-4">Ticker</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {followedTickers.map((ticker) => {
                    const info = StockRegistry.getStock(ticker);
                    const score = info?.telemetrySnapshot?.healthScore 
                      ? Math.round(info.telemetrySnapshot.healthScore) 
                      : 80;
                    return (
                      <tr 
                        key={ticker}
                        onClick={() => handleCompanyClick(ticker)}
                        className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-white">{ticker}</td>
                        <td className="p-4 text-white/70 max-w-[180px] truncate">{info?.companyName || `${ticker} India`}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded border border-white/10 text-white/80 font-mono text-[10px]">
                            {score} / 100
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-cyan-400 hover:underline text-[11px] font-semibold">Open Briefing</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* 4. Recent Research (Recently viewed companies) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-violet-400" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              Recent Research
            </span>
          </div>
          
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
            {recentResearch.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/30 space-y-3">
                <p>No recently viewed companies yet.</p>
                <button
                  onClick={() => handleNavigate("discovery")}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] rounded-lg cursor-pointer"
                >
                  Discover Stocks
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 font-medium">
                    <th className="p-4">Ticker</th>
                    <th className="p-4">Sector</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResearch.slice(0, 5).map((ticker) => {
                    const info = StockRegistry.getStock(ticker);
                    return (
                      <tr 
                        key={ticker}
                        onClick={() => handleCompanyClick(ticker)}
                        className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-white">{ticker}</td>
                        <td className="p-4 text-white/60">{info?.sector || "Conglomerate"}</td>
                        <td className="p-4 text-right">
                          <span className="text-cyan-400 hover:underline text-[11px] font-semibold">Resume Analysis</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* 5. Market Snapshot (Compact Only) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
            Market Snapshot
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {marketSnapshots.map((item) => (
            <div 
              key={item.index} 
              className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex justify-between items-center"
            >
              <div>
                <span className="text-[10px] font-medium text-white/50 block">{item.index}</span>
                <span className="text-sm font-bold font-mono text-white mt-0.5 block">{item.value}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                item.change.startsWith("+") 
                  ? "text-emerald-400 bg-emerald-400/10" 
                  : "text-rose-400 bg-rose-400/10"
              }`}>
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardHub;
