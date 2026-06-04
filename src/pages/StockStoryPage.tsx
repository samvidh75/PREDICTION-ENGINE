import React, { useState, useMemo } from "react";
import { StockRegistry } from "../services/stocks/StockRegistry";

import { WatchlistEngine } from "../services/portfolio/WatchlistEngine";
import { Star } from "lucide-react";

type TabKey = "overview" | "financials" | "valuation" | "ownership" | "risks";

function profileFromUrl() {
  if (typeof window === "undefined") {
    return { companyName: "Reliance Industries", symbol: "RELIANCE", sector: "Energy & Retail" };
  }
  const params = new URLSearchParams(window.location.search);
  const rawTicker = (params.get("id") ?? params.get("ticker") ?? "RELIANCE").toUpperCase().trim();
  const stock = StockRegistry.getStock(rawTicker);
  if (stock) {
    return {
      companyName: stock.companyName,
      symbol: stock.symbol,
      sector: stock.sector,
    };
  }
  return {
    companyName: `${rawTicker} India Ltd`,
    symbol: rawTicker,
    sector: "Conglomerate & Diversified",
  };
}

export const StockStoryPage: React.FC = () => {
  const stock = useMemo(() => profileFromUrl(), []);
  const info = useMemo(() => StockRegistry.getStock(stock.symbol), [stock.symbol]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [watchlists, setWatchlists] = useState(() => WatchlistEngine.getWatchlists());

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

  const score = info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : 82;
  const currentPrice = info?.fiftyTwoWeekRange.current ? `₹${info.fiftyTwoWeekRange.current.toLocaleString("en-IN")}` : "₹2,943.45";

  return (
    <div className="w-full space-y-8 pb-16 text-white max-w-7xl mx-auto antialiased">
      {/* HERO SECTION */}
      <section className="border-b border-white/5 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest block mb-1">
            {stock.symbol} · NSE
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            {stock.companyName}
          </h1>
          <div className="flex items-center gap-2.5 text-xs text-white/50">
            <span>{stock.sector}</span>
            <span>•</span>
            <span>Market Cap: {info?.marketCap.formatted || "₹50,000 Cr"}</span>
          </div>
          <button
            onClick={handleToggleWatchlist}
            className={`mt-3 h-8 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isInWatchlist 
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" 
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isInWatchlist ? "fill-cyan-400" : ""}`} />
            {isInWatchlist ? "Watching" : "Add to Watchlist"}
          </button>
        </div>

        <div className="flex gap-8">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-white/30 block mb-0.5">Current Price</span>
            <span className="text-2xl font-mono font-bold text-white">{currentPrice}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-white/30 block mb-0.5">Quality Score</span>
            <span className="text-2xl font-mono font-bold text-cyan-400">{score}/100</span>
          </div>
        </div>
      </section>

      {/* TABS HEADER */}
      <div className="border-b border-white/5 flex gap-4 overflow-x-auto">
        {(["overview", "financials", "valuation", "ownership", "risks"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-11 px-4 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 bg-transparent cursor-pointer ${
              activeTab === tab
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="min-h-[300px] bg-white/[0.01] border border-white/5 rounded-2xl p-6 md:p-8">
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/30 font-semibold mb-2">What happened</h3>
              <p className="text-sm text-white/80 leading-relaxed font-normal">
                {stock.symbol} registered strong growth momentum led by steady execution in core business activities and a sustained recovery in margins. Customer retention rates remain robust while operating leverage begins to lift profitability indexes.
              </p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/30 font-semibold mb-2">Why it matters</h3>
              <p className="text-sm text-white/80 leading-relaxed font-normal">
                Strong free cash flow and ROE metrics indicate high structural business quality. Pristine capital deployment continues to protect minority shareholder value against macroeconomic headwinds.
              </p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/30 font-semibold mb-2">What to watch</h3>
              <p className="text-sm text-white/80 leading-relaxed font-normal">
                Watch margin compression indices and pricing power durability over next quarter as raw material indexes fluctuate.
              </p>
            </div>
          </div>
        )}

        {activeTab === "financials" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">Revenue Growth (TTM)</span>
              <span className="text-lg font-mono font-bold text-white">+14.2%</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">EBITDA Margin</span>
              <span className="text-lg font-mono font-bold text-white">22.5%</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">ROE (Return on Equity)</span>
              <span className="text-lg font-mono font-bold text-white">18.6%</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">Debt to Equity</span>
              <span className="text-lg font-mono font-bold text-white">0.32</span>
            </div>
          </div>
        )}

        {activeTab === "valuation" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">P/E Ratio</span>
              <span className="text-lg font-mono font-bold text-white">{info?.peRatio || "24.5"}</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">EV / EBITDA</span>
              <span className="text-lg font-mono font-bold text-white">14.8</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">P/B Ratio</span>
              <span className="text-lg font-mono font-bold text-white">3.4</span>
            </div>
            <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
              <span className="text-[10px] text-white/40 block mb-1">Historical Average PE</span>
              <span className="text-lg font-mono font-bold text-white">22.0</span>
            </div>
          </div>
        )}

        {activeTab === "ownership" && (
          <div className="space-y-4 max-w-md">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">Promoters</span>
              <span className="font-mono font-bold">50.4%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full" style={{ width: "50.4%" }} />
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-white/60">FII (Foreign Institutional)</span>
              <span className="font-mono font-bold">22.1%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full" style={{ width: "22.1%" }} />
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-white/60">DII (Domestic Institutional)</span>
              <span className="font-mono font-bold">14.8%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full" style={{ width: "14.8%" }} />
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-white/60">Public & Others</span>
              <span className="font-mono font-bold">12.7%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full" style={{ width: "12.7%" }} />
            </div>
          </div>
        )}

        {activeTab === "risks" && (
          <div className="space-y-4 text-sm text-white/80 max-w-2xl">
            <p className="flex items-start gap-2.5">
              <span className="text-rose-400 shrink-0 font-bold">⚠️</span>
              <span><strong>Input Margin Cost Pressures:</strong> Fluctuation in raw material cost index could impact EBITDA margins next quarter.</span>
            </p>
            <p className="flex items-start gap-2.5">
              <span className="text-rose-400 shrink-0 font-bold">⚠️</span>
              <span><strong>Regulatory Compliance Headwinds:</strong> Any changes in sectoral policy framework could affect overall capacity execution limits.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockStoryPage;
