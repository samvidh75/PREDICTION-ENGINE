import React, { useState, useEffect, useMemo } from "react";
import { WatchlistEngine, CustomWatchlist } from "../services/portfolio/WatchlistEngine";
import { SmartWatchlistEngine, SmartWatchlist } from "../services/portfolio/SmartWatchlistEngine";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { loadAuthSession } from "../services/auth/sessionStore";
import { api, WatchlistRow } from "../services/api/client";
import ScorePill from "../components/ui/ScorePill";
import { EmptyState } from "../components/ui/DataState";
import { MissingDataBadge } from "../components/ui/PageHeader";
import { getScoreState, formatFreshness } from "../services/ui/dataFormatting";
import tokens from "../components/ui/tokens";
import { useToast } from "../components/feedback/useToast";

interface DisplayList {
  id: string;
  name: string;
  tickers: string[];
  source: "remote" | "local" | "smart";
}

const REMOTE_PREFIX = "remote-";
const SMART_PREFIX = "smart-";

export const WatchlistPage: React.FC = () => {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "anonymous">("loading");
  const [remoteLists, setRemoteLists] = useState<WatchlistRow[] | null>(null);
  const [localLists, setLocalLists] = useState<CustomWatchlist[]>(() => WatchlistEngine.getWatchlists());
  const [smartWatchlists] = useState<SmartWatchlist[]>(() => SmartWatchlistEngine.getSmartWatchlists());
  const [selectedList, setSelectedList] = useState<string>("");
  const toast = useToast();
  const [noteRefresh, setNoteRefresh] = useState(0);

  useEffect(() => {
    const session = loadAuthSession();
    if (session.uid) {
      api.getWatchlists().then(lists => {
        setRemoteLists(lists);
        setAuthState("authenticated");
      }).catch(() => {
        setRemoteLists(null);
        setAuthState("authenticated");
      });
    } else {
      setRemoteLists(null);
      setAuthState("anonymous");
    }
  }, []);

  useEffect(() => {
    const handler = () => setLocalLists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  useEffect(() => {
    if (selectedList) return;
    if (remoteLists && remoteLists.length > 0) {
      setSelectedList(`${REMOTE_PREFIX}${remoteLists[0].id}`);
    } else if (localLists.length > 0) {
      setSelectedList(localLists[0].id);
    } else if (smartWatchlists.length > 0) {
      setSelectedList(`${SMART_PREFIX}0`);
    }
  }, [remoteLists, localLists, smartWatchlists, selectedList]);

  const isBackendActive = remoteLists !== null;
  const isAuthenticated = authState !== "loading";

  const displayLists: DisplayList[] = useMemo(() => {
    const lists: DisplayList[] = [];
    if (remoteLists) {
      for (const wl of remoteLists) {
        lists.push({ id: `${REMOTE_PREFIX}${wl.id}`, name: wl.name, tickers: wl.tickers, source: "remote" });
      }
    } else {
      for (const wl of localLists) {
        lists.push({ id: wl.id, name: wl.name, tickers: wl.tickers, source: "local" });
      }
    }
    return lists;
  }, [remoteLists, localLists]);

  const handleRemoveTicker = (ticker: string) => {
    if (selectedList.startsWith(SMART_PREFIX)) return;

    const list = displayLists.find(l => l.id === selectedList);
    if (!list) return;

    if (list.source === "remote") {
      const remoteId = selectedList.replace(REMOTE_PREFIX, "");
      api.removeWatchlistTicker(remoteId, ticker)
        .then(updated => {
          setRemoteLists(prev => prev ? prev.map(wl => wl.id === remoteId ? updated : wl) : prev);
          toast.success(`${ticker} removed from watchlist`);
        })
        .catch(() => {
          toast.error(`Could not remove ${ticker}. Try again.`);
          api.getWatchlists().then(lists => setRemoteLists(lists)).catch(() => {});
        });
    } else {
      WatchlistEngine.removeTicker(selectedList, ticker);
      setLocalLists([...WatchlistEngine.getWatchlists()]);
      toast.success(`${ticker} removed from watchlist`);
    }
  };

  const rawActiveTickers = useMemo(() => {
    if (selectedList.startsWith(SMART_PREFIX)) {
      const idx = parseInt(selectedList.replace(SMART_PREFIX, ""), 10);
      return smartWatchlists[idx]?.tickers || [];
    }
    const list = displayLists.find(l => l.id === selectedList);
    return list?.tickers || [];
  }, [selectedList, displayLists, smartWatchlists]);

  const activeTickers = useMemo(() => {
    return [...rawActiveTickers].sort((a, b) => {
      const timeA = NoteEngine.getNote(a).timestamp || 0;
      const timeB = NoteEngine.getNote(b).timestamp || 0;
      return timeB - timeA;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawActiveTickers, noteRefresh]);

  const handleNoteChange = (ticker: string, text: string) => {
    NoteEngine.saveNote(ticker, text);
    setNoteRefresh(prev => prev + 1);
  };

  const listSourceLabel = (source: "remote" | "local" | "smart"): string | null => {
    if (source === "local") return "Local";
    if (source === "smart") return "Auto";
    return null;
  };

  if (authState === "loading") {
    return (
      <div className={`${tokens.layout.container} flex flex-col space-y-6`}>
        <header className="border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Watchlist</h1>
        </header>
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="text-sm text-slate-500">Loading watchlists...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${tokens.layout.container} flex flex-col space-y-6`}>
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Watchlist</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track and add research notes for monitored companies.
          {isAuthenticated && !isBackendActive && (
            <span className="ml-2 text-amber-600 text-xs">(offline mode — changes saved locally)</span>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="flex flex-col space-y-4 lg:col-span-1">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">My Lists</span>
            {displayLists.map((wl) => {
              const label = listSourceLabel(wl.source);
              return (
                <button
                  key={wl.id}
                  onClick={() => setSelectedList(wl.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                    selectedList === wl.id ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200" : "text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent"
                  }`}
                >
                  <span>{wl.name} <span className="text-slate-500 ml-1">({wl.tickers.length})</span></span>
                  {label && (
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 ml-2">{label}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Smart Lists</span>
            {smartWatchlists.map((wl, idx) => (
              <button
                key={wl.name}
                onClick={() => setSelectedList(`${SMART_PREFIX}${idx}`)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                  selectedList === `${SMART_PREFIX}${idx}` ? "bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200" : "text-slate-600 hover:text-slate-950 hover:bg-white border border-transparent"
                }`}
              >
                {wl.name} <span className="text-slate-500 ml-1">({wl.tickers.length})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeTickers.length === 0 ? (
            <EmptyState
              title="No companies saved in this list"
              description="Save companies from Search to keep notes and revisit verified scores when available."
            />
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="space-y-3 sm:hidden">
                {activeTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore ?? null;
                  const scoreState = getScoreState(score);
                  const noteObj = NoteEngine.getNote(ticker);

                  return (
                    <div key={ticker} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => navigateToStock({ ticker, mode: "push" })}
                          className="cursor-pointer border-none bg-transparent text-left font-mono font-bold text-slate-950 hover:underline"
                        >
                          {ticker}
                        </button>
                        <button
                          onClick={() => handleRemoveTicker(ticker)}
                          className="text-xs text-rose-400 hover:text-rose-500 cursor-pointer bg-transparent border-none"
                          disabled={selectedList.startsWith(SMART_PREFIX)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Score</span>
                          {scoreState === "available" ? (
                            <ScorePill score={Math.round(score!)} />
                          ) : (
                            <span className="text-[10px] text-slate-400">Unavailable</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Freshness</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {noteObj.lastUpdated ? formatFreshness(noteObj.lastUpdated) : "Unavailable"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <input
                          type="text"
                          value={noteObj.note}
                          onChange={(e) => handleNoteChange(ticker, e.target.value)}
                          placeholder="Add a research note..."
                          className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/15"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="min-w-[720px]">
                <div className="grid grid-cols-[100px_80px_80px_1fr_80px] gap-2 border-b border-slate-200 bg-slate-50 p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span className="pl-3">Ticker</span>
                  <span>Score</span>
                  <span>Freshness</span>
                  <span>My Note</span>
                  <span className="text-right pr-3">Actions</span>
                </div>
                {activeTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore ?? null;
                  const scoreState = getScoreState(score);
                  const noteObj = NoteEngine.getNote(ticker);

                  return (
                    <div key={ticker} className="grid grid-cols-[100px_80px_80px_1fr_80px] items-center gap-2 border-b border-slate-100 p-3 last:border-0 hover:bg-slate-50">
                      <button
                        onClick={() => navigateToStock({ ticker, mode: "push" })}
                        className="cursor-pointer border-none bg-transparent pl-3 text-left font-mono font-bold text-slate-950 hover:underline"
                      >
                        {ticker}
                      </button>
                      <div>
                        {scoreState === "available" ? (
                          <ScorePill score={Math.round(score!)} />
                        ) : (
                          <MissingDataBadge />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {noteObj.lastUpdated ? formatFreshness(noteObj.lastUpdated) : "Unavailable"}
                      </span>
                      <div>
                        <input
                          type="text"
                          value={noteObj.note}
                          onChange={(e) => handleNoteChange(ticker, e.target.value)}
                          placeholder="Why am I watching?"
                          className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/15"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pr-2">
                        <button
                          onClick={() => handleRemoveTicker(ticker)}
                          className="text-[11px] text-rose-400/80 hover:text-rose-400 cursor-pointer bg-transparent border-none"
                          disabled={selectedList.startsWith(SMART_PREFIX)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;