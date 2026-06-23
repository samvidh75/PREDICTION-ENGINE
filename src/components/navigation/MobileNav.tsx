import React, { useState } from "react";
import { ArrowLeftRight, BookOpen, Home, Info, LogIn, Search, Sparkles, Menu, X, Settings, LogOut, BarChart3, Bookmark, Eye, DollarSign } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface MobileNavItem {
  page: "dashboard" | "scanner" | "search" | "track" | "menu";
  label: string;
  icon: React.ReactNode;
}

export const MobileNav: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentPage = (() => {
    if (typeof window === "undefined") return "landing";
    return new URLSearchParams(window.location.search).get("page") ?? "landing";
  })();

  const setPage = (pageKey: string) => {
    setMenuOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const tabs: MobileNavItem[] = [
    { page: "dashboard", label: "Home", icon: <Home className="h-5 w-5" /> },
    { page: "scanner", label: "AI Scanner", icon: <BarChart3 className="h-5 w-5" /> },
    { page: "search", label: "Search", icon: <Search className="h-5 w-5" /> },
    { page: "track", label: "Track", icon: <Eye className="h-5 w-5" /> },
  ];

  const menuItems = [
    { page: "compare", label: "Compare", icon: <ArrowLeftRight className="h-4 w-4" /> },
    { page: "pricing", label: "Pricing", icon: <DollarSign className="h-4 w-4" /> },
    { page: "methodology", label: "Research standards", icon: <BookOpen className="h-4 w-4" /> },
    { page: "settings", label: "Account", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <>
      <nav
        className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-[90] h-16 border-t border-[var(--color-border)] bg-[var(--color-canvas)]/90 backdrop-blur-xl flex items-center justify-around pb-1"
        aria-label="Mobile navigation"
      >
        {tabs.map((tab) => {
          const isActive = currentPage === tab.page;
          return (
            <button
              key={tab.page}
              type="button"
              onClick={() => setPage(tab.page)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[var(--color-text-secondary)] hover:text-white transition-colors ${isActive ? "text-[#2962FF] font-semibold" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon}
              <span className="text-[10px] tracking-wide">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[var(--color-text-secondary)] hover:text-white transition-colors ${menuOpen ? "text-[#2962FF]" : ""}`}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] tracking-wide">More</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="More navigation options">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative w-full rounded-t-2xl bg-[var(--color-surface)] border-t border-[var(--color-border)] p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto pb-12">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-sm font-bold text-[var(--color-text-primary)] tracking-wide">More</h2>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              {menuItems.map((item) => (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => setPage(item.page)}
                  className="flex items-center gap-2.5 rounded-lg border border-[rgba(15,23,42,0.04)] bg-[rgba(15,23,42,0.01)] p-3 text-left text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[rgba(15,23,42,0.03)] transition-colors"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 py-3 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all mt-4"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
