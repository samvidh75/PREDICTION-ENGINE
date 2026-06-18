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
import { useToast } from "../components/feedback/useToast";

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

type MetadataState = { data: CompanyMetadata | null; loading: boolean; error: string | null; };

const tabs: TabKey[] = ["overview", "financials", "valuation", "ownership", "risks", "documents", "whychange"];
const TAB_LABELS: Record<TabKey, string> = { overview: "Overview", financials: "Fundamentals", valuation: "Valuation", ownership: "Quality", risks: "Risk", documents: "Data freshness", whychange: "Score changes" };

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
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function scoreFromLineage(factor: any): number | null {
  if (!factor || typeof factor.score !== "number" || !Number.isFinite(factor.score)) return null;
  return factor.score;
}

function adaptStockStoryResponse(data: any, financialsObj: any = null) {
  if (!data) throw new Error("STOCKSTORY_SNAPSHOT_UNAVAILABLE");
  const payload = data.data ?? data;

  if (data.status === "unavailable" || !payload) {
    return {
      apiStatus: "unavailable",
      unavailableReason: data.reason ?? data.code ?? "PREDICTION_NOT_FOUND",
      unavailableMessage: data.message ?? "No production prediction snapshot is available for this company.",
      dataState: data.dataState ?? null,
      confidence: "Unavailable", healthScore: null, rankingScore: null, classification: null,
      growth: null, quality: null, stability: null, valuation: null, momentum: null, risk: null,
      narrative: data.message ?? "No production prediction snapshot is available for this company.",
      factors: {}, financials: financialsObj || {},
      engineDetails: {
        growth: { score: null, revenueGrowth: financialsObj?.revenue_growth ?? null, epsGrowth: financialsObj?.earnings_growth ?? null, fcfGrowth: null, profitGrowth: financialsObj?.profit_growth ?? null, commentary: "Factor scoring details are pending." },
        quality: { score: null, roe: financialsObj?.roe ?? null, roic: financialsObj?.roic ?? null, grossMargin: null, operatingMargin: financialsObj?.operating_margin ?? null, efficiencyScore: null, commentary: "Factor scoring details are pending." },
        stability: { score: null, debtScore: null, cashScore: null, volatilityScore: null, coverageScore: null, commentary: "Factor scoring details are pending." },
        momentum: { score: null, momentumScore: null, trendScore: null, volatilityScore: null, commentary: "Factor scoring details are pending." },
        valuation: { score: null, peScore: null, pbScore: null, evEbitdaScore: null, fcfYieldScore: null, commentary: "Factor scoring details are pending." },
        risk: { score: null, accountingAnomalyScore: null, debtStressScore: null, cashFlowStressScore: null, volatilityRiskScore: null, redFlagCount: 0, commentary: "Factor scoring details are pending." },
        confidence: { level: "Unavailable", score: null, dataCompleteness: typeof data.dataState?.completenessScore === "number" ? data.dataState.completenessScore : null, signalAgreement: null, riskConsistency: null, historicalStability: null, commentary: "No confidence score is shown because the prediction system did not provide a usable production snapshot." },
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
    growth, quality, stability, valuation, momentum, risk,
    financials: financialsObj || {},
    engineDetails: {
      growth: { score: growth, revenueGrowth: financialsObj?.revenue_growth ?? null, epsGrowth: financialsObj?.earnings_growth ?? null, fcfGrowth: null, profitGrowth: financialsObj?.profit_growth ?? null, commentary: `Source: ${factors.growth.source} (${factors.growth.snapshotDate}).` },
      quality: { score: quality, roe: financialsObj?.roe ?? null, roic: financialsObj?.roic ?? null, grossMargin: null, operatingMargin: financialsObj?.operating_margin ?? null, efficiencyScore: quality, commentary: `Source: ${factors.quality.source} (${factors.quality.snapshotDate}).` },
      stability: { score: stability, debtScore: null, cashScore: null, volatilityScore: null, coverageScore: stability, commentary: `Source: ${factors.stability.source} (${factors.stability.snapshotDate}).` },
      momentum: { score: momentum, momentumScore: momentum, trendScore: null, volatilityScore: null, commentary: `Source: ${factors.momentum.source} (${factors.momentum.snapshotDate}).` },
      valuation: { score: valuation, peScore: valuation, pbScore: valuation, evEbitdaScore: valuation, fcfYieldScore: valuation, commentary: `Source: ${factors.value.source} (${factors.value.snapshotDate}).` },
      risk: { score: risk, accountingAnomalyScore: risk, debtStressScore: risk, cashFlowStressScore: risk, volatilityRiskScore: risk, redFlagCount: typeof risk === "number" && risk >= 65 ? 1 : 0, commentary: `Source: ${factors.risk.source} (${factors.risk.snapshotDate}).` },
      confidence: { level: payload.confidence?.level ?? payload.confidenceLevel ?? "Unavailable", score: typeof confidenceScore === "number" ? confidenceScore : null, dataCompleteness: typeof data.dataState?.completenessScore === "number" ? data.dataState.completenessScore : null, signalAgreement: null, riskConsistency: null, historicalStability: null, commentary: `Source: ${payload.confidence?.source ?? "prediction_registry"} (${payload.confidence?.snapshotDate ?? payload.predictionDate ?? "Unavailable"}).` },
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
  const toast = useToast();
  const [story, setStory] = useState<any | null>(null);
  const [storyLoading, setStoryLoading] = useState<boolean>(true);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => { RecentSearchStore.addTicker(ticker); }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    setMetadata({ data: null, loading: true, error: null });
    api.getMetadata(ticker, { signal: controller.signal }).then((data) => { if (controller.signal.aborted) return; setMetadata({ data, loading: false, error: null }); }).catch(() => { if (controller.signal.aborted) return; setMetadata({ data: null, loading: false, error: "Company metadata is temporarily unavailable." }); });
    return () => controller.abort();
  }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    setStoryLoading(true); setStoryError(null);
    const horizon = Number.parseInt(new URLSearchParams(window.location.search).get("horizon") ?? "30", 10);
    api.getStockStory(ticker, horizon, { signal: controller.signal }).then((data) => { if (controller.signal.aborted) return; setStory(data); setStoryLoading(false); }).catch(() => { if (controller.signal.aborted) return; setStoryError("Company health analysis is temporarily unavailable."); setStoryLoading(false); });
    return () => controller.abort();
  }, [ticker]);

  const [financials, setFinancials] = useState<any>(null);
  useEffect(() => { api.getCompanyFinancials(ticker).then(data => setFinancials(data)).catch(() => setFinancials(null)); }, [ticker]);

  const companyName = metadata.data?.companyName && metadata.data.companyName !== ticker ? metadata.data.companyName : registryStock?.companyName || ticker;
  const sector = metadata.data?.sector || registryStock?.sector || "Data unavailable";
  const industry = metadata.data?.industry || "Data unavailable";
  const exchange = metadata.data?.exchange || liveQuote.quote?.exchange || registryStock?.exchange || "Data unavailable";
  const marketCap = formatLargeINR(metadata.data?.marketCap);
  const currency = metadata.data?.currency || "INR";
  const quote = liveQuote.quote;
  const priceLabel = liveQuote.loading ? "Loading..." : quote ? formatINR(quote.price) : "Data unavailable";
  const changeLabel = quote ? `${formatINR(quote.change)} (${formatPercent(quote.changePercent)})` : "Data unavailable";

  const storyData = useMemo(() => {
    if (!story) { if (financials && financials.snapshot_date) return adaptStockStoryResponse({ status: "unavailable" }, financials); return null; }
    return adaptStockStoryResponse(story, financials);
  }, [story, financials]);
  const storyUnavailable = !story || storyData?.apiStatus === "unavailable";
  const isInWatchlist = useMemo(() => watchlists.some((w) => w.tickers.includes(ticker)), [watchlists, ticker]);

  const relatedCompanies = useMemo(() => {
    if (!registryStock?.sector) return [];
    return StockRegistry.getAllStocks().filter((stock) => stock.symbol !== ticker && stock.sector === registryStock.sector).slice(0, 6);
  }, [registryStock?.sector, ticker]);

  const handleToggleWatchlist = () => {
    const defaultList = watchlists[0];
    if (!defaultList) return;
    if (isInWatchlist) { WatchlistEngine.removeTicker(defaultList.id, ticker); toast.success(`${ticker} removed from watchlist`); }
    else { WatchlistEngine.addTicker(defaultList.id, ticker); toast.success(`${ticker} saved to watchlist`); }
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const handleSaveNote = (value: string) => { setNoteText(value); NoteEngine.saveNote(ticker, value); };

  const navigateToPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey); params.delete("id"); params.delete("tab");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock"); params.set("id", ticker); params.set("tab", tab);
    window.history.replaceState({}, "", `?${params.toString()}`);
  };

  if (storyLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 antialiased" style={{ color: "#0f1419" }}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <button onClick={() => navigateToPage("dashboard")} className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider hover:opacity-80 animate-pulse" style={{ color: "#1a6e4a" }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4" style={{ borderColor: "#e2e8f0", borderTopColor: "#1a6e4a" }} />
            <span className="text-sm font-semibold tracking-wider uppercase" style={{ color: "#536471" }}>Loading company research...</span>
          </div>
        </div>
      </div>
    );
  }

  const hasFinancials = financials && financials.snapshot_date;

  if (!storyData || (storyUnavailable && !hasFinancials)) {
    const missingInputs = Array.isArray(storyData?.dataState?.missingInputs) ? storyData.dataState.missingInputs.filter(Boolean) : [];
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 antialiased" style={{ color: "#0f1419" }}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <button onClick={() => navigateToPage("dashboard")} className="flex w-fit items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider transition-colors hover:opacity-80" style={{ color: "#1a6e4a" }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>

        <section className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: "#536471" }}>
                <span>{ticker}</span><span>•</span><span>{exchange !== "Data unavailable" ? exchange : "NSE / BSE"}</span><span>•</span><span>{currency}</span>
              </div>
              <h1 className="max-w-2xl truncate text-2xl font-bold tracking-tight md:text-3xl" style={{ color: "#0f1419" }}>{companyName}</h1>
              <div className="mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#0369a1" }}>
                Company not indexed yet
              </div>
            </div>
            <div className="grid min-w-[260px] grid-cols-2 gap-4 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Live Quote</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: "#0f1419" }}>{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? 'text-accent-success' : 'text-rose-700'}`}>{changeLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Volume</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: "#0f1419" }}>
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Data unavailable"}
                </div>
                <div className="mt-0.5 font-mono text-[9px]" style={{ color: "#8b98a5" }}>Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#0f1419" }}>Why scoring is unavailable</h3>
            <p className="mt-2 max-w-3xl text-xs leading-5" style={{ color: "#536471" }}>
              This company is recognised but verified scoring factors are not yet ready. Live quotes may still appear when market data is available.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
            <button onClick={handleToggleWatchlist} className={`flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all ${isInWatchlist ? "border-rose-200/50" : "border-emerald-200/50"}`} style={{ background: isInWatchlist ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.6)", color: isInWatchlist ? "#c0392b" : "#1a6e4a" }}>
              <Star className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-rose-700" : ""}`} />
              {isInWatchlist ? "Remove from watchlist" : "Track via watchlist"}
            </button>
            <button type="button" onClick={() => navigateToPage("search")} className="h-10 rounded-xl px-4 text-xs font-semibold text-white transition hover:opacity-90" style={{ background: "#0f1419" }}>
              Search Another Company
            </button>
            <button type="button" onClick={() => navigateToPage("methodology")} className="h-10 rounded-xl border px-4 text-xs font-semibold transition hover:bg-white/60" style={{ background: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.4)", color: "#536471" }}>
              View Scoring Methodology
            </button>
          </div>

          {missingInputs.length > 0 && (
            <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8b98a5" }}>Data sources pending</div>
              <div className="flex flex-wrap gap-2">
                {missingInputs.map((input: string) => (
                  <span key={input} className="rounded-lg px-2 py-1 text-[10px] font-semibold font-mono" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>{input}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>My Research Notes</div>
          <textarea value={noteText} onChange={(event) => handleSaveNote(event.target.value)} placeholder="Add your own research notes for this company..." className="h-20 w-full resize-none rounded-xl p-3 text-xs outline-none transition" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.4)", color: "#0f1419" }} />
        </div>
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const healthScore = typeof storyData.healthScore === "number" && Number.isFinite(storyData.healthScore) ? storyData.healthScore : null;
  const strokeDashoffset = circumference - ((healthScore ?? 0) / 100) * circumference;

  const renderProgressBar = (label: string, score: number | null, colorClass: string) => {
    const hasScore = typeof score === "number" && Number.isFinite(score);
    const barColors: Record<string, string> = {
      "text-fuchsia-700": "bg-fuchsia-500", "text-emerald-700": "bg-emerald-500", "text-sky-700": "bg-sky-500",
      "text-orange-700": "bg-orange-500", "text-amber-700": "bg-amber-500", "text-rose-700": "bg-rose-500", "text-indigo-700": "bg-indigo-500",
    };
    const barColor = barColors[colorClass] || "bg-slate-400";
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span style={{ color: "#536471" }}>{label}</span>
          <span className={colorClass}>{hasScore ? formatScore(score) : "Not available"}</span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#f0f1f5" }}>
          <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: hasScore ? `${score}%` : "0%" }} />
        </div>
      </div>
    );
  };

  const formatGrowthValue = (val: number | null) => {
    if (val === null || val === undefined) return <span style={{ color: "#8b98a5" }}>Unavailable</span>;
    const isPos = val >= 0;
    return <span className={`font-mono font-bold ${isPos ? "text-accent-success" : "text-rose-700"}`}>{isPos ? "+" : ""}{(val * 100).toFixed(2)}%</span>;
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 antialiased" style={{ color: "#0f1419" }}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <button onClick={() => navigateToPage("dashboard")} className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider transition-colors hover:opacity-80" style={{ color: "#1a6e4a" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </button>
      </div>

      <section className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border" style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.3)" }}>
              <svg className="h-full w-full -rotate-90">
                <circle cx="56" cy="56" r={radius} className="stroke-slate-200" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r={radius} stroke="#059669" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold tracking-tight tabular-nums" style={{ color: "#0f1419" }}>{healthScore !== null ? Math.round(healthScore) : "N/A"}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: "#1a6e4a" }}>Score</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8b98a5" }}>
                <span>{ticker}</span><span>•</span><span>{exchange}</span><span>•</span><span>{currency}</span>
              </div>
              <h1 className="max-w-xl text-2xl font-extrabold tracking-tight md:text-3xl truncate" style={{ color: "#0f1419" }}>{companyName}</h1>
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
            <div className="grid grid-cols-2 gap-6 rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Live Price</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums" style={{ color: "#0f1419" }}>{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? 'text-accent-success' : 'text-rose-700'}`}>{changeLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Volume</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums" style={{ color: "#0f1419" }}>
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Data unavailable"}
                </div>
                <div className="mt-0.5 font-mono text-[9px]" style={{ color: "#8b98a5" }}>Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}>
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: "#1a6e4a" }}>
            <Activity className="h-3 w-3" /> Explanation
          </div>
          <p className="text-xs leading-relaxed max-w-5xl" style={{ color: "#0f1419" }}>{storyData.narrative}</p>
          <p className="mt-3 max-w-5xl rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
            Research signals are for informational purposes only. Not personalised investment advice.
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <button onClick={handleToggleWatchlist} className={`flex h-9 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-all ${isInWatchlist ? "border-rose-200" : "border-emerald-200"}`} style={{ background: isInWatchlist ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.6)", color: isInWatchlist ? "#c0392b" : "#1a6e4a" }}>
          <Star className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-rose-700" : ""}`} />
          {isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        </button>
      </section>

      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>My Research Notes</div>
        <textarea value={noteText} onChange={(event) => handleSaveNote(event.target.value)} placeholder="Add your own research notes for this company..." className="h-20 w-full resize-none rounded-xl p-3 text-xs outline-none transition" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.4)", color: "#0f1419" }} />
      </div>

        <div className="flex gap-2 overflow-x-auto" role="tablist" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
          {tabs.map((tab) => (
            <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => selectTab(tab)} className={`h-10 shrink-0 border-b-2 bg-transparent px-4 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? "text-accent-primary font-extrabold" : "text-ink-muted hover:opacity-80"}`} style={activeTab === tab ? { borderBottomColor: "#1a6e4a", color: "#1a6e4a" } : { borderBottomColor: "transparent", color: "#8b98a5" }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

      <div className="min-h-[300px] rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>

        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-5 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "#1a6e4a" }}>
                <Trophy className="h-3.5 w-3.5" /> Factor Breakdown
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("Growth metrics", storyData.growth, "text-fuchsia-700")}
                {renderProgressBar("Quality metrics", storyData.quality, "text-emerald-700")}
                {renderProgressBar("Stability score", storyData.stability, "text-sky-700")}
                {renderProgressBar("Price trend", storyData.momentum, "text-orange-700")}
                {renderProgressBar("Value score", storyData.valuation, "text-amber-700")}
              </div>
              <div className="text-[9px] leading-normal mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                Composite score is the average of available factor scores. Missing factors are shown as unavailable.
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8b98a5" }}>
                  <Building2 className="h-3.5 w-3.5" /> Corporate Profile
                </div>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                    <dt style={{ color: "#536471" }}>Sector</dt><dd className="text-right font-semibold" style={{ color: "#0f1419" }}>{sector}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                    <dt style={{ color: "#536471" }}>Industry</dt><dd className="text-right font-semibold truncate max-w-[180px]" style={{ color: "#0f1419" }}>{industry}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                    <dt style={{ color: "#536471" }}>Market Cap</dt><dd className="text-right font-mono font-semibold tabular-nums" style={{ color: "#0f1419" }}>{marketCap}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt style={{ color: "#536471" }}>Data Policy</dt><dd className="text-right font-semibold" style={{ color: "#0f1419" }}>Source-backed only</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeTab === "financials" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#d946ef" }}>
                  <Sparkles className="h-4 w-4" /> Growth Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#d946ef" }}>
                  Score: {formatScore(storyData.growth)}
                </span>
              </div>
              <dl className="space-y-3.5 text-xs">
                <div className="flex justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>Revenue Growth (QoQ/YoY)</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.revenueGrowth)}</dd>
                </div>
                <div className="flex justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>EPS Growth</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.epsGrowth)}</dd>
                </div>
                <div className="flex justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>Profit Growth</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.profitGrowth)}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt style={{ color: "#536471" }}>Free Cash Flow (FCF) Growth</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.fcfGrowth)}</dd>
                </div>
              </dl>
              <div className="rounded-lg p-3 text-xs leading-normal" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#d946ef" }}>
                {storyData.engineDetails.growth.commentary}
              </div>
            </div>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#1a6e4a" }}>
                  <Trophy className="h-4 w-4" /> Quality Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#1a6e4a" }}>
                  Score: {formatScore(storyData.quality)}
                </span>
              </div>
              <dl className="space-y-3.5 text-xs">
                <div className="flex justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>Return on Equity (ROE)</dt><dd>{formatGrowthValue(storyData.engineDetails.quality.roe)}</dd>
                </div>
                <div className="flex justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>Return on Invested Capital (ROIC)</dt><dd>{formatGrowthValue(storyData.engineDetails.quality.roic)}</dd>
                </div>
                <div className="flex justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>Gross Profit Margin</dt><dd>{formatGrowthValue(storyData.engineDetails.quality.grossMargin)}</dd>
                </div>
                <div className="flex justify-between pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>Operating Profit Margin</dt><dd>{formatGrowthValue(storyData.engineDetails.quality.operatingMargin)}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt style={{ color: "#536471" }}>Asset Efficiency Score</dt><dd className="font-mono font-bold tabular-nums" style={{ color: "#0f1419" }}>{formatScore(storyData.engineDetails.quality.efficiencyScore)}</dd>
                </div>
              </dl>
              <div className="rounded-lg p-3 text-xs leading-normal" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#1a6e4a" }}>
                {storyData.engineDetails.quality.commentary}
              </div>
            </div>
          </div>
        )}

        {activeTab === "valuation" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#b8860b" }}>
                  <TrendingUp className="h-4 w-4" /> Valuation Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}>
                  Score: {formatScore(storyData.valuation)}
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("PE Multiples Rating", storyData.engineDetails.valuation.peScore, "text-amber-700")}
                {renderProgressBar("Price to Book (PB) Rating", storyData.engineDetails.valuation.pbScore, "text-amber-700")}
                {renderProgressBar("EV/EBITDA Rating", storyData.engineDetails.valuation.evEbitdaScore, "text-amber-700")}
                {renderProgressBar("Free Cash Flow Yield Rating", storyData.engineDetails.valuation.fcfYieldScore, "text-amber-700")}
              </div>
              <div className="rounded-lg p-3 text-xs leading-normal" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}>
                {storyData.engineDetails.valuation.commentary}
              </div>
            </div>
            <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                Raw Valuation Multiples
              </div>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>P/E Ratio</dt><dd className="font-mono font-bold tabular-nums" style={{ color: "#0f1419" }}>{formatNumber(storyData.financials.peRatio)}</dd>
                </div>
                <div className="flex justify-between pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>P/B Ratio</dt><dd className="font-mono font-bold tabular-nums" style={{ color: "#0f1419" }}>{formatNumber(storyData.financials.pbRatio)}</dd>
                </div>
                <div className="flex justify-between pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                  <dt style={{ color: "#536471" }}>EV/EBITDA</dt><dd className="font-mono font-bold tabular-nums" style={{ color: "#0f1419" }}>{formatNumber(storyData.financials.evEbitda)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: "#536471" }}>FCF Yield</dt><dd className="font-mono font-bold tabular-nums" style={{ color: "#0f1419" }}>{localFormatPercent(storyData.financials.fcfYield)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === "ownership" && (
          <div className="space-y-6">
            {ownership ? (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#0369a1" }}>Shareholding Breakdown</h3>
                  <div className="space-y-4">
                    {ownership.categories && ownership.categories.map((c: any) => {
                      const pct = parseFloat(c.share) || 0;
                      return (
                        <div key={c.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span style={{ color: "#0f1419" }}>{c.category}</span>
                            <span style={{ color: "#536471" }}>{c.share} <span className="text-[10px] font-normal" style={{ color: "#0369a1" }}>({c.change})</span></span>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#f0f1f5" }}>
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl p-5 flex flex-col justify-between" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                    Institutional Stance
                  </div>
                  <p className="text-xs leading-relaxed my-4" style={{ color: "#0f1419" }}>{ownership.comment}</p>
                  <div className="text-[9px] italic" style={{ color: "#8b98a5" }}>* Sourced from quarterly shareholding declarations to the stock exchange.</div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-5 text-sm" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                Ownership and shareholding data is not available from the connected data providers yet.
              </div>
            )}
          </div>
        )}

        {activeTab === "risks" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#c0392b" }}>
                  <AlertCircle className="h-4 w-4" /> Risk Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#c0392b" }}>
                  Risk Level: {formatScore(storyData.risk)}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {renderProgressBar("Accounting Anomalies", storyData.engineDetails.risk.accountingAnomalyScore, "text-rose-700")}
                {renderProgressBar("Leverage Stress Score", storyData.engineDetails.risk.debtStressScore, "text-rose-700")}
                {renderProgressBar("Cash Flow Strains", storyData.engineDetails.risk.cashFlowStressScore, "text-rose-700")}
                {renderProgressBar("Price Volatility Risk", storyData.engineDetails.risk.volatilityRiskScore, "text-rose-700")}
              </div>
              <div className="rounded-lg p-3 text-xs leading-normal flex items-start gap-2" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#c0392b" }}>
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block text-[10px] uppercase mb-1" style={{ color: "#c0392b" }}>{storyData.engineDetails.risk.redFlagCount} Risk indicators</span>
                  {storyData.engineDetails.risk.commentary}
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#4338ca" }}>
                  <Activity className="h-4 w-4" /> Confidence Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#4338ca" }}>
                  Reliability: {storyData.confidence}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {renderProgressBar("Data Completeness", storyData.engineDetails.confidence.dataCompleteness, "text-indigo-700")}
                {renderProgressBar("Signal Agreement", storyData.engineDetails.confidence.signalAgreement, "text-indigo-700")}
                {renderProgressBar("Risk Consistency", storyData.engineDetails.confidence.riskConsistency, "text-indigo-700")}
                {renderProgressBar("Historical Stability", storyData.engineDetails.confidence.historicalStability, "text-indigo-700")}
              </div>
              <div className="rounded-lg p-3 text-xs leading-normal" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#4338ca" }}>
                {storyData.engineDetails.confidence.commentary}
              </div>
            </div>
          </div>
        )}

        {activeTab === "whychange" && (
          <div>
            <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
              <Activity className="h-4 w-4" style={{ color: "#1a6e4a" }} /> Why It Changed
            </div>
            <WhyItChangedTab symbol={ticker} />
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                <FileText className="h-4 w-4" style={{ color: "#1a6e4a" }} /> Corporate Actions & Timeline
              </div>
              {timeline.length > 0 ? (
                <div className="relative ml-3.5 pl-5 space-y-6 text-xs" style={{ borderLeft: "1px solid rgba(255,255,255,0.3)" }}>
                  {timeline.map((evt, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-white" />
                      <div className="font-mono text-[10px] font-extrabold mb-1" style={{ color: "#1a6e4a" }}>{evt.date}</div>
                      <div className="font-bold text-sm mb-1" style={{ color: "#0f1419" }}>{evt.event}</div>
                      <p className="leading-relaxed" style={{ color: "#536471" }}>{evt.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl p-5 text-sm" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                  Corporate actions timeline is not available from the connected data providers yet.
                </div>
              )}
            </div>
            <div>
              <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                <FileText className="h-4 w-4" style={{ color: "#1a6e4a" }} /> Data Source & Freshness
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Financial Data</div>
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt style={{ color: "#536471" }}>Snapshot date</dt>
                      <dd className="font-mono tabular-nums" style={{ color: "#0f1419" }}>{normalizeDate(financials?.snapshot_date) || "Unavailable"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: "#536471" }}>Sources</dt>
                      <dd><SourceBadge source="Provider filings" /></dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Prediction Data</div>
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt style={{ color: "#536471" }}>Prediction date</dt>
                      <dd className="font-mono tabular-nums" style={{ color: "#0f1419" }}>{normalizeDate(storyData?.dataState?.asOf) || normalizeDate(storyData?.predictionDate) || "Unavailable"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: "#536471" }}>Freshness</dt>
                      <dd><DataFreshnessBadge date={storyData?.predictionDate ?? null} /></dd>
                    </div>
                    <div className="flex justify-between">
                      <dt style={{ color: "#536471" }}>Status</dt>
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
        <section className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Same Sector Companies</div>
          <div className="flex flex-wrap gap-3">
            {relatedCompanies.map((company) => (
              <button
                key={company.symbol}
                onClick={() => navigateToStock({ ticker: company.symbol, mode: "push" })}
                className="flex items-center justify-between gap-4 rounded-xl px-4 py-2.5 text-left transition-all hover:bg-white/80"
                style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                <div>
                  <div className="font-mono text-xs font-bold" style={{ color: "#0f1419" }}>{company.symbol}</div>
                  <div className="max-w-[160px] truncate text-[10px]" style={{ color: "#536471" }}>{company.companyName}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5" style={{ color: "#1a6e4a" }} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StockStoryPage;
