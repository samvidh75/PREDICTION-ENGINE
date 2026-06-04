import React, { useEffect, useRef, useState } from "react";
import { Compass, Search, X } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { UserJourneyEngine } from "../../services/behavior/UserJourneyEngine";
import { RegisteredStock } from "../../services/stocks/StockRegistry";
import { StockSearchEngine } from "../../services/stocks/StockSearchEngine";
import { CompanyCard } from "../company/CompanyCard";

interface Props {
  onClose: () => void;
}

export const CommandCentreSearch: React.FC<Props> = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegisteredStock[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions: string[] = [];
  const totalItemsCount = results.length > 0 ? results.length : suggestions.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < totalItemsCount - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0) {
          const index = activeIndex >= 0 && activeIndex < results.length ? activeIndex : 0;
          handleSelect(results[index]);
        } else {
          const index = activeIndex >= 0 && activeIndex < suggestions.length ? activeIndex : 0;
          handleSelect(suggestions[index]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, results, activeIndex, totalItemsCount]);

  const handleSearch = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    const match = StockSearchEngine.search(value);
    setResults(match);
    UserJourneyEngine.trackEvent("search", {
      query: value,
      resultCount: match.length,
    });
  };

  const handleSelect = (stock: RegisteredStock | string) => {
    const symbol = typeof stock === "string" ? stock : stock.symbol;
    const sector = typeof stock === "string" ? "Suggested" : stock.sector;

    UserJourneyEngine.trackEvent("stock_explore", { symbol, sector });
    navigateToStock({ ticker: symbol, mode: "push" });
    onClose();
  };

  const getScore = (stock: RegisteredStock): number | null => {
    const snapshotScore = stock.telemetrySnapshot?.healthScore;
    if (typeof snapshotScore === "number") return Math.round(snapshotScore);
    return null;
  };

  const getOneLineReason = (stock: RegisteredStock): string => {
    const sector = stock.sector.toLowerCase();
    return "Data unavailable";
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0c1620]/72 backdrop-blur-2xl flex justify-center items-start pt-14 md:pt-24 px-4 font-sans select-none">
      <div className="w-full md:w-[700px] ss-panel rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[82vh]">
        <div className="flex items-center gap-3.5 px-4 h-[52px] bg-white/[0.055] border-b border-cyan-100/10">
          <Search className="w-4 h-4 text-white/60" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search Indian companies, tickers, or sectors..."
            className="flex-1 bg-transparent text-white border-none outline-none text-[14px] placeholder-white/55 font-medium"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {results.length > 0 ? (
            results.map((stock, idx) => (
              <div 
                key={stock.symbol} 
                className={`transition-all duration-150 rounded-xl ${
                  idx === activeIndex 
                    ? "ring-2 ring-cyan-400 bg-white/[0.03]" 
                    : ""
                }`}
              >
                <CompanyCard
                  ticker={stock.symbol}
                  name={stock.companyName}
                  sector={stock.sector}
                  marketCap={stock.marketCap.formatted}
                  score={getScore(stock) ?? "N/A"}
                  whyItMatters={getOneLineReason(stock)}
                  onOpenBriefing={() => handleSelect(stock)}
                />
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="py-12 text-center text-xs text-white/45 uppercase tracking-widest font-mono">No matching companies found</div>
          ) : (
            <div className="py-8 px-1">
              <div className="flex items-center gap-2 text-[11px] text-white/45 uppercase tracking-widest mb-4 font-mono">
                <Compass className="w-3.5 h-3.5" />
                <span>Suggested searches</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {suggestions.map((symbol, idx) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => handleSelect(symbol)}
                    className={`px-4 py-2 border rounded-full text-xs font-semibold transition font-mono cursor-pointer ${
                      idx === activeIndex
                        ? "border-cyan-400 bg-cyan-400 text-black font-bold"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-cyan-400 hover:text-white"
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandCentreSearch;
