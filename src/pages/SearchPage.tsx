import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { UserJourneyEngine } from "../services/behavior/UserJourneyEngine";
import { RecentSearchStore } from "../services/search/RecentSearchStore";
import { RegisteredStock } from "../services/stocks/StockRegistry";
import { StockSearchEngine } from "../services/stocks/StockSearchEngine";
import { CompanyCard } from "../components/company/CompanyCard";

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

function getScore(stock: RegisteredStock): number | string {
  const snapshotScore = stock.telemetrySnapshot?.healthScore;
  return typeof snapshotScore === "number" ? Math.round(snapshotScore) : "N/A";
}

function getOneLineReason(stock: RegisteredStock): string {
  if (stock.sector?.trim()) {
    return `${stock.sector} company available for company intelligence review.`;
  }
  return "Company intelligence is available for this listing.";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-16">
      <section className="ss-tv-panel ss-tv-neon-edge rounded-2xl p-5 md:p-6">
        <div className="mx-auto flex max-w-[720px] flex-col gap-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-[#f0f3fa] md:text-3xl">Search</h1>
            <p className="mt-2 text-sm text-[#b2b5be]">
              Search Indian companies by ticker, company name, or sector.
            </p>
          </div>

          <div className="flex h-14 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_30px_rgba(41,98,255,0.08)]">
            <Search className="h-4 w-4 text-[#787b86]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
              placeholder="Try RELIANCE, Infosys, Banking, or Tata"
              className="h-full flex-1 border-none bg-transparent text-base text-[#f0f3fa] outline-none placeholder:text-[#787b86]"
            />
          </div>

          {recentSearches.length > 0 && !query.trim() && (
            <div className="flex flex-wrap justify-center gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleRecentSearch(item)}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-[#b2b5be] transition hover:border-[#2962ff]/50 hover:text-[#f0f3fa]"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-xs text-[#787b86]">
          Health Score and Research Signal are research aids based on available company data, not investment advice.
        </div>
        {query.trim().length >= 2 ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-[#b2b5be]">
                {results.length} result{results.length === 1 ? "" : "s"} for <span className="text-[#f0f3fa]">{query.trim()}</span>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((stock) => (
                  <CompanyCard
                    key={stock.symbol}
                    ticker={stock.symbol}
                    name={stock.companyName}
                    sector={stock.sector || "Data unavailable"}
                    marketCap={stock.marketCap.formatted || "Data unavailable"}
                    score={getScore(stock)}
                    whyItMatters={getOneLineReason(stock)}
                    onOpenBriefing={() => handleOpenStock(stock)}
                  />
                ))}
              </div>
            ) : (
              <div className="ss-tv-panel rounded-2xl p-8 text-center text-sm text-[#787b86]">
                No matching companies found for this search yet.
              </div>
            )}
          </>
        ) : (
          <div className="ss-tv-panel rounded-2xl p-8 text-center text-sm text-[#787b86]">
            Start typing at least 2 characters to see matching companies.
          </div>
        )}
      </section>
    </div>
  );
};

export default SearchPage;
