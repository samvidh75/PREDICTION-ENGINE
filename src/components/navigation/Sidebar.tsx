import React from "react";
import {
  LayoutDashboard,
  Search,
  Trophy,
  Eye,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

const sidebarGlass = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRight: '1px solid rgba(255,255,255,0.5)',
};

export const Sidebar: React.FC = () => {
  const { currentView, MapsTo } = useNavigation();
  const { isAuthenticated, logout, isConnecting } = useAuth();

  const links: NavItem[] = [
    { id: "dashboard" as ViewType, label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "search", label: "Search", icon: <Search className="h-4 w-4" /> },
    { id: "rankings", label: "Rankings", icon: <Trophy className="h-4 w-4" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="h-4 w-4" /> },
    { id: "trust", label: "Research", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <aside style={sidebarGlass} className="fixed bottom-0 left-0 top-[60px] z-40 hidden w-[220px] select-none flex-col justify-between py-4 md:flex">
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {links.map((link) => {
          const isActive = currentView === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => MapsTo(link.id)}
              className={`group flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition ${
isActive
                    ? "bg-accent-primary text-white shadow-sm"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
              }`}
            >
              <span className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      {isAuthenticated && (
        <div className="mt-4 border-t border-white/30 px-3 pt-4">
          <button
            type="button"
            onClick={() => void logout()}
            disabled={isConnecting}
            className="group flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium text-slate-500 hover:bg-white/60 hover:text-slate-900 disabled:opacity-50 transition"
          >
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
