import React, { useEffect, useState, useMemo } from "react";
import { StockSearchEngine } from "../../services/stocks/StockSearchIndex";
import { SearchRankingEngine } from "../../services/search/SearchRankingEngine";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { fPrice, fChange } from "../../lib/format";
import { useUnifiedQuotes } from "../../hooks/useUnifiedQuotes";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CommandCentre({ isOpen, onClose }: Props): JSX.Element | null {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRecent(RecentSearchStore.getRecent());
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    const raw = StockSearchEngine.search(query, 12);
    return SearchRankingEngine.rank(raw, query).slice(0, 8);
  }, [query]);
  const liveQuotes = useUnifiedQuotes(searchResults.map((stock) => stock.ticker));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Search company universe">
      <div 
        className="relative border border-white/10 p-6 flex flex-col justify-between overflow-hidden"
        style={{
          width: 700,
          height: 600,
          borderRadius: 20,
          background: "rgba(5, 7, 10, 0.97)",
          backdropFilter: "blur(30px)",
          boxShadow: "0 20px 80px rgba(0, 0, 0, 0.7)"
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <span className="text-[12px] uppercase tracking-[0.18em] text-white/55 font-semibold">Search Company Universe</span>
            <button 
              type="button" 
              onClick={onClose}
              className="text-[11px] uppercase tracking-[0.18em] text-white/45 hover:text-white/80 transition"
            >
              Esc to close
            </button>
          </div>

          <div className="mt-4 relative">
            <input
              autoFocus
              type="text"
              placeholder="Type ticker, company name, or sector..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-[48px] bg-black/40 border border-white/10 rounded-[14px] px-5 text-white text-[14px] outline-none focus:border-cyan-500/50 transition font-sans"
              aria-label="Search companies"
            />
          </div>

          <div className="mt-6 flex-1 overflow-y-auto pr-1 space-y-6">
            {searchResults.length > 0 ? (
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-3 font-semibold font-mono">Results</div>
                <div className="space-y-2">
                  {searchResults.map((stock) => {
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
                      className="w-full h-[64px] rounded-[14px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/25 px-4 flex items-center justify-between transition text-left cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-mono font-bold text-white">{stock.ticker}</span>
                          <span className="text-[11px] text-white/40 truncate">{stock.companyName}</span>
                        </div>
                        <div className="text-[10px] text-white/50 mt-1 truncate">{stock.sector}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] uppercase text-white/40 tracking-wider font-mono">Live Price</div>
                        <div className="text-[13px] font-bold text-white font-mono mt-0.5">
                          {quoteState?.loading ? "Loading..." : quote ? fPrice(quote.price) : "Unavailable"}
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 ${quote && quote.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {quote ? fChange(quote.changePercent) : ""}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>
            ) : query.trim().length >= 2 ? (
              <div className="text-center py-12">
                <div className="text-[12px] text-white/45 uppercase tracking-[0.18em] font-mono">No results found</div>
              </div>
            ) : (
              <div>
                {recent.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-3 font-semibold font-mono">Recent Research</div>
                    <div className="flex flex-wrap gap-2">
                      {recent.slice(0, 6).map((ticker) => (
                        <button
                          key={ticker}
                          type="button"
                          onClick={() => {
                            navigateToStock({ ticker, mode: "push" });
                            onClose();
                          }}
                          className="h-[30px] rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] px-3.5 text-[10px] uppercase tracking-[0.12em] text-white/70 transition font-mono cursor-pointer"
                        >
                          {ticker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-3 font-semibold font-mono">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Home / Dashboard", path: "dashboard" },
                      { label: "Market Discovery", path: "discovery" },
                      { label: "Watchlist Manager", path: "watchlist" },
                      { label: "Portfolio Analytics", path: "portfolio" }
                    ].map((act) => (
                      <button
                        key={act.label}
                        type="button"
                        onClick={() => {
                          window.history.pushState(null, "", `?page=${act.path}`);
                          window.dispatchEvent(new Event("popstate"));
                          onClose();
                        }}
                        className="h-[42px] rounded-[10px] border border-white/5 bg-white/[0.02] hover:bg-cyan-500/5 hover:border-cyan-500/20 text-[11px] text-white/75 hover:text-white px-4 flex items-center justify-between transition text-left cursor-pointer"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
