import React, { useState, useEffect, useCallback, useRef } from "react";
import { Trash2, RefreshCw, Clock, Plus, Search, Eye } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { runCompanyDataPipeline, PipelineResult } from "../services/data/CompanyDataPipeline";
import { globalPipelineQueue } from "../services/data/PipelineQueue";
import { fPrice, fChange, fRelativeTime } from "../lib/format";
import { ScoreRing } from "../components/ui/ScoreRing";
import { ClassificationBadge } from "../components/ui/ClassificationBadge";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductEmptyState, productNavigate } from "../components/product/ProductUI";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { useToast } from "../components/feedback/useToast";
import Input from "../components/ui/Input";

const WATCHLIST_KEY = "ss_watchlist";
const MAX_WATCHLIST = 20;

function getWatchlistSymbols(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY) ?? "";
    return raw ? raw.split(",").map(s => s.trim().toUpperCase()).filter(Boolean) : [];
  } catch { return []; }
}

function setWatchlistSymbols(symbols: string[]): void {
  localStorage.setItem(WATCHLIST_KEY, symbols.join(","));
  window.dispatchEvent(new Event("watchlistchange"));
}

function changeColor(change: number | null): string {
  if (change === null || change === undefined) return "text-[#8B949E]";
  return change >= 0 ? "text-green-400" : "text-red-400";
}

