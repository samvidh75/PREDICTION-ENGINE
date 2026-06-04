import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, Flame, TrendingUp, PlusCircle } from 'lucide-react';
import { StockRegistry } from '../services/stocks/StockRegistry';
import { WatchlistEngine } from '../services/portfolio/WatchlistEngine';
import { PageHeader } from '../components/ui/DesignSystem';

interface DiscoverCompany {
  symbol: string;
  name: string;
  score: number;
}

export const DiscoveryPage: React.FC = () => {
  const [rails, setRails] = useState<{ title: string; icon: React.ReactNode; companies: DiscoverCompany[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());

  useEffect(() => {
    const handleChange = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener('watchlistchange', handleChange);
    return () => window.removeEventListener('watchlistchange', handleChange);
  }, []);

  useEffect(() => {
    fetch('/api/intelligence/discovery/rankings')
      .then(res => res.json())
      .then(data => {
        const mapList = (list: any[]) => (list || []).map((item: any) => ({
          symbol: item.symbol,
          name: StockRegistry.getStock(item.symbol)?.companyName || item.symbol,
          score: Math.round(item.score || 0),
        }));

        setRails([
          { title: 'High Quality', icon: <Trophy className="w-5 h-5 text-amber-400" />, companies: mapList(data.highestQuality) },
          { title: 'High Growth', icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />, companies: mapList(data.highestGrowth) },
          { title: 'Value', icon: <TrendingUp className="w-5 h-5 text-[#22ab94]" />, companies: mapList(data.highestRisk?.slice().reverse()) },
          { title: 'Momentum', icon: <Flame className="w-5 h-5 text-orange-400" />, companies: mapList(data.highestMomentum) },
          { title: 'Turnarounds', icon: <PlusCircle className="w-5 h-5 text-sky-400" />, companies: mapList(data.topImproving) },
        ].filter(r => r.companies.length > 0));
        setLoading(false);
      })
      .catch(() => {
        setRails([]);
        setLoading(false);
      });
  }, []);

  const handleCompanyClick = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'stock');
    params.set('id', symbol);
    window.history.pushState({}, '', `?${params.toString()}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const isWatched = (ticker: string) => watchlists.some(w => w.tickers.includes(ticker));

  const toggleWatchlist = (ticker: string) => {
    const defaultList = watchlists[0];
    if (!defaultList) return;
    if (isWatched(ticker)) WatchlistEngine.removeTicker(defaultList.id, ticker);
    else WatchlistEngine.addTicker(defaultList.id, ticker);
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  return (
    <div className="w-full flex flex-col space-y-10 pb-12 text-white min-h-screen font-sans max-w-7xl mx-auto antialiased">
      <PageHeader title="Discovery" subtitle="What should I research?" />

      {loading ? (
        <div className="text-white/40 text-sm py-8 text-center">Loading discovery feeds...</div>
      ) : rails.length === 0 ? (
        <div className="text-white/40 text-sm py-8 text-center">Discovery feeds currently unavailable.</div>
      ) : (
        <div className="space-y-10">
          {rails.map((rail) => (
            <section key={rail.title} className="space-y-4">
              <div className="flex items-center gap-2">
                {rail.icon}
                <h2 className="text-lg font-bold text-white">{rail.title}</h2>
                <span className="text-xs text-white/40 ml-2">{rail.companies.length}</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x">
                {rail.companies.slice(0, 10).map((c) => (
                  <div key={c.symbol} className="flex-shrink-0 w-[260px] snap-start">
                    <button
                      onClick={() => handleCompanyClick(c.symbol)}
                      className="w-full text-left p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono font-bold text-white">{c.symbol}</span>
                        <span className="text-[10px] font-mono text-[#7da0ff]">{c.score}</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed mb-3">{c.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#7da0ff] group-hover:text-[#f0f3fa]">Open</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWatchlist(c.symbol); }}
                          className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer ${
                            isWatched(c.symbol) ? 'text-amber-400 border-amber-400/20 bg-amber-400/10' : 'text-white/40 border-white/10 hover:text-white/70'
                          }`}
                        >
                          {isWatched(c.symbol) ? 'Watching' : 'Watch'}
                        </button>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoveryPage;
