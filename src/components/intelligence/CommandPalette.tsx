import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, BarChart3, TrendingUp, Eye, ArrowLeftRight, BookOpen, Briefcase, History } from "lucide-react";

interface Action {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

function navigatePage(pageKey: string, params?: Record<string, string>) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("page", pageKey);
  if (params) Object.entries(params).forEach(([k, v]) => urlParams.set(k, v));
  window.history.pushState({}, "", `?${urlParams.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
  if (pageKey === "stock" && params?.id) trackRecentTicker(params.id);
}

const RECENT_TICKERS_KEY = 'ss_recent_tickers';

function getRecentTickers(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_TICKERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function trackRecentTicker(ticker: string): void {
  if (!ticker) return;
  try {
    const recents = getRecentTickers().filter(t => t !== ticker.toUpperCase());
    recents.unshift(ticker.toUpperCase());
    localStorage.setItem(RECENT_TICKERS_KEY, JSON.stringify(recents.slice(0, 20)));
  } catch { /* noop */ }
}

const DEFAULT_ACTIONS: Action[] = [
  { id: "search-company", label: "Search company", description: "Find companies by ticker or name", icon: Search, action: () => navigatePage("search") },
  { id: "open-scanner", label: "Open scanner", description: "Discover companies matching criteria", icon: BarChart3, action: () => navigatePage("scanner") },
  { id: "rankings", label: "View rankings", description: "Browse scored companies", icon: TrendingUp, action: () => navigatePage("rankings") },
  { id: "compare", label: "Compare companies", description: "Compare scores and factors", icon: ArrowLeftRight, action: () => navigatePage("compare") },
  { id: "watchlist", label: "Open watchlist", description: "Tracked companies thesis tracker", icon: Eye, action: () => navigatePage("watchlist") },
  { id: "portfolio", label: "Open portfolio", description: "Monitor your thesis", icon: Briefcase, action: () => navigatePage("portfolio") },
  { id: "alerts", label: "Open alerts", description: "What changed for tracked companies", icon: BookOpen, action: () => navigatePage("alerts") },
  { id: "methodology", label: "Open methodology", description: "How StockStory thinks", icon: BookOpen, action: () => navigatePage("methodology") },
  { id: "quality-compounders", label: "Find quality compounders", description: "High quality, strong growth", icon: TrendingUp, action: () => navigatePage("search") },
  { id: "undervalued-quality", label: "Find undervalued quality", description: "Good companies at reasonable prices", icon: BarChart3, action: () => navigatePage("search") },
  { id: "improving-momentum", label: "Find improving momentum", description: "Companies gaining strength", icon: TrendingUp, action: () => navigatePage("search") },
  { id: "review-tracked", label: "Review tracked companies", description: "Watchlist thesis status", icon: Eye, action: () => navigatePage("watchlist") },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const recentTickers = getRecentTickers();
  const researchAction: Action | null = recentTickers.length > 0 ? {
    id: "continue-last-research",
    label: "Continue last research",
    description: recentTickers[0],
    icon: History,
    action: () => { navigatePage("stock", { id: recentTickers[0] }); onClose(); },
  } : null;

  const dynamicActions = researchAction ? [researchAction] : [];

  const filteredActions = [...dynamicActions, ...DEFAULT_ACTIONS].filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    (a.description && a.description.toLowerCase().includes(query.toLowerCase()))
  );

  const allItems = [...filteredActions, ...searchResults.map((r) => ({
    id: `stock-${r.symbol}`, label: r.symbol, description: r.name, icon: Search,
    action: () => { navigatePage("stock", { id: r.symbol }); onClose(); },
  }))];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault();
      allItems[selectedIndex].action();
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "9") {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < allItems.length) {
        e.preventDefault();
        allItems[idx].action();
        onClose();
      }
    }
  }, [onClose, selectedIndex, allItems]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      timerId = setTimeout(() => { inputRef.current?.focus(); setSelectedIndex(0); }, 80);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (timerId) clearTimeout(timerId);
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (!query.trim() || !open) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const results = Array.isArray(data) ? data.slice(0, 5) : data?.results?.slice(0, 5) || [];
        setSearchResults(results);
        setSearching(false);
      })
      .catch(() => { setSearchResults([]); setSearching(false); });
    return () => ctrl.abort();
  }, [query, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[12vh] sm:pt-[18vh]"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(18px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0D1117] shadow-[0_28px_90px_rgba(0,0,0,0.58),0_8px_24px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.055)] transition-all duration-200 ease-out"
        style={{ transform: "translateZ(0)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#111827]/55 px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-[#484F58]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search companies or type a command..."
            className="h-8 w-full bg-transparent text-sm text-[#E6EDF3] placeholder:text-[#64748B] outline-none"
            aria-label="Command search"
          />
          <kbd className="hidden shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-[#484F58] sm:inline-block">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[min(54vh,380px)] overflow-y-auto px-2 py-2">
          {searching && (
            <div className="px-3 py-3 text-xs text-[#64748B]">Searching...</div>
          )}

          {!searching && query.trim() && searchResults.length === 0 && filteredActions.length === 0 && (
            <div className="flex flex-col items-center px-3 py-6 text-center">
              <Search className="h-6 w-6 text-[#64748B] mb-2" aria-hidden="true" />
              <p className="text-xs text-[#9AA7B5]">No commands match &ldquo;{query}&rdquo;</p>
              <p className="mt-1 max-w-[260px] text-[10px] leading-relaxed text-[#64748B]">Try searching for a company name or ticker instead</p>
              <button
                type="button"
                onClick={() => { setQuery(""); }}
                className="mt-3 text-[10px] font-medium text-[#2962FF] hover:text-[#3B71FF] transition-colors"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Route actions */}
          {filteredActions.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { item.action(); onClose(); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150 ${
                selectedIndex === i ? "bg-[#111827] text-[#E6EDF3] shadow-[inset_3px_0_0_#2962FF]" : "text-[#8B949E] hover:bg-white/[0.04]"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{item.label}</span>
                {item.description && <span className="ml-2 text-[10px] text-[#64748B]">{item.description}</span>}
              </div>
              {i < 9 && (
                <kbd className="shrink-0 ml-auto rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-[#484F58]">⌘{i + 1}</kbd>
              )}
            </button>
          ))}

          {/* Search results */}
          {searchResults.length > 0 && (
            <>
              {filteredActions.length > 0 && <div className="border-t border-white/[0.04] my-1" />}
              {searchResults.map((r, i) => {
                const idx = filteredActions.length + i;
                return (
                  <button
                    key={r.symbol}
                    type="button"
                    onClick={() => { navigatePage("stock", { id: r.symbol }); onClose(); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150 ${
                    selectedIndex === idx ? "bg-[#111827] text-[#E6EDF3] shadow-[inset_3px_0_0_#2962FF]" : "text-[#8B949E] hover:bg-white/[0.04]"
                  }`}
                >
                    <Search className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-semibold">{r.symbol}</span>
                      {r.name && <span className="ml-2 text-[10px] text-[#64748B]">{r.name}</span>}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-white/[0.04] bg-[#080C10]/45 px-5 py-2.5 text-[10px] text-[#64748B]">
          <span className="hidden sm:inline">↑↓ navigate · ↵ select · esc close · ⌘1-9 quick select</span>
          <span className="sm:hidden">Tap a result to navigate</span>
        </div>
      </div>
    </div>
  );
}
