import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass, Search, X } from "lucide-react";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";
import { UserJourneyEngine } from "../../services/behavior/UserJourneyEngine";
import { RegisteredStock } from "../../services/stocks/StockRegistry";
import { StockSearchEngine } from "../../services/stocks/StockSearchEngine";

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
    return "Not enough information";
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-center items-start bg-slate-950/45 px-3 pt-4 backdrop-blur-xl sm:px-4 sm:pt-14 md:pt-24 font-sans select-none" role="dialog" aria-modal="true" aria-label="Search companies">
      <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,.28)] md:w-[700px]">
        <div className="flex h-[60px] items-center gap-3.5 border-b border-[var(--color-border)] bg-white/70 px-4">
          <Search className="w-4 h-4 text-[#b2b5be]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search Indian companies, tickers, or sectors..."
            className="flex-1 bg-transparent text-[var(--color-text-primary)] border-none outline-none text-[14px] placeholder:text-[var(--color-text-muted)] font-medium"
            aria-label="Search companies, tickers, or sectors"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[#242731] rounded-full text-[#787b86] hover:text-[#f0f3fa] transition"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {results.length > 0 ? (
            results.map((stock, idx) => (
              <button type="button" onClick={() => handleSelect(stock)}
                key={stock.symbol} 
                className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150 ${
                  idx === activeIndex 
                    ? "border-[#2962ff]/40 bg-[#2962ff]/[0.06] shadow-[inset_3px_0_0_#2962ff]"
                    : "border-[var(--color-border)] bg-white/72 hover:border-[#2962ff]/30 hover:bg-white"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2962FF]/10 font-mono text-xs font-bold text-[#3159B7]">{stock.symbol.slice(0, 2)}</div>
                <div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{stock.companyName}</span><span className="font-mono text-[11px] font-semibold text-[var(--color-text-muted)]">{stock.symbol}</span></div><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{stock.sector}</p></div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2962FF]" />
              </button>
            ))
          ) : query.length >= 2 ? (
            <div className="py-12 text-center text-xs text-[#787b86] uppercase tracking-widest font-mono">No matching companies found</div>
          ) : (
            <div className="py-8 px-1">
              <div className="flex items-center gap-2 text-[11px] text-[#787b86] uppercase tracking-widest mb-4 font-mono">
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
                        ? "border-[#2962ff] bg-[#2962ff] text-white font-bold"
                        : "border-[#2a2e39] bg-[#1e222d] hover:bg-[#242731] text-[#7da0ff] hover:text-[#f0f3fa]"
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
