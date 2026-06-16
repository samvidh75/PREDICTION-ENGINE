import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, FileText, Star, Trophy, Sparkles, Flame, TrendingUp, Activity } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import type { CompanyMetadata } from "../services/data/types";
import WhyItChangedTab from "../components/intelligence/WhyItChangedTab";
import { formatNumber, formatPercentage as localFormatPercent, formatINR as uiFormatINR, normalizeDate, formatScore as formatScoreAdapter, formatFreshness } from "../services/ui/dataFormatting";


const getClassificationStyle = (cls: string) => {
  switch (cls) {
    case "Exceptional":
    case "Excellent":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "Good":
      return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
    case "Fair":
      return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    case "Weak":
      return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    case "Critical":
      return "bg-rose-500/10 border-rose-500/30 text-rose-400";
    case "Healthy":
      return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
    case "Stable":
      return "bg-neutral-500/10 border-neutral-500/30 text-neutral-400";
    case "Weakening":
      return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    case "At Risk":
      return "bg-rose-500/10 border-rose-500/30 text-rose-400";
    default:
      return "bg-white/5 border-white/10 text-white/60";
  }
};

const getConfidenceStyle = (conf: string) => {
  switch (conf) {
    case "Very High":
      return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
    case "High":
      return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
    case "Medium":
      return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    case "Low":
      return "bg-rose-500/10 border-rose-500/30 text-rose-400";
    default:
      return "bg-white/5 border-white/10 text-white/60";
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

function formatScoreLabel(value: number | null | undefined, suffix = "/100"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not available";
  return `${Math.round(value)}${suffix}`;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.015] p-5 text-sm text-white/45">
      {label} is not available from the connected data providers yet.
    </div>
  );
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

    fetch(`/api/market-data/metadata/${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.code || "METADATA_UNAVAILABLE");
        return body as CompanyMetadata;
      })
      .then((data) => setMetadata({ data, loading: false, error: null }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setMetadata({ data: null, loading: false, error: "Company metadata is temporarily unavailable." });
      });

    return () => controller.abort();
  }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    setStoryLoading(true);
    setStoryError(null);

    fetch(`/api/stockstory/${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.code || "STOCKSTORY_UNAVAILABLE");
        return body;
      })
      .then((data) => {
        setStory(data);
        setStoryLoading(false);
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setStoryError("Company health analysis is temporarily unavailable.");
        setStoryLoading(false);
      });

    return () => controller.abort();
  }, [ticker]);

  const [financials, setFinancials] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/company/${encodeURIComponent(ticker)}/financials`)
      .then(res => res.json())
      .then(data => setFinancials(data))
      .catch(() => setFinancials(null));

    fetch(`/api/company/${encodeURIComponent(ticker)}/ownership`)
      .then(res => res.json())
      .then(data => setOwnership(data))
      .catch(() => setOwnership(null));

    fetch(`/api/company/${encodeURIComponent(ticker)}/timeline`)
      .then(res => res.json())
      .then(data => setTimeline(data))
      .catch(() => setTimeline([]));
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

        <section className="rounded-lg border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-6">
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
            <h3 className="text-sm font-semibold text-slate-900">Why scores are unavailable</h3>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
              This company is in the equity universe, but verified analytical factors are not ready for this symbol. Live quote fields may still appear when provider data is available.
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
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Awaiting Ingestion Inputs</div>
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
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-white/60">{label}</span>
          <span className={colorClass}>{hasScore ? formatScoreLabel(score) : "Not available"}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              colorClass.includes("fuchsia") ? "bg-sky-500" :
              colorClass.includes("emerald") ? "bg-emerald-500" :
              colorClass.includes("cyan") ? "bg-cyan-500" :
              colorClass.includes("orange") ? "bg-orange-500" :
              colorClass.includes("amber") ? "bg-amber-500" :
              colorClass.includes("rose") ? "bg-rose-500" : "bg-white/40"
            }`}
            style={{ width: hasScore ? `${score}%` : "0%" }}
          />
        </div>
      </div>
    );
  };

  const formatGrowthValue = (val: number | null) => {
    if (val === null || val === undefined) return <span className="text-white/30">Unavailable</span>;
    const isPos = val >= 0;
    return (
      <span className={`font-mono font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
        {isPos ? "+" : ""}{(val * 100).toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 text-white antialiased">
      <div className="flex items-center justify-between gap-3 text-xs">
        <button
          onClick={() => navigateToPage("dashboard")}
          className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider text-cyan-400 transition-colors hover:text-cyan-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </button>
      </div>

      {/* --- COMPANY RESEARCH HEADER --- */}
      <section className="rounded-xl border border-white/10 bg-white/[0.015] p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-white/[0.01] border border-white/10">
              <svg className="h-full w-full -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  className="stroke-white/5"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r={radius}
                  stroke="#06b6d4"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold tracking-tight text-white">{healthScore !== null ? Math.round(healthScore) : "N/A"}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-cyan-400">Score</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/45">
                <span>{ticker}</span>
                <span>•</span>
                <span>{exchange}</span>
                <span>•</span>
                <span>{currency}</span>
              </div>
              <h1 className="max-w-xl text-2xl font-extrabold tracking-tight text-white md:text-3xl truncate">{companyName}</h1>
              
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
            <div className="grid grid-cols-2 gap-6 bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-white/30">Live Price</div>
                <div className="mt-1 font-mono text-xl font-bold text-white">{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {changeLabel}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-white/30">Volume</div>
                <div className="mt-1 font-mono text-xl font-bold text-white">
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Data unavailable"}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-white/35">Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-white/5 pt-4">
          <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Explanation
          </div>
          <p className="text-xs text-white/80 leading-relaxed max-w-5xl">
            {storyData.narrative}
          </p>
          <p className="mt-3 max-w-5xl rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/55">
            StockStory provides research intelligence and health assessments.
            It does not provide personalised investment advice.
          </p>
        </div>
      </section>

      {/* --- QUICK ACTION CONTROLS --- */}
      <section className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleToggleWatchlist}
          className={`flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-semibold transition-all ${
            isInWatchlist
              ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-rose-400" : ""}`} />
          {isInWatchlist ? "Remove From Watchlist" : "Add To Watchlist"}
        </button>
      </section>

      {/* --- RESEARCH NOTE --- */}
      <div className="rounded-xl border border-white/5 bg-white/[0.015] p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">My Research Notes</div>
        <textarea
          value={noteText}
          onChange={(event) => handleSaveNote(event.target.value)}
          placeholder="Add your own research notes for this company..."
          className="h-20 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/25 outline-none transition-colors focus:border-cyan-400"
        />
      </div>

      {/* --- TABS --- */}
      <div className="flex gap-2 overflow-x-auto border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={`h-10 shrink-0 border-b-2 bg-transparent px-4 text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? "border-cyan-400 text-cyan-400 font-extrabold" : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT PANEL --- */}
      <div className="min-h-[300px] rounded-xl border border-white/5 bg-white/[0.01] p-6">
        
        {/* === TAB 1: OVERVIEW === */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-5 bg-white/[0.01] border border-white/5 rounded-xl p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-2 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Factor Breakdown
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("Growth Outlook", storyData.growth, "text-fuchsia-400")}
                {renderProgressBar("Business Quality", storyData.quality, "text-emerald-400")}
                {renderProgressBar("Financial Stability", storyData.stability, "text-cyan-400")}
                {renderProgressBar("Market Momentum", storyData.momentum, "text-orange-400")}
                {renderProgressBar("Value & Margins", storyData.valuation, "text-amber-400")}
              </div>
              <div className="text-[9px] text-white/35 leading-normal mt-3 pt-3 border-t border-white/5">
                * Composite score is the average of available real factor scores from the prediction registry. Missing factors are shown as unavailable, not filled.
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                  <Building2 className="h-3.5 w-3.5" /> Corporate Profile
                </div>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                    <dt className="text-white/45">Sector</dt>
                    <dd className="text-right text-white/80 font-semibold">{sector}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                    <dt className="text-white/45">Industry</dt>
                    <dd className="text-right text-white/80 font-semibold truncate max-w-[180px]">{industry}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                    <dt className="text-white/45">Market Cap</dt>
                    <dd className="text-right font-mono text-white/80 font-semibold">{marketCap}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/45">Data Policy</dt>
                    <dd className="text-right text-white/70 font-semibold">Source-backed only</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* === TAB 2: FINANCIALS === */}
        {activeTab === "financials" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Growth Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 font-bold">
                  Score: {formatScoreLabel(storyData.growth)}
                </span>
              </div>
              
              <dl className="space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-white/50">Revenue Growth (QoQ/YoY)</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.revenueGrowth)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-white/50">EPS Growth</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.epsGrowth)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-white/50">Profit Growth</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.profitGrowth)}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt className="text-white/50">Free Cash Flow (FCF) Growth</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.growth.fcfGrowth)}</dd>
                </div>
              </dl>
              <div className="rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/10 p-3 text-xs text-fuchsia-300/80 leading-normal">
                {storyData.engineDetails.growth.commentary}
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4" /> Quality Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                  Score: {formatScoreLabel(storyData.quality)}
                </span>
              </div>
              
              <dl className="space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-white/50">Return on Equity (ROE)</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.roe)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-white/50">Return on Invested Capital (ROIC)</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.roic)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-white/50">Gross Profit Margin</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.grossMargin)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <dt className="text-white/50">Operating Profit Margin</dt>
                  <dd>{formatGrowthValue(storyData.engineDetails.quality.operatingMargin)}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt className="text-white/50">Asset Efficiency Score</dt>
                  <dd className="font-mono font-bold text-white">{formatScoreLabel(storyData.engineDetails.quality.efficiencyScore)}</dd>
                </div>
              </dl>
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-xs text-emerald-300/80 leading-normal">
                {storyData.engineDetails.quality.commentary}
              </div>
            </div>
          </div>
        )}

        {/* === TAB 3: VALUATION === */}
        {activeTab === "valuation" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Valuation Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                  Score: {formatScoreLabel(storyData.valuation)}
                </span>
              </div>
              
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("PE Multiples Rating", storyData.engineDetails.valuation.peScore, "text-amber-400")}
                {renderProgressBar("Price to Book (PB) Rating", storyData.engineDetails.valuation.pbScore, "text-amber-400")}
                {renderProgressBar("EV/EBITDA Rating", storyData.engineDetails.valuation.evEbitdaScore, "text-amber-400")}
                {renderProgressBar("Free Cash Flow Yield Rating", storyData.engineDetails.valuation.fcfYieldScore, "text-amber-400")}
              </div>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 text-xs text-amber-300/80 leading-normal">
                {storyData.engineDetails.valuation.commentary}
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 border-b border-white/5 pb-2">
                Raw Valuation Multiples
              </div>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <dt className="text-white/50">P/E Ratio</dt>
                  <dd className="font-mono text-white font-bold">{formatNumber(storyData.financials.peRatio)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <dt className="text-white/50">P/B Ratio</dt>
                  <dd className="font-mono text-white font-bold">{formatNumber(storyData.financials.pbRatio)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <dt className="text-white/50">EV/EBITDA</dt>
                  <dd className="font-mono text-white font-bold">{formatNumber(storyData.financials.evEbitda)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/50">FCF Yield</dt>
                  <dd className="font-mono text-white font-bold">{localFormatPercent(storyData.financials.fcfYield)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* === TAB 4: OWNERSHIP === */}
        {activeTab === "ownership" && (
          <div className="space-y-6">
            {ownership ? (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400 border-b border-white/5 pb-3">
                    Shareholding Breakdown
                  </h3>
                  <div className="space-y-4">
                    {ownership.categories && ownership.categories.map((c: any) => {
                      const pct = parseFloat(c.share) || 0;
                      return (
                        <div key={c.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-white/70">{c.category}</span>
                            <span className="text-white/40">{c.share} <span className="text-[10px] text-cyan-400 font-normal">({c.change})</span></span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 border-b border-white/5 pb-2">
                    Institutional Stance
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed my-4">
                    {ownership.comment}
                  </p>
                  <div className="text-[9px] text-white/30 italic">
                    * Sourced from quarterly shareholding declarations to the stock exchange.
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState label="Ownership and shareholding data" />
            )}
          </div>
        )}

        {/* === TAB 5: RISKS === */}
        {activeTab === "risks" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Risk Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
                  Risk Level: {formatScoreLabel(storyData.risk)}
                </span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {renderProgressBar("Accounting Anomalies", storyData.engineDetails.risk.accountingAnomalyScore, "text-rose-400")}
                {renderProgressBar("Leverage Stress Score", storyData.engineDetails.risk.debtStressScore, "text-rose-400")}
                {renderProgressBar("Cash Flow Strains", storyData.engineDetails.risk.cashFlowStressScore, "text-rose-400")}
                {renderProgressBar("Price Volatility Risk", storyData.engineDetails.risk.volatilityRiskScore, "text-rose-400")}
              </div>
              
              <div className="rounded-lg bg-rose-500/5 border border-rose-500/10 p-3 text-xs text-rose-300/80 leading-normal flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-[10px] uppercase text-rose-400 mb-1">{storyData.engineDetails.risk.redFlagCount} RED FLAGS DETECTED</span>
                  {storyData.engineDetails.risk.commentary}
                </div>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" /> Confidence Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold">
                  Reliability: {storyData.confidence}
                </span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {renderProgressBar("Data Completeness", storyData.engineDetails.confidence.dataCompleteness, "text-indigo-400")}
                {renderProgressBar("Signal Agreement", storyData.engineDetails.confidence.signalAgreement, "text-indigo-400")}
                {renderProgressBar("Risk Consistency", storyData.engineDetails.confidence.riskConsistency, "text-indigo-400")}
                {renderProgressBar("Historical Stability", storyData.engineDetails.confidence.historicalStability, "text-indigo-400")}
              </div>
              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3 text-xs text-indigo-300/80 leading-normal">
                {storyData.engineDetails.confidence.commentary}
              </div>
            </div>
          </div>
        )}

        {/* === TAB 7: WHY IT CHANGED === */}
        {activeTab === "whychange" && (
          <div>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30 border-b border-white/5 pb-3">
              <Activity className="h-4 w-4 text-emerald-400" /> Why It Changed
            </div>
            <WhyItChangedTab symbol={ticker} />
          </div>
        )}

        {/* === TAB 6: DOCUMENTS === */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30 border-b border-white/5 pb-3">
                <FileText className="h-4 w-4 text-cyan-400" /> Corporate Actions & Timeline
              </div>
              
              {timeline.length > 0 ? (
                <div className="relative border-l border-white/10 ml-3.5 pl-5 space-y-6 text-xs">
                  {timeline.map((evt, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-cyan-500 ring-4 ring-black/40"></span>
                      <div className="font-mono text-[10px] font-extrabold text-cyan-400 mb-1">{evt.date}</div>
                      <div className="font-bold text-white text-sm mb-1">{evt.event}</div>
                      <p className="text-white/60 leading-relaxed">{evt.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="Corporate actions timeline" />
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30 border-b border-white/5 pb-3">
                <FileText className="h-4 w-4 text-cyan-400" /> Data Source & Freshness
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">Financial Data</div>
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-white/50">Snapshot date</dt>
                      <dd className="font-mono text-white/80">{normalizeDate(financials?.snapshot_date) || "Unavailable"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-white/50">Sources</dt>
                      <dd className="font-mono text-white/80">Provider filings</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/30">Prediction Data</div>
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-white/50">Prediction date</dt>
                      <dd className="font-mono text-white/80">{normalizeDate(storyData?.dataState?.asOf) || normalizeDate(storyData?.predictionDate) || "Unavailable"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-white/50">Freshness</dt>
                      <dd className="font-mono text-white/80">{storyData?.predictionDate ? formatFreshness(storyData.predictionDate) : "Unavailable"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-white/50">Status</dt>
                      <dd className="font-mono text-white/80">{storyData?.apiStatus === "ok" ? "Available" : "Unavailable"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {relatedCompanies.length > 0 && (
        <section className="border-t border-white/5 pt-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/40">Same Sector Companies</div>
          <div className="flex flex-wrap gap-3">
            {relatedCompanies.map((company) => (
              <button
                key={company.symbol}
                onClick={() => navigateToStock({ ticker: company.symbol, mode: "push" })}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2.5 text-left transition-all hover:border-cyan-500/20 hover:bg-white/[0.03]"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-white">{company.symbol}</div>
                  <div className="max-w-[160px] truncate text-[10px] text-white/40">{company.companyName}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StockStoryPage;
