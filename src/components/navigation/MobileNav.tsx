import React from "react";
import { BarChart3, Briefcase, Eye, Home, Info, LogIn, Settings, Sparkles } from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface MobileNavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

interface PublicMobileNavItem {
  page: "landing" | "about" | "rankings" | "predictions" | "login" | "signup";
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

  const isPublicMobile = !isAuthenticated || ["landing", "about", "rankings", "predictions", "login", "signup"].includes(currentPage);

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const handleNav = (id: ViewType) => MapsTo(id);

  const handlePublicNav = (page: PublicMobileNavItem["page"]) => setPage(page);

  const tabs: MobileNavItem[] = [
    { id: "dashboard", label: "Home", icon: <Home className="h-5 w-5" /> },
    { id: "watchlist", label: "Watching", icon: <Eye className="h-5 w-5" /> },
    { id: "rankings", label: "Research", icon: <Sparkles className="h-5 w-5" /> },
    { id: "portfolio", label: "Portfolio", icon: <Briefcase className="h-5 w-5" /> },
    { id: "settings", label: "Account", icon: <Settings className="h-5 w-5" /> },
  ];

  const publicTabs: PublicMobileNavItem[] = [
    { page: "landing", label: "Home", icon: <Home className="h-5 w-5" /> },
    { page: "rankings", label: "Research", icon: <Sparkles className="h-5 w-5" /> },
    { page: "predictions", label: "Signals", icon: <BarChart3 className="h-5 w-5" /> },
    { page: "about", label: "About", icon: <Info className="h-5 w-5" /> },
    { page: "login", label: "Sign in", icon: <LogIn className="h-5 w-5" /> },
  ];

  return (
    <nav className="ssi-bottom-nav md:hidden">
      {isPublicMobile
        ? publicTabs.map((tab) => {
            const isActive = currentPage === tab.page;
            return (
              <button
                key={tab.page}
                type="button"
                onClick={() => handlePublicNav(tab.page)}
                className={`ssi-bottom-tab ${isActive ? "active" : ""}`}
              >
                {tab.icon}
                <span className="max-w-[58px] truncate text-[10px] leading-tight">{tab.label}</span>
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
                className={`ssi-bottom-tab ${isActive ? "active" : ""}`}
              >
                {tab.icon}
                <span className="max-w-[58px] truncate text-[10px] leading-tight">{tab.label}</span>
              </button>
            );
          })}
    </nav>
  );
};

export default MobileNav;
