import React from "react";
import { LayoutDashboard, Search, Compass, Briefcase, Eye, Bell, Settings, LogOut } from "lucide-react";
import { useNavigation, ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  id: ViewType | "search";
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { currentView, MapsTo } = useNavigation();
  const { isAuthenticated, logout, isConnecting } = useAuth();

  const links: NavItem[] = [
    { id: "terminal", label: "Home", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "search", label: "Search", icon: <Search className="w-4 h-4" /> },
    { id: "discovery", label: "Discovery", icon: <Compass className="w-4 h-4" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="w-4 h-4" /> },
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="w-4 h-4" /> },
    { id: "alerts", label: "Alerts", icon: <Bell className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (id: ViewType | "search") => {
    if (id === "search") {
      window.dispatchEvent(new Event("ss:open-search"));
      return;
    }
    MapsTo(id);
  };

  return (
    <aside className="w-[240px] fixed top-18 bottom-0 left-0 bg-[#0f0f0f] border-r border-[#2a2e39] flex flex-col justify-between py-6 z-40 hidden md:flex select-none">
      <nav className="flex-1 space-y-1.5 px-3 overflow-y-auto">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#787b86] px-3 block mb-3 font-sans">Menu</span>
        {links.map(link => {
          const isActive = link.id === "search" ? false : currentView === link.id;
          return (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`group w-full h-11 px-3 flex items-center space-x-3 text-[13px] font-medium transition-all duration-150 rounded-lg text-left cursor-pointer ${
                isActive 
                  ? "bg-[#2962ff]/15 text-[#7da0ff] font-semibold" 
                  : "text-[#b2b5be] hover:bg-[#1e222d] hover:text-[#f0f3fa]"
              }`}
            >
              <span className={`transition-colors duration-150 ${
                isActive ? "text-[#2962ff]" : "text-[#787b86] group-hover:text-[#b2b5be]"
              }`}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      {isAuthenticated && (
        <div className="px-3 border-t border-[#2a2e39] pt-4">
          <button
            onClick={() => void logout()}
            disabled={isConnecting}
            className="group w-full h-11 px-3 flex items-center space-x-3 text-[13px] font-medium text-[#b2b5be] hover:bg-[#1e222d] hover:text-[#f0f3fa] transition-all rounded-lg text-left disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-white/40 group-hover:text-white/70" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
