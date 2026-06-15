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
import EmptyState from "../components/ui/EmptyState";

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-16">
      <Card className="p-8">
        <div className="mx-auto flex max-w-[600px] flex-col gap-5 text-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Search Workspace</h1>
            <p className="mt-1 text-sm text-slate-400">
              Search Indian equities by ticker symbol, company name, or sector.
            </p>
          </div>

          <div className="relative">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="Try RELIANCE, Infosys, Tata..."
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
                  className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 transition"
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
            <div className="text-sm font-medium text-slate-400">
              {results.length} result{results.length === 1 ? "" : "s"} for <span className="text-white">"{query.trim()}"</span>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {results.map((stock) => {
                  const score =
                    typeof stock.telemetrySnapshot?.healthScore === "number" &&
                    Number.isFinite(stock.telemetrySnapshot.healthScore)
                      ? stock.telemetrySnapshot.healthScore
                      : null;
                  return (
                    <Card
                      key={stock.symbol}
                      onClick={() => handleOpenStock(stock)}
                      className="flex flex-col justify-between hover:bg-slate-900/80 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="font-mono font-bold text-lg text-white">
                            {stock.symbol}
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-[200px]">
                            {stock.companyName}
                          </div>
                        </div>
                        {score !== null ? (
                          <ScorePill score={score} />
                        ) : (
                          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-400">
                            Score not available
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="info">{stock.sector || "Not available"}</Badge>
                          {stock.exchange && <Badge variant="neutral">{stock.exchange}</Badge>}
                        </div>
                        <span>{stock.marketCap.formatted || "Not available"}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState description="No matching companies found." />
            )}
          </>
        ) : (
          <EmptyState description="Start typing at least 2 characters to see matching companies." />
        )}
      </section>
    </div>
  );
};

export default SearchPage;
