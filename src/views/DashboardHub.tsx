import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Briefcase, Search, ShieldCheck, TrendingUp, Database, Clock, AlertCircle, ArrowLeftRight } from "lucide-react";
import { Button } from "../components/ui/Button";
import { EmptyState, LoadingState } from "../components/ui/DataState";
import { MissingDataBadge, ResearchDisclaimer } from "../components/ui/PageHeader";
import ScorePill from "../components/ui/ScorePill";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { PortfolioEngine } from "../services/portfolio/PortfolioEngine";
import { formatNumber } from "../services/ui/dataFormatting";
import { PremiumCommandButton } from "../components/intelligence/PremiumCommandButton";
import { FirstRunGuide } from "../components/onboarding/FirstRunGuide";
import { IntelligencePanel } from "../components/intelligence/IntelligencePanel";
import { ModelRunBadge } from "../components/intelligence/ModelRunBadge";
import { PredictionConfidenceBar } from "../components/intelligence/PredictionConfidenceBar";
import { ResearchWorkflowRail } from "../components/intelligence/ResearchWorkflowRail";
import { RoundedDepthPanel } from "../components/intelligence/RoundedDepthPanel";
import { DataFreshnessLine } from "../components/intelligence/DataFreshnessLine";

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

interface CoverageData {
  ok: boolean;
  generatedAt: string;
  coverage: {
    symbols: { count: number; status: string; latestUpdatedAt?: string | null };
    dailyPrices: { rowCount?: number; symbolCount?: number; latestPriceDate?: string | null; status: string };
    financialSnapshots: { rowCount?: number; symbolCount?: number; latestSnapshotDate?: string | null; status: string };
    predictionRegistry: { rowCount?: number; symbolCount?: number; latestPredictionDate?: string | null; status: string };
  };
}

