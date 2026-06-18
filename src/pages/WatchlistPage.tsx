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
import { ChevronRight } from "lucide-react";
import { getScoreState, formatFreshness } from "../services/ui/dataFormatting";
import { useToast } from "../components/feedback/useToast";
import { AppScreen, MobilePageHeader, ResearchEmptyState, WatchlistSearchCard } from "../components/premium/PremiumUI";

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
      api.getWatchlists().then(lists => { setRemoteLists(lists); setAuthState("authenticated"); }).catch(() => { setRemoteLists(null); setAuthState("authenticated"); });
    } else { setRemoteLists(null); setAuthState("anonymous"); }
  }, []);

  useEffect(() => {
    const handler = () => setLocalLists([...WatchlistEngine.getWatchlists()]);
    window.addEventListener("watchlistchange", handler);
    return () => window.removeEventListener("watchlistchange", handler);
  }, []);

  useEffect(() => {
    if (selectedList) return;
    if (remoteLists && remoteLists.length > 0) setSelectedList(`${REMOTE_PREFIX}${remoteLists[0].id}`);
    else if (localLists.length > 0) setSelectedList(localLists[0].id);
    else if (smartWatchlists.length > 0) setSelectedList(`${SMART_PREFIX}0`);
  }, [remoteLists, localLists, smartWatchlists, selectedList]);

  const isBackendActive = remoteLists !== null;
  const isAuthenticated = authState !== "loading";

  const displayLists: DisplayList[] = useMemo(() => {
    const lists: DisplayList[] = [];
    if (remoteLists) {
      for (const wl of remoteLists) lists.push({ id: `${REMOTE_PREFIX}${wl.id}`, name: wl.name, tickers: wl.tickers, source: "remote" });
    } else {
      for (const wl of localLists) lists.push({ id: wl.id, name: wl.name, tickers: wl.tickers, source: "local" });
    }
    return lists;
  }, [remoteLists, localLists]);

  const handleRemoveTicker = (ticker: string) => {
    if (selectedList.startsWith(SMART_PREFIX)) return;
    const list = displayLists.find(l => l.id === selectedList);
    if (!list) return;
    if (list.source === "remote") {
      const remoteId = selectedList.replace(REMOTE_PREFIX, "");
      api.removeWatchlistTicker(remoteId, ticker).then(updated => { setRemoteLists(prev => prev ? prev.map(wl => wl.id === remoteId ? updated : wl) : prev); toast.success(`${ticker} removed from watchlist`); }).catch(() => { toast.error(`Could not remove ${ticker}. Try again.`); api.getWatchlists().then(lists => setRemoteLists(lists)).catch(() => {}); });
    } else {
      WatchlistEngine.removeTicker(selectedList, ticker);
      setLocalLists([...WatchlistEngine.getWatchlists()]);
      toast.success(`${ticker} removed from watchlist`);
    }
  };

  const rawActiveTickers = useMemo(() => {
    if (selectedList.startsWith(SMART_PREFIX)) { const idx = parseInt(selectedList.replace(SMART_PREFIX, ""), 10); return smartWatchlists[idx]?.tickers || []; }
    const list = displayLists.find(l => l.id === selectedList);
    return list?.tickers || [];
  }, [selectedList, displayLists, smartWatchlists]);

  const activeTickers = useMemo(() => {
    return [...rawActiveTickers].sort((a, b) => { const timeA = NoteEngine.getNote(a).timestamp || 0; const timeB = NoteEngine.getNote(b).timestamp || 0; return timeB - timeA; });
  }, [rawActiveTickers, noteRefresh]);

  const handleNoteChange = (ticker: string, text: string) => { NoteEngine.saveNote(ticker, text); setNoteRefresh(prev => prev + 1); };

  const listSourceLabel = (source: "remote" | "local" | "smart"): string | null => {
    if (source === "local") return "Local";
    if (source === "smart") return "Auto";
    return null;
  };

  if (authState === "loading") {
    return (
      <div className="flex flex-col space-y-6">
        <header className="pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0f1419" }}>Loading watchlists</h1>
        </header>
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="text-sm" style={{ color: "#536471" }}>Loading watchlists...</span>
        </div>
      </div>
    );
  }

  return (
    <AppScreen>
      <MobilePageHeader eyebrow="Watching" title="Watchlist" body={`Tap a row to open the evidence view, or search to add a company.${isAuthenticated && !isBackendActive ? " offline mode saves locally." : ""}`} />
      <WatchlistSearchCard onSearch={() => {
        const params = new URLSearchParams(window.location.search);
        params.set("page", "search");
        window.history.pushState({}, "", `?${params.toString()}`);
        window.dispatchEvent(new Event("urlchange"));
      }} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="flex flex-col space-y-4 lg:col-span-1">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-semibold tracking-wider" style={{ color: "#536471" }}>My Lists</span>
            {displayLists.map((wl) => {
              const label = listSourceLabel(wl.source);
              return (
                <button
                  key={wl.id}
                  onClick={() => setSelectedList(wl.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition cursor-pointer flex items-center justify-between ${
                    selectedList === wl.id ? "text-white shadow-sm" : "hover:bg-white/40"
                  }`}
                  style={selectedList === wl.id ? { background: "#1a6e4a", color: "white" } : { color: "#536471" }}
                >
                  <span>{wl.name} <span className="opacity-60 ml-1">({wl.tickers.length})</span></span>
                  {label && <span className={`text-[10px] uppercase tracking-wider ml-2 ${selectedList === wl.id ? 'text-white/70' : ''}`} style={selectedList !== wl.id ? { color: "#8b98a5" } : undefined}>{label}</span>}
                </button>
              );
            })}
          </div>
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-semibold tracking-wider" style={{ color: "#536471" }}>Smart Lists</span>
            {smartWatchlists.map((wl, idx) => (
              <button
                key={wl.name}
                onClick={() => setSelectedList(`${SMART_PREFIX}${idx}`)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition cursor-pointer ${
                  selectedList === `${SMART_PREFIX}${idx}` ? "text-white shadow-sm" : "hover:bg-white/40"
                }`}
                style={selectedList === `${SMART_PREFIX}${idx}` ? { background: "#1a6e4a", color: "white" } : { color: "#536471" }}
              >
                {wl.name} <span className="opacity-60 ml-1">({wl.tickers.length})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeTickers.length === 0 ? (
            <ResearchEmptyState title="No companies saved in this list" body="Search a stock above to add it. Saved companies stay grounded in verified score availability." />
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {activeTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore ?? null;
                  const scoreState = getScoreState(score);
                  const noteObj = NoteEngine.getNote(ticker);
                  return (
                    <div key={ticker} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <button onClick={() => navigateToStock({ ticker, mode: "push" })} className="cursor-pointer border-none bg-transparent text-left font-mono font-semibold hover:underline" style={{ color: "#0f1419" }}>
                          {ticker}
                        </button>
                        <button onClick={() => handleRemoveTicker(ticker)} className="text-xs transition-colors cursor-pointer bg-transparent border-none" style={{ color: "#8b98a5" }} disabled={selectedList.startsWith(SMART_PREFIX)}>Remove</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-xs block" style={{ color: "#8b98a5" }}>Score</span>{scoreState === "available" ? <ScorePill score={Math.round(score!)} /> : <span className="text-xs" style={{ color: "#8b98a5" }}>Unavailable</span>}</div>
                        <div><span className="text-xs block" style={{ color: "#8b98a5" }}>Freshness</span><span className="font-mono text-xs" style={{ color: "#536471" }}>{noteObj.lastUpdated ? formatFreshness(noteObj.lastUpdated) : "Unavailable"}</span></div>
                      </div>
                      <div className="mt-3">
                        <input type="text" value={noteObj.note} onChange={(e) => handleNoteChange(ticker, e.target.value)} placeholder="Add a research note..." className="w-full rounded-xl px-3 py-2 text-sm outline-none placeholder:opacity-60" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.4)", color: "#0f1419" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-[100px_80px_80px_1fr_80px] gap-2 p-3 text-[11px] font-semibold uppercase tracking-wider" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)", color: "#8b98a5" }}>
                    <span className="pl-3">Ticker</span><span>Score</span><span>Freshness</span><span>My Note</span><span className="text-right pr-3">Actions</span>
                  </div>
                  {activeTickers.map((ticker) => {
                    const info = StockRegistry.getStock(ticker);
                    const score = info?.telemetrySnapshot?.healthScore ?? null;
                    const scoreState = getScoreState(score);
                    const noteObj = NoteEngine.getNote(ticker);
                    return (
                      <div key={ticker} className="grid grid-cols-[100px_80px_80px_1fr_80px] items-center gap-2 p-3 last:border-0 hover:bg-white/30 transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.3)" }}>
                        <button onClick={() => navigateToStock({ ticker, mode: "push" })} className="cursor-pointer border-none bg-transparent pl-3 text-left font-mono font-semibold hover:underline" style={{ color: "#0f1419" }}>{ticker}</button>
                        <div>{scoreState === "available" ? <ScorePill score={Math.round(score!)} /> : <MissingDataBadge />}</div>
                        <span className="font-mono text-xs" style={{ color: "#536471" }}>{noteObj.lastUpdated ? formatFreshness(noteObj.lastUpdated) : "Unavailable"}</span>
                        <div><input type="text" value={noteObj.note} onChange={(e) => handleNoteChange(ticker, e.target.value)} placeholder="Why am I watching?" className="w-full rounded-xl px-2 py-1.5 text-sm outline-none placeholder:opacity-60" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.4)", color: "#0f1419" }} /></div>
                        <div className="flex items-center justify-end gap-2 pr-2">
                          <button onClick={() => handleRemoveTicker(ticker)} className="text-xs transition-colors cursor-pointer bg-transparent border-none" style={{ color: "#8b98a5" }} disabled={selectedList.startsWith(SMART_PREFIX)}>Remove</button>
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
    </AppScreen>
  );
};

export default WatchlistPage;
