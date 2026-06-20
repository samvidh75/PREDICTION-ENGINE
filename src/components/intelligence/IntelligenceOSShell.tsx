import React, { useState, useEffect, useCallback, useRef } from "react";
import { BarChart3, TrendingUp, ShieldCheck, Eye, Briefcase, Settings, Home, Search, ArrowLeftRight, Menu, X, Rocket } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import ProfileButton from "../navigation/ProfileButton";
import { NavLink } from "../navigation/NavLink";

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
  { id: "watchlist", label: "Watchlist", icon: Eye, pageKey: "watchlist" },
];

const MOBILE_MENU_ROUTES: ShellRoute[] = [
  { id: "rankings", label: "Rankings", icon: BarChart3, pageKey: "rankings" },
  { id: "compare", label: "Compare", icon: ArrowLeftRight, pageKey: "compare" },
  { id: "portfolio", label: "Portfolio", icon: Briefcase, pageKey: "portfolio" },
  { id: "alerts", label: "Alerts", icon: TrendingUp, pageKey: "alerts" },
  { id: "ipo", label: "IPO Center", icon: Rocket, pageKey: "ipo" },
  { id: "methodology", label: "Methodology", icon: ShieldCheck, pageKey: "methodology" },
  { id: "settings", label: "Settings", icon: Settings, pageKey: "settings" },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => getCurrentPageKey());
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    const handleMenuKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
      if (e.key === "Tab" && menuRef.current) {
        const focusable = menuRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleMenuKey);
    const prev = document.activeElement as HTMLElement | null;
    setTimeout(() => menuRef.current?.querySelector<HTMLElement>("button, [href]")?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", handleMenuKey);
      prev?.focus();
    };
  }, [menuOpen]);

  return (
    <>
      <a href="#ss-main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2962FF]">
        Skip to main content
      </a>
    <div className="flex min-h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-text-primary)] antialiased md:h-dvh">
      <header className="relative z-30 hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]/95 px-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl md:flex">
        <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">StockStory<span className="text-[#16A34A]">.</span>India</span>
        <button onClick={() => setCommandOpen(true)} className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.035)] px-3 text-xs text-[var(--color-text-muted)] shadow-[inset_0_1px_0_rgba(15,23,42,0.035)] transition-all duration-200 hover:border-[#2962FF]/40 hover:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50">
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Search companies or open a workflow...</span>
          <kbd className="ml-auto rounded border border-[var(--color-border-light)] bg-[rgba(15,23,42,0.03)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">⌘K</kbd>
        </button>
        <ProfileButton />
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-[var(--color-border-light)] bg-[var(--color-surface)]/95 pt-3 backdrop-blur-xl md:flex" aria-label="Main navigation">
          {ROUTES.map((route) => {
            const isActive = currentPage === route.pageKey;
            return <NavLink key={route.id} href={`/?page=${route.pageKey}`} className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50 ${isActive ? "bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] shadow-[inset_3px_0_0_#2962FF]" : "text-[var(--color-text-muted)] hover:bg-[rgba(15,23,42,0.04)] hover:text-[var(--color-text-secondary)]"}`} aria-label={route.label} title={route.label}>
              <route.icon className="h-4 w-4" aria-hidden="true" />
            </NavLink>;
          })}
        </nav>

        <main id="ss-main-content" className="min-w-0 flex-1 overflow-x-hidden pb-20 md:overflow-y-auto md:pb-0">
          <div className="w-full md:px-6 md:py-6 lg:px-10 xl:px-12">{children}</div>
        </main>
      </div>

      <nav className="ssi-bottom-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--color-border-light)] bg-[var(--color-surface)] px-2 py-2 safe-area-bottom md:hidden" aria-label="Main navigation">
          {MOBILE_ROUTES.map((route) => {
            const isActive = currentPage === route.pageKey;
            return (
              <NavLink
                key={route.id}
                href={`/?page=${route.pageKey}`}
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50 ${
                  isActive ? "bg-[rgba(15,23,42,0.06)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                }`}
                aria-label={route.label}
              >
                <route.icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[9px] font-medium uppercase tracking-wider">{route.label}</span>
              </NavLink>
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
          <button ref={menuTriggerRef} type="button" onClick={() => setMenuOpen(true)} className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[var(--color-text-muted)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50" aria-label="Menu" aria-haspopup="dialog" aria-expanded={menuOpen}>
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="text-[9px] font-medium uppercase tracking-wider">Menu</span>
          </button>
      </nav>

      {menuOpen && <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm md:hidden" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
        <section ref={menuRef} role="dialog" aria-modal="true" aria-label="Product menu" className="w-full rounded-t-3xl border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-8 pt-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between px-1"><h2 className="text-sm font-semibold text-[var(--color-text-primary)]" id="ss-mobile-menu-title">More research tools</h2><button type="button" onClick={() => setMenuOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-2 gap-2">{MOBILE_MENU_ROUTES.map((route) => <NavLink key={route.id} href={`/?page=${route.pageKey}`} onClick={() => setTimeout(() => setMenuOpen(false), 0)} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.025)] px-4 text-left text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50"><route.icon className="h-4 w-4 text-[#7EA1FF]" />{route.label}</NavLink>)}</div>
        </section>
      </div>}

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
    </>
  );
}
