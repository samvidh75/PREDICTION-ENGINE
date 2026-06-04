import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, Flame, Trophy, RefreshCw, Layers } from 'lucide-react';
import { StockRegistry } from '../../services/stocks/StockRegistry';
import { WatchlistEngine } from '../../services/portfolio/WatchlistEngine';
import { RecentSearchStore } from '../../services/search/RecentSearchStore';
import { PageHeader, Button } from '../ui/DesignSystem';

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>(null);

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const handleWatchlistChange = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handleWatchlistChange);
    return () => window.removeEventListener("watchlistchange", handleWatchlistChange);
  }, []);

  useEffect(() => {
    fetch('/api/intelligence/discovery/rankings')
      .then(res => res.json())
      .then(data => {
        const merged = [
          ...((data?.topImproving || []).map((item: any) => ({ ...item, category: 'Improving' }))),
          ...((data?.highestQuality || []).map((item: any) => ({ ...item, category: 'Quality' }))),
          ...((data?.highestMomentum || []).map((item: any) => ({ ...item, category: 'Momentum' }))),
        ].slice(0, 5);
        setOpportunities(merged.map((item: any) => {
          const stock = StockRegistry.getStock(item.symbol);
          return { ...item, companyName: stock?.companyName || item.symbol, sector: stock?.sector || '—' };
        }));
      })
      .catch(() => setOpportunities([]));

    fetch('/api/intelligence/market')
      .then(res => res.json())
      .then(data => setMarketData(data))
      .catch(() => setMarketData(null));
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const handleCompanyClick = (symbol: string) => {
    RecentSearchStore.addTicker(symbol);
    setRecentResearch(RecentSearchStore.getRecent());
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'stock');
    params.set('id', symbol);
    window.history.pushState({}, '', `?${params.toString()}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const handleNavigate = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', pageKey);
    window.history.pushState({}, '', `?${params.toString()}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach(w => w.tickers.forEach(t => unique.add(t)));
    return Array.from(unique).slice(0, 5);
  }, [watchlists]);

  return (
    <div className="w-full space-y-10 pb-12 text-white max-w-7xl mx-auto antialiased font-sans">
      {/* HERO */}
      <PageHeader
        title={`${greeting}`}
        subtitle="What deserves my attention?"
        primaryAction={
          <Button variant="primary" onClick={() => handleNavigate('discovery')}>
            Discover Ideas
          </Button>
        }
      />

      {/* 1. TODAY'S OPPORTUNITIES — max 5 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <h2 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Today's Opportunities</h2>
        </div>
        {opportunities.length === 0 ? (
          <div className="p-6 bg-white/[0.02] rounded-xl text-center text-sm text-white/30">
            No opportunity signals today. Check the Discovery page for active ideas.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((op: any) => (
              <button
                key={op.symbol}
                onClick={() => handleCompanyClick(op.symbol)}
                className="text-left p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono font-bold text-white text-sm">{op.symbol}</span>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded">
                    {op.category}
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed mb-2">{op.companyName}</p>
                <div className="flex items-center gap-2 text-[11px] text-[#7da0ff] group-hover:text-[#f0f3fa]">
                  <span>Open Briefing</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 2. WATCHLIST UPDATES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h2 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Watchlist Updates</h2>
          </div>
          <button onClick={() => handleNavigate('watchlist')} className="text-[11px] text-[#7da0ff] hover:text-[#f0f3fa] flex items-center gap-1 bg-transparent border-none cursor-pointer">
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {followedTickers.length === 0 ? (
          <div className="p-6 bg-white/[0.02] rounded-xl text-center text-sm text-white/30">
            Your watchlist is empty. <button onClick={() => handleNavigate('discovery')} className="text-[#7da0ff] hover:underline bg-transparent border-none cursor-pointer">Discover stocks</button>.
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            {followedTickers.map((ticker) => {
              const info = StockRegistry.getStock(ticker);
              return (
                <button
                  key={ticker}
                  onClick={() => handleCompanyClick(ticker)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.03] border-b border-white/5 last:border-0 transition-colors cursor-pointer bg-transparent"
                >
                  <div>
                    <span className="font-mono font-bold text-white text-sm">{ticker}</span>
                    <span className="text-xs text-white/50 ml-3">{info?.companyName || '—'}</span>
                  </div>
                  <span className="text-[11px] text-[#7da0ff]">Open</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. RECENT RESEARCH */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-violet-400" />
          <h2 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Recent Research</h2>
        </div>
        {recentResearch.length === 0 ? (
          <div className="p-6 bg-white/[0.02] rounded-xl text-center text-sm text-white/30">
            No recently viewed companies.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {recentResearch.slice(0, 5).map((ticker) => {
              const info = StockRegistry.getStock(ticker);
              return (
                <button
                  key={ticker}
                  onClick={() => handleCompanyClick(ticker)}
                  className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-sm font-mono text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  {ticker} <span className="text-white/40 text-xs ml-2">{info?.sector || '—'}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. MARKET SNAPSHOT */}
      {marketData && (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2962ff]" />
          <h2 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Market Snapshot</h2>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
          <p className="text-sm text-white/70 leading-relaxed">
            {marketData?.marketState || marketData?.regime || 'Market data currently unavailable.'}
          </p>
          {marketData?.sectorExposure && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(marketData.sectorExposure).slice(0, 4).map(([sector, val]: [string, any]) => (
                <span key={sector} className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded text-white/60">
                  {sector}: {typeof val === 'number' ? `${(val * 100).toFixed(0)}%` : val}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
      )}
    </div>
  );
};

export default DashboardHub;
