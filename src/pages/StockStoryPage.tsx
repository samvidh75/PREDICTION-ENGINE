import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowLeft, ArrowRight, Building2, Star } from "lucide-react";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { api, ApiError } from "../services/api/client";
import type { CompanyMetadata } from "../services/api/client";
import { formatNumber, formatPercentage as localFormatPercent, formatINR as uiFormatINR, formatScore } from "../services/ui/dataFormatting";
import { useToast } from "../components/feedback/useToast";
import { IntelligenceModal } from "../components/intelligence/IntelligenceModal";

import { computeSignalFromStoryData, storyDataToFactorScoresView } from "../lib/product/productSignalAdapter";
import { buildCompanyPageData, companyResearchToFactorScores } from "../lib/product/researchDataAdapter";
import { ThesisSnapshotEngine } from "../services/portfolio/ThesisSnapshotEngine";
import { getSnapshotChangeLabel } from "../services/ui/freshnessLabels";
import SignalExplanationPanel from "../components/research/SignalExplanationPanel";
import FactorDriverList from "../components/research/FactorDriverList";
import RiskReviewPanel from "../components/research/RiskReviewPanel";
import NextBestActionPanel from "../components/research/NextBestActionPanel";
import ResearchContextLink from "../components/research/ResearchContextLink";
import { FinancialMetricGrid } from "../components/research/FinancialMetricGrid";
import ValuationContextPanel from "../components/research/ValuationContextPanel";
import { buildFinancialSnapshot } from "../lib/product/financialSnapshotAdapter";
import PredictionEnginePanel from "../components/research/PredictionEnginePanel";
import { buildCompanyResearchViewModel } from "../lib/product/viewModels/companyResearchViewModel";
import { buildPredictionViewModel } from "../lib/product/predictionEngine/predictionViewModel";
import { getHealthometerTone } from "../lib/product/publicLabels";



const getClassificationStyle = (cls: string) => {
  const norm = cls.trim().toLowerCase();
  if (norm === 'very healthy' || norm === 'very healthy' || cls === 'Very Healthy') return "bg-[rgba(22,163,74,0.12)] border-[rgba(22,163,74,0.2)] text-[#16A34A]";
  if (norm === 'healthy') return "bg-[rgba(34,197,94,0.12)] border-[rgba(34,197,94,0.25)] text-[#22C55E]";
  if (norm === 'stable') return "bg-[rgba(41,98,255,0.12)] border-[rgba(41,98,255,0.25)] text-[#2962FF]";
  if (norm === 'needs review' || norm === 'unhealthy') return "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.25)] text-[#F59E0B]";
  if (norm === 'risk rising' || norm === 'very unhealthy') return "bg-[rgba(251,146,60,0.12)] border-[rgba(251,146,60,0.25)] text-[#FB923C]";
  if (norm === 'fragile') return "bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.25)] text-[#EF4444]";
  return "bg-white/[0.04] border-white/[0.08] text-[#9AA7B5]";
};

