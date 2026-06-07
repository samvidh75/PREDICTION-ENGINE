import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, BarChart3, Flame, Layers, RefreshCw, Trophy } from 'lucide-react';
import { StockRegistry } from '../../services/stocks/StockRegistry';
import { WatchlistEngine } from '../../services/portfolio/WatchlistEngine';
import { RecentSearchStore } from '../../services/search/RecentSearchStore';
import { PageHeader, Button } from '../ui/DesignSystem';

function isProductionStock(symbol: string): boolean {
  const stock = StockRegistry.getStock(symbol);
  if (!stock) return false;
  if (/^\d{5,6}$/.test(stock.symbol)) return false;
  if (!stock.companyName || stock.companyName.toUpperCase() === stock.symbol.toUpperCase()) return false;
  if (stock.companyName.includes('BSE Listed Security Code')) return false;
  if (!stock.sector || stock.sector === 'Data unavailable') return false;
  if (!stock.marketCap?.numeric || stock.marketCap.numeric <= 0) return false;
  return true;
}

function navigate(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set('page', pageKey);
  window.history.pushState({}, '', `?${params.toString()}`);
  window.dispatchEvent(new Event('urlchange'));
}

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  const params = new URLSearchParams(window.location.search);
  params.set('page', 'stock');
  params.set('id', symbol);
  window.history.pushState({}, '', `?${params.toString()}`);
  window.dispatchEvent(new Event('urlchange'));
}

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [researchSignals, setResearchSignals] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>(null);

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const handleWatchlistChange = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener('watchlistchange', handleWatchlistChange);
    return () => window.removeEventListener('watchlistchange', handleWatchlistChange);
  }, []);

  useEffect(() => {
    fetch('/api/intelligence/discovery/rankings')
      .then((res) => res.json())
      .then((data) => {
        const merged = [
          ...((data?.topImproving || []).map((item: any) => ({ ...item, category: 'Improving' }))),
          ...((data?.highestQuality || []).map((item: any) => ({ ...item, category: 'Quality' }))),
          ...((data?.highestMomentum || []).map((item: any) => ({ ...item, category: 'Momentum' }))),
        ];

        const validated = merged
          .filter((item: any) => isProductionStock(item.symbol))
          .map((item: any) => {
            const stock = StockRegistry.getStock(item.symbol);
            return {
              ...item,
              companyName: stock?.companyName,
              sector: stock?.sector,
              marketCap: stock?.marketCap.formatted,
            };
          })
          .slice(0, 5);

        setResearchSignals(validated);
      })
      .catch(() => setResearchSignals([]));

    fetch('/api/intelligence/market')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMarketData(data))
      .catch(() => setMarketData(null));
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((watchlist) => watchlist.tickers.forEach((ticker) => unique.add(ticker)));
    return Array.from(unique).filter(isProductionStock).slice(0, 5);
  }, [watchlists]);

  const recentTickers = useMemo(() => {
    return recentResearch.filter(isProductionStock).slice(0, 5);
  }, [recentResearch]);

  const handleCompanyClick = (symbol: string) => {
    openCompany(symbol);
    setRecentResearch(RecentSearchStore.getRecent());
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-12 font-sans text-white antialiased">
      <PageHeader
        title="Market Dashboard"
        subtitle="Verified company signals, watchlist movement, and current research context."
        primaryAction={
          <Button variant="primary" onClick={() => navigate('discovery')}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Discovery
          </Button>
        }
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/50">Research Signals</h2>
        </div>
        {researchSignals.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-white/40">
            No verified research signals are available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {researchSignals.map((signal: any) => (
              <button
                key={signal.symbol}
                onClick={() => handleCompanyClick(signal.symbol)}
                className="group cursor-pointer rounded-lg border border-white/5 bg-white/[0.02] p-5 text-left transition-colors duration-150 hover:bg-white/[0.04]"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="font-mono text-sm font-bold text-white">{signal.symbol}</span>
                  <span className="rounded border border-amber-400/15 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">
                    {signal.category}
                  </span>
                </div>
                <p className="mb-2 text-xs leading-relaxed text-white/65">{signal.companyName}</p>
                <p className="mb-3 text-[11px] leading-relaxed text-white/40">
                  {signal.sector} | {signal.marketCap}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#7da0ff] group-hover:text-[#f0f3fa]">
                  <span>Open company page</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/50">Watchlist Updates</h2>
          </div>
          <button onClick={() => navigate('watchlist')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[11px] text-[#7da0ff] hover:text-[#f0f3fa]">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {followedTickers.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-white/40">
            Your watchlist is empty. <button onClick={() => navigate('discovery')} className="cursor-pointer border-none bg-transparent text-[#7da0ff] hover:underline">Open discovery</button>.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]">
            {followedTickers.map((ticker) => {
              const info = StockRegistry.getStock(ticker);
              return (
                <button
                  key={ticker}
                  onClick={() => handleCompanyClick(ticker)}
                  className="flex w-full cursor-pointer items-center justify-between border-b border-white/5 bg-transparent p-4 text-left transition-colors last:border-0 hover:bg-white/[0.03]"
                >
                  <div>
                    <span className="font-mono text-sm font-bold text-white">{ticker}</span>
                    <span className="ml-3 text-xs text-white/50">{info?.companyName || 'Data unavailable'}</span>
                  </div>
                  <span className="text-[11px] text-[#7da0ff]">Open</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[#2962ff]" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/50">Recent Research</h2>
        </div>
        {recentTickers.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-white/40">
            No recently viewed companies.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {recentTickers.map((ticker) => {
              const info = StockRegistry.getStock(ticker);
              return (
                <button
                  key={ticker}
                  onClick={() => handleCompanyClick(ticker)}
                  className="cursor-pointer rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-white/[0.05]"
                >
                  {ticker} <span className="ml-2 text-xs text-white/40">{info?.sector || 'Data unavailable'}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {marketData && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#2962ff]" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/50">Market Snapshot</h2>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
            <p className="text-sm leading-relaxed text-white/70">
              {marketData?.marketState || marketData?.regime || 'Market data currently unavailable.'}
            </p>
            {marketData?.sectorExposure && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(marketData.sectorExposure).slice(0, 4).map(([sector, val]: [string, any]) => (
                  <span key={sector} className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60">
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
