import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Activity, ListFilter, Star, Eye, AlertTriangle } from 'lucide-react';
import { StockRegistry } from '../../services/stocks/StockRegistry';
import { WatchlistEngine } from '../../services/portfolio/WatchlistEngine';
import { PortfolioEngine } from '../../services/portfolio/PortfolioEngine';
import { RecentSearchStore } from '../../services/search/RecentSearchStore';
import { api, ApiError, type Signal as ApiSignal } from '../../services/api/client';
import Card from '../ui/Card';

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

const SEVERITY_DOT = {
  critical: 'bg-rose-500',
  important: 'bg-amber-500',
  monitor: 'bg-slate-400',
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 font-sans text-slate-900 antialiased">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Activity className="h-4 w-4 text-emerald-700" />
          <h1 className="text-sm font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('search')} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors">
            <ListFilter className="h-3 w-3" /> Search
          </button>
          <button onClick={() => navigate('watchlist')} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors">
            <Star className="h-3 w-3" /> Watchlists
          </button>
        </div>
      </div>

      {/* Status bar */}
      {healthData && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${healthData.dbConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {healthData.symbolsCovered} companies covered
          </span>
        </div>
      )}

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* COL A: Watchlist */}
        <section className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-emerald-700" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Watchlist</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{followedTickers.length}</span>
          </div>
          {followedTickers.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              <p>No companies saved yet.</p>
              <button onClick={() => navigate('search')} className="mt-1 text-[10px] text-emerald-700 hover:underline bg-transparent border-none cursor-pointer">
                Search companies
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
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left text-xs last:border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="font-mono font-semibold text-xs min-w-[60px] text-slate-900">{ticker}</span>
                  <span className="flex-1 text-[10px] text-slate-500 truncate">{info?.companyName || ''}</span>
                  {score !== null && (
                    <span className={`font-mono text-[10px] font-semibold ${score >= 70 ? 'text-emerald-700' : score >= 40 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {score}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">→</span>
                </button>
              );
            })
          )}
        </section>

        {/* COL B: Real Prediction Signals */}
        <section className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Signals</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {signalsLoading ? 'Loading' : signalsError ? 'Unavailable' : `${signals.length}/${symbolsAnalyzed}`}
            </span>
          </div>

          {signalsLoading ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              <p>Loading source-backed signal changes...</p>
            </div>
          ) : signalsError ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              <AlertTriangle className="h-4 w-4 text-amber-700 mx-auto mb-1" />
              <p>Signal changes are not available right now.</p>
              <p className="mt-1 text-[10px]">The dashboard will update when the prediction registry is reachable.</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              <p>No significant source-backed changes detected.</p>
              <p className="mt-1 text-[10px]">
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
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left text-xs last:border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[s.severity]}`} />
                <span className="font-mono font-semibold text-xs min-w-[60px] text-slate-900">{s.symbol}</span>
                <span className="text-[10px] text-slate-400 uppercase">{TYPE_LABEL[s.type] ?? s.type}</span>
                <span className="flex-1 text-[10px] text-slate-500 truncate">{s.explanation}</span>
                <span className="text-[10px] text-slate-400">→</span>
              </button>
            ))
          )}

          {signals.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <button onClick={() => navigate('rankings')} className="flex items-center gap-1 text-[10px] text-emerald-700 hover:underline bg-transparent border-none cursor-pointer">
                View rankings <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </section>

        {/* COL C: Saved research + quick access */}
        <section className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-emerald-700" />
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Saved research</h2>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="px-4 py-4 text-center text-xs text-slate-500 border-b border-slate-100">
              <p>No saved research items yet.</p>
              <button onClick={() => navigate('watchlist')} className="mt-1 text-[10px] text-emerald-700 hover:underline bg-transparent border-none cursor-pointer">
                Open watchlist
              </button>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                {holdings.length} position{holdings.length !== 1 ? 's' : ''}
              </div>
              {holdings.slice(0, 5).map(h => (
                <button
                  key={h.symbol}
                  onClick={() => openCompany(h.symbol)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left text-xs last:border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="font-mono font-semibold text-xs min-w-[60px] text-slate-900">{h.symbol}</span>
                  <span className="text-[10px] text-slate-500">{h.shares} @ {h.avgBuyPrice}</span>
                  <span className="text-[10px] text-slate-400">→</span>
                </button>
              ))}
            </>
          )}

          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recent</span>
            </div>
            {recentTickers.length === 0 ? (
              <p className="text-[10px] text-slate-500">No recently viewed companies.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {recentTickers.map(t => (
                  <button
                    key={t}
                    onClick={() => openCompany(t)}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListFilter className="h-3 w-3 text-slate-400" />
              <span className="text-[10px] text-slate-500">Methodology</span>
            </div>
            <button onClick={() => navigate('methodology')} className="text-[10px] text-emerald-700 hover:underline bg-transparent border-none cursor-pointer">
              View →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardHub;