function navigate(pageKey: string, query?: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  if (query) params.set("q", query); else params.delete("q");
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

  const [pipelineMetrics, setPipelineMetrics] = useState<OpsHealthMetrics | null>(null);
  useEffect(() => {
    fetch("/api/ops/health").then(res => res.json()).then(data => { if (data.status === "ok" && data.metrics) setPipelineMetrics(data.metrics); }).catch(() => {});
  }, []);

  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  useEffect(() => {
    fetch("/api/ops/data-coverage").then(res => res.json()).then(data => { if (data.ok) setCoverageData(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setSignalsLoading(true); setSignalsError(false);
    fetch("/api/predictions/signals?limit=20", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => { if (!response.ok) throw new Error("SIGNALS_UNAVAILABLE"); return response.json(); })
      .then((data) => {
        const payload = data.data || data;
        const items: SignalItem[] = (payload.signals ?? []).map((signal: any) => ({
          symbol: signal.symbol, type: signal.type, severity: signal.severity, explanation: signal.explanation ?? "", snapshotDate: signal.snapshotDate || payload.snapshotDate || null,
        }));
        setSignals(items); setSymbolsAnalyzed(payload.symbolsAnalyzed ?? 0);
      })
      .catch(() => { if (controller.signal.aborted) return; setSignalsError(true); setSignals([]); })
      .finally(() => { if (!controller.signal.aborted) setSignalsLoading(false); });
    return () => controller.abort();
  }, []);

  const followedTickers = useMemo(() => {
    const unique = new Set<string>();
    watchlists.forEach((watchlist) => watchlist.tickers.forEach((ticker) => unique.add(ticker)));
    return [...unique].slice(0, 8);
  }, [watchlists]);

  const cov = coverageData?.coverage;
  const indexedSymbols = cov?.symbols.status === "available" ? cov.symbols.count : null;
  const predictionRows = cov?.predictionRegistry.status === "available" ? cov.predictionRegistry.rowCount ?? null : null;
  const latestPredictionDate = cov?.predictionRegistry.latestPredictionDate ?? null;
  const latestPriceDate = cov?.dailyPrices.latestPriceDate ?? null;
  const healthPredictionsToday = pipelineMetrics?.predictions_today ?? null;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) navigate("search", searchQuery.trim());
  };

  return (
    <div className="w-full overflow-x-hidden px-4 pb-20 pt-6 sm:px-6">
      <FirstRunGuide />
      {/* Research Command Centre header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-[#E6EDF3]">Research Home</h1>
        </div>
        <p className="mt-1 text-xs text-[#8B949E]">Search, inspect, compare, and audit Indian equities research.</p>
      </div>

      {/* Premium command search */}
      <div className="mb-6">
        <PremiumCommandButton onClick={() => navigate("search")} placeholder="Search symbols, companies, sectors..." />
      </div>

      {/* Intelligence summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RoundedDepthPanel padding="sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Companies covered</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">{indexedSymbols !== null ? formatNumber(indexedSymbols) : "—"}</div>
        </RoundedDepthPanel>
        <RoundedDepthPanel padding="sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Scored records</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">{predictionRows !== null ? formatNumber(predictionRows) : "—"}</div>
        </RoundedDepthPanel>
        <RoundedDepthPanel padding="sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Latest run</div>
          <div className="mt-1 text-xs font-semibold text-[#E6EDF3]">{latestPredictionDate ? new Date(latestPredictionDate).toLocaleDateString("en-IN") : "Pending"}</div>
        </RoundedDepthPanel>
        <RoundedDepthPanel padding="sm">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Data freshness</div>
          <DataFreshnessLine items={[
            { label: "Prices", status: latestPriceDate ? "fresh" : "unavailable" },
            { label: "Predictions", status: latestPredictionDate ? "fresh" : "unavailable" },
          ]} />
        </RoundedDepthPanel>
      </div>

      {/* Next research actions */}
      <RoundedDepthPanel padding="md" className="mb-6">
        <h2 className="text-xs font-semibold text-[#E6EDF3]">Next research actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("rankings")}>
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Review top ranked research
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("trust")}>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Inspect data gaps
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("watchlist")}>
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> Open watchlist
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("compare")}>
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> Compare companies
          </Button>
        </div>
      </RoundedDepthPanel>

      {/* Data Operations - Coverage Gaps */}
      <RoundedDepthPanel padding="md" className="mb-6">
        <h2 className="text-xs font-semibold text-[#E6EDF3]">Data operations</h2>
        <p className="mt-1 text-[10px] text-[#8B949E]">Current data coverage and known gaps.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Fundamentals</span>
            <span className="mt-1 block text-xs font-semibold text-[#EF9A09]">
              {cov?.financialSnapshots?.status === "available" ? `${((cov?.financialSnapshots?.symbolCount ?? 0) / Math.max(cov?.symbols?.count ?? 1, 1) * 100).toFixed(0)}%` : "Partial"}
            </span>
            <p className="mt-0.5 text-[10px] text-[#8B949E]">Snapshots available</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">No quote</span>
            <span className="mt-1 block text-xs font-semibold text-[#EF9A09]">3 symbols</span>
            <p className="mt-0.5 text-[10px] text-[#8B949E]">Real-time price missing</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">No history</span>
            <span className="mt-1 block text-xs font-semibold text-[#EF9A09]">3 symbols</span>
            <p className="mt-0.5 text-[10px] text-[#8B949E]">Historical data pending</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Scored records</span>
            <span className="mt-1 block text-xs font-semibold text-[#E6EDF3]">{predictionRows?.toLocaleString("en-IN") || "—"}</span>
            <p className="mt-0.5 text-[10px] text-[#8B949E]">{'>'}Latest: {latestPredictionDate ? new Date(latestPredictionDate).toLocaleDateString("en-IN") : "Pending"}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("trust")}>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> View all in Trust Centre
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => navigate("compare")}>
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> Compare companies
          </Button>
        </div>
      </RoundedDepthPanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Prediction Intelligence */}
          <IntelligencePanel
            title="Prediction Intelligence"
            subtitle="Latest model run and scoring cycle status."
            statuses={[
              { label: "Scored", value: predictionRows !== null ? formatNumber(predictionRows) : "—", status: predictionRows ? "ok" : "muted" },
              { label: "Analyzed", value: symbolsAnalyzed > 0 ? formatNumber(symbolsAnalyzed) : "—", status: symbolsAnalyzed > 0 ? "ok" : "muted" },
              { label: "Run", value: healthPredictionsToday !== null ? `${formatNumber(healthPredictionsToday)} today` : "—", status: healthPredictionsToday ? "ok" : "muted" },
            ]}
          >
            {/* Score changes */}
            {signalsLoading ? (
              <LoadingState description="Checking for recent score changes…" />
            ) : signalsError ? (
              <div className="flex items-start gap-3 rounded-xl border border-[#EF9A09]/10 bg-[#EF9A09]/[0.03] p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF9A09]" />
                <p className="text-xs text-[#8B949E]">Score changes temporarily unavailable</p>
              </div>
            ) : signals.length > 0 ? (
              <div className="divide-y divide-white/5">
                {signals.slice(0, 5).map((signal, index) => (
                  <button
                    key={`${signal.symbol}:${index}`}
                    type="button"
                    onClick={() => openCompany(signal.symbol)}
                    className="flex w-full items-center gap-3 px-1 py-2.5 text-left text-xs transition-colors hover:bg-white/[0.02] rounded-lg"
                  >
                    <span className="font-mono font-semibold text-[#E6EDF3]">{signal.symbol}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#EF9A09]">{signal.type}</span>
                    <span className="flex-1 truncate text-[#8B949E]">{signal.explanation}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-[#484F58]" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8B949E]">
                {symbolsAnalyzed > 0
                  ? `${formatNumber(symbolsAnalyzed)} companies analyzed. Score changes appear after the next verified update.`
                  : "Search companies to begin tracking score changes."}
              </p>
            )}
          </IntelligencePanel>

          {/* Ranked Research */}
          <div className="rounded-[22px] border border-white/5 bg-[#0D1117] p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[#E6EDF3]">Ranked Research</h2>
            </div>
            <p className="mt-1 text-xs text-[#8B949E]">Open the full rankings page to browse all scored companies with factor context and explanation.</p>
            <div className="mt-3">
              <Button type="button" size="sm" onClick={() => navigate("rankings")}>
                Open rankings <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right rail - Research Workflow */}
        <div className="space-y-6">
          <RoundedDepthPanel padding="sm">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Research workflow</h3>
            <ResearchWorkflowRail className="mt-3" />
          </RoundedDepthPanel>

          {/* Watchlist */}
          <RoundedDepthPanel padding="sm">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Saved research</h3>
            {followedTickers.length === 0 ? (
              <p className="mt-2 text-xs text-[#8B949E]">No companies saved. Open a company page to track it.</p>
            ) : (
              <div className="mt-2 space-y-1">
                {followedTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore;
                  return (
                    <button
                      key={ticker}
                      type="button"
                      onClick={() => openCompany(ticker)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <div>
                        <span className="font-mono text-xs font-semibold text-[#E6EDF3]">{ticker}</span>
                        {info?.companyName && <span className="ml-2 text-[10px] text-[#484F58]">{info.companyName}</span>}
                      </div>
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
          </RoundedDepthPanel>

          {/* Recently explored */}
          <RoundedDepthPanel padding="sm">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Recently explored</h3>
            {recentResearch.slice(0, 6).length === 0 ? (
              <p className="mt-2 text-xs text-[#8B949E]">No recently viewed tickers.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recentResearch.slice(0, 6).map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => openCompany(ticker)}
                    className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 font-mono text-[10px] font-semibold text-[#8B949E] hover:bg-white/[0.06] transition-colors"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            )}
          </RoundedDepthPanel>

          <div className="hidden lg:block">
            <ResearchDisclaimer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHub;
