import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Briefcase, Search, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { EmptyState, LoadingState } from "../components/ui/DataState";
import { MissingDataBadge, PageHeader, ResearchDisclaimer, SectionHeader, DataFreshnessBadge } from "../components/ui/PageHeader";
import ScorePill from "../components/ui/ScorePill";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { PortfolioEngine } from "../services/portfolio/PortfolioEngine";
import tokens from "../components/ui/tokens";
import { OnboardingChecklist, DataReadinessPanel } from "../components/ui/OnboardingComponents";

interface SignalItem {
  symbol: string;
  type: string;
  severity: "critical" | "important" | "monitor";
  explanation: string;
  snapshotDate?: string | null;
}

interface OpsHealthMetrics {
  predictions_today?: number;
  symbols_covered?: number;
  pipeline_freshness?: string;
  db_health?: string;
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
  const [methodologyViewed, setMethodologyViewed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("onboarding_methodology_viewed") === "true";
    }
    return false;
  });

  useEffect(() => {
    setRecentResearch(RecentSearchStore.getRecent());
    const handler = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  const [pipelineMetrics, setPipelineMetrics] = useState<OpsHealthMetrics | null>(null);

  useEffect(() => {
    fetch("/api/ops/health")
      .then(res => res.json())
      .then(data => {
        if (data.status === "ok" && data.metrics) {
          setPipelineMetrics(data.metrics);
        }
      })
      .catch(() => {});
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
        const payload = data.data || data;
        const items: SignalItem[] = (payload.signals ?? []).map((signal: any) => ({
          symbol: signal.symbol,
          type: signal.type,
          severity: signal.severity,
          explanation: signal.explanation ?? "",
          snapshotDate: signal.snapshotDate || payload.snapshotDate || null,
        }));
        setSignals(items);
        setSymbolsAnalyzed(payload.symbolsAnalyzed ?? 0);
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
  const healthSymbolsCovered =
    typeof pipelineMetrics?.symbols_covered === "number" && pipelineMetrics.symbols_covered >= 0
      ? pipelineMetrics.symbols_covered
      : null;
  const healthPredictionsToday =
    typeof pipelineMetrics?.predictions_today === "number" && pipelineMetrics.predictions_today >= 0
      ? pipelineMetrics.predictions_today
      : null;
  const indexedCompanyCount = healthSymbolsCovered ?? (signalsLoading ? null : symbolsAnalyzed);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate("search", searchQuery.trim());
    }
  };

  const handleNavigateMethodology = () => {
    window.localStorage.setItem("onboarding_methodology_viewed", "true");
    setMethodologyViewed(true);
    navigate("trust");
  };

  const onboardingSteps = [
    {
      id: "search",
      title: "Search a company",
      description: "Find a company by ticker or name.",
      isCompleted: recentResearch.length > 0,
      actionLabel: "Search now",
      onAction: () => navigate("search"),
    },
    {
      id: "methodology",
      title: "Review the scoring methodology",
      description: "Review scoring inputs and availability labels.",
      isCompleted: methodologyViewed,
      actionLabel: "Read methodology",
      onAction: handleNavigateMethodology,
    },
    {
      id: "track",
      title: "Save or track companies",
      description: "Save companies and notes in a watchlist.",
      isCompleted: followedTickers.length > 0,
      actionLabel: "Go to Watchlist",
      onAction: () => navigate("watchlist"),
    },
  ];

  return (
    <div className={`${tokens.layout.container} flex flex-col gap-6`}>
      <PageHeader
        title="Research Dashboard"
        subtitle="Search companies, save research, and review verified score changes when available."
        primaryAction={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
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

      <OnboardingChecklist steps={onboardingSteps} />

      <DataReadinessPanel />

      <Card className="p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Start your research</h2>
            <p className="mt-1 text-xs text-slate-500">Search by ticker, company name, or sector.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <SectionHeader title="Watchlist" subtitle="Saved companies" />
          <div className="mt-3 text-3xl font-semibold text-slate-950 tabular-nums">{followedTickers.length}</div>
          <p className="mt-1 text-xs text-slate-500">Saved to your workspace.</p>
        </Card>
        <Card>
          <SectionHeader title="Portfolio" subtitle="Recorded holdings" />
          <div className="mt-3 text-3xl font-semibold text-slate-950 tabular-nums">{holdings.length}</div>
          <p className="mt-1 text-xs text-slate-500">Quotes appear when verified.</p>
        </Card>
        <Card>
          <SectionHeader title="Indexed companies" subtitle="Verified registry" />
          <div className="mt-3 text-3xl font-semibold text-slate-950 tabular-nums">
            {indexedCompanyCount === null ? "—" : indexedCompanyCount.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {healthPredictionsToday !== null
              ? `${healthPredictionsToday.toLocaleString()} prediction rows today${
                  pipelineMetrics?.pipeline_freshness ? `; prices ${pipelineMetrics.pipeline_freshness}` : ""
                }.`
              : "Available after source updates."}
          </p>
        </Card>
      </div>

      <div className={tokens.layout.sidebarGrid}>
        {/* Signal changes */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionHeader
            title="Score changes"
            subtitle="Appears when verified score changes are available."
            action={signals[0]?.snapshotDate ? <DataFreshnessBadge date={signals[0].snapshotDate} /> : <MissingDataBadge />}
          />
          <div className="mt-4">
            {signalsLoading ? (
              <LoadingState description="Checking prediction registry for recent score changes…" />
            ) : signalsError ? (
              <EmptyState
                title="Score changes unavailable"
                description="Score-change data is unavailable right now. No sample results are shown."
              />
            ) : signals.length === 0 ? (
              <EmptyState
                title="Score changes not ready yet"
                description={
                  symbolsAnalyzed > 0
                    ? `${symbolsAnalyzed} companies are registered. Score changes will appear after verified updates.`
                    : "Use Search to find companies and add them to your watchlist."
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
                  description="No companies saved yet. Open a company page to track it here."
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
