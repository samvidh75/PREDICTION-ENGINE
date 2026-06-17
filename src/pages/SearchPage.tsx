import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { UserJourneyEngine } from "../services/behavior/UserJourneyEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { RegisteredStock } from "../services/stocks/StockRegistry";
import { StockSearchEngine } from "../services/stocks/StockSearchEngine";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import ScorePill from "../components/ui/ScorePill";
import { EmptyState } from "../components/ui/DataState";
import tokens from "../components/ui/tokens";
import { formatNumber, formatINR, formatRank, formatFreshness } from "../services/ui/dataFormatting";
import { api, ApiError, type LeaderboardEntry } from "../services/api/client";


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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const recentSearches = useMemo(() => {
    return RecentSearchStore.getRecent().slice(0, 6);
  }, [results, query]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();
    const nextResults = trimmed.length >= 2 ? StockSearchEngine.search(trimmed) : [];
    setResults(nextResults);
    updateSearchUrl(value, "replace");

    if (trimmed.length >= 2) {
      UserJourneyEngine.trackEvent("search", {
        query: trimmed,
        resultCount: nextResults.length,
        source: "search_page",
      });
    }
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    updateSearchUrl(trimmed, "push");
    if (trimmed.length >= 2) {
      setResults(StockSearchEngine.search(trimmed));
    }
  };

  const handleOpenStock = (stock: RegisteredStock) => {
    const trimmed = query.trim();
    if (trimmed) RecentSearchStore.addTicker(trimmed);
    UserJourneyEngine.trackEvent("stock_explore", {
      symbol: stock.symbol,
      sector: stock.sector,
      source: "search_page",
    });
    navigateToStock({ ticker: stock.symbol, mode: "push" });
  };

  const handleRecentSearch = (value: string) => {
    setQuery(value);
    const nextResults = value.trim().length >= 2 ? StockSearchEngine.search(value) : [];
    setResults(nextResults);
    updateSearchUrl(value, "push");
  };

  return (
    <div className={`${tokens.layout.container} flex flex-col gap-6`}>
      <Card className="p-6 sm:p-8">
        <div className="mx-auto flex max-w-[620px] flex-col gap-5 text-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">Search Indian stocks</h1>
            <p className="mt-1 text-sm text-slate-600">
              Start with a ticker, company name, or sector.
            </p>
          </div>

          <div className="relative">
            <Input
              aria-label="Search Indian stocks"
              ref={inputRef}
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Try RELIANCE, TCS, INFY..."
              className="pl-10"
            />
            <Search className="absolute left-3 top-[13px] h-4 w-4 text-slate-500" />
          </div>

          {recentSearches.length > 0 && !query.trim() && (
            <div className="flex flex-wrap justify-center gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleRecentSearch(item)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <section className="space-y-4">
        {query.trim().length >= 2 ? (
          <>
            <div className="text-sm font-medium text-slate-600">
              {results.length} result{results.length === 1 ? "" : "s"} for <span className="text-slate-950">"{query.trim()}"</span>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {results.map((stock, idx) => {
                  const cleanedSym = stock.symbol.replace(/\.NS$/, "").toUpperCase();
                  const prediction = predictionsMap[cleanedSym];
                  const score = prediction?.rankingScore ?? null;
                  const confidenceScore = prediction?.confidenceScore ?? null;
                  const predictionDate = prediction?.predictionDate ?? null;
                  const predictionSector = prediction?.sector ?? null;
                  const rank = prediction?.rank ?? null;

                  return (
                    <Card
                      key={stock.symbol}
                      onClick={() => handleOpenStock(stock)}
                      className="flex cursor-pointer flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="font-mono text-lg font-semibold text-slate-950">
                            {stock.symbol}
                          </div>
                          <div className="max-w-[200px] truncate text-xs text-slate-500">
                            {stock.companyName}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge variant="info">{stock.sector || predictionSector || "Unavailable"}</Badge>
                            {stock.exchange && <Badge variant="neutral">{stock.exchange}</Badge>}
                          </div>
                        </div>
                        {score !== null ? (
                          <div className="flex flex-col items-end gap-1">
                            <ScorePill score={Math.round(score)} />
                            {rank !== null && (
                              <span className="text-[10px] text-slate-500 font-medium">{formatRank(rank)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
                            Score pending
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          {predictionDate && (
                            <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
                              Updated {formatFreshness(predictionDate)}
                            </span>
                          )}
                          {!prediction && (
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 font-mono">
                              Source registry
                            </span>
                          )}
                          {confidenceScore !== null && (
                            <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600 font-mono">
                              {Math.round(confidenceScore)}% confidence
                            </span>
                          )}
                        </div>
                        <span>
                          {typeof stock.marketCap.numeric === "number"
                            ? formatINR(stock.marketCap.numeric, true)
                            : stock.marketCap.formatted || "Unavailable"}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-200 bg-white">
                <span className="text-sm font-medium text-slate-900">No matching equity found</span>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  We couldn't find any companies matching "{query.trim()}". Try searching for these major Indian companies:
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleRecentSearch(sym)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white"
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
