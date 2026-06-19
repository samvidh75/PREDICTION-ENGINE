import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowLeft, ArrowRight, Building2, FileText, Sparkles, Star, TrendingUp, Trophy } from "lucide-react";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { api, ApiError } from "../services/api/client";
import type { CompanyMetadata } from "../services/api/client";
import WhyItChangedTab from "../components/intelligence/WhyItChangedTab";
import { formatNumber, formatPercentage as localFormatPercent, formatINR as uiFormatINR, formatScore } from "../services/ui/dataFormatting";
import { useToast } from "../components/feedback/useToast";
import { IntelligenceModal } from "../components/intelligence/IntelligenceModal";

const getClassificationStyle = (cls: string) => {
  switch (cls) {
    case "Exceptional":
    case "Excellent":
      return "bg-[var(--color-active-bg)] border-[var(--color-active)]/20 text-[var(--color-active)]";
    case "Good":
    case "Healthy":
      return "bg-[var(--color-active-bg)] border-[var(--color-active)]/20 text-[var(--color-active)]";
    case "Fair":
    case "Weakening":
      return "bg-[var(--color-warning-bg)] border-[var(--color-warning)]/20 text-[var(--color-warning)]";
    case "Stable":
      return "bg-[var(--color-muted-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)]";
    case "Weak":
    case "Critical":
    case "At Risk":
      return "bg-[var(--color-danger-bg)] border-[var(--color-danger)]/20 text-[var(--color-danger)]";
    default:
      return "bg-[var(--color-muted-bg)] border-[var(--color-border)] text-[var(--color-text-muted)]";
  }
};

const getConfidenceStyle = (conf: string) => {
  switch (conf) {
    case "Very High":
    case "High":
      return "bg-[var(--color-active-bg)] border-[var(--color-active)]/20 text-[var(--color-active)]";
    case "Medium":
      return "bg-[var(--color-warning-bg)] border-[var(--color-warning)]/20 text-[var(--color-warning)]";
    case "Low":
      return "bg-[var(--color-danger-bg)] border-[var(--color-danger)]/20 text-[var(--color-danger)]";
    default:
      return "bg-[var(--color-muted-bg)] border-[var(--color-border)] text-[var(--color-text-muted)]";
  }
};

type TabKey = "thesis" | "fundamentals" | "risk" | "peers" | "history";

type MetadataState = { data: CompanyMetadata | null; loading: boolean; error: string | null; };

const tabs: TabKey[] = ["thesis", "fundamentals", "risk", "peers", "history"];
const TAB_LABELS: Record<TabKey, string> = { thesis: "Thesis", fundamentals: "Fundamentals", risk: "Risk", peers: "Peers", history: "History" };
const TAB_ICONS: Record<TabKey, string> = { thesis: "Activity", fundamentals: "BarChart3", risk: "AlertCircle", peers: "Building2", history: "FileText" };

function readTickerFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") ?? params.get("ticker") ?? "").toUpperCase().trim();
}

function readTabFromUrl(): TabKey {
  if (typeof window === "undefined") return "thesis";
  const tab = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
  return tab && tabs.includes(tab) ? tab : "thesis";
}

function formatLargeINR(value?: number | null): string {
  return uiFormatINR(value, true);
}