export const WatchlistPage: React.FC = () => {
  useDocumentTitle("My Watchlist | StockStory India");
  const toast = useToast();
  const [symbols, setSymbols] = useState<string[]>(() => getWatchlistSymbols());
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const [addInput, setAddInput] = useState("");
  const [refreshProgress, setRefreshProgress] = useState<{ done: number; total: number } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const handler = () => {
      const updated = getWatchlistSymbols();
      setSymbols(updated);
    };
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  const loadSymbols = useCallback(async (syms: string[]) => {
    if (syms.length === 0) return;
    setLoadingSymbols(prev => {
      const next = new Set(prev);
      syms.forEach(s => next.add(s));
      return next;
    });
    await Promise.allSettled(
      syms.map(sym =>
        globalPipelineQueue.enqueue(() => runCompanyDataPipeline(sym)).then(
          r => { if (mountedRef.current) setResults(prev => ({ ...prev, [sym]: r })); },
          () => { if (mountedRef.current) setResults(prev => ({ ...prev, [sym]: null })); },
        )
      ),
    );
    if (mountedRef.current) {
      setLoadingSymbols(prev => {
        const next = new Set(prev);
        syms.forEach(s => next.delete(s));
        return next;
      });
    }
  }, []);

  useEffect(() => {
    loadSymbols(symbols);
  }, [symbols, loadSymbols]);

  const handleAdd = () => {
    const sym = addInput.toUpperCase().trim();
    if (!sym) return;
    if (symbols.length >= MAX_WATCHLIST) {
      toast.warning(`Watchlist limited to ${MAX_WATCHLIST} stocks. Remove some to add more.`);
      setAddInput("");
      return;
    }
    if (symbols.includes(sym)) {
      toast.info(`${sym} is already in your watchlist`);
      setAddInput("");
      return;
    }
    const updated = [...symbols, sym];
    setWatchlistSymbols(updated);
    setSymbols(updated);
    setAddInput("");
    toast.success(`${sym} added to watchlist`);
  };

  const handleRemove = (sym: string) => {
    const updated = symbols.filter(s => s !== sym);
    setWatchlistSymbols(updated);
    setSymbols(updated);
    setResults(prev => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
    toast.success(`${sym} removed`);
  };

  const handleRefreshAll = async () => {
    if (symbols.length === 0) return;
    setRefreshProgress({ done: 0, total: symbols.length });
    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      await globalPipelineQueue.enqueue(() => runCompanyDataPipeline(sym)).then(
        r => { if (mountedRef.current) setResults(prev => ({ ...prev, [sym]: r })); },
        () => { if (mountedRef.current) setResults(prev => ({ ...prev, [sym]: null })); },
      );
      if (mountedRef.current) {
        setRefreshProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null);
      }
    }
    if (mountedRef.current) setRefreshProgress(null);
    toast.success("Watchlist refreshed");
  };

  const isLoading = loadingSymbols.size > 0;
  const activeProgress = refreshProgress || (isLoading ? { done: symbols.filter(s => s in results).length, total: symbols.length } : null);

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#2962FF]" />
              <h1 className="text-base font-semibold text-[#E6EDF3]">Watchlist</h1>
            </div>
            <p className="mt-1 text-xs text-[#8B949E]">
              {symbols.length > 0
                ? `${symbols.length} stock${symbols.length !== 1 ? "s" : ""} tracked`
                : "Track stocks you care about"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeProgress && (
              <span className="text-[11px] text-[#8B949E]">
                Refreshing {activeProgress.done} of {activeProgress.total}...
              </span>
            )}
            {symbols.length > 0 && (
              <button
                onClick={handleRefreshAll}
                disabled={!!refreshProgress}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshProgress ? "animate-spin" : ""}`} />
                Refresh all
              </button>
            )}
            <button
              onClick={() => productNavigate("scanner")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Scanner
            </button>
          </div>
        </div>

        {symbols.length === 0 ? (
          <ProductEmptyState
            icon={Eye}
            title="Your watchlist is empty"
            body="Find stocks to track in the Scanner."
            action={
              <ProductAction onClick={() => productNavigate("scanner")}>
                Go to Scanner →
              </ProductAction>
            }
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2">
              <Input
                placeholder="Add stock symbol..."
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                className="h-9 text-xs max-w-[200px]"
                glass
              />
              <button
                onClick={handleAdd}
                disabled={!addInput.trim() || symbols.length >= MAX_WATCHLIST}
                className="inline-flex items-center gap-1 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
              {symbols.length >= MAX_WATCHLIST && (
                <span className="text-[10px] text-[#F59E0B]">Max {MAX_WATCHLIST} stocks</span>
              )}
            </div>

            {symbols.map((sym) => {
              const r = results[sym];
              const pending = loadingSymbols.has(sym);
              const ready = r !== undefined;

              const price = ready && r ? r.price.current : null;
              const change = ready && r ? r.price.change : null;
              const healthScore = ready && r ? (r.prediction?.healthScore ?? null) : null;
              const classification = ready && r ? (r.prediction?.classification ?? "INSUFFICIENT_DATA") : "INSUFFICIENT_DATA";
              const companyName = ready && r ? r.companyName : null;
              const fetchedAt = ready && r ? r.fetchedAt : null;

              return (
                <ProductPanel key={sym} className="p-3 md:p-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {pending && !r ? (
                        <div className="flex h-10 w-10 items-center justify-center">
                          <RefreshCw className="h-4 w-4 animate-spin text-[#2962FF]" />
                        </div>
                      ) : (
                        <ScoreRing score={healthScore} size="sm" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#E6EDF3]">{sym}</span>
                        {companyName && (
                          <span className="hidden truncate text-xs text-[#8B949E] max-w-[160px] sm:inline">{companyName}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {ready && r ? (
                          <>
                            <span className="font-mono text-xs font-medium text-[#E6EDF3]">{fPrice(price)}</span>
                            {change !== null && (
                              <span className={`font-mono text-xs font-medium ${changeColor(change)}`}>
                                {change >= 0 ? "+" : ""}{fChange(change)}
                              </span>
                            )}
                            <ClassificationBadge classification={classification} size="sm" />
                            {fetchedAt && (
                              <span className="flex items-center gap-1 text-[10px] text-[#484F58]">
                                <Clock className="h-3 w-3" />
                                Last researched {fRelativeTime(fetchedAt)}
                              </span>
                            )}
                          </>
                        ) : pending ? (
                          <span className="text-[11px] text-[#8B949E]">Loading data...</span>
                        ) : (
                          <span className="text-[11px] text-[#F59E0B]">Could not load data</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => navigateToStock({ ticker: sym, mode: "push" })}
                        className="inline-flex items-center gap-1 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[11px] font-medium text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
                      >
                        Research →
                      </button>
                      <button
                        onClick={() => handleRemove(sym)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#484F58] hover:bg-white/[0.04] hover:text-[#EF4444] transition-colors"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </ProductPanel>
              );
            })}
          </div>
        )}
      </ProductPage>
    </ProductShell>
  );
};

export default WatchlistPage;
