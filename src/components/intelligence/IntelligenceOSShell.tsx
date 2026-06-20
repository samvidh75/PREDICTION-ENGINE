import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, TrendingUp, ShieldCheck, Eye, Briefcase, Settings, Home, Search, ArrowLeftRight } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import ProfileButton from "../navigation/ProfileButton";

interface ShellRoute {
  id: string;
  label: string;
  icon: React.ElementType;
  pageKey: string;
}

const ROUTES: ShellRoute[] = [
  { id: "home", label: "Home", icon: Home, pageKey: "dashboard" },
  { id: "rankings", label: "Rankings", icon: BarChart3, pageKey: "rankings" },
  { id: "scanner", label: "Scanner", icon: Search, pageKey: "scanner" },
  { id: "alerts", label: "Alerts", icon: TrendingUp, pageKey: "alerts" },
  { id: "watchlist", label: "Watchlist", icon: Eye, pageKey: "watchlist" },
  { id: "portfolio", label: "Portfolio", icon: Briefcase, pageKey: "portfolio" },
  { id: "methodology", label: "Methodology", icon: ShieldCheck, pageKey: "methodology" },
  { id: "compare", label: "Compare", icon: ArrowLeftRight, pageKey: "compare" },
];

const MOBILE_ROUTES: ShellRoute[] = [
  { id: "home", label: "Home", icon: Home, pageKey: "dashboard" },
  { id: "scanner", label: "Scanner", icon: Search, pageKey: "scanner" },
  { id: "compare", label: "Compare", icon: ArrowLeftRight, pageKey: "compare" },
  { id: "watchlist", label: "Track", icon: Eye, pageKey: "watchlist" },
];

function navigatePage(pageKey: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.delete("id");
  params.delete("tab");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

function getCurrentPageKey(): string {
  if (typeof window === "undefined") return "dashboard";
  return new URLSearchParams(window.location.search).get("page") || "dashboard";
}

interface IntelligenceOSShellProps {
  children: React.ReactNode;
}

export function IntelligenceOSShell({ children }: IntelligenceOSShellProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => getCurrentPageKey());

  useEffect(() => {
    const handler = () => setCurrentPage(getCurrentPageKey());
    window.addEventListener("urlchange", handler);
    window.addEventListener("popstate", handler);
    return () => { window.removeEventListener("urlchange", handler); window.removeEventListener("popstate", handler); };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setCommandOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-[#070A0F] text-[#E6EDF3] antialiased">
      {/* Desktop layout */}
      <div className="hidden md:flex md:h-dvh md:flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#080C10]/95 px-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-[#E6EDF3]">
              StockStory<span className="text-[#16A34A]">.</span>India
            </span>
          </div>
          {/* Integrated compact search trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden h-9 flex-1 max-w-md items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs text-[#64748B] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-all duration-200 hover:border-[#2962FF]/40 hover:text-[#9AA7B5] focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50 sm:flex"
          >
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Search companies or open a workflow...</span>
            <kbd className="ml-auto rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">⌘K</kbd>
          </button>
          <div className="flex items-center gap-3">
            <ProfileButton />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Left rail */}
          <nav className="flex w-14 flex-col items-center gap-1 border-r border-white/[0.06] bg-[#080C10]/95 pt-3 backdrop-blur-xl" aria-label="Main navigation">
            {ROUTES.map((route) => {
              const isActive = currentPage === route.pageKey;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => navigatePage(route.pageKey)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50 ${
                    isActive ? "bg-[#111827] text-[#E6EDF3] shadow-[inset_3px_0_0_#2962FF]" : "text-[#64748B] hover:bg-white/[0.04] hover:text-[#9AA7B5]"
                  }`}
                  aria-label={route.label}
                  title={route.label}
                >
                  <route.icon className="h-4 w-4" aria-hidden="true" />
                </button>
              );
            })}
          </nav>
          {/* Main content — full-width workspace, no narrow column */}
          <main className="flex-1 overflow-y-auto">
            <div className="w-full px-6 py-6 lg:px-10 xl:px-12">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <div className="min-h-dvh overflow-x-hidden pb-20">
          <main className="w-full">
            {children}
          </main>
        </div>
        {/* Bottom dock */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/[0.06] bg-[#080C10] px-2 py-2 safe-area-bottom" aria-label="Main navigation">
          {MOBILE_ROUTES.map((route) => {
            const isActive = currentPage === route.pageKey;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => navigatePage(route.pageKey)}
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50 ${
                  isActive ? "bg-white/[0.06] text-[#E6EDF3]" : "text-[#64748B]"
                }`}
                aria-label={route.label}
              >
                <route.icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[9px] font-medium uppercase tracking-wider">{route.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[#2962FF] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50"
            aria-label="Command"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            <span className="text-[9px] font-medium uppercase tracking-wider">Search</span>
          </button>
        </nav>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
