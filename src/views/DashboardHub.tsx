import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Briefcase, Search, ShieldCheck, Database } from "lucide-react";
import { Button } from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { EmptyState, LoadingState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer, SectionHeader } from "../components/ui/PageHeader";
import ScorePill from "../components/ui/ScorePill";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { PortfolioEngine } from "../services/portfolio/PortfolioEngine";
import ResearchJourneyPanel from "../components/ui/ResearchJourneyPanel";
import tokens from "../components/ui/tokens";

interface SignalItem {
  symbol: string;
  type: string;
  severity: "critical" | "important" | "monitor";
  explanation: string;
}

function navigate(pageKey: string, query?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  if (query) {
    params.set("q", query);
  } else {
    params.delete("q");
  }
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate("search", searchQuery.trim());
    }
  };

  return (
    <div className={`${tokens.layout.container} flex flex-col gap-6`}>
      <PageHeader
        title="Research Dashboard"
        subtitle="Search any Indian listed company, track your watchlists, and monitor scoring updates when the backend pipeline runs."
        primaryAction={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => navigate("rankings")}>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Rankings
            </Button>
            <Button type="button" size="sm" onClick={() => navigate("search")}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </Button>
          </div>
        }
      />

      {/* Pipeline status banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <span className="block font-semibold text-emerald-900 text-sm">Pipeline status: ingestion active</span>
            <p className="text-xs text-emerald-800 mt-0.5">
              Live quotes are running. Factor scores appear once the nightly scoring cycle completes.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("trust")}
          className="inline-flex w-fit shrink-0 items-center gap-1 text-xs font-semibold text-emerald-900 hover:underline"
        >
          About the pipeline <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {/* Primary search action */}
      <Card className="p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Find a company</h2>
            <p className="text-xs text-slate-500 mt-0.5">Search by ticker symbol, company name, or sector.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="dashboard-search"
                aria-label="Search stocks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. RELIANCE, TCS, INFY..."
                className="pl-10"
              />
              <Search className="absolute left-3 top-[11px] h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <Button type="submit" className="shrink-0">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Research workflow guide */}
      <ResearchJourneyPanel
        onStartSearch={() => navigate("search")}
        onViewMethodology={() => navigate("trust")}
      />

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <SectionHeader title="Watchlist" subtitle="Saved companies" />
          <div className="mt-3 text-3xl font-semibold text-slate-950 tabular-nums">{followedTickers.length}</div>
          <p className="mt-1 text-xs text-slate-500">Saved locally to your browser session.</p>
        </Card>
        <Card>
          <SectionHeader title="Portfolio" subtitle="Recorded holdings" />
          <div className="mt-3 text-3xl font-semibold text-slate-950 tabular-nums">{holdings.length}</div>
          <p className="mt-1 text-xs text-slate-500">Live quotes withheld when feeds are offline.</p>
        </Card>
        <Card>
          <SectionHeader title="Indexed companies" subtitle="Backend registry" />
          <div className="mt-3 text-3xl font-semibold text-slate-950 tabular-nums">
            {signalsLoading ? "—" : symbolsAnalyzed}
          </div>
          <p className="mt-1 text-xs text-slate-500">Populated by scheduled data syncs.</p>
        </Card>
      </div>

      <div className={tokens.layout.sidebarGrid}>
        {/* Signal changes */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Score changes"
            subtitle="Appears after the background scoring pipeline completes."
            action={<MissingDataBadge />}
          />
          <div className="mt-4">
            {signalsLoading ? (
              <LoadingState description="Checking prediction registry for recent score changes…" />
            ) : signalsError ? (
              <EmptyState
                title="Score changes unavailable"
                description="The database backfill is in progress. No mocked results are shown. Check back after the next ingestion cycle."
              />
            ) : signals.length === 0 ? (
              <EmptyState
                title="Awaiting scoring cycle"
                description={
                  symbolsAnalyzed > 0
                    ? `${symbolsAnalyzed} companies are registered. Score changes will appear after the next nightly run.`
                    : "No companies indexed yet. Use Search to find companies and add them to your watchlist."
                }
                action={
                  <Button
                    type="button"
                    onClick={() => navigate("search")}
                    size="sm"
                  >
                    Search companies
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {signals.map((signal, index) => (
                  <button
                    key={`${signal.symbol}:${signal.type}:${index}`}
                    type="button"
                    onClick={() => openCompany(signal.symbol)}
                    className="grid w-full grid-cols-[96px_120px_1fr_20px] items-center gap-3 px-1 py-3 text-left text-sm transition hover:bg-slate-50 rounded-lg"
                  >
                    <span className="font-mono text-sm font-semibold text-slate-950">{signal.symbol}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{signal.type}</span>
                    <span className="truncate text-xs text-slate-600">{signal.explanation}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card>
            <SectionHeader title="Saved workspace" subtitle="Your watchlist tickers" />
            {followedTickers.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  description="No companies saved. Open a company page and click 'Add to Watchlist' to monitor it here."
                />
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
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-white"
                    >
                      <span>
                        <span className="block font-mono text-sm font-semibold text-slate-950">{ticker}</span>
                        <span className="block max-w-[200px] truncate text-xs text-slate-500">
                          {info?.companyName || "Metadata loading…"}
                        </span>
                      </span>
                      {typeof score === "number" && Number.isFinite(score) ? (
                        <ScorePill score={Math.round(score)} />
                      ) : (
                        <MissingDataBadge />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="Recently explored" subtitle="Last opened companies" />
            {recentTickers.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No recently viewed companies.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {recentTickers.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => openCompany(ticker)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
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

          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" className="w-full" onClick={() => navigate("trust")}>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Methodology
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => navigate("portfolio")}>
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Portfolio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;
