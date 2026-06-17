import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, FileText, Star, Trophy, Sparkles, TrendingUp, Activity } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { api, ApiError } from "../services/api/client";
import type { CompanyMetadata } from "../services/api/client";
import WhyItChangedTab from "../components/intelligence/WhyItChangedTab";
import { formatNumber, formatPercentage as localFormatPercent, formatINR as uiFormatINR, normalizeDate, formatScore } from "../services/ui/dataFormatting";
import { DataFreshnessBadge, SourceBadge, CoverageStatusBadge } from "../components/ui/PageHeader";


const getClassificationStyle = (cls: string) => {
  switch (cls) {
    case "Exceptional":
    case "Excellent":
      return "bg-emerald-50 border-emerald-200 text-emerald-800";
    case "Good":
      return "bg-sky-50 border-sky-200 text-sky-800";
    case "Fair":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "Weak":
      return "bg-orange-50 border-orange-200 text-orange-800";
    case "Critical":
      return "bg-rose-50 border-rose-200 text-rose-800";
    case "Healthy":
      return "bg-sky-50 border-sky-200 text-sky-800";
    case "Stable":
      return "bg-neutral-50 border-neutral-200 text-neutral-700";
    case "Weakening":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "At Risk":
      return "bg-rose-50 border-rose-200 text-rose-800";
    default:
      return "bg-slate-50 border-slate-200 text-slate-500";
  }
};

const getConfidenceStyle = (conf: string) => {
  switch (conf) {
    case "Very High":
      return "bg-indigo-50 border-indigo-200 text-indigo-800";
    case "High":
      return "bg-sky-50 border-sky-200 text-sky-800";
    case "Medium":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "Low":
      return "bg-rose-50 border-rose-200 text-rose-800";
    default:
      return "bg-slate-50 border-slate-200 text-slate-500";
  }
};

type TabKey = "overview" | "financials" | "valuation" | "ownership" | "risks" | "documents" | "whychange";

type MetadataState = {
  data: CompanyMetadata | null;
  loading: boolean;
  error: string | null;
};

const tabs: TabKey[] = ["overview", "financials", "valuation", "ownership", "risks", "documents", "whychange"];
const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  financials: "Fundamentals",
  valuation: "Valuation",
  ownership: "Quality",
  risks: "Risk",
  documents: "Data freshness",
  whychange: "Score changes",
};

function readTickerFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") ?? params.get("ticker") ?? "").toUpperCase().trim();
}

function readTabFromUrl(): TabKey {
  if (typeof window === "undefined") return "overview";
  const tab = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
  return tab && tabs.includes(tab) ? tab : "overview";
}

function formatLargeINR(value?: number | null): string {
  return uiFormatINR(value, true);
}

