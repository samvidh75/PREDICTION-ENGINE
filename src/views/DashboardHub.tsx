import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Briefcase, Search, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button";
import Card from "../components/ui/Card";
import { EmptyState, LoadingState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer, SectionHeader } from "../components/ui/PageHeader";
import ScorePill from "../components/ui/ScorePill";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { PortfolioEngine } from "../services/portfolio/PortfolioEngine";

interface SignalItem {
  symbol: string;
  type: string;
  severity: "critical" | "important" | "monitor";
  explanation: string;
}

function navigate(pageKey: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

function openCompany(symbol: string): void {
  RecentSearchStore.addTicker(symbol);
  const params = new URLSearchParams(window.location.search);
  params.set("page", "stock");
  params.set("id", symbol);
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

export const DashboardHub: React.FC = () => {
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [recentResearch, setRecentResearch] = useState<string[]>([]);
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState(false);
  const [symbolsAnalyzed, setSymbolsAnalyzed] = useState(0);

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const handler = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setSignalsLoading(true);
    setSignalsError(false);
    fetch("/api/predictions/signals?limit=20", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("SIGNALS_UNAVAILABLE");
        return response.json();
      })
      .then((data) => {
        const items: SignalItem[] = (data.signals ?? []).map((signal: any) => ({
          symbol: signal.symbol,
          type: signal.type,
          severity: signal.severity,
          explanation: signal.explanation ?? "",
        }));
        setSignals(items);
        setSymbolsAnalyzed(data.symbolsAnalyzed ?? 0);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSignalsError(true);
        setSignals([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSignalsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((watchlist) => watchlist.tickers.forEach((ticker) => unique.add(ticker)));
    return [...unique].slice(0, 8);
  }, [watchlists]);
  const holdings = useMemo(() => PortfolioEngine.getHoldings(), []);
  const recentTickers = recentResearch.slice(0, 6);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
      <PageHeader
        title="Dashboard"
        subtitle="A production research workspace for search, watchlists, rankings and source-backed signal availability."
        primaryAction={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("rankings")}>
              <BarChart3 className="h-4 w-4" />
              Rankings
            </Button>
            <Button type="button" onClick={() => navigate("search")}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <SectionHeader title="Watchlist coverage" subtitle="Companies saved across lists" />
          <div className="mt-4 text-3xl font-semibold text-slate-950">{followedTickers.length}</div>
          <p className="mt-1 text-xs text-slate-500">Saved tickers remain local to this workspace.</p>
        </Card>
        <Card>
          <SectionHeader title="Portfolio records" subtitle="User-entered holdings" />
          <div className="mt-4 text-3xl font-semibold text-slate-950">{holdings.length}</div>
          <p className="mt-1 text-xs text-slate-500">Live valuation is withheld when quotes are unavailable.</p>
        </Card>
        <Card>
          <SectionHeader title="Signal registry" subtitle="Backend prediction changes" />
          <div className="mt-4 text-3xl font-semibold text-slate-950">{signalsLoading ? "-" : symbolsAnalyzed}</div>
          <p className="mt-1 text-xs text-slate-500">Rows appear only after populated pipeline snapshots.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Signal changes"
            subtitle="Changes appear after production ingestion and scoring publish verified snapshots."
            action={<MissingDataBadge />}
          />
          <div className="mt-4">
            {signalsLoading ? (
              <LoadingState description="Checking the prediction registry for source-backed changes." />
            ) : signalsError ? (
              <EmptyState
                title="Signals are not ready yet"
                description="Signal changes will appear after the production data backfill completes. No sample events are shown."
              />
            ) : signals.length === 0 ? (
              <EmptyState
                title="No source-backed signal changes"
                description={
                  symbolsAnalyzed > 0
                    ? `${symbolsAnalyzed} symbols were analyzed and no significant changes were detected.`
                    : "Production data tables are currently empty, so signal changes will appear after ingestion and scoring populate the registry."
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {signals.map((signal, index) => (
                  <button
                    key={`${signal.symbol}:${signal.type}:${index}`}
                    type="button"
                    onClick={() => openCompany(signal.symbol)}
                    className="grid w-full grid-cols-[96px_120px_1fr_24px] items-center gap-3 px-1 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-mono font-semibold text-slate-950">{signal.symbol}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{signal.type}</span>
                    <span className="truncate text-slate-600">{signal.explanation}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Saved research" subtitle="Watchlist companies and recent searches" />
            {followedTickers.length === 0 ? (
              <div className="mt-4">
                <EmptyState description="No companies are saved yet. Search a company and add it to a watchlist to monitor it here." />
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {followedTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore;
                  return (
                    <button
                      key={ticker}
                      type="button"
                      onClick={() => openCompany(ticker)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span>
                        <span className="block font-mono text-sm font-semibold text-slate-950">{ticker}</span>
                        <span className="block max-w-[210px] truncate text-xs text-slate-500">{info?.companyName || "Company metadata unavailable"}</span>
                      </span>
                      {typeof score === "number" && Number.isFinite(score) ? <ScorePill score={Math.round(score)} /> : <MissingDataBadge />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="Recent research" subtitle="Last opened companies" />
            {recentTickers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No recently viewed companies.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {recentTickers.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => openCompany(ticker)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 hover:bg-white"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="hidden lg:block">
            <ResearchDisclaimer />
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={() => navigate("methodology")}>
            <ShieldCheck className="h-4 w-4" />
            Methodology
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={() => navigate("portfolio")}>
            <Briefcase className="h-4 w-4" />
            Portfolio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;
