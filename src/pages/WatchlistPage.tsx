import React, { useState } from "react";
import { WatchlistEngine, CustomWatchlist } from "../services/portfolio/WatchlistEngine";
import { SmartWatchlistEngine, SmartWatchlist } from "../services/portfolio/SmartWatchlistEngine";
import { AlertEngine } from "../services/portfolio/AlertEngine";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { CompanyCard } from "../components/company/CompanyCard";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { NoteEngine } from "../services/portfolio/NoteEngine";

export const WatchlistPage: React.FC = () => {
  const [watchlists, setWatchlists] = useState<CustomWatchlist[]>(() => WatchlistEngine.getWatchlists());
  const [smartWatchlists] = useState<SmartWatchlist[]>(() => SmartWatchlistEngine.getSmartWatchlists());
  const [selectedList, setSelectedList] = useState<string>(watchlists[0]?.id || "smart-0");

  return (
    <div className="w-full flex flex-col space-y-8 select-none bg-[#020304] text-white min-h-screen font-sans max-w-7xl mx-auto antialiased">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
            MONITOR
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Watchlist Centre
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Column 1: Lists & Smart Watchlists */}
        <div className="flex flex-col space-y-6 lg:col-span-1">
          {/* Custom Watchlists */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col space-y-4">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Custom Watchlists</span>
            <div className="flex flex-col space-y-2">
              {watchlists.map((wl) => (
                <button
                  key={wl.id}
                  onClick={() => setSelectedList(wl.id)}
                  className={`w-full h-11 px-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedList === wl.id
                      ? "bg-white text-black border-white font-bold"
                      : "bg-white/5 border-white/5 hover:bg-white/10 text-white/90"
                  }`}
                >
                  <span className="text-xs font-semibold">{wl.name}</span>
                  <span className={`text-[10px] font-mono ${selectedList === wl.id ? "text-black/60" : "text-white/40"}`}>
                    {wl.tickers.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Watchlists */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col space-y-4">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Smart Watchlists</span>
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
                    <span className="text-xs font-semibold">{wl.name}</span>
                    <span className={`text-[10px] font-mono ${selectedList === `smart-${idx}` ? "text-black/60" : "text-white/40"}`}>
                      {wl.tickers.length}
                    </span>
                  </div>
                  <span className={`text-[10px] leading-normal ${selectedList === `smart-${idx}` ? "text-black/60" : "text-white/40"}`}>
                    {wl.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Tickers in Active Watchlist (Table View) */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4 lg:col-span-3">
          <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Watchlist Stocks</span>
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-medium">
                  <th className="p-4">Ticker</th>
                  <th className="p-4">Quality Score</th>
                  <th className="p-4">Last Update</th>
                  <th className="p-4">Watch Reason</th>
                </tr>
              </thead>
              <tbody>
                {(selectedList.startsWith("smart-")
                  ? smartWatchlists[parseInt(selectedList.split("-")[1]) || 0]?.tickers || []
                  : watchlists.find((w) => w.id === selectedList)?.tickers || []
                ).map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : 80;
                  const noteObj = NoteEngine.getNote(ticker);
                  const lastUpdate = noteObj.lastUpdated;

                  return (
                    <tr 
                      key={ticker}
                      className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4">
                        <button 
                          onClick={() => navigateToStock({ ticker, mode: "push" })}
                          className="font-mono font-bold text-white hover:text-cyan-400 text-left bg-transparent border-none cursor-pointer"
                        >
                          {ticker}
                        </button>
                      </td>
                      <td className="p-4 text-cyan-400 font-mono font-bold">{score}/100</td>
                      <td className="p-4 text-white/40 font-mono">{lastUpdate}</td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={noteObj.note}
                          onChange={(e) => NoteEngine.saveNote(ticker, e.target.value)}
                          placeholder="Why are you watching this company?"
                          className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
