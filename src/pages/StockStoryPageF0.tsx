import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowLeftRight, Bookmark, TrendingUp, FileText, BarChart3, Building2, LineChart } from "lucide-react";
import StockWorkspaceBar from "../components/company/StockWorkspaceBar";
import StockStoryPage from "./StockStoryPage";
import { ProductShell, ProductPage, ProductPanel, ProductStatusPill, productNavigate, ProductAction } from "../components/product/ProductUI";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { useToast } from "../components/feedback/useToast";
import { InvestHandoffSheet } from "../components/invest/InvestHandoffSheet";
import { IntelligenceModal } from "../components/intelligence/IntelligenceModal";
import { SpatialSheet } from "../components/intelligence/SpatialSheet";
import { ShareResearchSummary } from "../components/share/ShareResearchSummary";
import { PRODUCT_EVENTS, trackEvent } from "../lib/analytics/productEvents";

const HORIZONS = [7, 30, 90, 180, 365] as const;
type PredictionHorizon = (typeof HORIZONS)[number];

function readHorizonFromUrl(): PredictionHorizon {
  if (typeof window === "undefined") return 30;
  const parsed = Number.parseInt(new URLSearchParams(window.location.search).get("horizon") ?? "", 10) as PredictionHorizon;
  return HORIZONS.includes(parsed) ? parsed : 30;
}

function readTickerFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") ?? params.get("symbol") ?? params.get("ticker") ?? params.get("companyId") ?? "").toUpperCase().trim();
}

type ConvictionLevel = "high" | "moderate" | "low" | "none";

