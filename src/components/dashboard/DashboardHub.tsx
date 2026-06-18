import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Database, Eye, Search, ShieldCheck, Star, TrendingUp } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { PortfolioEngine } from "../../services/portfolio/PortfolioEngine";
import { WatchlistEngine } from "../../services/portfolio/WatchlistEngine";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { api, type Signal as ApiSignal } from "../../services/api/client";
import { AppScreen, DataSourcePill, DataUnavailableState, MetricCard, MobilePageHeader, PremiumSkeleton, ResearchHeroCard, SectionHeader, StatusChip, Surface, WatchlistSearchCard, navigatePage } from "../premium/PremiumUI";

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
      <MobilePageHeader eyebrow="My research" title="What to inspect right now" body="Source-backed market research, saved companies, and data freshness. No trading prompts or fabricated metrics." />
      <WatchlistSearchCard onSearch={() => navigatePage("search")} />
      <ResearchHeroCard eyebrow="Research workspace" title="Your Indian equity research command centre." body="Search NSE/BSE companies, inspect signal changes, and keep watchlists grounded in verified data availability.">
        <div className="flex flex-wrap gap-2">
          <DataSourcePill label="Research only" tone="ok" />
          <DataSourcePill label="Unavailable data labelled" tone="muted" />
          <DataSourcePill label="No fake recommendations" tone="warn" />
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button onClick={() => navigatePage("search")} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-950 shadow-lg">
              <Search className="h-4 w-4" /> Search
            </button>
            <button onClick={() => navigatePage("rankings")} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur">
              Rankings <ArrowRight className="h-4 w-4" />
            </button>
        </div>
      </ResearchHeroCard>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Companies covered" value={coverage.symbols !== null ? coverage.symbols.toLocaleString("en-IN") : "Unavailable"} detail="Live coverage metadata." />
        <MetricCard label="Scored symbols" value={coverage.scored !== null ? coverage.scored.toLocaleString("en-IN") : "Pending"} detail="Latest verified scoring cycle." tone={coverage.scored ? "ok" : "warn"} />
        <MetricCard label="Signals analyzed" value={symbolsAnalyzed !== null ? symbolsAnalyzed.toLocaleString("en-IN") : "Unavailable"} detail="Research changes, not advice." tone={symbolsAnalyzed ? "ok" : "muted"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-700" />
              <h2 className="font-semibold text-slate-950">Recent signal changes</h2>
            </div>
            <StatusChip label={signalsError ? "Unavailable" : "Source backed"} tone={signalsError ? "warn" : "ok"} />
          </div>
          {signalsLoading ? (
            <div className="p-5"><PremiumSkeleton /></div>
          ) : signalsError ? (
            <DataUnavailableState title="Signals temporarily unavailable" body="The dashboard will update when verified prediction data is reachable." />
          ) : signals.length === 0 ? (
            <DataUnavailableState title="No significant signal changes" body={symbolsAnalyzed ? `${symbolsAnalyzed} companies were analyzed in the latest cycle. No research changes crossed the display threshold.` : "Signals appear after the daily verified update cycle."} action={<button onClick={() => navigatePage("rankings")} className="text-sm font-bold text-emerald-800">Open rankings</button>} />
          ) : (
            <div className="divide-y divide-slate-200/70">
              {signals.map((signal, index) => (
                <button key={`${signal.symbol}-${signal.type}-${index}`} onClick={() => openCompany(signal.symbol)} className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-emerald-50/50 sm:grid-cols-[110px_180px_1fr_auto] sm:items-center">
                  <span className="font-mono text-sm font-bold text-slate-950">{signal.symbol}</span>
                  <StatusChip label={typeLabel[signal.type] ?? signal.type} tone={signal.severity === "critical" ? "risk" : signal.severity === "important" ? "warn" : "muted"} />
                  <span className="min-w-0 truncate text-sm text-slate-600">{signal.explanation}</span>
                  <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" />
                </button>
              ))}
            </div>
          )}
        </Surface>

        <div className="space-y-5">
          <Surface className="p-5">
            <SectionHeader eyebrow="Saved" title="Watchlist" body="Real saved companies only." />
            <div className="mt-5 space-y-2">
              {followedTickers.length === 0 ? (
                <p className="text-sm text-slate-600">No companies saved yet. Search the universe to start tracking research.</p>
              ) : followedTickers.map((ticker) => {
                const info = StockRegistry.getStock(ticker);
                return (
                  <button key={ticker} onClick={() => openCompany(ticker)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60">
                    <span>
                      <span className="block font-mono text-sm font-bold text-slate-950">{ticker}</span>
                      <span className="block max-w-[220px] truncate text-xs text-slate-500">{info?.companyName || "Company name unavailable"}</span>
                    </span>
                    <Eye className="h-4 w-4 text-emerald-700" />
                  </button>
                );
              })}
            </div>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-950"><Star className="h-5 w-5 text-emerald-700" /> Portfolio quick view</div>
              <StatusChip label="User entered" tone="muted" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {holdings.length === 0 ? "No user-entered holdings saved. Broker data is not shown as active." : `${holdings.length} user-entered position${holdings.length === 1 ? "" : "s"} saved.`}
            </p>
          </Surface>

          <Surface className="p-5">
            <div className="flex items-center gap-2 font-semibold text-slate-950"><Database className="h-5 w-5 text-emerald-700" /> Data freshness</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{coverage.latest ? "Latest verified coverage metadata is available." : "Coverage freshness is unavailable right now."}</p>
            <button onClick={() => navigatePage("trust")} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">Open Trust Centre <ShieldCheck className="h-4 w-4" /></button>
          </Surface>
        </div>
      </div>

      {recentTickers.length > 0 && (
        <Surface className="p-5">
          <div className="mb-4 text-sm font-semibold text-slate-950">Recently viewed research</div>
          <div className="flex flex-wrap gap-2">
            {recentTickers.map((ticker) => (
              <button key={ticker} onClick={() => openCompany(ticker)} className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 font-mono text-xs font-bold text-slate-700 hover:border-emerald-200 hover:text-emerald-800">{ticker}</button>
            ))}
          </div>
        </Surface>
      )}

      {signalsError && (
        <div className="flex items-center gap-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4" /> Signal panel degraded; no fake signal cards were added.
        </div>
      )}
    </AppScreen>
  );
};

export default DashboardHub;
