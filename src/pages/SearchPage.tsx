import React, { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { productNavigate, ProductAction, ProductEmptyState, ProductPanel, ProductStatusPill } from "../components/product/ProductUI";
import { UserJourneyEngine } from "../services/behavior/UserJourneyEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { RegisteredStock } from "../services/stocks/StockRegistry";
import { StockSearchEngine } from "../services/stocks/StockSearchEngine";
import { api, type LeaderboardEntry, type WatchlistRow } from "../services/api/client";
import { formatFreshness, formatRank } from "../services/ui/dataFormatting";

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
  const [predictionsMap, setPredictionsMap] = useState<Record<string, LeaderboardEntry>>({});
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [watchlists, setWatchlists] = useState<WatchlistRow[]>([]);

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

  useEffect(() => {
    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    api.getLeaderboard(200)
      .then((res) => {
        if (cancelled) return;
        if (!res.data) { setLeaderboardLoading(false); return; }
        const map: Record<string, LeaderboardEntry> = {};
        res.data.forEach((item) => {
          if (item.symbol) {
            const cleaned = item.symbol.replace(/\.NS$/, "").toUpperCase();
            map[cleaned] = item;
          }
        });
        setPredictionsMap(map);
        setLeaderboardLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLeaderboardError(true);
          setLeaderboardLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    api.getWatchlists()
      .then((data) => setWatchlists(data))
      .catch(() => {});
  }, []);

  const recentSearches = useMemo(() => RecentSearchStore.getRecent().slice(0, 6), [query]);

  const topRanked = useMemo(() =>
    Object.values(predictionsMap)
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999))
      .slice(0, 8),
    [predictionsMap]
  );

  const isSaved = (symbol: string) => watchlists.some((wl) => wl.tickers.includes(symbol));

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

  const handleCompare = (symbol: string) => {
    UserJourneyEngine.trackEvent("feature_discover", { action: "compare", symbol, source: "search_page" });
    productNavigate("explore", `compare:${symbol}`);
  };

  const handleSave = async (symbol: string) => {
    const wl = watchlists[0];
    if (!wl) return;
    try {
      await api.addWatchlistTicker(wl.id, symbol);
      UserJourneyEngine.trackEvent("watchlist_create", { symbol, watchlistId: wl.id, source: "search_page" });
      const updated = await api.getWatchlists();
      setWatchlists(updated);
    } catch {}
  };

  const handleRecentSearch = (value: string) => {
    setQuery(value);
    setResults(value.trim().length >= 2 ? StockSearchEngine.search(value) : []);
    updateSearchUrl(value, "push");
  };

  const handleClearRecent = () => RecentSearchStore.clear();

  const handleRetryLeaderboard = () => {
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    api.getLeaderboard(200)
      .then((res) => {
        if (!res.data) { setLeaderboardLoading(false); return; }
        const map: Record<string, LeaderboardEntry> = {};
        res.data.forEach((item) => {
          if (item.symbol) {
            const cleaned = item.symbol.replace(/\.NS$/, "").toUpperCase();
            map[cleaned] = item;
          }
        });
        setPredictionsMap(map);
        setLeaderboardLoading(false);
      })
      .catch(() => {
        setLeaderboardError(true);
        setLeaderboardLoading(false);
      });
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#9AA7B5]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Search by ticker, company name, or sector..."
            className="h-9 w-full min-w-0 bg-transparent text-sm text-[#E6EDF3] outline-none placeholder:text-[#9AA7B5]"
            aria-label="Search companies"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); updateSearchUrl("", "replace"); }}
              className="shrink-0 rounded p-0.5 text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden md:inline-flex h-5 shrink-0 items-center rounded border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-1.5 font-mono text-[10px] text-[#9AA7B5]">⌘K</kbd>
        </div>

        <section className="space-y-4">
          {query.trim().length >= 2 ? (
            <>
              <div className="text-xs text-[#9AA7B5]">
                {results.length} result{results.length === 1 ? "" : "s"} for <span className="font-mono text-[#E6EDF3]">"{query.trim()}"</span>
              </div>

              {results.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {results.map((stock) => {
                    const cleanedSym = stock.symbol.replace(/\.NS$/, "").toUpperCase();
                    const prediction = predictionsMap[cleanedSym];
                    const score = prediction?.rankingScore ?? null;
                    const rank = prediction?.rank ?? null;
                    const predictionDate = prediction?.predictionDate ?? null;
                    const confidenceScore = prediction?.confidenceScore ?? null;
                    const saved = isSaved(stock.symbol);

                    return (
                      <ProductPanel key={stock.symbol} as="article" className="flex flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-[#E6EDF3]">{stock.symbol}</span>
                              {rank !== null && (
                                <span className="text-[10px] font-medium text-[#9AA7B5]">{formatRank(rank)}</span>
                              )}
                              {score !== null ? (
                                <ProductStatusPill tone="verified">{Math.round(score)}</ProductStatusPill>
                              ) : (
                                <ProductStatusPill tone="muted">Pending</ProductStatusPill>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-[#9AA7B5]">{stock.companyName}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {stock.sector && (
                                <span className="truncate text-[10px] font-medium text-[#64748B]">{stock.sector}</span>
                              )}
                              <ProductStatusPill tone={predictionDate ? "blue" : "muted"}>
                                {predictionDate ? formatFreshness(predictionDate) : "No data"}
                              </ProductStatusPill>
                              {confidenceScore !== null && (
                                <ProductStatusPill tone="blue">{Math.round(confidenceScore)}% confidence</ProductStatusPill>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(148,163,184,0.08)] pt-3">
                          <ProductAction variant="primary" onClick={() => handleOpenStock(stock)}>
                            Open
                          </ProductAction>
                          <ProductAction variant="secondary" onClick={() => handleCompare(stock.symbol)}>
                            Compare
                          </ProductAction>
                          <ProductAction
                            variant="ghost"
                            onClick={() => handleSave(stock.symbol)}
                            disabled={saved || watchlists.length === 0}
                            disabledReason={saved ? "Saved" : watchlists.length === 0 ? "Sign in" : undefined}
                          >
                            Save
                          </ProductAction>
                        </div>
                      </ProductPanel>
                    );
                  })}
                </div>
              ) : (
                <ProductEmptyState
                  icon={Search}
                  title="No matching company found"
                  body={`No results for "${query.trim()}". Try a different ticker, company name, or sector. Browse the top ranked companies instead.`}
                  action={
                    <ProductAction variant="secondary" onClick={() => productNavigate("explore", "rankings")}>
                      View Top Rankings
                    </ProductAction>
                  }
                />
              )}
            </>
          ) : (
            <>
              <ProductEmptyState
                icon={Search}
                title="Search the company universe"
                body="Type at least 2 characters to begin. Search by ticker, company name, or sector to find investment opportunities."
                action={
                  <ProductAction variant="secondary" onClick={() => productNavigate("explore", "rankings")}>
                    Browse Top Rankings
                  </ProductAction>
                }
              />

              {recentSearches.length > 0 && (
                <ProductPanel className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Recent searches</span>
                    <button
                      type="button"
                      onClick={handleClearRecent}
                      className="text-[10px] text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleRecentSearch(item)}
                        className="rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 font-mono text-[11px] font-medium text-[#E6EDF3] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </ProductPanel>
              )}

              {leaderboardLoading && (
                <ProductPanel className="p-4">
                  <div className="flex items-center gap-2 text-xs text-[#9AA7B5]">
                    Loading top ranked companies...
                  </div>
                </ProductPanel>
              )}

              {leaderboardError && (
                <ProductPanel className="flex items-center justify-between gap-3 p-4">
                  <span className="text-xs text-[#9AA7B5]">Could not load top rankings</span>
                  <button
                    type="button"
                    onClick={handleRetryLeaderboard}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-medium text-[#E6EDF3] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Retry
                  </button>
                </ProductPanel>
              )}

              {!leaderboardLoading && !leaderboardError && topRanked.length > 0 && (
                <ProductPanel className="p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">Top ranked today</span>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {topRanked.map((p) => (
                      <button
                        key={p.symbol}
                        type="button"
                        onClick={() => {
                          RecentSearchStore.addTicker(p.symbol.replace(/\.NS$/, ""));
                          UserJourneyEngine.trackEvent("stock_explore", { symbol: p.symbol, sector: p.sector, source: "search_top_ranked" });
                          navigateToStock({ ticker: p.symbol, mode: "push" });
                        }}
                        className="flex items-center gap-2 rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                      >
                        <span className="text-[10px] font-medium text-[#9AA7B5]">#{p.rank}</span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[11px] font-semibold text-[#E6EDF3]">
                            {p.symbol.replace(/\.NS$/, "")}
                          </span>
                          {p.companyName && (
                            <span className="block truncate text-[10px] text-[#64748B]">{p.companyName}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ProductPanel>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SearchPage;
