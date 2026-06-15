import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Briefcase, Search, ShieldCheck, Database, HelpCircle } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
      <PageHeader
        title="Research Command"
        subtitle="A guided workspace for Indian equity research, tracking watchlists, and monitoring backend signal updates."
        primaryAction={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("rankings")}>
              <BarChart3 className="h-4 w-4" />
              Rankings
            </Button>
            <Button type="button" onClick={() => navigate("search")}>
              <Search className="h-4 w-4" />
              Advanced Search
            </Button>
          </div>
        }
      />

      {/* Data Availability Status Banner */}
      <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Database className="h-4 w-4 shrink-0 text-emerald-700" />
          <div>
            <span className="font-semibold text-emerald-900">Database Status: Ingestion & Backfill Active.</span>
            <p className="text-xs text-emerald-800">
              Live quotes are active. If factor scores are empty, the scoring pipeline is preparing snapshots for the next ingestion cycle.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("trust")}
          className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-emerald-900 hover:underline"
        >
          Learn about the pipeline <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Prominent Primary Search Action */}
      <Card className="p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Start Stock Research</h3>
            <p className="text-xs text-slate-500">Query by ticker symbol, company name, or industry sector.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                aria-label="Quick search stock"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. RELIANCE, TCS, INFY)..."
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
            <Button type="submit" className="shrink-0 bg-slate-950 hover:bg-slate-800 text-white font-semibold">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Start Research Workflow Steps */}
      <ResearchJourneyPanel
        onStartSearch={() => navigate("search")}
        onViewMethodology={() => navigate("trust")}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <SectionHeader title="Watchlist coverage" subtitle="Saved companies in workspace" />
          <div className="mt-4 text-3xl font-semibold text-slate-950">{followedTickers.length}</div>
          <p className="mt-1 text-xs text-slate-500">Saved items remain local to your browser session.</p>
        </Card>
        <Card>
          <SectionHeader title="Portfolio positions" subtitle="Configured holdings" />
          <div className="mt-4 text-3xl font-semibold text-slate-950">{holdings.length}</div>
          <p className="mt-1 text-xs text-slate-500">Quotes are withheld if live feeds are offline.</p>
        </Card>
        <Card>
          <SectionHeader title="Ingested companies" subtitle="Backend database registry" />
          <div className="mt-4 text-3xl font-semibold text-slate-950">{signalsLoading ? "-" : symbolsAnalyzed}</div>
          <p className="mt-1 text-xs text-slate-500">Populated automatically via scheduled data syncs.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Signal Changes"
            subtitle="Scoring changes will appear here after the background scoring pipeline completes."
            action={<MissingDataBadge />}
          />
          <div className="mt-4">
            {signalsLoading ? (
              <LoadingState description="Querying prediction registry database for recent changes..." />
            ) : signalsError ? (
              <EmptyState
                title="Scoring changes temporarily unavailable"
                description="The database backfill is in progress. Verify database ingestion status or try again later. No mocked results are generated."
              />
            ) : signals.length === 0 ? (
              <EmptyState
                title="Awaiting database backfill"
                description={
                  symbolsAnalyzed > 0
                    ? `${symbolsAnalyzed} symbols are registered but no score changes have run yet. Check back after the nightly run.`
                    : "No companies have been indexed in the database. Use search above to locate companies and track them in your watchlists."
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
            <SectionHeader title="Saved Workspace" subtitle="Watchlists and monitored tickers" />
            {followedTickers.length === 0 ? (
              <div className="mt-4">
                <EmptyState description="No companies are saved. Search a ticker and click 'Add to Watchlist' to monitor it here." />
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
                        <span className="block max-w-[210px] truncate text-xs text-slate-500">{info?.companyName || "Metadata awaiting load"}</span>
                      </span>
                      {typeof score === "number" && Number.isFinite(score) ? <ScorePill score={Math.round(score)} /> : <MissingDataBadge />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader title="Recently Explored" subtitle="Last opened companies" />
            {recentTickers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No recently viewed companies.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {recentTickers.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => openCompany(ticker)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 hover:bg-white hover:border-slate-300"
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
          <Button type="button" variant="secondary" className="w-full" onClick={() => navigate("trust")}>
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
