import React, { useState, useEffect, useMemo } from "react";
import { WatchlistEngine, CustomWatchlist } from "../services/portfolio/WatchlistEngine";
import { SmartWatchlistEngine, SmartWatchlist } from "../services/portfolio/SmartWatchlistEngine";
import { navigateToStock } from "../architecture/navigation/routeCoordinator";
import { StockRegistry } from "../services/stocks/StockRegistry";
import { NoteEngine } from "../services/portfolio/NoteEngine";
import { loadAuthSession } from "../services/auth/sessionStore";
import { api, WatchlistRow } from "../services/api/client";
import { ChevronRight, TrendingUp, Eye } from "lucide-react";
import { getScoreState, formatFreshness } from "../services/ui/dataFormatting";
import { useToast } from "../components/feedback/useToast";
import { IntelligenceModal } from "../components/intelligence/IntelligenceModal";
import { PredictionConfidenceBar } from "../components/intelligence/PredictionConfidenceBar";
import { RoundedDepthPanel } from "../components/intelligence/RoundedDepthPanel";

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

  const listSourceLabel = (source: "remote" | "local" | "smart"): string | null => {
    if (source === "local") return "Local";
    if (source === "smart") return "Auto";
    return null;
  };

  if (authState === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-[76px] sm:px-6 md:pt-28">
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="text-xs text-[#8B949E]">Loading watchlists...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-[76px] sm:px-6 md:pt-28">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-[#E6EDF3]">Saved research</h1>
        </div>
        <p className="mt-1 text-xs text-[#8B949E]">Companies you are tracking for research follow-up. Tap a row to inspect the evidence view.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="flex flex-col space-y-3 lg:col-span-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">My Lists</span>
          {displayLists.length === 0 ? (
            <p className="text-xs text-[#8B949E]">No lists yet. Search a company to create one.</p>
          ) : (
            displayLists.map((wl) => {
              const label = listSourceLabel(wl.source);
              return (
                <button
                  key={wl.id}
                  onClick={() => setSelectedList(wl.id)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-colors flex items-center justify-between ${
                    selectedList === wl.id ? "bg-[#2962FF]/10 text-[#2962FF]" : "text-[#8B949E] hover:bg-white/[0.04]"
                  }`}
                >
                  <span>{wl.name} <span className="opacity-60 ml-1">({wl.tickers.length})</span></span>
                  {label && <span className="text-[10px] uppercase tracking-wider text-[#484F58]">{label}</span>}
                </button>
              );
            })
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
            <RoundedDepthPanel padding="lg" variant="elevated">
              <div className="flex flex-col items-center gap-3 text-center">
                <Eye className="h-8 w-8 text-[#484F58]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#E6EDF3]">No saved research</h2>
                <p className="max-w-md text-xs leading-relaxed text-[#8B949E]">
                  Search for a company above to add it to this list. Saved companies stay grounded in verified score availability.
                </p>
              </div>
            </RoundedDepthPanel>
          ) : (
            <div className="space-y-3">
              {activeTickers.map((ticker) => {
                const info = StockRegistry.getStock(ticker);
                const score = info?.telemetrySnapshot?.healthScore ?? null;
                const noteObj = NoteEngine.getNote(ticker);
                return (
                  <div key={ticker} className="rounded-[22px] border border-white/5 bg-[#0D1117] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button onClick={() => navigateToStock({ ticker, mode: "push" })} className="flex items-center gap-2 text-left">
                        <span className="font-mono text-sm font-bold text-[#E6EDF3] hover:underline">{ticker}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#484F58]" aria-hidden="true" />
                      </button>
                      <div className="flex items-center gap-2">
                        {typeof score === "number" && Number.isFinite(score) ? (
                          <span className="inline-flex items-center rounded-full border border-[#2962FF]/10 bg-[#2962FF]/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-[#2962FF]">{Math.round(score)}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-[#484F58]">Score pending</span>
                        )}
                        <button onClick={() => setExplanationSymbol(ticker)} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-[#8B949E] hover:bg-white/[0.08] hover:text-[#E6EDF3] transition-colors">
                          Explain
                        </button>
                        <button onClick={() => handleRemoveTicker(ticker)} className="text-[10px] text-[#484F58] hover:text-[#F23645] transition-colors" disabled={selectedList.startsWith(SMART_PREFIX)}>Remove</button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-[#484F58]">Score</span>
                        <span className="ml-1.5 font-mono text-xs text-[#8B949E]">{typeof score === "number" && Number.isFinite(score) ? Math.round(score) : "Unavailable"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#484F58]">Freshness</span>
                        <span className="ml-1.5 font-mono text-xs text-[#8B949E]">{noteObj.lastUpdated ? formatFreshness(noteObj.lastUpdated) : "Unavailable"}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <input type="text" value={noteObj.note} onChange={(e) => handleNoteChange(ticker, e.target.value)} placeholder="Why am I watching?" className="w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs text-[#E6EDF3] placeholder:text-[#484F58] outline-none" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Explanation modal */}
      <IntelligenceModal
        open={explanationSymbol !== null}
        onClose={() => setExplanationSymbol(null)}
        title={explanationSymbol ? `${explanationSymbol} — prediction explanation` : ""}
        subtitle="Model score and factor context for this symbol."
      >
        {explanationSymbol && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Symbol</span>
              <div className="mt-1 font-mono text-lg font-bold text-[#E6EDF3]">{explanationSymbol}</div>
            </div>
            <PredictionConfidenceBar score={null} />
            <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <p className="text-[11px] leading-relaxed text-[#8B949E]">
                <strong>Prediction explanation unavailable</strong> — Explanation data appears after the next completed scoring cycle for this symbol.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { navigateToStock({ ticker: explanationSymbol, mode: "push" }); setExplanationSymbol(null); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-[#E6EDF3] hover:bg-white/[0.08] transition-colors"
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Open company research
            </button>
            <p className="text-[10px] leading-relaxed text-[#484F58]">Research only. Not investment advice.</p>
          </div>
        )}
      </IntelligenceModal>
    </div>
  );
};

export default WatchlistPage;
