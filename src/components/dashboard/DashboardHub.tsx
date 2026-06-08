/**
 * TRACK-95L — Dashboard Command Centre Reconstruction
 * Bloomberg/Liquid-style institutional workspace.
 * 3-column layout: Watchlist | Signals | Portfolio Snapshot.
 * Dense, actionable, no decorative sections.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, Bell, TrendingUp, TrendingDown, Activity, Layers, Plus, Star, Eye, AlertTriangle } from 'lucide-react';
import { StockRegistry } from '../../services/stocks/StockRegistry';
import { WatchlistEngine } from '../../services/portfolio/WatchlistEngine';
import { PortfolioEngine } from '../../services/portfolio/PortfolioEngine';
import { RecentSearchStore } from '../../services/search/RecentSearchStore';
import { attentionEngine, AttentionItem } from '../../intelligence/AttentionEngine';

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

/** Compact dashboard row — no giant cards, no large padding */
const Row: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <button onClick={onClick} className={`flex w-full items-center gap-3 p-2 text-left text-xs
    border-b border-white/[0.04] last:border-0 bg-transparent cursor-pointer
    hover:bg-[#1F242B] transition-colors ${className || ''}`}>
    {children}
  </button>
);

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [signals, setSignals] = useState<any[]>([]);

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const h = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener('watchlistchange', h);
    return () => window.removeEventListener('watchlistchange', h);
  }, []);

  useEffect(() => {
    fetch('/api/intelligence/discovery/rankings')
      .then(r => r.json())
      .then(data => {
        const merged = [
          ...(data?.topImproving || []).map((i: any) => ({ ...i, kind: 'improving' })),
          ...(data?.highestMomentum || []).map((i: any) => ({ ...i, kind: 'momentum' })),
          ...(data?.highestQuality || []).map((i: any) => ({ ...i, kind: 'quality' })),
        ];
        setSignals(merged.slice(0, 10));
      })
      .catch(() => setSignals([]));
  }, []);

  const followedTickers = useMemo(() => {
    const u = new Set<string>();
    watchlists.forEach(w => w.tickers.forEach(t => u.add(t)));
    return [...u].slice(0, 8);
  }, [watchlists]);

  const recentTickers = useMemo(() => recentResearch.slice(0, 4), [recentResearch]);
  const holdings = useMemo(() => PortfolioEngine.getHoldings(), []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 font-sans text-white antialiased">
      {/* Top bar: compact title + quick actions */}
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-[#2962FF]" />
          <h1 className="text-sm font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('discovery')} className="flex items-center gap-1.5 rounded border border-white/[0.08] px-3 py-1 text-[10px] font-semibold text-[#8B949E] bg-transparent cursor-pointer hover:border-white/[0.15] hover:text-white transition-colors">
            <Plus className="h-3 w-3" /> Discover
          </button>
          <button onClick={() => navigate('watchlist')} className="flex items-center gap-1.5 rounded border border-white/[0.08] px-3 py-1 text-[10px] font-semibold text-[#8B949E] bg-transparent cursor-pointer hover:border-white/[0.15] hover:text-white transition-colors">
            <Star className="h-3 w-3" /> Watchlists
          </button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* COL A: Watchlist Intelligence */}
        <section className="rounded-lg border border-white/[0.06] bg-[#0D1117] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-[#2962FF]" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Watchlist</h2>
            </div>
            <span className="text-[10px] text-[#484F58] font-mono">{followedTickers.length}</span>
          </div>
          {followedTickers.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[#484F58]">
              <p>No stocks in your watchlist.</p>
              <button onClick={() => navigate('discovery')} className="mt-1 text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
                Add your first stock
              </button>
            </div>
          ) : (
            followedTickers.map(ticker => {
              const info = StockRegistry.getStock(ticker);
              const score = info?.telemetrySnapshot?.healthScore ?? null;
              return (
                <Row key={ticker} onClick={() => openCompany(ticker)}>
                  <span className="font-mono font-semibold text-xs min-w-[60px]">{ticker}</span>
                  <span className="flex-1 text-[10px] text-[#8B949E] truncate">{info?.companyName || ''}</span>
                  {score !== null && (
                    <span className={`font-mono text-[10px] font-semibold ${score >= 70 ? 'text-[#22AB94]' : score >= 40 ? 'text-[#EF9A09]' : 'text-[#F23645]'}`}>
                      {score}
                    </span>
                  )}
                  <span className="text-[10px] text-[#484F58]">→</span>
                </Row>
              );
            })
          )}
        </section>

        {/* COL B: Market Signals + Today's Priorities */}
        <section className="rounded-lg border border-white/[0.06] bg-[#0D1117] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#22AB94]" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Signals</h2>
            </div>
            <span className="text-[10px] text-[#484F58] font-mono">{signals.length}</span>
          </div>
          {signals.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[#484F58]">
              <p>No signals detected today.</p>
              <p className="mt-1 text-[10px]">Signals update after the daily pipeline run.</p>
            </div>
          ) : (
            signals.slice(0, 8).map((s: any) => (
              <Row key={s.symbol} onClick={() => openCompany(s.symbol)}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  s.kind === 'improving' ? 'bg-[#22AB94]' : s.kind === 'momentum' ? 'bg-[#EF9A09]' : 'bg-[#2962FF]'
                }`} />
                <span className="font-mono font-semibold text-xs min-w-[60px]">{s.symbol}</span>
                <span className="text-[10px] text-[#484F58] uppercase">{s.kind}</span>
                <span className="flex-1 text-[10px] text-[#8B949E] truncate">{s.companyName || ''}</span>
                <span className="text-[10px] text-[#484F58]">→</span>
              </Row>
            ))
          )}
          {signals.length > 0 && (
            <div className="border-t border-white/[0.06] px-3 py-2">
              <button onClick={() => navigate('discovery')} className="flex items-center gap-1 text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
                View all signals <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </section>

        {/* COL C: Portfolio Snapshot + Quick Access */}
        <section className="rounded-lg border border-white/[0.06] bg-[#0D1117] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-[#22AB94]" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Portfolio</h2>
            </div>
          </div>

          {/* Holdings summary */}
          {holdings.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-[#484F58] border-b border-white/[0.04]">
              <p>No holdings tracked.</p>
              <button onClick={() => navigate('portfolio')} className="mt-1 text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
                Add your first holding
              </button>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-[10px] text-[#484F58] uppercase font-semibold tracking-wider">
                {holdings.length} position{holdings.length !== 1 ? 's' : ''}
              </div>
              {holdings.slice(0, 5).map(h => (
                <Row key={h.symbol} onClick={() => openCompany(h.symbol)}>
                  <span className="font-mono font-semibold text-xs min-w-[60px]">{h.symbol}</span>
                  <span className="text-[10px] text-[#8B949E]">{h.shares} @ {h.avgBuyPrice}</span>
                  <span className="text-[10px] text-[#484F58]">→</span>
                </Row>
              ))}
            </>
          )}

          {/* Recent research */}
          <div className="border-t border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-3 w-3 text-[#484F58]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#484F58]">Recent</span>
            </div>
            {recentTickers.length === 0 ? (
              <p className="text-[10px] text-[#484F58]">No recently viewed companies.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {recentTickers.map(t => (
                  <button key={t} onClick={() => openCompany(t)}
                    className="rounded border border-white/[0.06] bg-[#11161C] px-2 py-0.5 font-mono text-[10px] text-[#8B949E] bg-transparent cursor-pointer hover:text-white hover:border-white/[0.12] transition-colors">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alerts count */}
          <div className="border-t border-white/[0.06] px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3 text-[#EF9A09]" />
              <span className="text-[10px] text-[#8B949E]">Alerts</span>
            </div>
            <button onClick={() => navigate('alerts')} className="text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
              View →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardHub;
