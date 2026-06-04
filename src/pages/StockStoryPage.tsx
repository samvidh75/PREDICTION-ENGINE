import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Compass, FileText, Star } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { formatINR, formatPercent, useLiveQuote } from "../hooks/useLiveQuotes";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { StockRegistry } from "../services/stocks/StockRegistry";
import type { CompanyMetadata } from "../services/data/types";

type TabKey = "overview" | "financials" | "valuation" | "ownership" | "risks" | "documents";

type MetadataState = {
  data: CompanyMetadata | null;
  loading: boolean;
  error: string | null;
};

const tabs: TabKey[] = ["overview", "financials", "valuation", "ownership", "risks", "documents"];

function readTickerFromUrl(): string {
  if (typeof window === "undefined") return "RELIANCE";
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") ?? params.get("ticker") ?? "RELIANCE").toUpperCase().trim() || "RELIANCE";
}

function readTabFromUrl(): TabKey {
  if (typeof window === "undefined") return "overview";
  const tab = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
  return tab && tabs.includes(tab) ? tab : "overview";
}

function formatLargeINR(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "Data unavailable";
  const crore = value / 10_000_000;
  if (crore >= 100_000) return `Rs ${(crore / 100_000).toFixed(2)} L Cr`;
  if (crore >= 1) return `Rs ${crore.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
  return formatINR(value);
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.015] p-5 text-sm text-white/45">
      {label} is not available from the connected data providers yet.
    </div>
  );
}

export const StockStoryPage: React.FC = () => {
  const ticker = useMemo(() => readTickerFromUrl(), []);
  const registryStock = useMemo(() => StockRegistry.getStock(ticker), [ticker]);
  const liveQuote = useLiveQuote(ticker);
  const [activeTab, setActiveTab] = useState<TabKey>(() => readTabFromUrl());
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [noteText, setNoteText] = useState(() => NoteEngine.getNote(ticker).note);
  const [metadata, setMetadata] = useState<MetadataState>({ data: null, loading: true, error: null });

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
        if (!response.ok) throw new Error(body?.error || `Metadata request failed with HTTP ${response.status}`);
        return body as CompanyMetadata;
      })
      .then((data) => setMetadata({ data, loading: false, error: null }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setMetadata({ data: null, loading: false, error: error.message });
      });

    return () => controller.abort();
  }, [ticker]);

  const companyName =
    metadata.data?.companyName && metadata.data.companyName !== ticker
      ? metadata.data.companyName
      : registryStock?.companyName || ticker;
  const sector = metadata.data?.sector || registryStock?.sector || "Data unavailable";
  const industry = metadata.data?.industry || "Data unavailable";
  const exchange = metadata.data?.exchange || liveQuote.quote?.exchange || "NSE";
  const marketCap = formatLargeINR(metadata.data?.marketCap);
  const currency = metadata.data?.currency || "INR";
  const quote = liveQuote.quote;
  const priceLabel = liveQuote.loading ? "Loading..." : quote ? formatINR(quote.price) : "Data unavailable";
  const changeLabel = quote ? `${formatINR(quote.change)} (${formatPercent(quote.changePercent)})` : liveQuote.error || "Data unavailable";

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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-16 text-white antialiased">
      <div className="flex items-center justify-between gap-3 text-xs">
        <button
          onClick={() => navigateToPage("dashboard")}
          className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider text-cyan-400 transition-colors hover:text-cyan-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </button>
        <button
          onClick={() => navigateToPage("discovery")}
          className="flex items-center gap-1.5 border-none bg-transparent font-bold uppercase tracking-wider text-white/60 transition-colors hover:text-white"
        >
          <Compass className="h-3.5 w-3.5" /> Discovery
        </button>
      </div>

      <section className="border-b border-white/5 pb-5">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/45">
              <span>{ticker}</span>
              <span>{exchange}</span>
              <span>{currency}</span>
            </div>
            <h1 className="max-w-4xl text-2xl font-bold tracking-tight text-white md:text-3xl">{companyName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
              <span>{sector}</span>
              <span>•</span>
              <span>{industry}</span>
            </div>
            {metadata.error && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                Metadata provider unavailable. Showing verified quote data and local identity labels.
              </div>
            )}
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-5">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/30">Live Price</div>
              <div className="mt-1 font-mono text-2xl font-bold text-white">{priceLabel}</div>
              <div className={`mt-1 font-mono text-[11px] ${quote && quote.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {changeLabel}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/30">Volume</div>
              <div className="mt-1 font-mono text-2xl font-bold text-white">
                {quote?.volume ? quote.volume.toLocaleString("en-IN") : "Data unavailable"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-white/35">Updated {formatDateTime(quote?.updatedAt)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleWatchlist}
            className={`flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-semibold transition-all ${
              isInWatchlist
                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${isInWatchlist ? "fill-rose-400" : ""}`} />
            {isInWatchlist ? "Remove From Watchlist" : "Add To Watchlist"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.015] p-4">
          <div className="text-[9px] font-bold uppercase tracking-wider text-white/30">Quote Source</div>
          <div className="mt-2 text-sm text-white/80">Yahoo Finance provider chain</div>
          <div className="mt-1 text-xs text-white/40">Falls back only to configured providers. No generated prices.</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.015] p-4">
          <div className="text-[9px] font-bold uppercase tracking-wider text-white/30">Market Cap</div>
          <div className="mt-2 font-mono text-sm text-white/80">{marketCap}</div>
          <div className="mt-1 text-xs text-white/40">{metadata.loading ? "Loading provider metadata..." : "Provider supplied field"}</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.015] p-4">
          <div className="text-[9px] font-bold uppercase tracking-wider text-white/30">Data Policy</div>
          <div className="mt-2 text-sm text-white/80">Real data only</div>
          <div className="mt-1 text-xs text-white/40">Missing corporate data is shown as unavailable.</div>
        </div>
      </section>

      <div className="rounded-lg border border-white/5 bg-white/[0.015] p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">My Research Notes</div>
        <textarea
          value={noteText}
          onChange={(event) => handleSaveNote(event.target.value)}
          placeholder="Add your own research notes for this company..."
          className="h-20 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/25 outline-none transition-colors focus:border-cyan-400"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={`h-10 shrink-0 border-b-2 bg-transparent px-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? "border-cyan-400 text-cyan-400" : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="min-h-[220px] rounded-lg border border-white/5 bg-white/[0.01] p-6">
        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                <Building2 className="h-3.5 w-3.5" /> Company Profile
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Name</dt>
                  <dd className="text-right text-white/85">{companyName}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Sector</dt>
                  <dd className="text-right text-white/85">{sector}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Industry</dt>
                  <dd className="text-right text-white/85">{industry}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Exchange</dt>
                  <dd className="text-right text-white/85">{exchange}</dd>
                </div>
              </dl>
            </div>
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Live Quote</div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Price</dt>
                  <dd className="text-right font-mono text-white/85">{priceLabel}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Change</dt>
                  <dd className="text-right font-mono text-white/85">{changeLabel}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Volume</dt>
                  <dd className="text-right font-mono text-white/85">{quote?.volume ? quote.volume.toLocaleString("en-IN") : "Data unavailable"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-white/45">Updated</dt>
                  <dd className="text-right text-white/85">{formatDateTime(quote?.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === "financials" && <EmptyState label="Financial statement data" />}
        {activeTab === "valuation" && <EmptyState label="Valuation ratios" />}
        {activeTab === "ownership" && <EmptyState label="Ownership and shareholding data" />}
        {activeTab === "risks" && <EmptyState label="Risk analysis" />}
        {activeTab === "documents" && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
              <FileText className="h-3.5 w-3.5" /> Corporate Filings & Disclosures
            </div>
            <EmptyState label="Corporate filings" />
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
