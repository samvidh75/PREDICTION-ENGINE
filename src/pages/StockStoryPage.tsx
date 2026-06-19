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
      <div className="flex w-full flex-col gap-6 px-6 pb-16 antialiased bg-[#070A0F] text-[#E6EDF3] min-h-screen">
        <div className="flex items-center justify-between gap-3 text-xs">
          <button onClick={() => navigateToPage("dashboard")} className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider hover:opacity-80 text-[#E6EDF3]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/[0.08] border-t-[#2962FF]" />
            <span className="text-sm font-semibold tracking-wider text-[#9AA7B5]">Loading company research...</span>
          </div>
        </div>
      </div>
    );
  }

  const hasFinancials = financials && financials.snapshot_date;

  if (!storyData || (storyUnavailable && !hasFinancials)) {
    return (
      <div className="flex w-full flex-col gap-6 px-6 pb-16 antialiased bg-[#070A0F] text-[#E6EDF3] min-h-screen">
        <div className="flex items-center justify-between gap-3 text-xs">
          <button onClick={() => navigateToPage("dashboard")} className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider text-[#E6EDF3] hover:opacity-80">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-[#9AA7B5]">
                <span>{ticker}</span><span>•</span><span>{exchange !== "Insufficient information" ? exchange : "NSE / BSE"}</span><span>•</span><span>{currency}</span>
              </div>
              <h1 className="max-w-2xl truncate text-2xl font-bold tracking-tight text-[#E6EDF3] md:text-3xl">{companyName}</h1>
              <div className="mt-3 inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-[#9AA7B5]">
                Company not indexed yet
              </div>
            </div>
            <div className="grid min-w-[260px] grid-cols-2 gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#9AA7B5]">Live Quote</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#E6EDF3]">{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{changeLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#9AA7B5]">Volume</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#E6EDF3]">
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "Insufficient information"}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-[#64748B]">Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#b8860b]/30 bg-[rgba(184,134,11,0.08)] p-4 text-[#b8860b]">
            <h3 className="text-sm font-semibold text-[#E6EDF3]">Why scoring is unavailable</h3>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[#9AA7B5]">
              This company is recognised but verified scoring factors are not yet ready. Live quotes may still appear when market data is available.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={handleToggleWatchlist} className={`h-10 rounded-xl px-4 text-xs font-semibold transition ${isInWatchlist ? "border border-red-500/30 bg-red-500/10 text-red-400" : "border border-white/[0.12] bg-white/[0.06] text-[#E6EDF3] hover:bg-white/[0.10]"}`}>
              <Star className={`mr-1.5 inline-block h-4 w-4 ${isInWatchlist ? "text-red-400" : ""}`} />
              {isInWatchlist ? "Remove from watchlist" : "Track via watchlist"}
            </button>
            <button type="button" onClick={() => navigateToPage("search")} className="h-10 rounded-xl bg-[#2962FF] px-4 text-xs font-semibold text-white transition hover:bg-[#3B71FF]">
              Search Another Company
            </button>
            <button type="button" onClick={() => navigateToPage("methodology")} className="h-10 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-xs font-semibold text-[#9AA7B5] transition hover:bg-white/[0.08]">
              View Scoring Methodology
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0D1117] p-5">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#9AA7B5]">My Research Notes</div>
          <textarea value={noteText} onChange={(event) => handleSaveNote(event.target.value)} placeholder="Add your own research notes for this company..." className="h-20 w-full resize-none rounded-xl border border-white/[0.08] bg-[#0D1117] p-3 text-xs text-[#E6EDF3] placeholder:text-[#64748B] outline-none transition focus:border-[#2962FF]" aria-label="Research notes" />
        </div>

        <p className="mt-4 text-center text-[9px] font-medium tracking-wider text-[#64748B] uppercase">Research only. Not investment advice.</p>
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

        {activeTab === "thesis" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Research Thesis</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#E6EDF3]">
                  {storyData?.narrative || "Thesis details are being prepared."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#16A34A]">Bull Case</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#E6EDF3]">
                    {storyData?.growth !== null && storyData?.growth >= 60
                      ? "Strong growth metrics and quality indicators suggest the company has favourable fundamentals."
                      : storyData?.valuation !== null && storyData?.valuation >= 60
                        ? "Attractive valuation relative to fundamentals may present a reasonable entry point for further research."
                        : "Review fundamentals and risk tabs for a complete picture before forming a thesis."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444]">Bear Case</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#E6EDF3]">
                    {storyData?.risk !== null && storyData?.risk < 40
                      ? "Elevated risk indicators warrant closer review of leverage, volatility, and cash flow stability."
                      : storyData?.momentum !== null && storyData?.momentum < 40
                        ? "Weak price momentum may reflect broader sector or market concerns."
                        : "Research the risk tab to identify potential concerns before making any decision."}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Before You Invest</h2>
                <ul className="mt-3 space-y-2">
                  {[
                    "Understand the business model and how it makes money.",
                    "Compare this company with its peers in the same sector.",
                    "Review the risk factors, leverage, and volatility metrics.",
                    "Decide your position size and risk tolerance with your broker or adviser.",
                    "Research is not advice — always verify independently.",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[#9AA7B5]">
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[rgba(41,98,255,0.15)] text-center text-[9px] font-bold text-[#2962FF] flex items-center justify-center">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Factor Scores</h2>
                <div className="space-y-3">
                  {[
                    { label: "Quality", value: storyData.quality, key: "quality" },
                    { label: "Growth", value: storyData.growth, key: "growth" },
                    { label: "Stability", value: storyData.stability, key: "stability" },
                    { label: "Momentum", value: storyData.momentum, key: "momentum" },
                    { label: "Valuation", value: storyData.valuation, key: "valuation" },
                  ].map((f) => (
                    <div key={f.key}>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#9AA7B5]">{f.label}</span>
                        <span className="font-mono font-semibold tabular-nums text-[#E6EDF3]">{f.value != null ? `${Math.round(f.value)}` : "—"}</span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                        <div className="h-full rounded-full bg-[#2962FF] transition-all" style={{ width: f.value != null ? `${f.value}%` : "0%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  <Building2 className="h-3.5 w-3.5" /> Profile
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#64748B]">Sector</dt><dd className="text-right font-semibold text-[#E6EDF3]">{sector}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#64748B]">Industry</dt><dd className="text-right font-semibold truncate max-w-[160px] text-[#E6EDF3]">{industry}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#64748B]">Market Cap</dt><dd className="text-right font-mono font-semibold tabular-nums text-[#E6EDF3]">{marketCap}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {activeTab === "fundamentals" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Growth</h3>
              <dl className="mt-3 space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">Revenue Growth</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.revenueGrowth)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">EPS Growth</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.epsGrowth)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">Profit Growth</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.profitGrowth)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#64748B]">FCF Growth</dt><dd>{formatGrowthValue(storyData.engineDetails.growth.fcfGrowth)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">{storyData.engineDetails.growth.commentary}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Quality</h3>
              <dl className="mt-3 space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">ROE</dt><dd>{formatGrowthValue(storyData.engineDetails.quality.roe)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">ROIC</dt><dd>{formatGrowthValue(storyData.engineDetails.quality.roic)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">Operating Margin</dt><dd>{formatGrowthValue(storyData.engineDetails.quality.operatingMargin)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#64748B]">Efficiency Score</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{formatScore(storyData.engineDetails.quality.efficiencyScore)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">{storyData.engineDetails.quality.commentary}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Valuation</h3>
              <dl className="mt-3 space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">P/E Ratio</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{formatNumber(storyData.financials.peRatio)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">P/B Ratio</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{formatNumber(storyData.financials.pbRatio)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/[0.06] pb-2">
                  <dt className="text-[#64748B]">EV/EBITDA</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{formatNumber(storyData.financials.evEbitda)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#64748B]">FCF Yield</dt><dd className="font-mono font-bold tabular-nums text-[#E6EDF3]">{localFormatPercent(storyData.financials.fcfYield)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">{storyData.engineDetails.valuation.commentary}</p>
            </div>
            {ownership && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Shareholding</h3>
                <div className="mt-3 space-y-3">
                  {ownership.categories?.map((c: any) => (
                    <div key={c.category} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#9AA7B5]">{c.category}</span>
                        <span className="text-[#E6EDF3]">{c.share}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                        <div className="h-full rounded-full bg-[#2962FF]" style={{ width: `${parseFloat(c.share) || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "risk" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#EF4444]">
                <AlertCircle className="h-3 w-3" /> Risk Factors
              </h3>
              <div className="mt-4 space-y-4">
                {[
                  { label: "Accounting", value: storyData.engineDetails.risk.accountingAnomalyScore },
                  { label: "Leverage", value: storyData.engineDetails.risk.debtStressScore },
                  { label: "Cash Flow", value: storyData.engineDetails.risk.cashFlowStressScore },
                  { label: "Volatility", value: storyData.engineDetails.risk.volatilityRiskScore },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#9AA7B5]">{r.label}</span>
                      <span className="font-mono font-semibold tabular-nums text-[#E6EDF3]">{r.value != null ? `${Math.round(r.value)}` : "—"}</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div className={`h-full rounded-full transition-all ${r.value != null && r.value >= 60 ? 'bg-[#EF4444]' : 'bg-[#2962FF]'}`} style={{ width: r.value != null ? `${r.value}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-[#64748B]">{storyData.engineDetails.risk.commentary}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                <Activity className="h-3 w-3" /> Confidence
              </h3>
              <dl className="mt-4 space-y-3 text-xs">
                {[
                  { label: "Data completeness", value: storyData.engineDetails.confidence.dataCompleteness },
                  { label: "Signal agreement", value: storyData.engineDetails.confidence.signalAgreement },
                  { label: "Risk consistency", value: storyData.engineDetails.confidence.riskConsistency },
                  { label: "Historical stability", value: storyData.engineDetails.confidence.historicalStability },
                ].map((c) => (
                  <div key={c.label} className="flex justify-between border-b border-white/[0.06] pb-2">
                    <dt className="text-[#64748B]">{c.label}</dt>
                    <dd className="font-mono font-semibold tabular-nums text-[#E6EDF3]">{c.value != null ? `${Math.round(c.value)}%` : "—"}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">{storyData.engineDetails.confidence.commentary}</p>
            </div>
          </div>
        )}

        {activeTab === "peers" && (
          <div className="space-y-4">
            {relatedCompanies.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedCompanies.map((company) => (
                  <button
                    key={company.symbol}
                    type="button"
                    onClick={() => navigateToTicker(company.symbol)}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#E6EDF3]">{company.symbol}</span>
                        <span className="text-[10px] text-[#64748B]">{company.sector}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#9AA7B5]">{company.companyName}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#2962FF]" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-5 text-sm text-[#8B949E]">
                Peer companies in the same sector are not available for comparison.
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Compare with Peers</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#9AA7B5]">
                Use the compare tool to evaluate this company against others in the same sector side by side.
              </p>
              <button
                type="button"
                onClick={() => { const p = new URLSearchParams(window.location.search); p.set("page", "compare"); p.set("id", ticker); window.history.pushState({}, "", `?${p.toString()}`); window.dispatchEvent(new Event("urlchange")); }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#2962FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors"
              >
                Compare companies
              </button>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            {timeline.length > 0 ? (
              <div className="relative ml-3 space-y-6 border-l border-white/[0.08] pl-6 text-xs">
                {timeline.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[25px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#2962FF] ring-4 ring-[#0D1117]" />
                    <div className="mb-1 font-mono text-[10px] font-semibold text-[#2962FF]">{evt.date}</div>
                    <div className="mb-1 text-sm font-semibold text-[#E6EDF3]">{evt.event}</div>
                    <p className="leading-relaxed text-[#9AA7B5]">{evt.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-5 text-sm text-[#8B949E]">
                Corporate actions timeline is not currently available.
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Research Basis</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#9AA7B5]">
                Research is based on company fundamentals, market data, and sector analysis. All scores are computed through documented methodology.
              </p>
            </div>
          </div>
        )}
      </div>

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
