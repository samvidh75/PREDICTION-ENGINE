import React, { useState } from "react";
import { WatchlistEngine, CustomWatchlist } from "../services/portfolio/WatchlistEngine";
import { SmartWatchlistEngine, SmartWatchlist } from "../services/portfolio/SmartWatchlistEngine";
import { AlertEngine } from "../services/portfolio/AlertEngine";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { Eye, Bell, Shield, ArrowRight } from "lucide-react";
import { CompanyCard } from "../components/company/CompanyCard";
import { StockRegistry } from "../services/stocks/StockRegistry";

export const WatchlistPage: React.FC = () => {
  const [watchlists, setWatchlists] = useState<CustomWatchlist[]>(() => WatchlistEngine.getWatchlists());
  const [smartWatchlists] = useState<SmartWatchlist[]>(() => SmartWatchlistEngine.getSmartWatchlists());
  const [selectedList, setSelectedList] = useState<string>(watchlists[0]?.id || "smart-0");
  const alerts = AlertEngine.getAlerts();

  return (
    <div className="w-full flex flex-col space-y-8 select-none p-6 md:p-8 bg-[#020304] text-white min-h-screen font-sans max-w-7xl mx-auto antialiased">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400 block mb-1">
            MONITOR
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Watchlist Centre
          </h2>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-2.5 font-mono text-[10px] text-gray-400 bg-white/5 border border-white/5 px-4 py-2 rounded-full">
          <span>Active Monitor</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Column 1: Lists & Smart Watchlists */}
        <div className="flex flex-col space-y-6">
          {/* Custom Watchlists */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">Custom Watchlists</span>
            <div className="flex flex-col space-y-2">
              {watchlists.map((wl) => (
                <button
                  key={wl.id}
                  onClick={() => setSelectedList(wl.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedList === wl.id
                      ? "bg-white text-black border-white font-bold"
                      : "bg-white/5 border-white/5 hover:bg-white/10 text-white/90"
                  }`}
                >
                  <span className="text-sm font-semibold">{wl.name}</span>
                  <span className={`text-[10px] font-mono ${selectedList === wl.id ? "text-black/60" : "text-gray-400"}`}>
                    {wl.tickers.length} Stocks
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Watchlists */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">Smart Watchlists</span>
            <div className="flex flex-col space-y-2">
              {smartWatchlists.map((wl, idx) => (
                <button
                  key={wl.name}
                  onClick={() => setSelectedList(`smart-${idx}`)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex flex-col space-y-1 cursor-pointer ${
                    selectedList === `smart-${idx}`
                      ? "bg-white text-black border-white font-bold"
                      : "bg-white/5 border-white/5 hover:bg-white/10 text-white/90"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm font-semibold">{wl.name}</span>
                    <span className={`text-[10px] font-mono ${selectedList === `smart-${idx}` ? "text-black/60" : "text-gray-400"}`}>
                      {wl.tickers.length} Stocks
                    </span>
                  </div>
                  <span className={`text-[10px] ${selectedList === `smart-${idx}` ? "text-black/60" : "text-gray-400"}`}>
                    {wl.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Tickers in Active Watchlist */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
          <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">Watchlist Stocks</span>
          <div className="flex flex-col space-y-4">
            {/* Display list based on selection */}
            {(selectedList.startsWith("smart-")
              ? smartWatchlists[parseInt(selectedList.split("-")[1]) || 0]?.tickers || []
              : watchlists.find((w) => w.id === selectedList)?.tickers || []
            ).map((ticker) => {
              const info = StockRegistry.getStock(ticker);
              return (
                <CompanyCard
                  key={ticker}
                  ticker={ticker}
                  name={info?.companyName || ticker}
                  sector={info?.sector || "Conglomerate"}
                  marketCap={info?.marketCap.formatted || "₹50,000 Cr"}
                  score={info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : 80}
                  whyItMatters={
                    ticker === "TCS" ? "A large software exporter with steady cash generation." :
                    ticker === "RELIANCE" ? "A diversified market leader across energy, retail, and telecom." :
                    (info?.sector || "Conglomerate").toLowerCase().includes("bank") ? "Credit growth, deposits, and asset quality are key monitoring metrics." :
                    "Actively tracked company with stable volume metrics."
                  }
                  onClick={() => navigateToStock({ ticker, mode: "push" })}
                />
              );
            })}
          </div>
        </div>

        {/* Column 3: Watchlist Alerts */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4">
          <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest font-mono">Watchlist Alerts</span>
          <div className="flex flex-col space-y-3">
            {alerts.filter((a) => a.category === "Momentum" || a.category === "Risk").map((a) => (
              <div key={a.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col space-y-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-cyan-400 uppercase font-mono">
                  <span>{a.title}</span>
                  <span className="text-gray-500">{a.timestamp}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
