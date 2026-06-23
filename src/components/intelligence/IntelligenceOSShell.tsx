import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Menu, X, ArrowLeftRight, Settings, BookOpen, DollarSign, Rocket } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import ProfileButton from "../navigation/ProfileButton";
import { NavLink } from "../navigation/NavLink";
import DesktopRail from "../navigation/DesktopRail";

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
    <div className="flex min-h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-text-primary)] antialiased">
      {/* Desktop: left rail + top header */}
      <DesktopRail />

      <div className="flex min-h-0 flex-1 md:ml-16 flex-col">
        <header className="relative z-30 hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]/95 px-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl md:flex md:ml-0">
          <div className="flex-1" />
          <button onClick={() => setCommandOpen(true)} className="flex h-9 flex-1 max-w-md items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.035)] px-3 text-xs text-[var(--color-text-muted)] shadow-[inset_0_1px_0_rgba(15,23,42,0.035)] transition-all duration-200 hover:border-[#2962FF]/40 hover:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50">
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Search companies...</span>
            <kbd className="ml-auto rounded border border-[var(--color-border-light)] bg-[rgba(15,23,42,0.03)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">⌘K</kbd>
          </button>
          <ProfileButton />
        </header>

        <main id="ss-main-content" className="min-w-0 flex-1 overflow-x-hidden pb-24 md:overflow-y-auto md:pb-6">
          <div className="w-full md:px-6 md:py-6 lg:px-10 xl:px-12">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)] h-16 safe-area-bottom md:hidden" aria-label="Main navigation">
        <NavLink href="/?page=dashboard" className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium ${currentPage === "dashboard" ? "text-[#2962FF]" : "text-[var(--color-text-muted)]"}`} aria-label="Home">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={currentPage === "dashboard" ? 2.4 : 1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span>Home</span>
        </NavLink>
        <NavLink href="/?page=scanner" className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium ${currentPage === "scanner" ? "text-[#6d28d9]" : "text-[var(--color-text-muted)]"}`} aria-label="AI Scanner">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={currentPage === "scanner" ? 2.4 : 1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
          <span>AI Scanner</span>
        </NavLink>
        <NavLink href="/?page=search" className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium ${currentPage === "search" ? "text-[#2962FF]" : "text-[var(--color-text-muted)]"}`} aria-label="Search">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={currentPage === "search" ? 2.4 : 1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span>Search</span>
        </NavLink>
        <NavLink href="/?page=track" className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium ${currentPage === "track" ? "text-[#2962FF]" : "text-[var(--color-text-muted)]"}`} aria-label="Track">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={currentPage === "track" ? 2.4 : 1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          <span>Track</span>
        </NavLink>
        <button type="button" onClick={() => setMenuOpen(true)} className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium ${menuOpen ? "text-[#2962FF]" : "text-[var(--color-text-muted)]"}`} aria-label="More">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm md:hidden" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
          <section ref={menuRef} role="dialog" aria-modal="true" aria-label="More options" className="w-full rounded-t-3xl border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-8 pt-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">More</h2>
              <button type="button" onClick={() => setMenuOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#2962FF]/50" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NavLink href="/?page=compare" onClick={() => setTimeout(() => setMenuOpen(false), 0)} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.025)] px-4 text-left text-sm font-medium text-[var(--color-text-primary)]"><ArrowLeftRight className="h-4 w-4 text-[var(--color-text-secondary)]" />Compare</NavLink>
              <NavLink href="/?page=pricing" onClick={() => setTimeout(() => setMenuOpen(false), 0)} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.025)] px-4 text-left text-sm font-medium text-[var(--color-text-primary)]"><DollarSign className="h-4 w-4 text-[var(--color-text-secondary)]" />Pricing</NavLink>
              <NavLink href="/?page=methodology" onClick={() => setTimeout(() => setMenuOpen(false), 0)} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.025)] px-4 text-left text-sm font-medium text-[var(--color-text-primary)]"><BookOpen className="h-4 w-4 text-[var(--color-text-secondary)]" />Research standards</NavLink>
              <NavLink href="/?page=settings" onClick={() => setTimeout(() => setMenuOpen(false), 0)} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.025)] px-4 text-left text-sm font-medium text-[var(--color-text-primary)]"><Settings className="h-4 w-4 text-[var(--color-text-secondary)]" />Account</NavLink>
              <NavLink href="/?page=ipo" onClick={() => setTimeout(() => setMenuOpen(false), 0)} className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.025)] px-4 text-left text-sm font-medium text-[var(--color-text-primary)]"><Rocket className="h-4 w-4 text-[var(--color-text-secondary)]" />IPO Center</NavLink>
            </div>
          </section>
        </div>
      )}

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
    </>
  );
}
