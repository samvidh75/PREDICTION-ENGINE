import React, { useState, useEffect } from "react";
import { TrendingUp, Sparkles, Trophy, Flame, PlusCircle, Search } from "lucide-react";

import { CompanyCard } from "../components/company/CompanyCard";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { PageHeader } from "../components/ui/DesignSystem";

interface DiscoverCompany {
  symbol: string;
  name: string;
  score: number;
  price: string;
  change: string;
  isPositive: boolean;
  oneLiner: string;
}

interface DiscoverCategory {
  title: string;
  icon: React.ReactNode;
  companies: DiscoverCompany[];
}

export const DiscoveryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [categories, setCategories] = useState<DiscoverCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleWatchlistChange = () => {
      setWatchlists([...WatchlistEngine.getWatchlists()]);
    };
    window.addEventListener("watchlistchange", handleWatchlistChange);
    return () => window.removeEventListener("watchlistchange", handleWatchlistChange);
  }, []);

  useEffect(() => {
    fetch('/api/intelligence/discovery/rankings')
      .then(res => res.json())
      .then(data => {
        if (!data || data.error) throw new Error(data?.error || 'No data');
        const mapToCompanies = (list: any[]) => list.map(item => ({
          symbol: item.symbol,
          name: StockRegistry.getStock(item.symbol)?.name || item.symbol,
          score: Math.round(item.score || 0),
          price: 'Unavailable',
          change: 'Unavailable',
          isPositive: true,
          oneLiner: 'Discovered via quantitative factor analysis.'
        }));
        setCategories([
          { title: 'High Quality', icon: <Trophy className="w-5 h-5 text-yellow-400" />, companies: mapToCompanies(data.highestQuality || []) },
          { title: 'High Growth', icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />, companies: mapToCompanies(data.highestGrowth || []) },
          { title: 'Momentum', icon: <Flame className="w-5 h-5 text-amber-400 animate-pulse" />, companies: mapToCompanies(data.highestMomentum || []) },
          { title: 'Turnarounds / Improving', icon: <PlusCircle className="w-5 h-5 text-sky-400" />, companies: mapToCompanies(data.topImproving || []) }
        ].filter(c => c.companies.length > 0));
        setLoading(false);
      })
      .catch(() => {
        setCategories([]);
        setLoading(false);
      });
  }, []);

  const handleCompanyClick = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", symbol);
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

  const filteredCategories = categories.map(category => {
    const filtered = category.companies.filter(c => 
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...category, companies: filtered.slice(0, 10) };
  }).filter(category => category.companies.length > 0);

  return (
    <div className="w-full flex flex-col space-y-8 select-none pb-12 bg-[#020304] text-white min-h-screen font-sans max-w-7xl mx-auto antialiased">
      (* Page Header *)
      <PageHeader
        title="Discovery Hub"
        subtitle="What should I research?"
        primaryAction={
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Filter by ticker or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>
        }
      />

      (* Horizontal Netflix Reels *)
      <div className="space-y-8">
        {loading ? <div className="text-white/50 text-sm pl-4">Loading discovery feeds...</div> : filteredCategories.length === 0 ? <div className="text-white/50 text-sm pl-4">Discovery feeds currently unavailable.</div> :
        filteredCategories.map((category) => (
          <div key={category.title} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              {category.icon}
              <h2 className="text-lg font-bold text-white tracking-tight">{category.title}</h2>
            </div>

            (* Horizontal Scroll Rail *)
            <div className="relative w-full">
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent snap-x">
                {category.companies.map((c) => {
                  const info = StockRegistry.getStock(c.symbol);
                  return (
                    <div key={c.symbol} className="flex-shrink-0 w-[280px] snap-start">
                      <CompanyCard
                        ticker={c.symbol}
                        name={c.name}
                        sector={info?.sector || "Unavailable"}
                        marketCap={info?.marketCap?.formatted || "Unavailable"}
                        score={c.score}
                        whyItMatters={c.oneLiner}
                        isWatched={isWatched(c.symbol)}
                        onOpenBriefing={() => handleCompanyClick(c.symbol)}
                        onToggleWatchlist={() => handleToggleWatchlist(c.symbol)}
                      />
                    </div>
                  );
                }) }
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscoveryPage;
