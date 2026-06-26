import React, { useState, useMemo } from "react";
import { StockSearchIndex } from "../../services/stocks/StockSearchIndex";
import { SearchRankingEngine } from "../../services/search/SearchRankingEngine";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { fPrice, fChange } from "../../lib/format";
import { useUnifiedQuotes } from "../../hooks/useUnifiedQuotes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MobileSearchOverlay({ isOpen, onClose }: Props): JSX.Element | null {
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    const raw = StockSearchIndex.search(query, 12);
    return SearchRankingEngine.rank(raw, query).slice(0, 8);
  }, [query]);
  const liveQuotes = useUnifiedQuotes(searchResults.map((stock) => stock.ticker));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f0f0f] flex flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <input
          autoFocus
          type="text"
          placeholder="Search Ticker, Company..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-[56px] bg-[#131722] border border-[#2a2e39] rounded-[18px] px-4 text-[#f0f3fa] outline-none text-[15px] shadow-lg font-vos-interface"
        />
        <button 
          type="button" 
          onClick={onClose}
          className="text-[13px] uppercase tracking-[0.18em] text-[#b2b5be] shrink-0 px-2"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 mt-6 overflow-y-auto space-y-3">
        {searchResults.length > 0 ? (
          searchResults.map((stock) => {
            const quoteState = liveQuotes[stock.ticker];
            const quote = quoteState?.quote;
            return (
            <button
              key={stock.ticker}
              type="button"
              onClick={() => {
                RecentSearchStore.addTicker(stock.ticker);
                navigateToStock({ ticker: stock.ticker, mode: "push" });
                onClose();
              }}
              className="w-full h-[84px] rounded-[18px] border border-[#2a2e39] bg-[#131722] active:scale-[0.97] px-4 flex items-center justify-between transition text-left"
            >
              <div>
                <div className="text-[15px] font-semibold text-[#f0f3fa] truncate max-w-[200px]">{stock.companyName}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#787b86] mt-1">{stock.ticker} · {stock.exchange}</div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-semibold text-[#f0f3fa]">
                  {quoteState?.loading ? "Loading..." : quote ? fPrice(quote.price) : "Unavailable"}
                </div>
                <div
                  className="text-[11px] font-medium mt-1"
                  style={{ color: quote && quote.changePercent >= 0 ? "#22ab94" : "#f23645" }}
                >
                  {quote ? fChange(quote.changePercent) : ""}
                </div>
              </div>
            </button>
            );
          })
        ) : query.trim().length >= 2 ? (
          <div className="text-center py-16">
            <div className="text-[12px] text-[#787b86] uppercase tracking-[0.18em]">No matching opportunities found</div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-[12px] text-[#787b86] uppercase tracking-[0.18em]">Search above to begin exploring</div>
          </div>
        )}
      </div>
    </div>
  );
}