function formatDateTime(value?: string): string {
  if (!value) return "Insufficient information";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Insufficient information";
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
      growth: { score: growth, revenueGrowth: financialsObj?.revenue_growth ?? null, epsGrowth: financialsObj?.earnings_growth ?? null, fcfGrowth: null, profitGrowth: financialsObj?.profit_growth ?? null, commentary: "Growth metrics reflect revenue and earnings trends." },
      quality: { score: quality, roe: financialsObj?.roe ?? null, roic: financialsObj?.roic ?? null, grossMargin: null, operatingMargin: financialsObj?.operating_margin ?? null, efficiencyScore: quality, commentary: "Quality metrics assess profitability and capital efficiency." },
      stability: { score: stability, debtScore: null, cashScore: null, volatilityScore: null, coverageScore: stability, commentary: "Stability measures balance sheet strength and earnings consistency." },
      momentum: { score: momentum, momentumScore: momentum, trendScore: null, volatilityScore: null, commentary: "Momentum tracks recent price trends and market sentiment." },
      valuation: { score: valuation, peScore: valuation, pbScore: valuation, evEbitdaScore: valuation, fcfYieldScore: valuation, commentary: "Valuation compares market price to fundamental business value." },
      risk: { score: risk, accountingAnomalyScore: risk, debtStressScore: risk, cashFlowStressScore: risk, volatilityRiskScore: risk, redFlagCount: typeof risk === "number" && risk >= 65 ? 1 : 0, commentary: "Risk metrics flag potential accounting, leverage, and volatility concerns." },
      confidence: { level: payload.confidence?.level ?? payload.confidenceLevel ?? "Unavailable", score: typeof confidenceScore === "number" ? confidenceScore : null, dataCompleteness: typeof data.dataState?.completenessScore === "number" ? data.dataState.completenessScore : null, signalAgreement: null, riskConsistency: null, historicalStability: null, commentary: "Confidence reflects the overall reliability of the current score assessment." },
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
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);

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
    api.getStockStory(ticker, horizon, { signal: controller.signal }).then((data) => { if (controller.signal.aborted) return; setStory(data); setStoryLoading(false); }).catch(() => { if (controller.signal.aborted) return; setStoryError("Company research is temporarily unavailable."); setStoryLoading(false); });
    return () => controller.abort();
  }, [ticker]);

  const [financials, setFinancials] = useState<any>(null);
  useEffect(() => { api.getCompanyFinancials(ticker).then(data => setFinancials(data)).catch(() => setFinancials(null)); }, [ticker]);

  const companyName = metadata.data?.companyName && metadata.data.companyName !== ticker ? metadata.data.companyName : registryStock?.companyName || ticker;
  const sector = metadata.data?.sector || registryStock?.sector || "Insufficient information";
  const industry = metadata.data?.industry || "Insufficient information";
  const exchange = metadata.data?.exchange || liveQuote.quote?.exchange || registryStock?.exchange || "Insufficient information";
  const marketCap = formatLargeINR(metadata.data?.marketCap);
  const currency = metadata.data?.currency || "INR";
  const quote = liveQuote.quote;
  const priceLabel = liveQuote.loading ? "Loading..." : quote ? formatINR(quote.price) : "Insufficient information";
  const changeLabel = quote ? `${formatINR(quote.change)} (${formatPercent(quote.changePercent)})` : "Insufficient information";

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

  const navigateToTicker = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock"); params.set("id", symbol); params.delete("tab");
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
      <div className="flex w-full flex-col gap-6 px-6 pb-16 antialiased" style={{ color: "#0f1419" }}>
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
    return (
      <div className="flex w-full flex-col gap-6 px-6 pb-16 antialiased" style={{ color: "#0f1419" }}>
        <div className="flex items-center justify-between gap-3 text-xs">
          <button onClick={() => navigateToPage("dashboard")} className="flex w-fit items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider transition-colors hover:opacity-80" style={{ color: "#1a6e4a" }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>

        <section className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wide" style={{ color: "#536471" }}>
                <span>{ticker}</span><span>•</span><span>{exchange !== "Insufficient information" ? exchange : "NSE / BSE"}</span><span>•</span><span>{currency}</span>
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
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? 'text-[var(--color-active)]' : 'text-[var(--color-danger)]'}`}>{changeLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Volume</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: "#0f1419" }}>
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Insufficient information"}
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
            <button onClick={handleToggleWatchlist} className={`btn btn-sm ${isInWatchlist ? "btn-ghost text-[var(--color-danger)]" : "btn-secondary"}`}>
              <Star className={`icon-action ${isInWatchlist ? "text-[var(--color-danger)]" : ""}`} />
              {isInWatchlist ? "Remove from watchlist" : "Track via watchlist"}
            </button>
            <button type="button" onClick={() => navigateToPage("search")} className="h-10 rounded-xl px-4 text-xs font-semibold text-white transition hover:opacity-90" style={{ background: "#0f1419" }}>
              Search Another Company
            </button>
            <button type="button" onClick={() => navigateToPage("methodology")} className="h-10 rounded-xl border px-4 text-xs font-semibold transition hover:bg-white/60" style={{ background: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.4)", color: "#536471" }}>
              View Scoring Methodology
            </button>
          </div>
        </section>

        <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>My Research Notes</div>
          <textarea value={noteText} onChange={(event) => handleSaveNote(event.target.value)} placeholder="Add your own research notes for this company..." className="h-20 w-full resize-none rounded-xl p-3 text-xs outline-none transition" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.4)", color: "#0f1419" }} aria-label="Research notes" />
        </div>

        <p className="mt-4 text-center text-[9px] font-medium tracking-wider text-[#8b98a5] uppercase">Research only. Not investment advice.</p>
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const score = typeof storyData.healthScore === "number" && Number.isFinite(storyData.healthScore) ? storyData.healthScore : null;
  const strokeDashoffset = circumference - ((score ?? 0) / 100) * circumference;

  const renderProgressBar = (label: string, scoreValue: number | null, colorClass: string) => {
    const hasScore = typeof scoreValue === "number" && Number.isFinite(scoreValue);
    const barColors: Record<string, string> = {
      "text-primary": "bg-[var(--color-accent)]", "text-secondary": "bg-[var(--color-text-muted)]",
      "text-warning": "bg-[var(--color-warning)]", "text-danger": "bg-[var(--color-danger)]",
    };
    const barColor = barColors[colorClass] || "bg-slate-400";
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span style={{ color: "#536471" }}>{label}</span>
          <span className={colorClass}>{hasScore ? formatScore(scoreValue) : "Insufficient information"}</span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#f0f1f5" }}>
          <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: hasScore ? `${scoreValue}%` : "0%" }} />
        </div>
      </div>
    );
  };

  const formatGrowthValue = (val: number | null) => {
    if (val === null || val === undefined) return <span style={{ color: "#8b98a5" }}>Insufficient information</span>;
    const isPos = val >= 0;
    return <span className={`font-mono font-bold ${isPos ? "text-[var(--color-active)]" : "text-[var(--color-danger)]"}`}>{isPos ? "+" : ""}{(val * 100).toFixed(2)}%</span>;
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 pb-16 antialiased text-[#E6EDF3]">
      <div className="flex items-center justify-between gap-3 text-xs">
        <button onClick={() => navigateToPage("dashboard")} className="flex items-center gap-1.5 border-none bg-transparent font-semibold uppercase tracking-wider transition-colors hover:opacity-80 text-[#8B949E]">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </button>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#0D1117] p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
              <svg className="h-full w-full -rotate-90">
                <circle cx="56" cy="56" r={radius} className="stroke-white/[0.08]" strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r={radius} stroke="#2962FF" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-semibold tracking-tight tabular-nums text-[#E6EDF3]">{score !== null ? Math.round(score) : "N/A"}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#2962FF]">Score</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8b98a5" }}>
                <span>{ticker}</span><span>•</span><span>{exchange}</span><span>•</span><span>{currency}</span>
              </div>
              <h1 className="max-w-xl text-2xl font-semibold tracking-tight md:text-3xl truncate text-[#E6EDF3]">{companyName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getClassificationStyle(storyData.classification)}`}>
                  {storyData.classification ?? "Not enough information"}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getConfidenceStyle(storyData.confidence)}`}>
                  {storyData.confidence} Confidence
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:items-end">
            <div className="grid grid-cols-2 gap-6 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3.5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B949E]">Live Price</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-[#E6EDF3]">{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? 'text-[var(--color-active)]' : 'text-[var(--color-danger)]'}`}>{changeLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B949E]">Volume</div>
                <div className="mt-1 font-mono text-xl font-bold tabular-nums text-[#E6EDF3]">
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Insufficient information"}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-[#484F58]">Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 text-[#8B949E]">
            <Activity className="h-3 w-3" /> Explanation
          </div>
          <p className="text-xs leading-relaxed max-w-5xl text-[#E6EDF3]">{storyData.narrative}</p>
          <p className="mt-3 max-w-5xl rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-[11px] leading-relaxed text-[#8B949E]">
            Research signals are for informational purposes only. Not personalised investment advice.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExplanationModalOpen(true)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[10px] font-semibold text-[#8B949E] hover:bg-white/[0.08] hover:text-[#E6EDF3] transition-colors"
            >
              <Activity className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
              Open full explanation
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <button onClick={handleToggleWatchlist} className={`rounded-xl border border-white/[0.08] px-4 py-2 text-[10px] font-semibold transition-colors ${isInWatchlist ? "text-[#F23645] bg-white/[0.04]" : "text-[#8B949E] bg-white/[0.03] hover:bg-white/[0.06] hover:text-[#E6EDF3]"}`}>
          <Star className={`mr-1.5 inline h-3 w-3 ${isInWatchlist ? "text-[#F23645]" : ""}`} />
          {isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        </button>
      </section>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0D1117] p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">My Research Notes</div>
        <textarea value={noteText} onChange={(event) => handleSaveNote(event.target.value)} placeholder="Add your own research notes for this company..." className="h-20 w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-[#E6EDF3] outline-none transition placeholder-[#484F58]" aria-label="Research notes" />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06]" role="tablist">
        {tabs.map((tab) => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => selectTab(tab)} className={`h-10 shrink-0 border-b-2 bg-transparent px-4 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? "text-[#2962FF] border-[#2962FF] font-semibold" : "text-[#484F58] border-transparent hover:text-[#8B949E]"}`}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="min-h-[300px] rounded-2xl border border-white/[0.08] bg-[#0D1117] p-6">

        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-5 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[#8B949E]">
                <Trophy className="h-3.5 w-3.5" /> Factor Breakdown
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("Growth metrics", storyData.growth, "text-primary")}
                {renderProgressBar("Quality metrics", storyData.quality, "text-primary")}
                {renderProgressBar("Stability score", storyData.stability, "text-secondary")}
                {renderProgressBar("Price trend", storyData.momentum, "text-warning")}
                {renderProgressBar("Value score", storyData.valuation, "text-secondary")}
              </div>
              <div className="text-[9px] leading-normal mt-3 pt-3 border-t border-white/[0.06] text-[#484F58]">
                Composite score is the average of available factor scores. Missing factors are shown as insufficient information.
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  <Building2 className="h-3.5 w-3.5" /> Corporate Profile
                </div>
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4 pb-2 border-b border-white/[0.06]">
                    <dt className="text-[#484F58]">Sector</dt><dd className="text-right font-semibold text-[#E6EDF3]">{sector}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-2 border-b border-white/[0.06]">
                    <dt className="text-[#484F58]">Industry</dt><dd className="text-right font-semibold truncate max-w-[180px] text-[#E6EDF3]">{industry}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pb-2 border-b border-white/[0.06]">
                    <dt className="text-[#484F58]">Market Cap</dt><dd className="text-right font-mono font-semibold tabular-nums text-[#E6EDF3]">{marketCap}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeTab === "financials" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#E6EDF3]">
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
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#E6EDF3]">
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
            <div className="md:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#E6EDF3]">
                  <TrendingUp className="h-4 w-4" /> Valuation Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}>
                  Score: {formatScore(storyData.valuation)}
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {renderProgressBar("PE Multiples", storyData.engineDetails.valuation.peScore, "text-secondary")}
                {renderProgressBar("Price to Book (PB)", storyData.engineDetails.valuation.pbScore, "text-secondary")}
                {renderProgressBar("EV/EBITDA", storyData.engineDetails.valuation.evEbitdaScore, "text-secondary")}
                {renderProgressBar("Free Cash Flow Yield", storyData.engineDetails.valuation.fcfYieldScore, "text-secondary")}
              </div>
              <div className="rounded-lg p-3 text-xs leading-normal" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}>
                {storyData.engineDetails.valuation.commentary}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider pb-2 text-[#8B949E]">
                Raw Valuation Multiples
              </div>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-white/[0.06]">
                  <dt className="text-[#484F58]">P/E Ratio</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{formatNumber(storyData.financials.peRatio)}</dd>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-white/[0.06]">
                  <dt className="text-[#484F58]">P/B Ratio</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{formatNumber(storyData.financials.pbRatio)}</dd>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-white/[0.06]">
                  <dt className="text-[#484F58]">EV/EBITDA</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{formatNumber(storyData.financials.evEbitda)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#484F58]">FCF Yield</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{localFormatPercent(storyData.financials.fcfYield)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === "ownership" && (
          <div className="space-y-6">
            {ownership ? (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider pb-3 text-[#E6EDF3]">Shareholding Breakdown</h3>
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
                            <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider pb-2 text-[#8B949E]">
                    Institutional Stance
                  </div>
                  <p className="text-xs leading-relaxed my-4 text-[#E6EDF3]">{ownership.comment}</p>
                  <div className="text-[9px] italic text-[#484F58]">* Based on quarterly shareholding declarations to the stock exchange.</div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-5 text-sm border border-white/[0.06] bg-white/[0.04] text-[#8B949E]">
                Ownership and shareholding data is not currently available.
              </div>
            )}
          </div>
        )}

        {activeTab === "risks" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#E6EDF3]">
                  <AlertCircle className="h-4 w-4" /> Risk Engine
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#c0392b" }}>
                  Risk Level: {formatScore(storyData.risk)}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {renderProgressBar("Accounting Anomalies", storyData.engineDetails.risk.accountingAnomalyScore, "text-danger")}
                {renderProgressBar("Leverage Stress", storyData.engineDetails.risk.debtStressScore, "text-danger")}
                {renderProgressBar("Cash Flow Strains", storyData.engineDetails.risk.cashFlowStressScore, "text-danger")}
                {renderProgressBar("Price Volatility", storyData.engineDetails.risk.volatilityRiskScore, "text-danger")}
              </div>
              <div className="rounded-lg p-3 text-xs leading-normal flex items-start gap-2" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#c0392b" }}>
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-[10px] uppercase mb-1" style={{ color: "#c0392b" }}>{storyData.engineDetails.risk.redFlagCount} Risk indicators</span>
                  {storyData.engineDetails.risk.commentary}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[#E6EDF3]">
                  <Activity className="h-4 w-4" /> Alert Check
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#4338ca" }}>
                  Confidence: {storyData.confidence}
                </span>
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
                      <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--color-accent)] ring-4 ring-[var(--color-canvas)]" />
                      <div className="font-mono text-[10px] font-semibold mb-1" style={{ color: "#1a6e4a" }}>{evt.date}</div>
                      <div className="font-bold text-sm mb-1" style={{ color: "#0f1419" }}>{evt.event}</div>
                      <p className="leading-relaxed" style={{ color: "#536471" }}>{evt.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl p-5 text-sm border border-white/[0.06] bg-white/[0.04] text-[#8B949E]">
                  Corporate actions timeline is not currently available.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {relatedCompanies.length > 0 && (
        <section className="pt-6">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Same Sector Companies</div>
          <div className="flex flex-wrap gap-3">
            {relatedCompanies.map((company) => (
              <button
                key={company.symbol}
                onClick={() => navigateToTicker(company.symbol)}
                className="flex items-center justify-between gap-4 rounded-xl px-4 py-2.5 text-left transition-all hover:bg-white/80 border border-white/[0.08] bg-[#0D1117]"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-[#E6EDF3]">{company.symbol}</div>
                  <div className="max-w-[160px] truncate text-[10px] text-[#8B949E]">{company.companyName}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#1a6e4a]" />
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="mt-4 text-center text-[9px] font-medium tracking-wider text-[#484F58] uppercase">Research only. Not investment advice.</p>

      <IntelligenceModal
        open={explanationModalOpen}
        onClose={() => setExplanationModalOpen(false)}
        title={ticker ? `${ticker} — score explanation` : ""}
        subtitle="Factor context and score details for this company."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Score</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-[#E6EDF3]">
                  {score !== null ? Math.round(score) : "—"}
                </span>
                <span className="text-xs text-[#8B949E]">/ 100</span>
              </div>
              {storyData?.classification && (
                <span className="mt-1 inline-flex items-center rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-[#8B949E]">
                  {storyData.classification}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Factor context</span>
            <p className="mt-2 text-xs leading-relaxed text-[#8B949E]">
              {storyData?.narrative || "Factor scoring details are pending. Scores are derived from verified market data and model calculations."}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Factor scores</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                { label: "Growth", value: storyData?.growth ?? null },
                { label: "Quality", value: storyData?.quality ?? null },
                { label: "Stability", value: storyData?.stability ?? null },
                { label: "Momentum", value: storyData?.momentum ?? null },
                { label: "Valuation", value: storyData?.valuation ?? null },
                { label: "Risk", value: storyData?.risk ?? null },
              ].map((f) => (
                <div key={f.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] text-[#8B949E]">{f.label}</div>
                  <div className="mt-1 text-base font-bold tabular-nums text-[#E6EDF3]">
                    {f.value !== null ? formatScore(f.value) : "—"}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-[#484F58]">Factor scores are shown for reference, not as causal attribution.</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Research basis</span>
            <div className="mt-2 space-y-1.5">
              {[
                { label: "Assessment date", value: storyData?.predictionDate ? formatDateTime(storyData.predictionDate) : "Pending" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#8B949E]">{item.label}</span>
                  <span className="text-xs font-medium text-[#E6EDF3]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-[#484F58]">
            Research only. This score explanation shows model inputs and outputs for reference. It is not investment advice.
          </p>
        </div>
      </IntelligenceModal>
    </div>
  );
};

export default StockStoryPage;
