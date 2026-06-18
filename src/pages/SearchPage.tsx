import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { UserJourneyEngine } from "../services/behavior/UserJourneyEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { RegisteredStock } from "../services/stocks/StockRegistry";
import { StockSearchEngine } from "../services/stocks/StockSearchEngine";
import Badge from "../components/ui/Badge";
import ScorePill from "../components/ui/ScorePill";
import { EmptyState } from "../components/ui/DataState";
import { formatINR, formatRank, formatFreshness } from "../services/ui/dataFormatting";
import { api, type LeaderboardEntry } from "../services/api/client";

function readQueryFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
}

function updateSearchUrl(query: string, mode: "push" | "replace"): void {
  const url = new URL(window.location.href);
  url.searchParams.set("page", "search");
  if (query.trim()) url.searchParams.set("q", query.trim());
  else url.searchParams.delete("q");
  if (mode === "push") window.history.pushState({}, "", url.toString());
  else window.history.replaceState({}, "", url.toString());
  window.dispatchEvent(new Event("urlchange"));
}

export const SearchPage: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => readQueryFromUrl());
  const [results, setResults] = useState<RegisteredStock[]>(() => {
    const initialQuery = readQueryFromUrl();
    return initialQuery.length >= 2 ? StockSearchEngine.search(initialQuery) : [];
  });

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const nextQuery = readQueryFromUrl();
      setQuery(nextQuery);
      setResults(nextQuery.length >= 2 ? StockSearchEngine.search(nextQuery) : []);
    };
    window.addEventListener("urlchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("urlchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  const [predictionsMap, setPredictionsMap] = useState<Record<string, LeaderboardEntry>>({});

  useEffect(() => {
    api.getLeaderboard(200)
      .then((res) => {
        if (!res.data) return;
        const map: Record<string, LeaderboardEntry> = {};
        res.data.forEach((item) => {
          if (item.symbol) {
            const cleaned = item.symbol.replace(/\.NS$/, "").toUpperCase();
            map[cleaned] = item;
          }
        });
        setPredictionsMap(map);
      })
      .catch(() => {});
  }, []);

  const recentSearches = useMemo(() => RecentSearchStore.getRecent().slice(0, 6), [results, query]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();
    const nextResults = trimmed.length >= 2 ? StockSearchEngine.search(trimmed) : [];
    setResults(nextResults);
    updateSearchUrl(value, "replace");
    if (trimmed.length >= 2) {
      UserJourneyEngine.trackEvent("search", { query: trimmed, resultCount: nextResults.length, source: "search_page" });
    }
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    updateSearchUrl(trimmed, "push");
    if (trimmed.length >= 2) setResults(StockSearchEngine.search(trimmed));
  };

  const handleOpenStock = (stock: RegisteredStock) => {
    const trimmed = query.trim();
    if (trimmed) RecentSearchStore.addTicker(trimmed);
    UserJourneyEngine.trackEvent("stock_explore", { symbol: stock.symbol, sector: stock.sector, source: "search_page" });
    navigateToStock({ ticker: stock.symbol, mode: "push" });
  };

  const handleRecentSearch = (value: string) => {
    setQuery(value);
    setResults(value.trim().length >= 2 ? StockSearchEngine.search(value) : []);
    updateSearchUrl(value, "push");
  };

  return (
    <div className="flex flex-col gap-5 antialiased" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#0f1419" }}>
      {/* Compact search header — no bulky glass card */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 shadow-sm">
        <Search className="h-4 w-4 shrink-0" style={{ color: "#8b98a5" }} />
        <input
          aria-label="Search Indian companies"
          ref={inputRef}
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Search by ticker, company name, or sector..."
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:opacity-60"
          style={{ color: "#0f1419" }}
        />
        {recentSearches.length > 0 && !query.trim() && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#8b98a5" }}>Recent</span>
            {recentSearches.slice(0, 3).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleRecentSearch(item)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition hover:bg-white/80"
                style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="space-y-4">
        {query.trim().length >= 2 ? (
          <>
            <div className="text-sm" style={{ color: "#536471" }}>
              {results.length} result{results.length === 1 ? "" : "s"} for <span className="font-medium" style={{ color: "#0f1419" }}>"{query.trim()}"</span>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {results.map((stock, idx) => {
                  const cleanedSym = stock.symbol.replace(/\.NS$/, "").toUpperCase();
                  const prediction = predictionsMap[cleanedSym];
                  const score = prediction?.rankingScore ?? null;
                  const confidenceScore = prediction?.confidenceScore ?? null;
                  const predictionDate = prediction?.predictionDate ?? null;
                  const predictionSector = prediction?.sector ?? null;
                  const rank = prediction?.rank ?? null;

                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => handleOpenStock(stock)}
                      className="flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-left transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold" style={{ color: "#0f1419" }}>{stock.symbol}</span>
                          {score !== null ? (
                            <ScorePill score={Math.round(score)} />
                          ) : (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>Pending</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="truncate text-xs" style={{ color: "#536471" }}>{stock.companyName}</span>
                          <span className="text-[10px] font-medium" style={{ color: "#8b98a5" }}>{stock.sector || predictionSector || ""}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        {rank !== null && <span className="text-[10px] font-medium" style={{ color: "#536471" }}>#{rank}</span>}
                        {confidenceScore !== null && <span className="text-[10px] font-mono" style={{ color: "#2c6b9e" }}>{Math.round(confidenceScore)}%</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white/80 px-6 py-8 text-center">
                <p className="text-sm font-semibold" style={{ color: "#0f1419" }}>No matching equity found</p>
                <p className="mt-1 text-xs" style={{ color: "#536471" }}>
                  Try searching for: 
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleRecentSearch(sym)}
                      className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition hover:bg-white/80"
                      style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="Search the company universe" description="Type at least 2 characters to begin." />
        )}
      </section>
    </div>
  );
};

export default SearchPage;
