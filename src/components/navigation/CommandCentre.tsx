import React, { useEffect, useState, useMemo } from "react";
import { StockSearchEngine } from "../../services/stocks/StockSearchIndex";
import { SearchRankingEngine } from "../../services/search/SearchRankingEngine";
import { RecentSearchStore } from "../../services/search/RecentSearchStore";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent toggles state
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return []; // Section 144: render after 2 characters
    const raw = StockSearchEngine.search(query, 12);
    return SearchRankingEngine.rank(raw, query).slice(0, 8); // Section 135: max 8 visible per section
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div 
        className="relative border border-white/10 p-6 flex flex-col justify-between overflow-hidden"
        style={{
          width: 760,
          height: 640,
          borderRadius: 28,
          background: "rgba(5, 7, 10, 0.97)",
          backdropFilter: "blur(30px)",
          boxShadow: "0 20px 80px rgba(0, 0, 0, 0.7)"
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <span className="text-[12px] uppercase tracking-[0.18em] text-white/55 font-semibold">Command Centre</span>
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
              placeholder="Search Company, Ticker, Sector, or Theme..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-[52px] bg-black/40 border border-white/10 rounded-[18px] px-5 text-white/92 text-[15px] outline-none focus:border-green-400/40 transition"
            />
          </div>

          <div className="mt-6 flex-1 overflow-y-auto pr-1 space-y-6">
            {searchResults.length > 0 ? (
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-3 font-semibold">Stocks</div>
                <div className="space-y-2">
                  {searchResults.map((stock) => (
                    <button
                      key={stock.ticker}
                      type="button"
                      onClick={() => {
                        RecentSearchStore.addTicker(stock.ticker);
                        navigateToStock({ ticker: stock.ticker, mode: "push" });
                        onClose();
                      }}
                      className="w-full h-[72px] rounded-[18px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 px-4 flex items-center justify-between transition text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-white/92 truncate">{stock.companyName}</div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-1">{stock.ticker} • {stock.exchange}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-semibold text-white/92">₹{stock.price.toFixed(2)}</div>
                        <div 
                          className="text-[11px] font-medium mt-1"
                          style={{ color: stock.dailyChangePct >= 0 ? "#00D17A" : "#FF5B6E" }}
                        >
                          {stock.dailyChangePct >= 0 ? "+" : ""}{stock.dailyChangePct.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : query.trim().length >= 2 ? (
              <div className="text-center py-12">
                <div className="text-[13px] text-white/45 uppercase tracking-[0.18em]">No matching opportunities found</div>
              </div>
            ) : (
              <div>
                {recent.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-3 font-semibold">Recent Searches</div>
                    <div className="flex flex-wrap gap-2">
                      {recent.slice(0, 8).map((ticker) => (
                        <button
                          key={ticker}
                          type="button"
                          onClick={() => {
                            navigateToStock({ ticker, mode: "push" });
                            onClose();
                          }}
                          className="h-[34px] rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/15 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/70 transition"
                        >
                          {ticker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-3 font-semibold">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Open Dashboard", path: "dashboard" },
                      { label: "Open Assistant", path: "assistant" },
                      { label: "Open Company Universe", path: "company" },
                      { label: "Open Simulated lessons", path: "practice" }
                    ].map((act) => (
                      <button
                        key={act.label}
                        type="button"
                        onClick={() => {
                          window.history.pushState(null, "", `?page=${act.path}`);
                          window.dispatchEvent(new Event("popstate"));
                          onClose();
                        }}
                        className="h-[46px] rounded-[14px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-[12px] text-white/75 hover:text-white/92 px-4 flex items-center justify-between transition text-left"
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