function formatDateTime(value?: string): string {
  if (!value) return "Data unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data unavailable";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function scoreFromLineage(factor: any): number | null {
  if (!factor || typeof factor.score !== "number" || !Number.isFinite(factor.score)) {
    return null;
  }
  return factor.score;
}

function adaptStockStoryResponse(data: any, financialsObj: any = null) {
  if (!data) {
    throw new Error("STOCKSTORY_SNAPSHOT_UNAVAILABLE");
  }

  const payload = data.data ?? data;
  if (data.status === "unavailable" || !payload) {
    return {
      apiStatus: "unavailable",
      unavailableReason: data.reason ?? data.code ?? "PREDICTION_NOT_FOUND",
      unavailableMessage: data.message ?? "No production prediction snapshot is available for this company.",
      dataState: data.dataState ?? null,
      confidence: "Unavailable",
      healthScore: null,
      rankingScore: null,
      classification: null,
      growth: null,
      quality: null,
      stability: null,
      valuation: null,
      momentum: null,
      risk: null,
      narrative: data.message ?? "No production prediction snapshot is available for this company.",
      factors: {},
      financials: financialsObj || {},
      engineDetails: {
        growth: { score: null, revenueGrowth: financialsObj?.revenue_growth ?? null, epsGrowth: financialsObj?.earnings_growth ?? null, fcfGrowth: null, profitGrowth: financialsObj?.profit_growth ?? null, commentary: "Scoring engine details are pending." },
        quality: { score: null, roe: financialsObj?.roe ?? null, roic: financialsObj?.roic ?? null, grossMargin: null, operatingMargin: financialsObj?.operating_margin ?? null, efficiencyScore: null, commentary: "Scoring engine details are pending." },
        stability: { score: null, debtScore: null, cashScore: null, volatilityScore: null, coverageScore: null, commentary: "Scoring engine details are pending." },
        momentum: { score: null, momentumScore: null, trendScore: null, volatilityScore: null, commentary: "Scoring engine details are pending." },
        valuation: { score: null, peScore: null, pbScore: null, evEbitdaScore: null, fcfYieldScore: null, commentary: "Scoring engine details are pending." },
        risk: { score: null, accountingAnomalyScore: null, debtStressScore: null, cashFlowStressScore: null, volatilityRiskScore: null, redFlagCount: 0, commentary: "Scoring engine details are pending." },
        confidence: {
          level: "Unavailable",
          score: null,
          dataCompleteness: typeof data.dataState?.completenessScore === "number" ? data.dataState.completenessScore : null,
          signalAgreement: null,
          riskConsistency: null,
          historicalStability: null,
          commentary: "No confidence score is shown because the prediction registry did not provide a usable production snapshot.",
        },
      },
    };
  }

  const factors = payload.factors;
  if (!factors) throw new Error("STOCKSTORY_FACTORS_MISSING");

  const growth = scoreFromLineage(factors.growth);
  const quality = scoreFromLineage(factors.quality);
  const stability = scoreFromLineage(factors.stability);
  const momentum = scoreFromLineage(factors.momentum);
  const valuation = scoreFromLineage(factors.value);
  const risk = scoreFromLineage(factors.risk);
  const confidenceScore = payload.confidence?.score ?? payload.confidenceScore ?? null;

  return {
    ...payload,
    apiStatus: data.status ?? "ok",
    dataState: data.dataState ?? null,
    confidence: payload.confidence?.level ?? payload.confidenceLevel ?? "Unavailable",
    growth,
    quality,
    stability,
    valuation,
    momentum,
    risk,
    financials: financialsObj || {},
    engineDetails: {
      growth: { score: growth, revenueGrowth: financialsObj?.revenue_growth ?? null, epsGrowth: financialsObj?.earnings_growth ?? null, fcfGrowth: null, profitGrowth: financialsObj?.profit_growth ?? null, commentary: `Source: ${factors.growth.source} (${factors.growth.snapshotDate}).` },
      quality: { score: quality, roe: financialsObj?.roe ?? null, roic: financialsObj?.roic ?? null, grossMargin: null, operatingMargin: financialsObj?.operating_margin ?? null, efficiencyScore: quality, commentary: `Source: ${factors.quality.source} (${factors.quality.snapshotDate}).` },
      stability: { score: stability, debtScore: null, cashScore: null, volatilityScore: null, coverageScore: stability, commentary: `Source: ${factors.stability.source} (${factors.stability.snapshotDate}).` },
      momentum: { score: momentum, momentumScore: momentum, trendScore: null, volatilityScore: null, commentary: `Source: ${factors.momentum.source} (${factors.momentum.snapshotDate}).` },
      valuation: { score: valuation, peScore: valuation, pbScore: valuation, evEbitdaScore: valuation, fcfYieldScore: valuation, commentary: `Source: ${factors.value.source} (${factors.value.snapshotDate}).` },
      risk: { score: risk, accountingAnomalyScore: risk, debtStressScore: risk, cashFlowStressScore: risk, volatilityRiskScore: risk, redFlagCount: typeof risk === "number" && risk >= 65 ? 1 : 0, commentary: `Source: ${factors.risk.source} (${factors.risk.snapshotDate}).` },
      confidence: {
        level: payload.confidence?.level ?? payload.confidenceLevel ?? "Unavailable",
        score: typeof confidenceScore === "number" ? confidenceScore : null,
        dataCompleteness: typeof data.dataState?.completenessScore === "number" ? data.dataState.completenessScore : null,
        signalAgreement: null,
        riskConsistency: null,
        historicalStability: null,
        commentary: `Source: ${payload.confidence?.source ?? "prediction_registry"} (${payload.confidence?.snapshotDate ?? payload.predictionDate ?? "Unavailable"}).`,
      },
    },
  };
}

export const StockStoryPage: React.FC = () => {
  const ticker = useMemo(() => readTickerFromUrl(), []);
  const registryStock = useMemo(() => StockRegistry.getStock(ticker), [ticker]);
  const liveQuote = useLiveQuote(ticker);
  const [activeTab, setActiveTab] = useState<TabKey>(() => readTabFromUrl());
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [noteText, setNoteText] = useState(() => NoteEngine.getNote(ticker).note);
  const [metadata, setMetadata] = useState<MetadataState>({ data: null, loading: true, error: null });

  const [story, setStory] = useState<any | null>(null);
  const [storyLoading, setStoryLoading] = useState<boolean>(true);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    RecentSearchStore.addTicker(ticker);
  }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    setMetadata({ data: null, loading: true, error: null });

    api.getMetadata(ticker, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setMetadata({ data, loading: false, error: null });
      })
      .catch((error: ApiError) => {
        if (controller.signal.aborted) return;
        setMetadata({ data: null, loading: false, error: "Company metadata is temporarily unavailable." });
      });

    return () => controller.abort();
  }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    setStoryLoading(true);
    setStoryError(null);

    const horizon = Number.parseInt(new URLSearchParams(window.location.search).get("horizon") ?? "30", 10);
    api.getStockStory(ticker, horizon, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setStory(data);
        setStoryLoading(false);
      })
      .catch((error: ApiError) => {
        if (controller.signal.aborted) return;
        setStoryError("Company health analysis is temporarily unavailable.");
        setStoryLoading(false);
      });

    return () => controller.abort();
  }, [ticker]);

  const [financials, setFinancials] = useState<any>(null);

  useEffect(() => {
    api.getCompanyFinancials(ticker)
      .then(data => setFinancials(data))
      .catch(() => setFinancials(null));
  }, [ticker]);

  const companyName =
    metadata.data?.companyName && metadata.data.companyName !== ticker
      ? metadata.data.companyName
      : registryStock?.companyName || ticker;
  const sector = metadata.data?.sector || registryStock?.sector || "Data unavailable";
  const industry = metadata.data?.industry || "Data unavailable";
  const exchange = metadata.data?.exchange || liveQuote.quote?.exchange || registryStock?.exchange || "Data unavailable";
  const marketCap = formatLargeINR(metadata.data?.marketCap);
  const currency = metadata.data?.currency || "INR";
  const quote = liveQuote.quote;
  const priceLabel = liveQuote.loading ? "Loading..." : quote ? formatINR(quote.price) : "Data unavailable";
  const changeLabel = quote ? `${formatINR(quote.change)} (${formatPercent(quote.changePercent)})` : "Data unavailable";
  const storyData = useMemo(() => {
    if (!story) {
      if (financials && financials.snapshot_date) {
        return adaptStockStoryResponse({ status: "unavailable" }, financials);
      }
      return null;
    }
    return adaptStockStoryResponse(story, financials);
  }, [story, financials]);
  const storyUnavailable = !story || storyData?.apiStatus === "unavailable";

  const isInWatchlist = useMemo(() => {
    return watchlists.some((w) => w.tickers.includes(ticker));
  }, [watchlists, ticker]);

  const relatedCompanies = useMemo(() => {
    if (!registryStock?.sector) return [];
    return StockRegistry.getAllStocks()
      .filter((stock) => stock.symbol !== ticker && stock.sector === registryStock.sector)
      .slice(0, 6);
  }, [registryStock?.sector, ticker]);

  const handleToggleWatchlist = () => {
    const defaultList = watchlists[0];
    if (!defaultList) return;
    if (isInWatchlist) WatchlistEngine.removeTicker(defaultList.id, ticker);
    else WatchlistEngine.addTicker(defaultList.id, ticker);
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const handleSaveNote = (value: string) => {
    setNoteText(value);
    NoteEngine.saveNote(ticker, value);
  };

  const navigateToPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    params.delete("tab");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", ticker);
    params.set("tab", tab);
    window.history.replaceState({}, "", `?${params.toString()}`);
  };

  if (storyLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 text-slate-900 antialiased">
        <div className="flex items-center justify-between gap-3 text-xs">
          <button
            onClick={() => navigateToPage("dashboard")}
            className="flex animate-pulse items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider text-emerald-800 transition-colors hover:text-emerald-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700"></div>
            <span className="text-sm font-semibold tracking-wider text-slate-600 uppercase">Loading company research...</span>
          </div>
        </div>
      </div>
    );
  }

  const hasFinancials = financials && financials.snapshot_date;
  if (!storyData || (storyUnavailable && !hasFinancials)) {
    const missingInputs = Array.isArray(storyData?.dataState?.missingInputs)
      ? storyData.dataState.missingInputs.filter(Boolean)
      : [];
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 text-slate-900 antialiased">
        <div className="flex items-center justify-between gap-3 text-xs">
          <button
            onClick={() => navigateToPage("dashboard")}
            className="flex w-fit items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider text-emerald-800 transition-colors hover:text-emerald-700 font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>

        <section className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 font-sans">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                <span>{ticker}</span>
                <span>•</span>
                <span>{exchange !== "Data unavailable" ? exchange : "NSE / BSE"}</span>
                <span>•</span>
                <span>{currency}</span>
              </div>
              <h1 className="max-w-2xl truncate text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{companyName}</h1>
              <div className="mt-3 inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-800">
                Company not indexed yet
              </div>
            </div>

            <div className="grid min-w-[260px] grid-cols-2 gap-4 rounded-lg border border-slate-200/80 bg-slate-50/80 p-3.5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Live Quote</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900">{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {changeLabel}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Volume</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Data unavailable"}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-slate-400">Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200/80 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Why scoring is unavailable</h3>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
              This company is recognised but verified scoring factors are not yet ready. Live quotes may still appear when market data is available.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
            <button
              onClick={handleToggleWatchlist}
              className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-xs font-semibold transition-all ${
                isInWatchlist
                  ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-rose-700" : ""}`} />
              {isInWatchlist ? "Remove from Watchlist" : "Track via Watchlist"}
            </button>
            <button
              type="button"
              onClick={() => navigateToPage("search")}
              className="h-10 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Search Another Company
            </button>
            <button
              type="button"
              onClick={() => navigateToPage("methodology")}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View Scoring Methodology
            </button>
            <button
              type="button"
              onClick={() => navigateToPage("rankings")}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View Active Rankings
            </button>
          </div>

          {missingInputs.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Data sources pending</div>
              <div className="flex flex-wrap gap-2">
                {missingInputs.map((input: string) => (
                  <span key={input} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 font-mono">
                    {input}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">My Research Notes</div>
          <textarea
            value={noteText}
            onChange={(event) => handleSaveNote(event.target.value)}
            placeholder="Add your own research notes for this company..."
            className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const healthScore = typeof storyData.healthScore === "number" && Number.isFinite(storyData.healthScore)
    ? storyData.healthScore
    : null;
  const strokeDashoffset = circumference - ((healthScore ?? 0) / 100) * circumference;

  const renderProgressBar = (label: string, score: number | null, colorClass: string) => {
    const hasScore = typeof score === "number" && Number.isFinite(score);
    const barColors: Record<string, string> = {
      "text-fuchsia-700": "bg-fuchsia-500",
      "text-emerald-700": "bg-emerald-500",
      "text-sky-700": "bg-sky-500",
      "text-orange-700": "bg-orange-500",
      "text-amber-700": "bg-amber-500",
      "text-rose-700": "bg-rose-500",
      "text-indigo-700": "bg-indigo-500",
    };
    const barColor = barColors[colorClass] || "bg-slate-400";
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-600">{label}</span>
          <span className={colorClass}>{hasScore ? formatScore(score) : "Not available"}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: hasScore ? `${score}%` : "0%" }}
          />
        </div>
      </div>
    );
  };

  const formatGrowthValue = (val: number | null) => {
    if (val === null || val === undefined) return <span className="text-slate-400">Unavailable</span>;
    const isPos = val >= 0;
    return (
      <span className={`font-mono font-bold ${isPos ? "text-emerald-700" : "text-rose-700"}`}>
        {isPos ? "+" : ""}{(val * 100).toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 text-slate-900 antialiased">
      <div className="flex items-center justify-between gap-3 text-xs">
        <button
          onClick={() => navigateToPage("dashboard")}
          className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider text-emerald-700 transition-colors hover:text-emerald-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </button>
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-200">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-slate-200"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke="#059669"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">{healthScore !== null ? Math.round(healthScore) : "N/A"}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-700">Score</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>{ticker}</span>
                <span>•</span>
                <span>{exchange}</span>
                <span>•</span>
                <span>{currency}</span>
              </div>
              <h1 className="max-w-xl text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl truncate">{companyName}</h1>
              
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getClassificationStyle(storyData.classification)}`}>
                  {storyData.classification ?? "Unavailable"}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getConfidenceStyle(storyData.confidence)}`}>
                  {storyData.confidence} Confidence
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <div className="grid grid-cols-2 gap-6 bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Live Price</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-900">{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {changeLabel}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Volume</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-900">
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Data unavailable"}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-slate-400">Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Explanation
          </div>
          <p className="text-xs text-slate-700 leading-relaxed max-w-5xl">
            {storyData.narrative}
          </p>
          <p className="mt-3 max-w-5xl rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            Research signals are for informational purposes only. Not personalised investment advice.
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleToggleWatchlist}
          className={`flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-semibold transition-all ${
            isInWatchlist
              ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-rose-700" : ""}`} />
          {isInWatchlist ? "Remove From Watchlist" : "Add To Watchlist"}
        </button>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">My Research Notes</div>
        <textarea
          value={noteText}
          onChange={(event) => handleSaveNote(event.target.value)}
          placeholder="Add your own research notes for this company..."
          className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={`h-10 shrink-0 border-b-2 bg-transparent px-4 text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? "border-emerald-700 text-emerald-700 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="min-h-[300px] rounded-xl border border-slate-200/80 bg-white p-6">
        
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-5 bg-slate-50/50 border border-slate-200/80 rounded-xl p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Factor Breakdown
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("Growth Outlook", storyData.growth, "text-fuchsia-700")}
                {renderProgressBar("Business Quality", storyData.quality, "text-emerald-700")}
                {renderProgressBar("Financial Stability", storyData.stability, "text-sky-700")}
                {renderProgressBar("Market Momentum", storyData.momentum, "text-orange-700")}
                {renderProgressBar("Value & Margins", storyData.valuation, "text-amber-700")}
              </div>
              <div className="text-[9px] text-slate-500 leading-normal mt-3 pt-3 border-t border-slate-200">
                Composite score is the average of available factor scores. Missing factors are shown as unavailable.
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Building2 className="h-3.5 w-3.5" /> Corporate Profile
                </div>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <dt className="text-slate-500">Sector</dt>
                    <dd className="text-right text-slate-800 font-semibold">{sector}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <dt className="text-slate-500">Industry</dt>
                    <dd className="text-right text-slate-800 font-semibold truncate max-w-[180px]">{industry}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-200 pb-2">
                    <dt className="text-slate-500">Market Cap</dt>
                    <dd className="text-right font-mono text-slate-800 font-semibold">{marketCap}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Data Policy</dt>
                    <dd className="text-right text-slate-700 font-semibold">Source-backed only</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeTab === "financials" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-fuchsia-700 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Growth Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 font-bold">
                  Score: {formatScore(storyData.growth)}
                </span>
              </div>
              
              <dl className="space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Revenue Growth (QoQ/YoY)</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.revenueGrowth)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">EPS Growth</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.epsGrowth)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Profit Growth</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.profitGrowth)}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt className="text-slate-500">Free Cash Flow (FCF) Growth</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.fcfGrowth)}</dd>
                </div>
              </dl>
              <div className="rounded-lg bg-fuchsia-50 border border-fuchsia-100 p-3 text-xs text-fuchsia-700 leading-normal">
                {storyData.engineDetails.growth.commentary}
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4" /> Quality Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  Score: {formatScore(storyData.quality)}
                </span>
              </div>
              
              <dl className="space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Return on Equity (ROE)</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.roe)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Return on Invested Capital (ROIC)</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.roic)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Gross Profit Margin</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.grossMargin)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Operating Profit Margin</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.operatingMargin)}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt className="text-slate-500">Asset Efficiency Score</dt>
                  <dd className="font-mono font-bold text-slate-900">{formatScore(storyData.engineDetails.quality.efficiencyScore)}</dd>
                </div>
              </dl>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 leading-normal">
                {storyData.engineDetails.quality.commentary}
              </div>
            </div>
          </div>
        )}

        {activeTab === "valuation" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Valuation Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-bold">
                  Score: {formatScore(storyData.valuation)}
                </span>
              </div>
              
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("PE Multiples Rating", storyData.engineDetails.valuation.peScore, "text-amber-700")}
                {renderProgressBar("Price to Book (PB) Rating", storyData.engineDetails.valuation.pbScore, "text-amber-700")}
                {renderProgressBar("EV/EBITDA Rating", storyData.engineDetails.valuation.evEbitdaScore, "text-amber-700")}
                {renderProgressBar("Free Cash Flow Yield Rating", storyData.engineDetails.valuation.fcfYieldScore, "text-amber-700")}
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 leading-normal">
                {storyData.engineDetails.valuation.commentary}
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                Raw Valuation Multiples
              </div>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <dt className="text-slate-500">P/E Ratio</dt>
                  <dd className="font-mono text-slate-900 font-bold">{formatNumber(storyData.financials.peRatio)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <dt className="text-slate-500">P/B Ratio</dt>
                  <dd className="font-mono text-slate-900 font-bold">{formatNumber(storyData.financials.pbRatio)}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <dt className="text-slate-500">EV/EBITDA</dt>
                  <dd className="font-mono text-slate-900 font-bold">{formatNumber(storyData.financials.evEbitda)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">FCF Yield</dt>
                  <dd className="font-mono text-slate-900 font-bold">{localFormatPercent(storyData.financials.fcfYield)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === "ownership" && (
          <div className="space-y-6">
            {ownership ? (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-sky-700 border-b border-slate-200 pb-3">
                    Shareholding Breakdown
                  </h3>
                  <div className="space-y-4">
                    {ownership.categories && ownership.categories.map((c: any) => {
                      const pct = parseFloat(c.share) || 0;
                      return (
                        <div key={c.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700">{c.category}</span>
                            <span className="text-slate-500">{c.share} <span className="text-[10px] text-sky-700 font-normal">({c.change})</span></span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                    Institutional Stance
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed my-4">
                    {ownership.comment}
                  </p>
                  <div className="text-[9px] text-slate-400 italic">
                    * Sourced from quarterly shareholding declarations to the stock exchange.
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Ownership and shareholding data is not available from the connected data providers yet.
              </div>
            )}
          </div>
        )}

        {activeTab === "risks" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Risk Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                  Risk Level: {formatScore(storyData.risk)}
                </span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {renderProgressBar("Accounting Anomalies", storyData.engineDetails.risk.accountingAnomalyScore, "text-rose-700")}
                {renderProgressBar("Leverage Stress Score", storyData.engineDetails.risk.debtStressScore, "text-rose-700")}
                {renderProgressBar("Cash Flow Strains", storyData.engineDetails.risk.cashFlowStressScore, "text-rose-700")}
                {renderProgressBar("Price Volatility Risk", storyData.engineDetails.risk.volatilityRiskScore, "text-rose-700")}
              </div>
              
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 leading-normal flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-[10px] uppercase text-rose-700 mb-1">{storyData.engineDetails.risk.redFlagCount} RED FLAGS DETECTED</span>
                  {storyData.engineDetails.risk.commentary}
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" /> Confidence Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
                  Reliability: {storyData.confidence}
                </span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {renderProgressBar("Data Completeness", storyData.engineDetails.confidence.dataCompleteness, "text-indigo-700")}
                {renderProgressBar("Signal Agreement", storyData.engineDetails.confidence.signalAgreement, "text-indigo-700")}
                {renderProgressBar("Risk Consistency", storyData.engineDetails.confidence.riskConsistency, "text-indigo-700")}
                {renderProgressBar("Historical Stability", storyData.engineDetails.confidence.historicalStability, "text-indigo-700")}
              </div>
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-700 leading-normal">
                {storyData.engineDetails.confidence.commentary}
              </div>
            </div>
          </div>
        )}

        {activeTab === "whychange" && (
          <div>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-3">
              <Activity className="h-4 w-4 text-emerald-700" /> Why It Changed
            </div>
            <WhyItChangedTab symbol={ticker} />
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-3">
                <FileText className="h-4 w-4 text-emerald-700" /> Corporate Actions & Timeline
              </div>
              
              {timeline.length > 0 ? (
                <div className="relative border-l border-slate-200 ml-3.5 pl-5 space-y-6 text-xs">
                  {timeline.map((evt, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white"></span>
                      <div className="font-mono text-[10px] font-extrabold text-emerald-700 mb-1">{evt.date}</div>
                      <div className="font-bold text-slate-900 text-sm mb-1">{evt.event}</div>
                      <p className="text-slate-600 leading-relaxed">{evt.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Corporate actions timeline is not available from the connected data providers yet.
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-3">
                <FileText className="h-4 w-4 text-emerald-700" /> Data Source & Freshness
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Financial Data</div>
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Snapshot date</dt>
                      <dd className="font-mono text-slate-800">{normalizeDate(financials?.snapshot_date) || "Unavailable"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Sources</dt>
                      <dd><SourceBadge source="Provider filings" /></dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prediction Data</div>
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Prediction date</dt>
                      <dd className="font-mono text-slate-800">{normalizeDate(storyData?.dataState?.asOf) || normalizeDate(storyData?.predictionDate) || "Unavailable"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Freshness</dt>
                      <dd><DataFreshnessBadge date={storyData?.predictionDate ?? null} /></dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Status</dt>
                      <dd><CoverageStatusBadge status={storyData?.apiStatus === "ok" ? "available" : null} /></dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {relatedCompanies.length > 0 && (
        <section className="border-t border-slate-200 pt-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Same Sector Companies</div>
          <div className="flex flex-wrap gap-3">
            {relatedCompanies.map((company) => (
              <button
                key={company.symbol}
                onClick={() => navigateToStock({ ticker: company.symbol, mode: "push" })}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-left transition-all hover:border-emerald-200 hover:bg-white"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900">{company.symbol}</div>
                  <div className="max-w-[160px] truncate text-[10px] text-slate-500">{company.companyName}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-700" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StockStoryPage;
