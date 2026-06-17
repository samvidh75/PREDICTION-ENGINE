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
    <div className="flex flex-col gap-6 antialiased" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#0f1419" }}>
      <div
        className="rounded-2xl p-8"
        style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)" }}
      >
        <div className="mx-auto flex max-w-[620px] flex-col gap-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: "#0f1419" }}>Search Indian stocks</h1>
            <p className="mt-1.5 text-base" style={{ color: "#536471" }}>Start with a ticker, company name, or sector.</p>
          </div>

          <div className="relative">
            <div
              className="flex items-center gap-3 px-4 rounded-2xl transition-all duration-200 focus-within:shadow-lg"
              style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.5)" }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: "#8b98a5" }} />
              <input
                aria-label="Search Indian stocks"
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Try RELIANCE, TCS, INFY..."
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:opacity-60"
                style={{ color: "#0f1419" }}
              />
            </div>
          </div>

          {recentSearches.length > 0 && !query.trim() && (
            <div className="flex flex-wrap justify-center gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleRecentSearch(item)}
                  className="rounded-xl px-3.5 py-1.5 text-xs transition hover:bg-white/60"
                  style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="space-y-5">
        {query.trim().length >= 2 ? (
          <>
            <div className="text-sm" style={{ color: "#536471" }}>
              {results.length} result{results.length === 1 ? "" : "s"} for <span className="font-medium" style={{ color: "#0f1419" }}>"{query.trim()}"</span>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
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
                      className="flex cursor-pointer flex-col justify-between rounded-2xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                      style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="font-mono text-lg font-semibold" style={{ color: "#0f1419" }}>
                            {stock.symbol}
                          </div>
                          <div className="max-w-[200px] truncate text-sm" style={{ color: "#536471" }}>
                            {stock.companyName}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <Badge variant="info" glass>{stock.sector || predictionSector || "Unavailable"}</Badge>
                            {stock.exchange && <Badge variant="neutral" glass>{stock.exchange}</Badge>}
                          </div>
                        </div>
                        {score !== null ? (
                          <div className="flex flex-col items-end gap-1">
                            <ScorePill score={Math.round(score)} />
                            {rank !== null && (
                              <span className="text-xs font-medium" style={{ color: "#536471" }}>{formatRank(rank)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}>
                            Score pending
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}>
                        <div className="flex flex-wrap gap-2">
                          {predictionDate && (
                            <span className="inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#e8f4ee", borderColor: "rgba(26,110,74,0.2)", color: "#1a6e4a" }}>
                              Updated {formatFreshness(predictionDate)}
                            </span>
                          )}
                          {!prediction && (
                            <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[10px] font-medium font-mono" style={{ background: "rgba(255,255,255,0.6)", color: "#536471" }}>
                              Source registry
                            </span>
                          )}
                          {confidenceScore !== null && (
                            <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[10px] font-medium font-mono" style={{ background: "rgba(255,255,255,0.6)", color: "#2c6b9e" }}>
                              {Math.round(confidenceScore)}% confidence
                            </span>
                          )}
                        </div>
                        <span className="tabular-nums" style={{ color: "#536471" }}>
                          {typeof stock.marketCap.numeric === "number" ? formatINR(stock.marketCap.numeric, true) : stock.marketCap.formatted || "Unavailable"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center p-10 text-center rounded-2xl"
                style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)" }}
              >
                <span className="text-base font-semibold" style={{ color: "#0f1419" }}>No matching equity found</span>
                <p className="mt-1.5 text-sm max-w-md" style={{ color: "#536471" }}>
                  We couldn't find any companies matching "{query.trim()}". Try searching for these major Indian companies:
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleRecentSearch(sym)}
                      className="rounded-xl px-3.5 py-1.5 text-xs transition hover:bg-white/60"
                      style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#536471" }}
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
