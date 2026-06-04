import React, { useState, useEffect, useMemo } from 'react';
import { WatchlistEngine, CustomWatchlist } from '../services/portfolio/WatchlistEngine';
import { SmartWatchlistEngine, SmartWatchlist } from '../services/portfolio/SmartWatchlistEngine';
import { navigateToStock } from '../architecture/navigation/routeCoordinator';
import { StockRegistry } from '../services/stocks/StockRegistry';
import { NoteEngine } from '../services/portfolio/NoteEngine';
import { PageHeader } from '../components/ui/DesignSystem';

export const WatchlistPage: React.FC = () => {
  const [watchlists, setWatchlists] = useState<CustomWatchlist[]>(() => WatchlistEngine.getWatchlists());
  const [smartWatchlists] = useState<SmartWatchlist[]>(() => SmartWatchlistEngine.getSmartWatchlists());
  const [selectedList, setSelectedList] = useState<string>(watchlists[0]?.id || 'smart-0');

  useEffect(() => {
    const handler = () => setWatchlists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener('watchlistchange', handler);
    return () => window.removeEventListener('watchlistchange', handler);
  }, []);

  const handleRemoveTicker = (ticker: string) => {
    if (selectedList.startsWith('smart-')) return;
    WatchlistEngine.removeTicker(selectedList, ticker);
    setWatchlists([...WatchlistEngine.getWatchlists()]);
  };

  const rawActiveTickers = selectedList.startsWith('smart-')
    ? smartWatchlists[parseInt(selectedList.split('-')[1]) || 0]?.tickers || []
    : watchlists.find(w => w.id === selectedList)?.tickers || [];

  const activeTickers = useMemo(() => {
    return [...rawActiveTickers].sort((a, b) => {
      const timeA = NoteEngine.getNote(a).timestamp || 0;
      const timeB = NoteEngine.getNote(b).timestamp || 0;
      return timeB - timeA;
    });
  }, [rawActiveTickers]);

  return (
    <div className="w-full flex flex-col space-y-8 pb-12 text-white min-h-screen font-sans max-w-5xl mx-auto antialiased">
      <PageHeader title="Watchlist" subtitle="Why am I watching these?" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar: lists */}
        <div className="flex flex-col space-y-4 lg:col-span-1">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">My Lists</span>
            {watchlists.map(wl => (
              <button
                key={wl.id}
                onClick={() => setSelectedList(wl.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                  selectedList === wl.id ? 'bg-white/10 text-white font-semibold' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                {wl.name} <span className="text-white/30 ml-1">({wl.tickers.length})</span>
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Smart Lists</span>
            {smartWatchlists.map((wl, idx) => (
              <button
                key={wl.name}
                onClick={() => setSelectedList(`smart-${idx}`)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                  selectedList === `smart-${idx}` ? 'bg-white/10 text-white font-semibold' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                {wl.name} <span className="text-white/30 ml-1">({wl.tickers.length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main: tickers table */}
        <div className="lg:col-span-3">
          {activeTickers.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/30">
              No stocks in this list.
            </div>
          ) : (
            <div className="bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_120px_1fr_80px] gap-2 p-3 text-[10px] uppercase text-white/40 font-bold tracking-wider border-b border-white/5">
                <span className="pl-3">Ticker</span>
                <span>Score</span>
                <span>Last Update</span>
                <span>My Note</span>
                <span className="text-right pr-3">Actions</span>
              </div>
              {activeTickers.map(ticker => {
                const info = StockRegistry.getStock(ticker);
                const score = info?.telemetrySnapshot?.healthScore ? Math.round(info.telemetrySnapshot.healthScore) : null;
                const noteObj = NoteEngine.getNote(ticker);
                return (
                  <div key={ticker} className="grid grid-cols-[1fr_80px_120px_1fr_80px] gap-2 p-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] items-center">
                    <button onClick={() => navigateToStock({ ticker, mode: 'push' })} className="text-left font-mono font-bold text-white hover:text-[#7da0ff] cursor-pointer bg-transparent border-none pl-3">{ticker}</button>
                    <span className="font-mono text-xs text-[#7da0ff]">{score !== null ? `${score}` : '—'}</span>
                    <span className="text-[10px] text-white/40 font-mono">{noteObj.lastUpdated}</span>
                    <div>
                      <input
                        type="text"
                        value={noteObj.note}
                        onChange={e => { NoteEngine.saveNote(ticker, e.target.value); }}
                        placeholder="Why am I watching?"
                        className="bg-transparent text-xs text-white/60 placeholder-white/20 w-full focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pr-2">
                      <button onClick={() => handleRemoveTicker(ticker)} className="text-[10px] text-rose-400/60 hover:text-rose-400 cursor-pointer bg-transparent border-none">Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
