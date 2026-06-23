import React from "react";
import { LayoutDashboard, Search, ShieldCheck, Settings, LogOut, BarChart3, Bookmark } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NavLink } from "./NavLink";
import StockStoryLogo from "../brand/StockStoryLogo";

const NAV_ITEMS = [
  { href: "/?page=dashboard", label: "Home", icon: <LayoutDashboard className="icon-nav" /> },
  { href: "/?page=search", label: "Search", icon: <Search className="icon-nav" /> },
  { href: "/?page=scanner", label: "AI Scanner", icon: <BarChart3 className="icon-nav" /> },
  { href: "/?page=track", label: "Track", icon: <Bookmark className="icon-nav" /> },
  { href: "/?page=pricing", label: "Pricing", icon: <BarChart3 className="icon-nav" /> },
  { href: "/?page=settings", label: "Settings", icon: <Settings className="icon-nav" /> },
];

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:h-screen md:sticky md:top-0 md:border-r md:border-[var(--color-border)] md:bg-[var(--color-surface)] md:p-4 md:justify-between">
      <div>
        <div className="flex items-center gap-2 px-3 pb-5 mb-2 border-b border-[var(--color-border-light)]">
          <StockStoryLogo variant="lockup" size="sm" />
        </div>
        <nav className="flex flex-col gap-0.5 mt-4" aria-label="Main navigation">
          {NAV_ITEMS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="nav-link"
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
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
