import React, { useState, useMemo } from "react";
import { StockSearchEngine } from "../../services/stocks/StockSearchIndex";
import { SearchRankingEngine } from "../../services/search/SearchRankingEngine";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { formatINR, formatPercent, useLiveQuotes } from "../../hooks/useLiveQuotes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MobileSearchOverlay({ isOpen, onClose }: Props): JSX.Element | null {
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    const raw = StockSearchEngine.search(query, 12);
    return SearchRankingEngine.rank(raw, query).slice(0, 8);
  }, [query]);
  const liveQuotes = useLiveQuotes(searchResults.map((stock) => stock.ticker));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020304] flex flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <input
          autoFocus
          type="text"
          placeholder="Search Ticker, Company..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-[56px] bg-[#10141a]/92 border border-white/12 rounded-[18px] px-4 text-white/92 outline-none text-[15px] shadow-lg font-vos-interface"
        />
        <button 
          type="button" 
          onClick={onClose}
          className="text-[13px] uppercase tracking-[0.18em] text-white/60 shrink-0 px-2"
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
              className="w-full h-[84px] rounded-[18px] border border-white/5 bg-white/[0.02] active:scale-[0.97] px-4 flex items-center justify-between transition text-left"
            >
              <div>
                <div className="text-[15px] font-semibold text-white/92 truncate max-w-[200px]">{stock.companyName}</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-1">{stock.ticker} · {stock.exchange}</div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-semibold text-white/92">
                  {quoteState?.loading ? "Loading..." : quote ? formatINR(quote.price) : "Unavailable"}
                </div>
                <div
                  className="text-[11px] font-medium mt-1"
                  style={{ color: quote && quote.changePercent >= 0 ? "#00D17A" : "#FF5B6E" }}
                >
                  {quote ? formatPercent(quote.changePercent) : ""}
                </div>
              </div>
            </button>
            );
          })
        ) : query.trim().length >= 2 ? (
          <div className="text-center py-16">
            <div className="text-[12px] text-white/45 uppercase tracking-[0.18em]">No matching opportunities found</div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-[12px] text-white/45 uppercase tracking-[0.18em]">Search above to begin exploring</div>
          </div>
        )}
      </div>
    </div>
  );
}

