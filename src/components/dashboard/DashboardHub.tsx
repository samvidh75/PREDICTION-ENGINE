import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Database, Eye, Search, ShieldCheck, Star, TrendingUp } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { PortfolioEngine } from "../../services/portfolio/PortfolioEngine";
import { WatchlistEngine } from "../../services/portfolio/WatchlistEngine";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { api, type Signal as ApiSignal } from "../../services/api/client";
import { AppScreen, DataSourcePill, DataUnavailableState, MetricCard, PremiumSkeleton, StatusChip, Surface, navigatePage } from "../premium/PremiumUI";

interface SignalItem {
  symbol: string;
  type: string;
  severity: "critical" | "important" | "monitor";
  explanation: string;
}

const typeLabel: Record<string, string> = {
  classification_upgrade: "Classification upgrade",
  classification_downgrade: "Classification downgrade",
  confidence_increase: "Confidence increased",
  confidence_decrease: "Confidence decreased",
  factor_change: "Factor change",
  ranking_change: "Ranking change",
};

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  navigateToStock({ ticker: symbol, mode: "push" });
}

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState(false);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState<number | null>(null);
  const [coverage, setCoverage] = useState<{ symbols: number | null; scored: number | null; latest: string | null }>({
    symbols: null,
    scored: null,
    latest: null,
  });

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const h = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", h);
    return () => window.removeEventListener("watchlistchange", h);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    api.getSignals(12)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setSignals((data.signals ?? []).map((s: ApiSignal) => ({
          symbol: s.symbol,
          type: s.type,
          severity: s.severity,
          explanation: s.explanation ?? "Source-backed research change",
        })));
        setSymbolsAnalyzed(data.symbolsAnalyzed ?? null);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setSignalsError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setSignalsLoading(false);
      });

    if (typeof api.getDataCoverage === "function") {
      api.getDataCoverage()
        .then((cov) => {
          if (ctrl.signal.aborted) return;
          setCoverage({
            symbols: cov.coverage?.symbols?.count ?? null,
            scored: cov.coverage?.predictionRegistry?.symbolCount ?? null,
            latest: cov.coverage?.predictionRegistry?.latestPredictionDate ?? cov.generatedAt ?? null,
          });
        })
        .catch(() => {});
    }
    return () => ctrl.abort();
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((w) => w.tickers.forEach((ticker) => unique.add(ticker)));
    return [...unique].slice(0, 8);
  }, [watchlists]);
  const holdings = useMemo(() => PortfolioEngine.getHoldings(), []);
  const recentTickers = recentResearch.slice(0, 6);

  return (
    <AppScreen>
      {/* Compact research workspace header with integrated search */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-950">Research workspace</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Database className="h-3 w-3" aria-hidden="true" />
              {coverage.symbols !== null ? `${coverage.symbols.toLocaleString("en-IN")} companies` : "— companies"}
            </span>
            {coverage.scored !== null && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                {coverage.scored.toLocaleString("en-IN")} scored
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Activity className="h-3 w-3" aria-hidden="true" />
              {symbolsAnalyzed !== null ? `${symbolsAnalyzed.toLocaleString("en-IN")} analyzed` : "—"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigatePage("search")} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search companies
          </button>
          <button onClick={() => navigatePage("rankings")} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors">
            Rankings <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Compact data strip — inline metrics, no giant cards */}
      <Surface className="overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-200/70">
          <div className="px-4 py-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Coverage</span>
            <span className="ml-2 font-mono text-sm font-bold text-slate-950">{coverage.symbols !== null ? coverage.symbols.toLocaleString("en-IN") : "—"}</span>
          </div>
          <div className="px-4 py-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Scored</span>
            <span className="ml-2 font-mono text-sm font-bold text-slate-950">{coverage.scored !== null ? coverage.scored.toLocaleString("en-IN") : "—"}</span>
          </div>
          <div className="px-4 py-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Signals</span>
            <span className="ml-2 font-mono text-sm font-bold text-slate-950">{symbolsAnalyzed !== null ? symbolsAnalyzed.toLocaleString("en-IN") : "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-200/70 px-4 py-2">
          <DataSourcePill label="Research only" tone="ok" />
          <DataSourcePill label="Unavailable data labelled" tone="muted" />
          <DataSourcePill label="No fake recommendations" tone="warn" />
        </div>
      </Surface>

      {/* Main workspace: signal changes + saved companies side by side */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Recent signal changes — compact panel */}
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-slate-950">Signal changes</h2>
            </div>
            <StatusChip label={signalsError ? "Unavailable" : "Source backed"} tone={signalsError ? "warn" : "ok"} />
          </div>
          {signalsLoading ? (
            <div className="p-4"><PremiumSkeleton /></div>
          ) : signalsError ? (
            <DataUnavailableState title="Signals temporarily unavailable" body="The dashboard will update when verified prediction data is reachable." />
          ) : signals.length === 0 ? (
            <DataUnavailableState title="No significant signal changes" body={symbolsAnalyzed ? `${symbolsAnalyzed} companies were analyzed in the latest cycle. No research changes crossed the display threshold.` : "Signals appear after the daily verified update cycle."} action={<button onClick={() => navigatePage("rankings")} className="text-xs font-bold text-emerald-800">Open rankings</button>} />
          ) : (
            <div className="divide-y divide-slate-200/70">
              {signals.map((signal, index) => (
                <button key={`${signal.symbol}-${signal.type}-${index}`} onClick={() => openCompany(signal.symbol)} className="grid w-full gap-2 px-4 py-3 text-left transition hover:bg-emerald-50/50 sm:grid-cols-[100px_140px_1fr_auto] sm:items-center">
                  <span className="font-mono text-xs font-bold text-slate-950">{signal.symbol}</span>
                  <StatusChip label={typeLabel[signal.type] ?? signal.type} tone={signal.severity === "critical" ? "risk" : signal.severity === "important" ? "warn" : "muted"} />
                  <span className="min-w-0 truncate text-xs text-slate-600">{signal.explanation}</span>
                  <ArrowRight className="hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </Surface>

        {/* Right column: watchlist + portfolio + freshness — compact */}
        <div className="space-y-3">
          <Surface className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-950">Watchlist</span>
            </div>
            {followedTickers.length === 0 ? (
              <p className="text-xs text-slate-500">No companies saved yet.</p>
            ) : followedTickers.map((ticker) => {
              const info = StockRegistry.getStock(ticker);
              return (
                <button key={ticker} onClick={() => openCompany(ticker)} className="flex w-full items-center justify-between rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60 mb-1.5 last:mb-0">
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-bold text-slate-950">{ticker}</span>
                    <span className="block truncate text-[10px] text-slate-500">{info?.companyName || "Company name unavailable"}</span>
                  </span>
                  <Eye className="h-3 w-3 shrink-0 text-emerald-700" aria-hidden="true" />
                </button>
              );
            })}
          </Surface>

          <div className="grid grid-cols-2 gap-3">
            <Surface className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-slate-950">Portfolio</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {holdings.length === 0 ? "No positions saved." : `${holdings.length} position${holdings.length === 1 ? "" : "s"}.`}
              </p>
            </Surface>
            <Surface className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-slate-950">Freshness</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{coverage.latest ? "Coverage available" : "Unavailable"}</p>
              <button onClick={() => navigatePage("trust")} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800">Details <ShieldCheck className="h-3 w-3" aria-hidden="true" /></button>
            </Surface>
          </div>
        </div>
      </div>

      {/* Recently viewed research chips */}
      {recentTickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Recent</span>
          {recentTickers.map((ticker) => (
            <button key={ticker} onClick={() => openCompany(ticker)} className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-700 hover:border-emerald-200 hover:text-emerald-800 transition-colors">{ticker}</button>
          ))}
        </div>
      )}

      {signalsError && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-800">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Signal panel degraded; no fake signal cards were added.
        </div>
      )}
    </AppScreen>
  );
};

export default DashboardHub;
