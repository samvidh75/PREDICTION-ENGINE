/**
 * TRACK-95O — Dashboard
 * Practical research workspace.
 * 3-column layout: Watchlist | Signals (real prediction diffs) | Saved research.
 * 
 * Signals are now powered by GET /api/predictions/signals — real
 * prediction_registry snapshot diffs, not synthetic rankings.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Activity, ListFilter, Star, Eye, AlertTriangle } from 'lucide-react';
import { StockRegistry } from '../../services/stocks/StockRegistry';
import { WatchlistEngine } from '../../services/portfolio/WatchlistEngine';
import { PortfolioEngine } from '../../services/portfolio/PortfolioEngine';
import { RecentSearchStore } from '../../services/search/RecentSearchStore';

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

interface SignalItem {
  symbol: string;
  type: string;
  severity: 'critical' | 'important' | 'monitor';
  explanation: string;
  delta: number | string;
}

const Row: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <button onClick={onClick} className={`flex w-full items-center gap-3 p-2 text-left text-xs
    border-b border-white/[0.04] last:border-0 bg-transparent cursor-pointer
    hover:bg-[#1F242B] transition-colors ${className || ''}`}>
    {children}
  </button>
);

const SEVERITY_DOT = {
  critical: 'bg-[#F23645]',
  important: 'bg-[#EF9A09]',
  monitor: 'bg-[#484F58]',
} as const;

const TYPE_LABEL: Record<string, string> = {
  classification_upgrade: 'Upgrade',
  classification_downgrade: 'Downgrade',
  confidence_increase: 'Conf ↑',
  confidence_decrease: 'Conf ↓',
  factor_change: 'Factor',
  ranking_change: 'Ranking',
};

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState(false);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState(0);

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const h = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener('watchlistchange', h);
    return () => window.removeEventListener('watchlistchange', h);
  }, []);

  useEffect(() => {
    setSignalsLoading(true);
    setSignalsError(false);
    fetch('/api/predictions/signals?limit=20')
      .then(r => {
        if (!r.ok) throw new Error('unavailable');
        return r.json();
      })
      .then(data => {
        const items: SignalItem[] = (data.signals ?? []).map((s: any) => ({
          symbol: s.symbol,
          type: s.type,
          severity: s.severity,
          explanation: s.explanation ?? '',
          delta: s.delta ?? '',
        }));
        setSignals(items);
        setSymbolsAnalyzed(data.symbolsAnalyzed ?? 0);
      })
      .catch(() => {
        setSignalsError(true);
        setSignals([]);
      })
      .finally(() => setSignalsLoading(false));
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
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-[#2962FF]" />
          <h1 className="text-sm font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('search')} className="flex items-center gap-1.5 rounded border border-white/[0.08] px-3 py-1 text-[10px] font-semibold text-[#8B949E] bg-transparent cursor-pointer hover:border-white/[0.15] hover:text-white transition-colors">
            <ListFilter className="h-3 w-3" /> Search
          </button>
          <button onClick={() => navigate('watchlist')} className="flex items-center gap-1.5 rounded border border-white/[0.08] px-3 py-1 text-[10px] font-semibold text-[#8B949E] bg-transparent cursor-pointer hover:border-white/[0.15] hover:text-white transition-colors">
            <Star className="h-3 w-3" /> Watchlists
          </button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* COL A: Watchlist */}
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
              <p>No companies saved yet.</p>
              <button onClick={() => navigate('search')} className="mt-1 text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
                Search companies
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

        {/* COL B: Real Prediction Signals (TRACK-95O) */}
        <section className="rounded-lg border border-white/[0.06] bg-[#0D1117] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[#22AB94]" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Signals</h2>
            </div>
            <span className="text-[10px] text-[#484F58] font-mono">
              {signalsLoading ? 'Loading' : signalsError ? 'Unavailable' : `${signals.length}/${symbolsAnalyzed}`}
            </span>
          </div>

          {signalsLoading ? (
            <div className="px-3 py-4 text-center text-xs text-[#484F58]">
              <p>Loading source-backed signal changes...</p>
            </div>
          ) : signalsError ? (
            <div className="px-3 py-4 text-center text-xs text-[#484F58]">
              <AlertTriangle className="h-4 w-4 text-[#EF9A09] mx-auto mb-1" />
              <p>Signal changes are not available right now.</p>
              <p className="mt-1 text-[10px]">The dashboard will update when the prediction registry is reachable.</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[#484F58]">
              <p>No significant source-backed changes detected.</p>
              <p className="mt-1 text-[10px]">
                {symbolsAnalyzed > 0
                  ? `${symbolsAnalyzed} symbols analyzed — markets are stable.`
                  : 'Signals update after the daily pipeline run.'}
              </p>
            </div>
          ) : (
            signals.map((s, i) => (
              <Row key={`${s.symbol}:${s.type}:${i}`} onClick={() => openCompany(s.symbol)}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[s.severity]}`} />
                <span className="font-mono font-semibold text-xs min-w-[60px]">{s.symbol}</span>
                <span className="text-[10px] text-[#484F58] uppercase">{TYPE_LABEL[s.type] ?? s.type}</span>
                <span className="flex-1 text-[10px] text-[#8B949E] truncate">{s.explanation}</span>
                <span className="text-[10px] text-[#484F58]">→</span>
              </Row>
            ))
          )}

          {signals.length > 0 && (
            <div className="border-t border-white/[0.06] px-3 py-2">
              <button onClick={() => navigate('rankings')} className="flex items-center gap-1 text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
                View rankings <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </section>

        {/* COL C: Saved research + quick access */}
        <section className="rounded-lg border border-white/[0.06] bg-[#0D1117] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-[#22AB94]" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">Saved research</h2>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-[#484F58] border-b border-white/[0.04]">
              <p>No saved research items yet.</p>
              <button onClick={() => navigate('watchlist')} className="mt-1 text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
                Open watchlist
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

          <div className="border-t border-white/[0.06] px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListFilter className="h-3 w-3 text-[#8B949E]" />
              <span className="text-[10px] text-[#8B949E]">Methodology</span>
            </div>
            <button onClick={() => navigate('methodology')} className="text-[10px] text-[#2962FF] bg-transparent border-none cursor-pointer hover:underline">
              View →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardHub;
