import React, { useState, useEffect, useMemo } from "react";
import { WatchlistEngine, CustomWatchlist } from "../services/portfolio/WatchlistEngine";
import { SmartWatchlistEngine, SmartWatchlist } from "../services/portfolio/SmartWatchlistEngine";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import Card from "../components/ui/Card";
import ScorePill from "../components/ui/ScorePill";
import Badge from "../components/ui/Badge";

export const WatchlistPage: React.FC = () => {
  const [watchlists, setWatchlists] = useState<CustomWatchlist[]>(() => WatchlistEngine.getWatchlists());
  const [smartWatchlists] = useState<SmartWatchlist[]>(() => SmartWatchlistEngine.getSmartWatchlists());
  const [selectedList, setSelectedList] = useState<string>(watchlists[0]?.id || "smart-0");
  const [noteRefresh, setNoteRefresh] = useState(0);

  useEffect(() => {
    const handler = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  const handleRemoveTicker = (ticker: string) => {
    if (selectedList.startsWith("smart-")) return;
    WatchlistEngine.removeTicker(selectedList, ticker);
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const rawActiveTickers = selectedList.startsWith("smart-")
    ? smartWatchlists[parseInt(selectedList.split("-")[1], 10) || 0]?.tickers || []
    : watchlists.find((w) => w.id === selectedList)?.tickers || [];

  const activeTickers = useMemo(() => {
    return [...rawActiveTickers].sort((a, b) => {
      const timeA = NoteEngine.getNote(a).timestamp || 0;
      const timeB = NoteEngine.getNote(b).timestamp || 0;
      return timeB - timeA;
    });
  }, [rawActiveTickers, noteRefresh]);

  const handleNoteChange = (ticker: string, text: string) => {
    NoteEngine.saveNote(ticker, text);
    setNoteRefresh((prev) => prev + 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col space-y-6 pb-12 font-sans text-slate-900 antialiased">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Watchlist</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track and add research notes for monitored companies.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar: lists selector */}
        <div className="flex flex-col space-y-4 lg:col-span-1">
          <div className="space-y-1">
                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">My Lists</span>
            {watchlists.map((wl) => (
              <button
                key={wl.id}
                onClick={() => setSelectedList(wl.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                  selectedList === wl.id ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200" : "text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent"
                }`}
              >
                {wl.name} <span className="text-slate-500 ml-1">({wl.tickers.length})</span>
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Smart Lists</span>
            {smartWatchlists.map((wl, idx) => (
              <button
                key={wl.name}
                onClick={() => setSelectedList(`smart-${idx}`)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                  selectedList === `smart-${idx}` ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200" : "text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent"
                }`}
              >
                {wl.name} <span className="text-slate-500 ml-1">({wl.tickers.length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main watchlist content */}
        <div className="lg:col-span-3">
          {activeTickers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              <p className="font-semibold text-slate-800">No companies saved in this list.</p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                Use Search to open a company research page, then save companies you want to monitor.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="min-w-[720px]">
              <div className="grid grid-cols-[100px_80px_110px_1fr_80px] gap-2 border-b border-slate-200 bg-slate-50 p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="pl-3">Ticker</span>
                <span>Score</span>
                <span>Last Update</span>
                <span>My Note</span>
                <span className="text-right pr-3">Actions</span>
              </div>
              {activeTickers.map((ticker) => {
                const info = StockRegistry.getStock(ticker);
                const score = info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : null;
                const noteObj = NoteEngine.getNote(ticker);
                return (
                  <div key={ticker} className="grid grid-cols-[100px_80px_110px_1fr_80px] items-center gap-2 border-b border-slate-100 p-3 last:border-0 hover:bg-slate-50">
                    <button
                      onClick={() => navigateToStock({ ticker, mode: "push" })}
                      className="cursor-pointer border-none bg-transparent pl-3 text-left font-mono font-bold text-slate-950 hover:underline"
                    >
                      {ticker}
                    </button>
                    <div>
                      {score !== null ? <ScorePill score={score} /> : <span className="font-mono text-slate-500">Unavailable</span>}
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{noteObj.lastUpdated || "Unavailable"}</span>
                    <div>
                      <input
                        type="text"
                        value={noteObj.note}
                        onChange={(e) => handleNoteChange(ticker, e.target.value)}
                        placeholder="Why am I watching?"
                        className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pr-2">
                      <button
                        onClick={() => handleRemoveTicker(ticker)}
                        className="text-[11px] text-rose-400/80 hover:text-rose-400 cursor-pointer bg-transparent border-none"
                        disabled={selectedList.startsWith("smart-")}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
