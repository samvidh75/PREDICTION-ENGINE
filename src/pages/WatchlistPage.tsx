import React, { useState, useEffect, useMemo } from "react";
import { WatchlistEngine, CustomWatchlist } from "../services/portfolio/WatchlistEngine";
import { SmartWatchlistEngine, SmartWatchlist } from "../services/portfolio/SmartWatchlistEngine";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { loadAuthSession } from "../services/auth/sessionStore";
import { api, WatchlistRow } from "../services/api/client";
import { ChevronRight, Eye } from "lucide-react";
import { formatFreshness } from "../services/ui/dataFormatting";
import { useToast } from "../components/feedback/useToast";
import { ProductPanel, ProductEmptyState, ProductAction, ProductStatusPill, productNavigate } from "../components/product/ProductUI";

interface DisplayList {
  id: string;
  name: string;
  tickers: string[];
  source: "remote" | "local" | "smart";
}

const REMOTE_PREFIX = "remote-";
const SMART_PREFIX = "smart-";

const THESIS_TABS = ["All", "What changed", "Needs review", "Thesis improving", "Risk rising"] as const;
type ThesisTab = typeof THESIS_TABS[number];

export const WatchlistPage: React.FC = () => {
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "anonymous">("loading");
  const [remoteLists, setRemoteLists] = useState<WatchlistRow[] | null>(null);
  const [localLists, setLocalLists] = useState<CustomWatchlist[]>(() => WatchlistEngine.getWatchlists());
  const [smartWatchlists] = useState<SmartWatchlist[]>(() => SmartWatchlistEngine.getSmartWatchlists());
  const [selectedList, setSelectedList] = useState<string>("");
  const [thesisTab, setThesisTab] = useState<ThesisTab>("All");
  const toast = useToast();
  const [noteRefresh, setNoteRefresh] = useState(0);
  const [explanationSymbol, setExplanationSymbol] = useState<string | null>(null);

  useEffect(() => {
    const session = loadAuthSession();
    if (session.uid) { api.getWatchlists().then(lists => { setRemoteLists(lists); setAuthState("authenticated"); }).catch(() => { setRemoteLists(null); setAuthState("authenticated"); }); }
    else { setRemoteLists(null); setAuthState("anonymous"); }
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
    if (remoteLists) { for (const wl of remoteLists) lists.push({ id: `${REMOTE_PREFIX}${wl.id}`, name: wl.name, tickers: wl.tickers, source: "remote" }); }
    else { for (const wl of localLists) lists.push({ id: wl.id, name: wl.name, tickers: wl.tickers, source: "local" }); }
    return lists;
  }, [remoteLists, localLists]);

  const handleRemoveTicker = (ticker: string) => {
    if (selectedList.startsWith(SMART_PREFIX)) return;
    const list = displayLists.find(l => l.id === selectedList);
    if (!list) return;
    if (list.source === "remote") {
      const remoteId = selectedList.replace(REMOTE_PREFIX, "");
      api.removeWatchlistTicker(remoteId, ticker).then(updated => { setRemoteLists(prev => prev ? prev.map(wl => wl.id === remoteId ? updated : wl) : prev); toast.success(`${ticker} removed`); }).catch(() => { toast.error(`Could not remove ${ticker}.`); api.getWatchlists().then(lists => setRemoteLists(lists)).catch(() => {}); });
    } else {
      WatchlistEngine.removeTicker(selectedList, ticker);
      setLocalLists([...WatchlistEngine.getWatchlists()]);
      toast.success(`${ticker} removed`);
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

  const sectorBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    activeTickers.forEach((t) => {
      const sec = StockRegistry.getStock(t)?.sector || "Unknown";
      counts[sec] = (counts[sec] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activeTickers]);

  if (authState === "loading") {
    return (
      <div className="w-full px-6 pb-16 pt-20 md:px-10 md:pt-28 lg:px-16 xl:px-24">
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="text-xs text-[#8B949E]">Loading watchlists...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 pb-16 pt-20 md:px-10 md:pt-24 lg:px-16 xl:px-24">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#E6EDF3]">Tracked companies</h1>
          </div>
          <p className="mt-1 text-xs text-[#8B949E]">Companies you are researching.</p>
        </div>
        {sectorBreakdown.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">Sectors</span>
            {sectorBreakdown.map(([sector, count]) => (
              <span key={sector} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#E6EDF3]">
                {sector} <span className="text-[#484F58]">({count})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="flex flex-col space-y-3 lg:col-span-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">My Lists</span>
          {displayLists.length === 0 ? (
            <p className="text-xs text-[#8B949E]">No lists yet. Search a company to create one.</p>
          ) : (
            displayLists.map((wl) => (
              <button
                key={wl.id}
                onClick={() => setSelectedList(wl.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-colors flex items-center justify-between ${
                  selectedList === wl.id ? "bg-[#2962FF]/10 text-[#2962FF]" : "text-[#8B949E] hover:bg-white/[0.04]"
                }`}
              >
                <span>{wl.name} <span className="opacity-60 ml-1">({wl.tickers.length})</span></span>
              </button>
            ))
          )}
          {smartWatchlists.length > 0 && (
            <>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Smart Lists</span>
              {smartWatchlists.map((wl, idx) => (
                <button
                  key={wl.name}
                  onClick={() => setSelectedList(`${SMART_PREFIX}${idx}`)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-colors ${
                    selectedList === `${SMART_PREFIX}${idx}` ? "bg-[#2962FF]/10 text-[#2962FF]" : "text-[#8B949E] hover:bg-white/[0.04]"
                  }`}
                >
                  {wl.name} <span className="opacity-60 ml-1">({wl.tickers.length})</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="lg:col-span-3">
          {activeTickers.length === 0 ? (
            <ProductEmptyState
              icon={Eye}
              title="Track companies you are researching"
              body="Open the scanner or search for a company to start tracking."
              action={
                <div className="flex flex-wrap gap-2">
                  <ProductAction onClick={() => productNavigate("scanner")}>Open scanner</ProductAction>
                  <ProductAction variant="secondary" onClick={() => productNavigate("search")}>Search company</ProductAction>
                </div>
              }
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {THESIS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setThesisTab(tab)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      thesisTab === tab
                        ? "border-[#2962FF] bg-[#2962FF]/10 text-[#2962FF]"
                        : "border-[rgba(148,163,184,0.16)] bg-[rgba(255,255,255,0.03)] text-[#9AA7B5] hover:text-[#E6EDF3]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {activeTickers.map((ticker) => {
                  const info = StockRegistry.getStock(ticker);
                  const score = info?.telemetrySnapshot?.healthScore ?? null;
                  const noteObj = NoteEngine.getNote(ticker);
                  const hasScore = typeof score === "number" && Number.isFinite(score);
                  return (
                    <ProductPanel key={ticker} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigateToStock({ ticker, mode: "push" })} className="flex items-center gap-2 text-left">
                            <span className="font-mono text-sm font-bold text-[#E6EDF3] hover:underline">{ticker}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-[#484F58]" aria-hidden="true" />
                          </button>
                          <div className="flex items-center gap-1.5">
                            {hasScore ? (
                              <ProductStatusPill tone="blue">{Math.round(score)}</ProductStatusPill>
                            ) : (
                              <ProductStatusPill tone="muted">Under review</ProductStatusPill>
                            )}
                            <ProductStatusPill tone={noteObj.lastUpdated ? "verified" : "muted"}>
                              {noteObj.lastUpdated ? `Last update ${formatFreshness(noteObj.lastUpdated)}` : "No updates yet"}
                            </ProductStatusPill>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <ProductAction variant="ghost" onClick={() => navigateToStock({ ticker, mode: "push" })}>Open</ProductAction>
                          <ProductAction variant="ghost" onClick={() => productNavigate("compare", ticker)}>Compare</ProductAction>
                          <button onClick={() => handleRemoveTicker(ticker)} className="text-[10px] text-[#484F58] hover:text-[#F23645] transition-colors" disabled={selectedList.startsWith(SMART_PREFIX)}>Remove</button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <input type="text" value={noteObj.note} onChange={(e) => handleNoteChange(ticker, e.target.value)} placeholder="Why am I watching?" className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" aria-label="Watchlist note" />
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <button onClick={() => setExplanationSymbol(explanationSymbol === ticker ? null : ticker)} className="text-[10px] text-[#2962FF] hover:text-[#3B71FF] transition-colors">
                          {explanationSymbol === ticker ? "Hide explanation" : "What changed"}
                        </button>
                        {explanationSymbol === ticker && (
                          <button onClick={() => { navigateToStock({ ticker, mode: "push" }); setExplanationSymbol(null); }} className="text-[10px] text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
                            Open full research
                          </button>
                        )}
                      </div>
                      {explanationSymbol === ticker && (
                        <div className="mt-3 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-[11px] leading-relaxed text-[#8B949E]">
                            <strong>Not enough information</strong> — Explanation data appears after the next completed scoring cycle for this symbol.
                          </p>
                          <p className="text-[10px] leading-relaxed text-[#484F58]">Research only. Not investment advice.</p>
                        </div>
                      )}
                    </ProductPanel>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
