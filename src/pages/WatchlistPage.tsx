import React, { useState, useEffect, useMemo } from "react";
import { WatchlistEngine, CustomWatchlist } from "../services/portfolio/WatchlistEngine";
import { SmartWatchlistEngine, SmartWatchlist } from "../services/portfolio/SmartWatchlistEngine";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { PageHeader, CustomTable, Button } from "../components/ui/DesignSystem";

interface RowProps {
  ticker: string;
  score: number | null;
  onClick: () => void;
  onRemove: () => void;
}

const WatchlistRow: React.FC<RowProps> = ({ ticker, score, onClick, onRemove }) => {
  const [noteObj, setNoteObj] = useState(() => NoteEngine.getNote(ticker));

  const handleNoteChange = (val: string) => {
    NoteEngine.saveNote(ticker, val);
    setNoteObj({
      symbol: ticker,
      note: val,
      lastUpdated: new Date().toLocaleDateString()
    });
  };

  return (
    <tr className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
      <td className="p-4 font-mono font-bold text-white">
        <button 
          onClick={onClick}
          className="text-white hover:text-cyan-400 text-left bg-transparent border-none cursor-pointer"
        >
          {ticker}
        </button>
      </td>
      <td className="p-4 text-cyan-400 font-mono font-bold">{score !== null ? `${score}/100` : "N/A"}</td>
      <td className="p-4 text-white/40 font-mono">{noteObj.lastUpdated}</td>
      <td className="p-4">
        <input
          type="text"
          value={noteObj.note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Why am I watching this company?"
          className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 w-full"
        />
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-3 shrink-0">
          <button 
            onClick={onClick}
            className="text-[11px] text-cyan-400 hover:underline font-semibold bg-transparent border-none cursor-pointer"
          >
            Open Briefing
          </button>
          <button 
            onClick={onRemove}
            className="text-[11px] text-rose-400 hover:underline font-semibold bg-transparent border-none cursor-pointer"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
};

export const WatchlistPage: React.FC = () => {
  const [watchlists, setWatchlists] = useState<CustomWatchlist[]>(() => WatchlistEngine.getWatchlists());
  const [smartWatchlists] = useState<SmartWatchlist[]>(() => SmartWatchlistEngine.getSmartWatchlists());
  const [selectedList, setSelectedList] = useState<string>(watchlists[0]?.id || "smart-0");

  useEffect(() => {
    const handleWatchlistChange = () => {
      setWatchlists([...WatchlistEngine.getWatchlists()]);
    };
    window.addEventListener("watchlistchange", handleWatchlistChange);
    return () => window.removeEventListener("watchlistchange", handleWatchlistChange);
  }, []);

  const handleRemoveTicker = (ticker: string) => {
    if (selectedList.startsWith("smart-")) return; // Cannot edit smart lists
    WatchlistEngine.removeTicker(selectedList, ticker);
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const rawActiveTickers = selectedList.startsWith("smart-")
    ? smartWatchlists[parseInt(selectedList.split("-")[1]) || 0]?.tickers || []
    : watchlists.find((w) => w.id === selectedList)?.tickers || [];

  const activeTickers = useMemo(() => {
    return [...rawActiveTickers].sort((a, b) => {
      const timeA = NoteEngine.getNote(a).timestamp || 0;
      const timeB = NoteEngine.getNote(b).timestamp || 0;
      return timeB - timeA;
    });
  }, [rawActiveTickers]);

  return (
    <div className="w-full flex flex-col space-y-8 select-none bg-[#020304] text-white min-h-screen font-sans max-w-7xl mx-auto antialiased">
      {/* Page Header */}
      <PageHeader
        title="Watchlist Centre"
        subtitle="What am I monitoring?"
      />

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
            {activeTickers.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/30 space-y-3">
                <p>No watched stocks in this category.</p>
                <Button
                  variant="secondary"
                  onClick={() => navigateToStock({ ticker: "RELIANCE", mode: "push" })}
                >
                  Browse Opportunity
                </Button>
              </div>
            ) : (
              <CustomTable headers={["Ticker", "Score", "Last Update", "Why am I watching this?", "Actions"]}>
                {activeTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : null;

                  return (
                    <WatchlistRow
                      key={ticker}
                      ticker={ticker}
                      score={score}
                      onClick={() => navigateToStock({ ticker, mode: "push" })}
                      onRemove={() => handleRemoveTicker(ticker)}
                    />
                  );
                })}
              </CustomTable>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