const getConfidenceStyle = (conf: string) => {
  const norm = String(conf).toLowerCase();
  switch (norm) {
    case "very high":
    case "high":
      return "bg-[rgba(22,163,74,0.12)] border-[rgba(22,163,74,0.2)] text-[#16A34A]";
    case "medium":
      return "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.2)] text-[#F59E0B]";
    case "low":
      return "bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.2)] text-[#EF4444]";
    default:
      return "bg-white/[0.04] border-white/[0.08] text-[#9AA7B5]";
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
  if (!value) return "Awaiting updated information";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Awaiting updated information";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function extractScore(factor: any): number | null {
  if (!factor || typeof factor.score !== "number" || !Number.isFinite(factor.score)) return null;
  return factor.score;
}

function adaptStockStoryResponse(data: any, financialsObj: any = null) {
  if (!data) throw new Error("STOCKSTORY_SNAPSHOT_UNAVAILABLE");
  const payload = data.data ?? data;

  if (data.status === "unavailable" || !payload) {
    return {
      apiStatus: "unavailable",
      unavailableReason: null,
      unavailableMessage: "Not enough information for a reliable research case yet.",
      dataState: data.dataState ?? null,
      confidence: "Unavailable", healthScore: null, rankingScore: null, classification: null,
      growth: null, quality: null, stability: null, valuation: null, momentum: null, risk: null,
      narrative: "Not enough information for a reliable research case yet.",
      factors: {}, financials: financialsObj || {},
      engineDetails: {
        growth: { score: null, revenueGrowth: financialsObj?.revenue_growth ?? null, epsGrowth: financialsObj?.earnings_growth ?? null, fcfGrowth: null, profitGrowth: financialsObj?.profit_growth ?? null, commentary: "Factor scoring details are not yet available." },
        quality: { score: null, roe: financialsObj?.roe ?? null, roic: financialsObj?.roic ?? null, grossMargin: null, operatingMargin: financialsObj?.operating_margin ?? null, efficiencyScore: null, commentary: "Factor scoring details are not yet available." },
        stability: { score: null, debtScore: null, cashScore: null, volatilityScore: null, coverageScore: null, commentary: "Factor scoring details are not yet available." },
        momentum: { score: null, momentumScore: null, trendScore: null, volatilityScore: null, commentary: "Factor scoring details are not yet available." },
        valuation: { score: null, peScore: null, pbScore: null, evEbitdaScore: null, fcfYieldScore: null, commentary: "Factor scoring details are not yet available." },
        risk: { score: null, accountingAnomalyScore: null, debtStressScore: null, cashFlowStressScore: null, volatilityRiskScore: null, redFlagCount: 0, commentary: "Factor scoring details are not yet available." },
        confidence: { level: "Unavailable", score: null, dataCompleteness: typeof data.dataState?.completenessScore === "number" ? data.dataState.completenessScore : null, signalAgreement: null, riskConsistency: null, historicalStability: null, commentary: "Not enough information for this view yet." },
      },
    };
  }

  const factors = payload.factors;
  if (!factors) throw new Error("STOCKSTORY_FACTORS_MISSING");

  const growth = extractScore(factors.growth);
  const quality = extractScore(factors.quality);
  const stability = extractScore(factors.stability);
  const momentum = extractScore(factors.momentum);
  const valuation = extractScore(factors.value);
  const risk = extractScore(factors.risk);
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
    api.getMetadata(ticker, { signal: controller.signal }).then((data) => { if (controller.signal.aborted) return; setMetadata({ data, loading: false, error: null }); }).catch(() => { if (controller.signal.aborted) return; setMetadata({ data: null, loading: false, error: "Company metadata needs research." }); });
    return () => controller.abort();
  }, [ticker]);

  useEffect(() => {
    const controller = new AbortController();
    setStoryLoading(true); setStoryError(null);
    const horizon = Number.parseInt(new URLSearchParams(window.location.search).get("horizon") ?? "30", 10);
    api.getStockStory(ticker, horizon, { signal: controller.signal }).then((data) => { if (controller.signal.aborted) return; setStory(data); setStoryLoading(false); }).catch(() => { if (controller.signal.aborted) return; setStoryError("Company research needs review."); setStoryLoading(false); });
    return () => controller.abort();
  }, [ticker]);

  const [financials, setFinancials] = useState<any>(null);
  useEffect(() => { api.getCompanyFinancials(ticker).then(data => setFinancials(data)).catch(() => setFinancials(null)); }, [ticker]);

  const [researchData, setResearchData] = useState<any>(null);
  const [researchDataLoading, setResearchDataLoading] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    setResearchDataLoading(true);
    api.getCompanyResearch(ticker, { signal: ctrl.signal })
      .then((res) => { if (!ctrl.signal.aborted) setResearchData(res.data); })
      .catch(() => { if (!ctrl.signal.aborted) setResearchData(null); })
      .finally(() => { if (!ctrl.signal.aborted) setResearchDataLoading(false); });
    return () => ctrl.abort();
  }, [ticker]);

  const companyName = metadata.data?.companyName && metadata.data.companyName !== ticker ? metadata.data.companyName : registryStock?.companyName || ticker;
  const sector = metadata.data?.sector || registryStock?.sector || "Awaiting classification";
  const industry = metadata.data?.industry || "Awaiting classification";
  const exchange = metadata.data?.exchange || liveQuote.quote?.exchange || registryStock?.exchange || "Awaiting classification";
  const marketCap = formatLargeINR(metadata.data?.marketCap);
  const currency = metadata.data?.currency || "INR";
  const quote = liveQuote.quote;
  const priceLabel = liveQuote.loading ? "Loading..." : quote ? formatINR(quote.price) : "Awaiting market data";
  const changeLabel = quote ? `${formatINR(quote.change)} (${formatPercent(quote.changePercent)})` : "Awaiting market data";

  const storyData = useMemo(() => {
    if (!story) { if (financials && financials.snapshot_date) return adaptStockStoryResponse({ status: "unavailable" }, financials); return null; }
    return adaptStockStoryResponse(story, financials);
  }, [story, financials]);
  const storyUnavailable = !story || storyData?.apiStatus === "unavailable";

  const healthometerLabel: string | null = story?.healthometer?.label ?? null;

  const pageData = useMemo(() => buildCompanyPageData(researchData, storyData, financials), [researchData, storyData, financials]);
  const signal = useMemo(() => pageData.signal ?? computeSignalFromStoryData(storyData), [pageData.signal, storyData]);
  const factorView = useMemo(() => pageData.factors ?? storyDataToFactorScoresView(storyData), [pageData.factors, storyData]);
  const financialSnapshot = useMemo(() => buildFinancialSnapshot(financials), [financials]);
  const isInWatchlist = useMemo(() => watchlists.some((w) => w.tickers.includes(ticker)), [watchlists, ticker]);

  const researchViewModel = useMemo(() => {
    const score = researchData?.score ?? storyData?.healthScore ?? null;
    const financialGroups = financials ? buildFinancialSnapshot(financials).groups : [];
    return buildCompanyResearchViewModel(
      ticker,
      companyName,
      sector,
      { score, financialGroups },
      isInWatchlist
    );
  }, [ticker, companyName, sector, researchData, storyData, financials, isInWatchlist]);

  const predictionModel = useMemo(() => {
    return buildPredictionViewModel(
      ticker,
      researchViewModel.research?.score,
      researchData?.riskScore ?? factorView?.riskScore,
      financials
    );
  }, [ticker, researchViewModel.research?.score, researchData?.riskScore, factorView?.riskScore, financials]);

  const relatedCompanies = useMemo(() => {
    if (!registryStock?.sector) return [];
    return StockRegistry.getAllStocks().filter((stock) => stock.symbol !== ticker && stock.sector === registryStock.sector).slice(0, 6);
  }, [registryStock?.sector, ticker]);

  const handleToggleWatchlist = () => {
    const defaultList = watchlists[0];
    if (!defaultList) return;
    if (isInWatchlist) {
      WatchlistEngine.removeTicker(defaultList.id, ticker);
      toast.success(`${ticker} removed from watchlist`);
    } else {
      WatchlistEngine.addTicker(defaultList.id, ticker);
      toast.success(`${ticker} saved to watchlist`);
      if (signal && signal !== null) {
        ThesisSnapshotEngine.saveSnapshot({
          symbol: ticker,
          score: signal.score,
          label: signal.label,
          confidence: signal.confidence,
          timestamp: new Date().toISOString(),
          factors: {},
        });
      }
    }
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const snapshotLabel = useMemo(() => {
    if (!isInWatchlist) return null;
    const labelLower = (signal?.label ?? '').toLowerCase();
    return getSnapshotChangeLabel(ticker, signal?.score ?? null, labelLower === 'unhealthy' || labelLower === 'very unhealthy' || labelLower === 'risk rising' || labelLower === 'fragile' || labelLower === 'avoid for now' ? 30 : null);
  }, [isInWatchlist, ticker, signal]);

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

  if (!researchViewModel.hasEnoughData) {
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
              <h1 className="text-2xl font-bold tracking-tight text-[#E6EDF3] mb-1">{companyName}</h1>
              <div className="inline-flex rounded-full border border-[rgba(41,98,255,0.2)] bg-[rgba(41,98,255,0.12)] px-2.5 py-1 text-[10px] font-medium text-[#2962FF]">
                Not enough information for this view yet.
              </div>
            </div>
            <div className="grid min-w-[260px] grid-cols-2 gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#9AA7B5]">Price context</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#E6EDF3]">{priceLabel}</div>
                <div className={`mt-0.5 font-mono text-[10px] font-bold ${quote && quote.changePercent >= 0 ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{changeLabel}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#9AA7B5]">Volume</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#E6EDF3]">
                  {typeof quote?.volume === "number" && Number.isFinite(quote.volume) ? quote.volume.toLocaleString("en-IN") : "—"}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-[#64748B]">Updated {formatDateTime(quote?.updatedAt)}</div>
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-xs leading-5 text-[#9AA7B5]">
            Research context is based on available data. Track this company to review changes over time.
          </p>

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
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B5]">Your Notes</span>
            {noteText && noteText.trim().length > 0 && (
              <span className="text-[9px] text-[#64748B]">Saved on this device</span>
            )}
          </div>
          <textarea value={noteText} onChange={(event) => handleSaveNote(event.target.value)} placeholder="Add your own research notes for this company..." className="h-20 w-full resize-none rounded-xl border border-white/[0.08] bg-[#0D1117] p-3 text-xs text-[#E6EDF3] placeholder:text-[#64748B] outline-none transition focus:border-[#2962FF]" aria-label="Research notes" />
        </div>
        <div className="mt-4 text-center">
          <button type="button" onClick={() => { const p = new URLSearchParams(window.location.search); p.set("page", "terms"); window.history.pushState({}, "", `?${p.toString()}`); window.dispatchEvent(new Event("urlchange")); }} className="text-[9px] font-medium tracking-wider text-[#64748B] uppercase hover:text-[#9AA7B5] transition-colors">
            Informational research tool — Read Terms & Disclosures
          </button>
        </div>

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
          <span className="text-[#64748B]">{label}</span>
          <span className={colorClass}>{hasScore ? formatScore(scoreValue) : "Awaiting data"}</span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden bg-[rgba(255,255,255,0.06)]">
          <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: hasScore ? `${scoreValue}%` : "0%" }} />
        </div>
      </div>
    );
  };

  const formatGrowthValue = (val: number | null) => {
    if (val === null || val === undefined) return <span className="text-[#64748B]">Awaiting data</span>;
    const isPos = val >= 0;
    return <span className={`font-mono font-bold ${isPos ? "text-[var(--color-active)]" : "text-[var(--color-danger)]"}`}>{isPos ? "+" : ""}{(val * 100).toFixed(2)}%</span>;
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 pb-16 antialiased text-[#E6EDF3]">

      {healthometerLabel && (() => {
        const tone = getHealthometerTone(healthometerLabel);
        return (
          <div className="flex items-center gap-3">
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: tone.color, backgroundColor: tone.bg, borderColor: tone.border }}
            >
              {healthometerLabel}
            </span>
            {score !== null && (
              <span className="text-xs text-[#64748B]">{Math.round(score)} / 100 &middot; {predictionModel.activeFactorCount} active dimensions</span>
            )}
          </div>
        );
      })()}

      <div className="rounded-2xl border border-white/[0.08] bg-[#0D1117] p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Your Notes</span>
          {noteText && noteText.trim().length > 0 && (
            <span className="text-[9px] text-[#64748B]">Saved on this device</span>
          )}
        </div>
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
              <PredictionEnginePanel
                symbol={ticker}
                score={score}
                riskScore={factorView?.riskScore}
                qualityScore={factorView?.qualityScore}
                valuationScore={factorView?.valuationScore}
                growthScore={factorView?.growthScore}
                stabilityScore={factorView?.stabilityScore}
                momentumScore={factorView?.momentumScore}
                rawMetrics={financials}
                healthometerLabel={healthometerLabel}
              />
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Research Thesis</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#E6EDF3]">
                  {pageData?.narrative || storyData?.narrative || "Thesis details are being prepared."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#16A34A]">Bull Case</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#E6EDF3]">
                    {pageData?.bullCase
                      ? pageData.bullCase
                      : storyData?.growth !== null && storyData?.growth >= 60
                        ? "Strong growth metrics and quality indicators suggest the company has favourable fundamentals."
                        : storyData?.valuation !== null && storyData?.valuation >= 60
                          ? "Attractive valuation relative to fundamentals may present a reasonable entry point for further research."
                          : "Review fundamentals and risk tabs for a complete picture before forming a thesis."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444]">Bear Case</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#E6EDF3]">
                    {pageData?.bearCase
                      ? pageData.bearCase
                      : storyData?.risk !== null && storyData?.risk < 40
                        ? "Elevated risk indicators warrant closer review of leverage, volatility, and cash flow stability."
                        : storyData?.momentum !== null && storyData?.momentum < 40
                          ? "Weak price momentum may reflect broader sector or market concerns."
                          : "Research the risk tab to identify potential concerns before making any decision."}
                  </p>
                </div>
              </div>
              {pageData?.topStrengths && pageData.topStrengths.length > 0 && (
                <div className="rounded-2xl border border-[rgba(22,163,74,0.15)] bg-[rgba(22,163,74,0.04)] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#16A34A]">Key Strengths</h3>
                  <ul className="mt-2 space-y-1.5">
                    {pageData.topStrengths.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[#9AA7B5]">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A]/60" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pageData?.topRisks && pageData.topRisks.length > 0 && (
                <div className="rounded-2xl border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.04)] p-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444]">Key Risks</h3>
                  <ul className="mt-2 space-y-1.5">
                    {pageData.topRisks.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[#9AA7B5]">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EF4444]/60" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <RiskReviewPanel
                riskFlags={pageData?.keyRiskFlags ?? []}
                overallRisk={pageData?.overallRisk ?? null}
                riskScore={factorView?.riskScore ?? null}
              />
              <NextBestActionPanel symbol={ticker} hasSignal={signal !== null && signal.label !== "Research signals pending"} hasSector={sector !== "Awaiting classification"} />
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5">
                <h2 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">
                  Before You Invest
                  <ResearchContextLink label="How scores work" />
                </h2>
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
              <FactorDriverList factors={factorView} />
              {financialSnapshot.groups.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E]">Financial Strength</h3>
                  <FinancialMetricGrid groups={financialSnapshot.groups} />
                </div>
              )}
              {financialSnapshot.valuation && (
                <ValuationContextPanel context={financialSnapshot.valuation} />
              )}
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
              <div className="flex justify-center">
                <ResearchContextLink />
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

      <div className="mt-4 text-center">
        <button type="button" onClick={() => { const p = new URLSearchParams(window.location.search); p.set("page", "terms"); window.history.pushState({}, "", `?${p.toString()}`); window.dispatchEvent(new Event("urlchange")); }} className="text-[9px] font-medium tracking-wider text-[#64748B] uppercase hover:text-[#9AA7B5] transition-colors">
          Informational research tool — Read Terms & Disclosures
        </button>
      </div>

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
              {storyData?.narrative || "Factor scoring details are not yet available."}
            </p>
          </div>

          {signal && <SignalExplanationPanel signal={signal} />}
          <FactorDriverList factors={factorView} />
          <RiskReviewPanel
            riskFlags={pageData?.keyRiskFlags ?? []}
            overallRisk={pageData?.overallRisk ?? null}
            riskScore={factorView?.riskScore ?? null}
          />

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Research basis</span>
            <div className="mt-2 space-y-1.5">
              {[
                { label: "Assessment date", value: storyData?.predictionDate ? formatDateTime(storyData.predictionDate) : "Assessment not yet available" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#8B949E]">{item.label}</span>
                  <span className="text-xs font-medium text-[#E6EDF3]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-[#64748B]">
            This score explanation shows model inputs and outputs for reference. <button type="button" onClick={() => { const p = new URLSearchParams(window.location.search); p.set("page", "terms"); window.history.pushState({}, "", `?${p.toString()}`); window.dispatchEvent(new Event("urlchange")); }} className="underline hover:text-[#9AA7B5] transition-colors">Read Terms & Disclosures</button>
          </p>
        </div>
      </IntelligenceModal>
    </div>
  );
};

export default StockStoryPage;
