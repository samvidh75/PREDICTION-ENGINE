import React from "react";
import { LayoutDashboard, Compass, Briefcase, Eye, Bell, Settings, LogOut } from "lucide-react";
import { useNavigation, ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

export const Sidebar: React.FC = () => {
  const { currentView, MapsTo } = useNavigation();
  const { isAuthenticated, logout, isConnecting } = useAuth();

  const primaryLinks: NavItem[] = [
    { id: "terminal", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "discovery", label: "Discover", icon: <Compass className="w-4 h-4" /> },
  ];

  const investorLinks: NavItem[] = [
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="w-4 h-4" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="w-4 h-4" /> },
    { id: "alerts", label: "Alerts", icon: <Bell className="w-4 h-4" /> },
  ];

  const secondaryLinks: NavItem[] = [];

  const renderSection = (title: string, links: NavItem[]) => (
    <div className="mb-4">
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 px-4 block mb-2 font-mono">{title}</span>
      {links.map(link => {
        const isActive = currentView === link.id;
        return (
          <button
            key={link.id}
            onClick={() => MapsTo(link.id)}
            className="group w-full h-10 px-4 flex items-center space-x-3 text-[12px] tracking-wide font-medium text-white/50 transition-all duration-200 ease-out hover:bg-white/5 hover:text-white relative text-left"
          >
            {/* Active indicator */}
            <div
              className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#06B6D4] transition-all duration-200 transform ${
                isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
              }`}
            />
            <span className={`transition-colors duration-200 ${
              isActive ? "text-[#06B6D4]" : "text-white/40 group-hover:text-white/75"
            }`}>
              {link.icon}
            </span>
            <span className={`transition-colors duration-200 ${isActive ? "text-white font-semibold" : ""}`}>
              {link.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className="w-65 fixed top-18 bottom-0 left-0 bg-[#020304] border-r border-white/5 flex flex-col justify-between py-6 z-40 hidden md:flex select-none">
      <nav className="flex-1 space-y-2 px-2 overflow-y-auto">
        {renderSection("Intelligence", primaryLinks)}
        {renderSection("Investor", investorLinks)}
        {secondaryLinks.length > 0 && renderSection("Tools", secondaryLinks)}
      </nav>

      {/* Settings at bottom */}
      <div className="px-2 border-t border-white/5 pt-4">
        <button
          onClick={() => MapsTo("settings")}
          className={`group w-full h-10 px-4 flex items-center space-x-3 text-[12px] tracking-wide font-medium transition-all duration-200 ease-out hover:bg-white/5 relative text-left ${
            currentView === "settings" ? "text-white font-semibold" : "text-white/50"
          }`}
        >
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#06B6D4] transition-all duration-200 transform ${
              currentView === "settings" ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
            }`}
          />
          <Settings className={`w-4 h-4 transition-colors duration-200 ${
            currentView === "settings" ? "text-[#06B6D4]" : "text-white/40 group-hover:text-white/75"
          }`} />
          <span>Settings</span>
        </button>
        {isAuthenticated && (
          <button
            onClick={() => void logout()}
            disabled={isConnecting}
            className="group w-full h-10 px-4 flex items-center space-x-3 text-[12px] tracking-wide font-medium transition-all duration-200 ease-out hover:bg-white/5 relative text-left text-white/50 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 text-white/40 group-hover:text-white/75" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
