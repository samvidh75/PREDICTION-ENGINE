import React from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Compass,
  Eye,
  FileText,
  GitCompare,
  Layers,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  links: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { currentView, MapsTo } = useNavigation();
  const { isAuthenticated, logout, isConnecting } = useAuth();

  const sections: NavSection[] = [
    {
      label: "Market",
      links: [
        { id: "terminal", label: "Market home", icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: "search", label: "Search", icon: <Search className="h-4 w-4" /> },
        { id: "discovery", label: "Discovery", icon: <Compass className="h-4 w-4" /> },
        { id: "daily-feed", label: "Daily feed", icon: <Newspaper className="h-4 w-4" /> },
      ],
    },
    {
      label: "Research",
      links: [
        { id: "analysis", label: "Analysis", icon: <BarChart3 className="h-4 w-4" /> },
        { id: "compare", label: "Compare", icon: <GitCompare className="h-4 w-4" /> },
        { id: "rankings", label: "Rankings", icon: <Trophy className="h-4 w-4" /> },
        { id: "leaderboard", label: "Leaderboard", icon: <Activity className="h-4 w-4" /> },
        { id: "academy", label: "Academy", icon: <BookOpen className="h-4 w-4" /> },
      ],
    },
    {
      label: "Portfolio",
      links: [
        { id: "portfolio", label: "Portfolio", icon: <Briefcase className="h-4 w-4" /> },
        { id: "watchlist", label: "Watchlist", icon: <Eye className="h-4 w-4" /> },
        { id: "alerts", label: "Alerts", icon: <Bell className="h-4 w-4" /> },
        { id: "portfolio-doctor", label: "Portfolio doctor", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "journal", label: "Prediction journal", icon: <FileText className="h-4 w-4" /> },
        { id: "workspace", label: "Workspace", icon: <Layers className="h-4 w-4" /> },
      ],
    },
    {
      label: "System",
      links: [
        { id: "trust", label: "Trust centre", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <aside className="ss-tv-neon-edge fixed bottom-0 left-0 top-18 z-40 hidden w-[240px] select-none flex-col justify-between border-r border-white/10 bg-[#080a0f]/92 py-6 backdrop-blur-xl md:flex">
      <nav className="flex-1 space-y-5 overflow-y-auto px-3">
        {sections.map((section) => (
          <div key={section.label}>
            <span className="mb-2 block px-3 font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#787b86]">
              {section.label}
            </span>
            <div className="space-y-1">
              {section.links.map((link) => {
                const isActive = currentView === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => MapsTo(link.id)}
                    className={`group flex h-10 w-full cursor-pointer items-center space-x-3 rounded-lg px-3 text-left text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[#2962ff]/16 font-semibold text-[#9bb5ff] shadow-[0_0_24px_rgba(41,98,255,0.12)]"
                        : "text-[#b2b5be] hover:bg-white/[0.055] hover:text-[#f0f3fa]"
                    }`}
                  >
                    <span
                      className={`transition-colors duration-150 ${
                        isActive ? "text-[#2962ff]" : "text-[#787b86] group-hover:text-[#b2b5be]"
                      }`}
                    >
                      {link.icon}
                    </span>
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isAuthenticated && (
        <div className="mt-4 border-t border-[#2a2e39] px-3 pt-4">
          <button
            type="button"
            onClick={() => void logout()}
            disabled={isConnecting}
            className="group flex h-11 w-full cursor-pointer items-center space-x-3 rounded-lg px-3 text-left text-[13px] font-medium text-[#b2b5be] transition-all hover:bg-[#1e222d] hover:text-[#f0f3fa] disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 text-white/40 group-hover:text-white/70" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
