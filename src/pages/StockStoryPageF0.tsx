import React, { useState, useEffect } from "react";
import { Activity, ArrowLeft, Bookmark, ShieldAlert, TrendingUp, GitCompare } from "lucide-react";
import StockWorkspaceBar from "../components/company/StockWorkspaceBar";
import StockStoryPage from "./StockStoryPage";
import { ProductShell, ProductPage, productNavigate } from "../components/product/ProductUI";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { useToast } from "../components/feedback/useToast";
import { InvestHandoffSheet } from "../components/invest/InvestHandoffSheet";
import { buildCompanyResearch } from "../lib/product/companyResearchRuntime";
import { useLiveQuote, formatINR, formatPercent } from "../hooks/useLiveQuotes";
import type { PriceTick } from "../services/realtime/RealtimeStateManager";

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

export default function StockStoryPageF0(): JSX.Element {
  const [horizon, setHorizon] = useState<PredictionHorizon>(() => readHorizonFromUrl());
  const ticker = readTickerFromUrl();
  const stockInfo = ticker ? StockRegistry.getStock(ticker) : null;
  const [investOpen, setInvestOpen] = useState(false);
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const toast = useToast();
  const isInWatchlist = watchlists.some((w) => w.tickers.includes(ticker));
  const liveQuote = useLiveQuote(ticker);
  const [liveTick, setLiveTick] = useState<PriceTick | null>(null);

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

  useEffect(() => {
    if (!ticker) return;
    const { RealtimeCoordinator } = require("../services/realtime/RealtimeCoordinator");
    const unsub = RealtimeCoordinator.subscribeToStock(ticker, (tick: PriceTick) => {
      setLiveTick(tick);
    });
    return unsub;
  }, [ticker]);

  const runtimeResult = buildCompanyResearch(ticker, stockInfo?.companyName, stockInfo?.sector, stockInfo ? { sector: stockInfo.sector } : null, isInWatchlist);

  const quotePrice = liveTick ? `Rs ${liveTick.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : liveQuote.quote ? formatINR(liveQuote.quote.price) : "—";
  const quoteChange = liveTick
    ? `${liveTick.change >= 0 ? "+" : ""}${liveTick.change.toFixed(2)} (${liveTick.changePercent >= 0 ? "+" : ""}${liveTick.changePercent.toFixed(2)}%)`
    : liveQuote.quote
      ? `${formatINR(liveQuote.quote.change)} (${formatPercent(liveQuote.quote.changePercent)})`
      : null;
  const isPositive = liveTick ? liveTick.change >= 0 : liveQuote.quote ? liveQuote.quote.changePercent >= 0 : true;

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
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">{runtimeResult.identity.displayName}</h1>
            {ticker && runtimeResult.identity.displayName !== ticker && (
              <span className="mt-0.5 inline-block font-mono text-xs font-medium text-[#9AA7B5]">{ticker}</span>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#0C1119] px-4 py-2.5">
            <div className="text-right">
              <div className="font-mono text-base font-bold tabular-nums text-[#E6EDF3]">{quotePrice}</div>
              {quoteChange && (
                <div className={`font-mono text-[10px] font-bold ${isPositive ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>{quoteChange}</div>
              )}
            </div>
            <div className="h-8 w-px bg-[rgba(148,163,184,0.14)]" />
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#9AA7B5]">
              {liveTick ? "Live" : "Price"}
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Horizon</span>
            <div className="flex items-center gap-1 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-3 py-1.5">
              {HORIZONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectHorizon(option)}
                  aria-pressed={horizon === option}
                  className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                    horizon === option
                      ? "bg-[#2962FF] text-white shadow-sm"
                      : "text-[#9AA7B5] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#E6EDF3]"
                  }`}
                >
                  {option}D
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setInvestOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#2962FF] bg-[#2962FF] px-5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(41,98,255,0.2)] transition hover:bg-[#3B71FF]"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Invest
            </button>
            {watchlists.length > 0 && (
              <button
                onClick={handleToggleWatchlist}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-4 text-xs font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
              >
                <Bookmark className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-[#2962FF] text-[#2962FF]" : ""}`} />
                {isInWatchlist ? "Tracking" : "Track"}
              </button>
            )}
            <button
              onClick={() => productNavigate("compare", ticker)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-4 text-xs font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
            >
              <GitCompare className="h-3.5 w-3.5" /> Compare
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0C1119] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-3.5 w-3.5 text-[#2962FF]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B5]">Prediction Engine</span>
            </div>
            {runtimeResult.prediction.overallScore !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#E6EDF3]">{runtimeResult.prediction.overallScore}</span>
                <span className="text-[10px] text-[#9AA7B5]">/ 100</span>
                <span className="rounded-full border border-[rgba(41,98,255,0.2)] bg-[rgba(41,98,255,0.12)] px-2 py-0.5 text-[9px] font-semibold text-[#2962FF]">{runtimeResult.prediction.readiness}</span>
              </div>
            ) : (
              <p className="text-xs text-[#64748B]">Not enough information for this view yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0C1119] p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-3.5 w-3.5 text-[#16A34A]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA7B5]">Healthometer</span>
            </div>
            {runtimeResult.healthometer.overallScore !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#E6EDF3]">{Math.round(runtimeResult.healthometer.overallScore)}</span>
                <span className="text-[10px] text-[#9AA7B5]">/ 100</span>
                {runtimeResult.healthometer.dimensions.length > 0 && (
                  <span className="text-[9px] text-[#64748B]">{runtimeResult.healthometer.dimensions.filter((d: any) => d.score !== null).length} active</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#64748B]">Not enough information for this view yet.</p>
            )}
          </div>
        </div>

        <StockWorkspaceBar ticker={ticker} horizon={horizon} />

        <StockStoryPage key={horizon} />

        <div className="mt-8 border-t border-[rgba(148,163,184,0.08)] pt-5">
          <p className="text-[10px] leading-relaxed text-[#64748B]">
            Scores reflect relative research conviction within the selected horizon and are not financial advice. Always conduct your own research before investing. StockStory is a research workspace.
          </p>
          <button
            onClick={() => productNavigate("methodology")}
            className="mt-2 text-[10px] font-medium text-[#2962FF] hover:text-[#3B71FF] transition-colors underline underline-offset-2"
          >
            How research methodology works
          </button>
        </div>

        <InvestHandoffSheet
          open={investOpen}
          onClose={() => setInvestOpen(false)}
          symbol={ticker}
        />

        {stockInfo && (
          <div className="mt-4 text-center">
            <button
              onClick={() => productNavigate("methodology")}
              className="text-[9px] font-medium uppercase tracking-wider text-[#64748B] transition hover:text-[#9AA7B5]"
            >
              How research methodology works
            </button>
          </div>
        )}
      </ProductPage>
    </ProductShell>
  );
}
