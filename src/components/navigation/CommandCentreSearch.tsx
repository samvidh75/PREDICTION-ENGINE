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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSearch = (value: string) => {
    setQuery(value);
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

  const getScore = (stock: RegisteredStock): number => {
    const snapshotScore = stock.telemetrySnapshot?.healthScore;
    if (typeof snapshotScore === "number") return Math.round(snapshotScore);
    if (stock.healthStatus === "veryHealthy") return 88;
    if (stock.healthStatus === "healthy") return 78;
    if (stock.healthStatus === "weakening") return 54;
    if (stock.healthStatus === "unhealthy") return 38;
    return 66;
  };

  const getOneLineReason = (stock: RegisteredStock): string => {
    const sector = stock.sector.toLowerCase();
    if (stock.symbol === "TCS") return "A large software exporter with steady cash generation and margin discipline.";
    if (stock.symbol === "RELIANCE") return "A diversified market leader across energy, retail, and telecom.";
    if (sector.includes("bank")) return "Credit growth, deposits, and asset quality are the key factors to watch.";
    if (sector.includes("it") || sector.includes("software")) return "Client spending, export demand, and margins drive the investment story.";
    return "A useful company to review for sector position, valuation, and market attention.";
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-2xl flex justify-center items-start pt-14 md:pt-24 px-4 font-sans select-none">
      <div className="w-full max-w-[700px] bg-[#090b0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[82vh]">
        <div className="flex items-center gap-3.5 px-4 h-[52px] bg-white/[0.02] border-b border-white/10">
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
            results.map((stock) => (
              <CompanyCard
                key={stock.symbol}
                ticker={stock.symbol}
                name={stock.companyName}
                sector={stock.sector}
                marketCap={stock.marketCap.formatted}
                score={getScore(stock)}
                whyItMatters={getOneLineReason(stock)}
                onClick={() => handleSelect(stock)}
              />
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
                {["RELIANCE", "HAL", "BEL", "IRFC", "GRANULES"].map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => handleSelect(symbol)}
                    className="px-4 py-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] rounded-full text-xs font-semibold text-cyan-400 hover:text-white transition font-mono cursor-pointer"
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
