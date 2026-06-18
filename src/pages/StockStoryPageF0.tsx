import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowLeftRight, Bookmark, Shield } from "lucide-react";
import StockWorkspaceBar from "../components/company/StockWorkspaceBar";
import StockStoryPage from "./StockStoryPage";
import { ProductShell, ProductPage, ProductPanel, ProductStatusPill, productNavigate } from "../components/product/ProductUI";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { SourceAuditSheet } from "../components/intelligence/SourceAuditSheet";
import { useToast } from "../components/feedback/useToast";

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
  const [auditOpen, setAuditOpen] = useState(false);
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

  const companyName = stockInfo?.companyName || "Unavailable";
  const sector = stockInfo?.sector || null;

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
              onClick={() => productNavigate("compare", ticker)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 py-1.5 text-[11px] font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
            >
              <ArrowLeftRight className="h-3 w-3" /> Compare
            </button>
            <button
              onClick={() => setAuditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-2.5 py-1.5 text-[11px] font-semibold text-[#9AA7B5] transition hover:border-[#2962FF]/60 hover:text-[#E6EDF3]"
            >
              <Shield className="h-3 w-3" /> Source trace
            </button>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">{ticker || "Unavailable"}</h1>
            <span className="text-sm text-[#9AA7B5]">{companyName}</span>
          </div>
          {sector && (
            <p className="mt-0.5 text-xs text-[#64748B]">{sector}</p>
          )}
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <ProductPanel className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9AA7B5]">Score</div>
            <div className="mt-2 flex items-center gap-2">
              <ProductStatusPill tone={stockInfo ? "blue" : "muted"}>
                {stockInfo ? "Registry available" : "Registry unavailable"}
              </ProductStatusPill>
            </div>
          </ProductPanel>
          <ProductPanel className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9AA7B5]">Source</div>
            <div className="mt-2 flex items-center gap-2">
              <ProductStatusPill tone={ticker ? "verified" : "muted"}>
                {ticker ? "Symbol resolved" : "No symbol"}
              </ProductStatusPill>
              <ProductStatusPill tone="muted">
                {horizon}D horizon
              </ProductStatusPill>
            </div>
          </ProductPanel>
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-4 py-2.5">
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

        <StockWorkspaceBar ticker={ticker} horizon={horizon} />

        <StockStoryPage key={horizon} />

        <SourceAuditSheet
          open={auditOpen}
          onClose={() => setAuditOpen(false)}
          symbol={ticker}
        />
      </ProductPage>
    </ProductShell>
  );
}
