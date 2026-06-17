import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Activity, Star, Eye, AlertTriangle, Search } from 'lucide-react';
import { StockRegistry } from '../../services/stocks/StockRegistry';
import { WatchlistEngine } from '../../services/portfolio/WatchlistEngine';
import { PortfolioEngine } from '../../services/portfolio/PortfolioEngine';
import { RecentSearchStore } from '../../services/search/RecentSearchStore';
import { api, ApiError, type Signal as ApiSignal } from '../../services/api/client';
import { navigateToStock } from '../../architecture/navigation/routeCoordinator';
import Card from '../ui/Card';

function navigate(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set('page', pageKey);
  window.history.pushState({}, '', `?${params.toString()}`);
  window.dispatchEvent(new Event('urlchange'));
}

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  navigateToStock({ ticker: symbol, mode: "push" });
}

interface SignalItem {
  symbol: string;
  type: string;
  severity: 'critical' | 'important' | 'monitor';
  explanation: string;
  delta: number | string;
}

const SEVERITY_DOT = {
  critical: 'bg-rose-500',
  important: 'bg-amber-500',
  monitor: 'bg-slate-400',
} as const;

const TYPE_LABEL: Record<string, string> = {
  classification_upgrade: 'Upgrade',
  classification_downgrade: 'Downgrade',
  confidence_increase: 'Confidence increased',
  confidence_decrease: 'Confidence decreased',
  factor_change: 'Factor change',
  ranking_change: 'Ranking change',
};

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState(false);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState(0);
  const [healthData, setHealthData] = useState<{
    symbolsCovered: number;
    dbConnected: boolean;
  } | null>(null);

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const h = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener('watchlistchange', h);
    return () => window.removeEventListener('watchlistchange', h);
  }, []);

  useEffect(() => {
    setSignalsLoading(true);
    setSignalsError(false);
    api.getSignals(20)
      .then(data => {
        if (!data.signals) {
          setSignals([]);
          return;
        }
        const items: SignalItem[] = data.signals.map((s: ApiSignal) => ({
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

  useEffect(() => {
    const ctrl = new AbortController();
    api.getOpsHealth()
      .then(res => {
        if (ctrl.signal.aborted) return;
        setHealthData({
          symbolsCovered: res.metrics.symbols_covered,
          dbConnected: res.metrics.db_health === 'connected',
        });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const followedTickers = useMemo(() => {
    const u = new Set<string>();
    watchlists.forEach(w => w.tickers.forEach(t => u.add(t)));
    return [...u].slice(0, 8);
  }, [watchlists]);

  const recentTickers = useMemo(() => recentResearch.slice(0, 4), [recentResearch]);
  const holdings = useMemo(() => PortfolioEngine.getHoldings(), []);

  return (
    <div className="mx-auto w-full max-w-7xl px-0 font-sans text-slate-900 antialiased">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-accent-primary" />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Research workspace</h1>
            <p className="text-sm text-slate-500">Review signals, saved companies, and recent activity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('search')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-sm">
            <Search className="h-3.5 w-3.5" /> Search
          </button>
          <button onClick={() => navigate('watchlist')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-sm">
            <Star className="h-3.5 w-3.5" /> Watchlists
          </button>
        </div>
      </div>

      {/* Status bar */}
      {healthData && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200/60 bg-white px-5 py-3 text-xs text-slate-500 shadow-sm">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${healthData.dbConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {healthData.symbolsCovered} companies in coverage universe
          </span>
        </div>
      )}

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* COL A: Watchlist */}
        <section className="rounded-xl border border-slate-200/60 bg-white overflow-hidden shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-accent-primary" />
              <h2 className="text-xs font-semibold text-slate-700">Watchlist</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">{followedTickers.length}</span>
          </div>
          {followedTickers.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500">No companies saved yet.</p>
              <button onClick={() => navigate('search')} className="mt-2 text-xs text-accent-primary hover:underline bg-transparent border-none cursor-pointer font-medium">
                Search companies to follow
              </button>
            </div>
          ) : (
            followedTickers.map(ticker => {
              const info = StockRegistry.getStock(ticker);
              const score = info?.telemetrySnapshot?.healthScore ?? null;
              return (
                <button
                  key={ticker}
                  onClick={() => openCompany(ticker)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3 text-left text-sm last:border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="font-mono font-semibold text-sm min-w-[64px] text-slate-900">{ticker}</span>
                  <span className="flex-1 text-xs text-slate-500 truncate">{info?.companyName || ''}</span>
                  {score !== null && (
                    <span className={`font-mono text-xs font-semibold tabular-nums ${score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {score}
                    </span>
                  )}
                  <span className="text-xs text-slate-300">→</span>
                </button>
              );
            })
          )}
        </section>

        {/* COL B: Signals */}
        <section className="rounded-xl border border-slate-200/60 bg-white overflow-hidden shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-4 w-4 text-accent-primary" />
              <h2 className="text-xs font-semibold text-slate-700">Latest signals</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {signalsLoading ? 'Loading' : signalsError ? 'Unavailable' : `${signals.length}/${symbolsAnalyzed}`}
            </span>
          </div>

          {signalsLoading ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              <p>Loading source-backed signal changes...</p>
            </div>
          ) : signalsError ? (
            <div className="px-5 py-8 text-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Signal changes not available right now.</p>
              <p className="text-xs text-slate-400 mt-1">The dashboard will update when prediction data is reachable.</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500">No significant signal changes detected.</p>
              <p className="text-xs text-slate-400 mt-1">
                {symbolsAnalyzed > 0
                  ? `${symbolsAnalyzed} symbols analyzed — markets are stable.`
                  : 'Signals update after the daily pipeline run.'}
              </p>
            </div>
          ) : (
            signals.map((s, i) => (
              <button
                key={`${s.symbol}:${s.type}:${i}`}
                onClick={() => openCompany(s.symbol)}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3 text-left text-sm last:border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[s.severity]}`} />
                <span className="font-mono font-semibold text-sm min-w-[64px] text-slate-900">{s.symbol}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">{TYPE_LABEL[s.type] ?? s.type}</span>
                <span className="flex-1 text-xs text-slate-500 truncate">{s.explanation}</span>
                <span className="text-xs text-slate-300">→</span>
              </button>
            ))
          )}

          {signals.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-2.5">
              <button onClick={() => navigate('rankings')} className="flex items-center gap-1 text-xs text-accent-primary hover:underline bg-transparent border-none cursor-pointer font-medium">
                View all rankings <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </section>

        {/* COL C: Saved research */}
        <section className="rounded-xl border border-slate-200/60 bg-white overflow-hidden shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Star className="h-4 w-4 text-accent-primary" />
              <h2 className="text-xs font-semibold text-slate-700">Saved research</h2>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-slate-500">No saved research items yet.</p>
              <button onClick={() => navigate('watchlist')} className="mt-2 text-xs text-accent-primary hover:underline bg-transparent border-none cursor-pointer font-medium">
                Open watchlist
              </button>
            </div>
          ) : (
            <>
              <div className="px-5 py-2 text-xs text-slate-400 uppercase font-semibold tracking-wider border-b border-slate-100">
                {holdings.length} position{holdings.length !== 1 ? 's' : ''}
              </div>
              {holdings.slice(0, 5).map(h => (
                <button
                  key={h.symbol}
                  onClick={() => openCompany(h.symbol)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3 text-left text-sm last:border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="font-mono font-semibold text-sm min-w-[64px] text-slate-900">{h.symbol}</span>
                  <span className="text-xs text-slate-500">{h.shares} @ {h.avgBuyPrice}</span>
                  <span className="text-xs text-slate-300">→</span>
                </button>
              ))}
            </>
          )}

          <div className="border-t border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Recently viewed</span>
            </div>
            {recentTickers.length === 0 ? (
              <p className="text-xs text-slate-400">No recently viewed companies.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentTickers.map(t => (
                  <button
                    key={t}
                    onClick={() => openCompany(t)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">Research methodology</span>
            <button onClick={() => navigate('methodology')} className="text-xs text-accent-primary hover:underline bg-transparent border-none cursor-pointer font-medium">
              View →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardHub;