export default function StockStoryPageF0(): JSX.Element {
  const [horizon, setHorizon] = useState<PredictionHorizon>(() => readHorizonFromUrl());
  const ticker = readTickerFromUrl();
  const stockInfo = ticker ? StockRegistry.getStock(ticker) : null;
  const [whyThisViewOpen, setWhyThisViewOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const toast = useToast();
  const isInWatchlist = watchlists.some((w) => w.tickers.includes(ticker));

  useEffect(() => {
    const handler = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  const selectHorizon = (nextHorizon: PredictionHorizon) => {
    const params = new URLSearchParams(window.location.search);
    params.set("horizon", String(nextHorizon));
    window.history.replaceState({}, "", `?${params.toString()}`);
    setHorizon(nextHorizon);
  };

  const handleToggleWatchlist = () => {
    const defaultList = watchlists[0];
    if (!defaultList) return;
    if (isInWatchlist) {
      WatchlistEngine.removeTicker(defaultList.id, ticker);
      toast.success(`${ticker} removed from watchlist`);
    } else {
      WatchlistEngine.addTicker(defaultList.id, ticker);
      toast.success(`${ticker} saved to watchlist`);
    }
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const companyName = stockInfo?.companyName || "Needs research";
  const sector = stockInfo?.sector || null;

  const convictionLevel: ConvictionLevel = !ticker ? "none" : stockInfo && sector ? "moderate" : "low";

  const convictionLabel: Record<ConvictionLevel, string> = {
    high: "High conviction",
    moderate: "Moderate conviction",
    low: "Under review",
    none: "Insufficient information",
  };

  const convictionTone: Record<ConvictionLevel, "verified" | "blue" | "warning" | "muted"> = {
    high: "verified",
    moderate: "blue",
    low: "warning",
    none: "muted",
  };

  const whatThisIsBasedOn = stockInfo && sector
    ? ["Company fundamentals", "Sector analysis", "Market data"]
    : ticker
      ? ["Company identification"]
      : [];

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={() => productNavigate("search")}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#9AA7B5] transition hover:text-[#E6EDF3]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            {watchlists.length > 0 && (
              <button
                onClick={handleToggleWatchlist}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 py-1.5 text-[11px] font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
              >
                <Bookmark className={`h-3 w-3 ${isInWatchlist ? "fill-[#2962FF] text-[#2962FF]" : ""}`} />
                {isInWatchlist ? "Saved" : "Watchlist"}
              </button>
            )}
            <button
              onClick={() => { setShareOpen(true); trackEvent(PRODUCT_EVENTS.COMPANY_SHARE_OPENED); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 py-1.5 text-[11px] font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
              aria-label="Share research summary"
            >
              <ArrowLeftRight className="h-3 w-3" /> Share
            </button>
            <button
              onClick={() => productNavigate("compare", ticker)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 py-1.5 text-[11px] font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
            >
              <ArrowLeftRight className="h-3 w-3" /> Compare
            </button>
            <button
              onClick={() => setWhyThisViewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 py-1.5 text-[11px] font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
            >
              <FileText className="h-3 w-3" /> Why this view
            </button>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">{stockInfo?.companyName || ticker || "Needs research"}</h1>
            <span className="text-sm text-[#9AA7B5]">{ticker && ticker !== stockInfo?.companyName ? ticker : ""}</span>
          </div>
          {sector && (
            <p className="mt-0.5 text-xs text-[#64748B]">{sector}</p>
          )}
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <ProductPanel className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9AA7B5]">Conviction</div>
            <div className="mt-2 flex items-center gap-2">
              <ProductStatusPill tone={convictionTone[convictionLevel]}>
                {convictionLabel[convictionLevel]}
              </ProductStatusPill>
            </div>
            {convictionLevel === "none" && (
              <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                Research signals are being prepared for this company. Check back once the research cycle completes.
              </p>
            )}
          </ProductPanel>
          <ProductPanel className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9AA7B5]">What this is based on</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {whatThisIsBasedOn.length > 0 ? (
                whatThisIsBasedOn.map((item) => (
                  <ProductStatusPill key={item} tone="blue">{item}</ProductStatusPill>
                ))
              ) : (
                <ProductStatusPill tone="muted">Awaiting research</ProductStatusPill>
              )}
              <ProductStatusPill tone="muted">
                {horizon}D horizon
              </ProductStatusPill>
            </div>
          </ProductPanel>
        </div>

        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-4 py-2.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Horizon</span>
            {HORIZONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectHorizon(option)}
                aria-pressed={horizon === option}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  horizon === option
                    ? "bg-[#2962FF] text-white shadow-sm"
                    : "text-[#9AA7B5] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#E6EDF3]"
                }`}
              >
                {option}D
              </button>
            ))}
          </div>
          <ProductAction onClick={() => setInvestOpen(true)} variant="primary">
            Invest through broker
          </ProductAction>
        </div>

        <StockWorkspaceBar ticker={ticker} horizon={horizon} />

        <StockStoryPage key={horizon} />

        <IntelligenceModal
          open={whyThisViewOpen}
          onClose={() => setWhyThisViewOpen(false)}
          title={`Research basis — ${ticker || "current view"}`}
          subtitle="Why this stock page looks the way it does and what research supports it."
        >
          <div className="space-y-5">
              <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                <BarChart3 className="h-3.5 w-3.5" /> Research basis
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#E6EDF3]">Company fundamentals</span>
                  <ProductStatusPill tone={stockInfo ? "verified" : "muted"}>
                    {stockInfo ? "Available" : "Pending"}
                  </ProductStatusPill>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#E6EDF3]">Sector context</span>
                  <ProductStatusPill tone={sector ? "verified" : "muted"}>
                    {sector || "Unclassified"}
                  </ProductStatusPill>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#E6EDF3]">Prediction horizon</span>
                  <ProductStatusPill tone="blue">{horizon}D</ProductStatusPill>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                <LineChart className="h-3.5 w-3.5" /> Methodology
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs leading-relaxed text-[#9AA7B5]">
                  Predictions are model-generated based on available data. Scores reflect relative conviction within the selected horizon and are not financial advice. Always conduct your own research before investing.
                </p>
              </div>
            </div>
          </div>
        </IntelligenceModal>

        <InvestHandoffSheet
          open={investOpen}
          onClose={() => setInvestOpen(false)}
          symbol={ticker}
        />

        <SpatialSheet open={shareOpen} onClose={() => setShareOpen(false)} title="Share Research Summary">
          {stockInfo ? (
            <ShareResearchSummary
              data={{
                ticker,
                companyName: stockInfo.companyName || ticker,
                sector: stockInfo.sector,
              }}
              onClose={() => setShareOpen(false)}
              onOpenMethodology={() => { setShareOpen(false); productNavigate("methodology"); }}
            />
          ) : (
            <div className="flex items-center justify-center py-8 text-xs text-[#9AA7B5]">
              Research summary pending...
            </div>
          )}
        </SpatialSheet>
      </ProductPage>
    </ProductShell>
  );
}
