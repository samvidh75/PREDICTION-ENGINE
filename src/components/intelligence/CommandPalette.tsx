import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, BarChart3, TrendingUp, Eye, ArrowLeftRight, BookOpen, Briefcase, Home, Command } from "lucide-react";
import { RoundedDepthPanel } from "./RoundedDepthPanel";

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
}

const DEFAULT_ACTIONS: Action[] = [
  { id: "search-company", label: "Search company", description: "Find companies by ticker or name", icon: Search, action: () => navigatePage("search") },
  { id: "open-scanner", label: "Open scanner", description: "Browse and filter companies", icon: BarChart3, action: () => navigatePage("search") },
  { id: "rankings", label: "View rankings", description: "Browse scored companies", icon: TrendingUp, action: () => navigatePage("rankings") },
  { id: "compare", label: "Compare companies", description: "Compare scores and factors", icon: ArrowLeftRight, action: () => navigatePage("compare") },
  { id: "watchlist", label: "Open watchlist", description: "Saved research", icon: Eye, action: () => navigatePage("watchlist") },
  { id: "portfolio", label: "Open portfolio", description: "Manual tracking", icon: Briefcase, action: () => navigatePage("portfolio") },
  { id: "methodology", label: "Open methodology", description: "Scoring methodology", icon: BookOpen, action: () => navigatePage("methodology") },
  { id: "about", label: "Open About", description: "Product mission and team", icon: Command, action: () => navigatePage("about") },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredActions = DEFAULT_ACTIONS.filter((a) =>
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
  }, [onClose, selectedIndex, allItems]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      setTimeout(() => { inputRef.current?.focus(); setSelectedIndex(0); }, 80);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
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
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] sm:pt-[20vh]"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg mx-4 rounded-[32px] bg-[#0D1117] border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden transition-all duration-300 ease-out"
        style={{ transform: "translateZ(0)" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-[#484F58]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search companies or type a command..."
            className="w-full bg-transparent text-sm text-[#E6EDF3] placeholder:text-[#484F58] outline-none"
            aria-label="Command search"
          />
          <kbd className="hidden shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-[#484F58] sm:inline-block">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto px-2 py-2">
          {searching && (
            <div className="px-3 py-3 text-xs text-[#484F58]">Searching...</div>
          )}

          {!searching && query.trim() && searchResults.length === 0 && filteredActions.length === 0 && (
            <div className="px-3 py-3 text-xs text-[#484F58]">
              {query.trim() ? "No results found" : "Type to search"}
            </div>
          )}

          {/* Route actions */}
          {filteredActions.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { item.action(); onClose(); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150 ${
                selectedIndex === i ? "bg-white/[0.08] text-[#E6EDF3]" : "text-[#8B949E] hover:bg-white/[0.04]"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0 text-[#484F58]" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{item.label}</span>
                {item.description && <span className="ml-2 text-[10px] text-[#484F58]">{item.description}</span>}
              </div>
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
                      selectedIndex === idx ? "bg-white/[0.08] text-[#E6EDF3]" : "text-[#8B949E] hover:bg-white/[0.04]"
                    }`}
                  >
                    <Search className="h-4 w-4 shrink-0 text-[#484F58]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-semibold">{r.symbol}</span>
                      {r.name && <span className="ml-2 text-[10px] text-[#484F58]">{r.name}</span>}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-white/[0.04] px-5 py-2.5 text-[10px] text-[#484F58]">
          <span className="hidden sm:inline">↑↓ navigate · ↵ select · esc close</span>
          <span className="sm:hidden">Tap a result to navigate</span>
        </div>
      </div>
    </div>
  );
}
