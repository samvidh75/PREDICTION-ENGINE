import React from "react";
import {
  LayoutDashboard,
  Search,
  Trophy,
  Eye,
  ShieldCheck,
  Settings,
  LogIn,
  UserPlus,
  Home,
  Info
} from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface MobileNavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

interface PublicMobileNavItem {
  page: "landing" | "about" | "login" | "signup";
  label: string;
  icon: React.ReactNode;
}

export const MobileNav: React.FC = () => {
  const { currentView, MapsTo } = useNavigation();
  const { isAuthenticated } = useAuth();

  const currentPage = (() => {
    if (typeof window === "undefined") return "landing";
    return new URLSearchParams(window.location.search).get("page") ?? "landing";
  })();

  const isPublicMobile = !isAuthenticated || ["landing", "about", "login", "signup"].includes(currentPage);

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const handleNav = (id: ViewType) => {
    MapsTo(id);
  };

  const handlePublicNav = (page: PublicMobileNavItem["page"]) => {
    setPage(page);
  };

  const tabs: MobileNavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "search", label: "Search", icon: <Search className="h-5 w-5" /> },
    { id: "rankings", label: "Rankings", icon: <Trophy className="h-5 w-5" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="h-5 w-5" /> },
    { id: "trust", label: "Method", icon: <ShieldCheck className="h-5 w-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
  ];

  const publicTabs: PublicMobileNavItem[] = [
    { page: "landing", label: "Home", icon: <Home className="h-5 w-5" /> },
    { page: "about", label: "About", icon: <Info className="h-5 w-5" /> },
    { page: "login", label: "Sign in", icon: <LogIn className="h-5 w-5" /> },
    { page: "signup", label: "Create", icon: <UserPlus className="h-5 w-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] flex h-16 items-center justify-around border-t border-slate-200 bg-white px-2 md:hidden">
      {isPublicMobile
        ? publicTabs.map((tab) => {
            const isActive = currentPage === tab.page;
            return (
              <button
                key={tab.page}
                type="button"
                onClick={() => handlePublicNav(tab.page)}
                className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-all ${
                  isActive ? "text-emerald-800" : "text-slate-500"
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })
        : tabs.map((tab) => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNav(tab.id)}
                className={`flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-all ${
                  isActive ? "text-emerald-800" : "text-slate-500"
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
    </div>
  );
};

export default MobileNav;
