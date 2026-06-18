import React from "react";
import { LayoutDashboard, Search, Trophy, Eye, ShieldCheck, Settings, LogOut, Sparkles } from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

export const Sidebar: React.FC = () => {
  const { currentView, MapsTo } = useNavigation();
  const { logout } = useAuth();

  const links: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard" as ViewType, label: "Home", icon: <LayoutDashboard className="icon-nav" /> },
    { id: "search", label: "Search", icon: <Search className="icon-nav" /> },
    { id: "rankings", label: "Rankings", icon: <Trophy className="icon-nav" /> },
    { id: "signals" as ViewType, label: "Signals", icon: <Sparkles className="icon-nav" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="icon-nav" /> },
    { id: "trust", label: "Trust Centre", icon: <ShieldCheck className="icon-nav" /> },
    { id: "settings", label: "Settings", icon: <Settings className="icon-nav" /> },
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:h-screen md:sticky md:top-0 md:border-r md:border-[var(--color-border)] md:bg-[var(--color-surface)] md:p-4 md:justify-between">
      <div>
        <div className="flex items-center gap-2 px-3 pb-5 mb-2 border-b border-[var(--color-border-light)]">
          <div className="w-7 h-7 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold">S</div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">StockStory</span>
        </div>
        <nav className="flex flex-col gap-0.5 mt-4" aria-label="Main navigation">
          {links.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => MapsTo(link.id)}
                className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.icon}
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>
      <button
        type="button"
          onClick={logout}
        className="nav-link text-[var(--color-text-muted)]"
      >
        <LogOut className="icon-nav" />
        Sign out
      </button>
    </aside>
  );
};
