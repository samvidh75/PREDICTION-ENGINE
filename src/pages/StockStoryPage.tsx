import React, { useState, useMemo } from "react";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { Star, ArrowRight, Download, FileText, ArrowLeft, Compass } from "lucide-react";

type TabKey = "overview" | "financials" | "valuation" | "ownership" | "risks" | "documents";

function profileFromUrl() {
  if (typeof window === "undefined") {
    return { companyName: "Data unavailable", symbol: "N/A", sector: "Data unavailable" };
  }
  const params = new URLSearchParams(window.location.search);
  const rawTicker = (params.get("id") ?? params.get("ticker") ?? "").toUpperCase().trim();
  const stock = StockRegistry.getStock(rawTicker);
  if (stock) {
    return {
      companyName: stock.companyName,
      symbol: stock.symbol,
      sector: stock.sector,
    };
  }
  return {
    companyName: "Data unavailable",
    symbol: rawTicker || "N/A",
    sector: "Data unavailable",
  };
}

export const StockStoryPage: React.FC = () => {
  const stock = useMemo(() => profileFromUrl(), []);
  const info = useMemo(() => StockRegistry.getStock(stock.symbol), [stock.symbol]);
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as TabKey;
      const valid: TabKey[] = ["overview", "financials", "valuation", "ownership", "risks", "documents"];
      if (valid.includes(tab)) return tab;
    }
    return "overview";
  });
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());
  const [noteText, setNoteText] = useState(() => NoteEngine.getNote(stock.symbol).note);

  const isInWatchlist = useMemo(() => {
    return watchlists.some(w => w.tickers.includes(stock.symbol));
  }, [watchlists, stock.symbol]);

  const handleToggleWatchlist = () => {
    const defaultList = watchlists[0];
    if (!defaultList) return;
    if (isInWatchlist) {
      WatchlistEngine.removeTicker(defaultList.id, stock.symbol);
    } else {
      WatchlistEngine.addTicker(defaultList.id, stock.symbol);
    }
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const handleSaveNote = (val: string) => {
    setNoteText(val);
    NoteEngine.saveNote(stock.symbol, val);
  };

  const score = info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : null;
  const currentPrice = info?.fiftyTwoWeekRange.current ? `₹${info.fiftyTwoWeekRange.current.toLocaleString("en-IN")}` : null;

  // Related companies: maximum 5, same sector only
  const relatedCompanies = useMemo(() => {
    const all = StockRegistry.getAllStocks();
    return all
      .filter(s => s.symbol !== stock.symbol && s.sector === stock.sector)
      .slice(0, 5);
  }, [stock.symbol, stock.sector]);

  const handleCompanyClick = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", "stock");
    params.set("id", symbol);
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const navigateTo = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  return (
    <div className="w-full space-y-6 pb-16 text-white max-w-7xl mx-auto antialiased px-4">
      {/* Back and Utility Routing Actions */}
      <div className="flex justify-between items-center text-xs">
        <button
          onClick={() => navigateTo("dashboard")}
          className="text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
        </button>
        <button
          onClick={() => navigateTo("discovery")}
          className="text-white/60 hover:text-white font-bold uppercase tracking-wider bg-transparent border-none cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Compass className="w-3.5 h-3.5" /> Open In Discovery
        </button>
      </div>

      {/* 1. HERO SECTION (ABOVE THE FOLD ONLY) */}
      <section className="border-b border-white/5 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-[9px] font-bold text-white/45 uppercase tracking-widest block mb-1">
            {stock.symbol} · NSE
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
            {stock.companyName}
          </h1>
          <div className="flex items-center gap-2.5 text-xs text-white/50">
            <span>{stock.sector}</span>
            <span>•</span>
            <span>Market Cap: {info?.marketCap.formatted || "Data unavailable"}</span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={handleToggleWatchlist}
              className={`h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isInWatchlist 
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isInWatchlist ? "fill-rose-450" : ""}`} />
              {isInWatchlist ? "Remove From Watchlist" : "Add To Watchlist"}
            </button>
          </div>
        </div>

        <div className="flex gap-6 shrink-0">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-white/30 block">Current Price</span>
            <span className="text-xl md:text-2xl font-mono font-bold text-white">{currentPrice || "Data unavailable"}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-white/30 block">Quality Score</span>
            <span className="text-xl md:text-2xl font-mono font-bold text-cyan-400">{score !== null ? `${score}/100` : "Data unavailable"}</span>
          </div>
        </div>
      </section>

      {/* 2. BRIEF OVERVIEW CARDS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block font-mono">What Happened</span>
          <p className="text-xs text-white/80 leading-relaxed mt-1">
            Data unavailable. Please check back later.
          </p>
        </div>
        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block font-mono">Why It Matters</span>
          <p className="text-xs text-white/80 leading-relaxed mt-1">
            Data unavailable. Please check back later.
          </p>
        </div>
        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider block font-mono">What to Watch</span>
          <p className="text-xs text-white/80 leading-relaxed mt-1">
            Data unavailable. Please check back later.
          </p>
        </div>
      </section>

      {/* Research Notes Editor */}
      <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-2">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block font-mono">My Research Notes</span>
        <textarea
          value={noteText}
          onChange={(e) => handleSaveNote(e.target.value)}
          placeholder="Add note details regarding why you are monitoring this stock..."
          className="w-full h-16 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 resize-none font-sans"
        />
      </div>

      {/* 3. THREE KEY METRICS */}
      <section className="grid grid-cols-3 gap-4 border-t border-b border-white/5 py-4">
        <div className="text-center">
          <span className="text-[9px] text-white/40 uppercase block font-mono">Quality</span>
          <span className="text-xs md:text-sm font-bold text-white/40 font-mono mt-0.5 block">Data unavailable</span>
        </div>
        <div className="text-center">
          <span className="text-[9px] text-white/40 uppercase block font-mono">Valuation</span>
          <span className="text-xs md:text-sm font-bold text-white/40 font-mono mt-0.5 block">Data unavailable</span>
        </div>
        <div className="text-center">
          <span className="text-[9px] text-white/40 uppercase block font-mono">Growth</span>
          <span className="text-xs md:text-sm font-bold text-white/40 font-mono mt-0.5 block">Data unavailable</span>
        </div>
      </section>

      {/* 4. TABS HEADER */}
      <div className="border-b border-white/5 flex gap-2 overflow-x-auto scrollbar-none">
        {(["overview", "financials", "valuation", "ownership", "risks", "documents"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-9 px-3 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 bg-transparent cursor-pointer shrink-0 ${
              activeTab === tab
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 5. TAB CONTENT */}
      <div className="min-h-[200px] bg-white/[0.01] border border-white/5 rounded-2xl p-6">
        {activeTab === "overview" && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold font-mono mb-1">Company Description</h3>
              <p className="text-xs text-white/80 leading-relaxed font-normal">
                {stock.companyName} is a leading enterprise in the {stock.sector} sector, focusing on sustainable capital deployment and robust cash conversion models.
              </p>
            </div>
            <div className="text-[10px] text-white/30 font-mono">
              Should I spend more time here?
            </div>
          </div>
        )}

        {activeTab === "financials" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">Revenue Growth</span>
              <span className="text-sm font-mono font-bold text-white/40">Data unavailable</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">EBITDA Margin</span>
              <span className="text-sm font-mono font-bold text-white/40">Data unavailable</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">ROE</span>
              <span className="text-sm font-mono font-bold text-white/40">Data unavailable</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">Debt to Equity</span>
              <span className="text-sm font-mono font-bold text-white/40">Data unavailable</span>
            </div>
          </div>
        )}

        {activeTab === "valuation" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">P/E Ratio</span>
              <span className="text-sm font-mono font-bold text-white">{info?.peRatio || "Data unavailable"}</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">EV / EBITDA</span>
              <span className="text-sm font-mono font-bold text-white/40">Data unavailable</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">P/B Ratio</span>
              <span className="text-sm font-mono font-bold text-white/40">Data unavailable</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl">
              <span className="text-[9px] text-white/40 block mb-1">Historic PE Avg</span>
              <span className="text-sm font-mono font-bold text-white/40">Data unavailable</span>
            </div>
          </div>
        )}

        {activeTab === "ownership" && (
          <div className="space-y-3 max-w-md">
            <div className="text-xs text-white/40">Ownership data unavailable. Please check back later.</div>
          </div>
        )}

        {activeTab === "risks" && (
          <div className="space-y-3 text-xs text-white/80 max-w-2xl">
            <span className="text-[10px] text-white/30 uppercase font-mono block mb-1">Risk Analysis</span>
            <p className="text-white/40">Risk data unavailable. Please check back later.</p>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-3 max-w-md">
            <span className="text-[10px] text-white/30 uppercase font-mono block mb-1">Corporate Filings & Disclosures</span>
            <div className="text-xs text-white/30">Documents data unavailable. Please check back later.</div>
          </div>
        )}
      </div>

      {/* 6. RELATED COMPANIES / SIMILAR COMPANIES (SAME SECTOR ONLY, MAX 5) */}
      {relatedCompanies.length > 0 && (
        <section className="space-y-3 border-t border-white/5 pt-6">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block font-mono">
            View Similar Companies ({stock.sector})
          </span>
          <div className="flex flex-wrap gap-3">
            {relatedCompanies.map(c => {
              const info = StockRegistry.getStock(c.symbol);
              const score = info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : null;
              return (
                <button
                  key={c.symbol}
                  onClick={() => handleCompanyClick(c.symbol)}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-cyan-500/20 transition-all cursor-pointer"
                >
                  <div className="text-left">
                    <span className="text-xs font-mono font-bold text-white block">{c.symbol}</span>
                    <span className="text-[10px] text-white/40 block truncate max-w-[120px]">{c.companyName}</span>
                  </div>
                  <div className="text-right border-l border-white/5 pl-3">
                    <span className="text-[9px] text-white/45 block font-mono">Score</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">{score !== null ? score : "N/A"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default StockStoryPage;
