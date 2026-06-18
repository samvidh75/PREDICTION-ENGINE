import React from "react";
import { LayoutDashboard, Search, Trophy, Eye, ShieldCheck, Settings, LogOut, Sparkles } from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { currentView, MapsTo } = useNavigation();
  const { isAuthenticated, logout, isConnecting } = useAuth();

  const links: NavItem[] = [
    { id: "dashboard" as ViewType, label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "search", label: "Search", icon: <Search className="h-4 w-4" /> },
    { id: "rankings", label: "Rankings", icon: <Trophy className="h-4 w-4" /> },
    { id: "signals" as ViewType, label: "Signals", icon: <Sparkles className="h-4 w-4" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="h-4 w-4" /> },
    { id: "trust", label: "Trust Centre", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <aside
      className="fixed bottom-0 left-0 top-15 z-40 hidden w-[240px] select-none flex-col justify-between py-5 md:flex"
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.86),rgba(237,246,243,0.76))", backdropFilter: "blur(18px)", borderRight: "1px solid rgba(8,127,105,0.12)", boxShadow: "18px 0 48px rgba(15,23,42,0.08)" }}
    >
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {links.map((link) => {
          const isActive = currentView === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => MapsTo(link.id)}
              className={`group flex h-11 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "text-white shadow-sm bg-[#087f69]"
                  : "hover:bg-white/60" 
              }`}
              style={isActive ? { background: "linear-gradient(135deg,#087f69,#0f9f92)", color: "white", boxShadow: "0 14px 28px rgba(8,127,105,0.24)" } : { color: "#24313d" }}
            >
              <span className={`shrink-0 ${isActive ? "text-white" : "text-ink-muted"}`}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      {isAuthenticated && (
        <div className="mt-4 border-t px-3 pt-4" style={{ borderColor: "rgba(8,127,105,0.12)" }}>
          <button
            type="button"
            onClick={() => void logout()}
            disabled={isConnecting}
            className="group flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition hover:bg-white/60 disabled:opacity-50"
            style={{ color: "#536471" }}
          >
            <LogOut className="h-4 w-4" style={{ color: "#8b98a5" }} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
