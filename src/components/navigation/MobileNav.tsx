import React from "react";
import { ArrowLeftRight, BookOpen, Eye, Home, Info, LogIn, Search, Sparkles, TrendingUp, Activity } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface MobileNavItem {
  page: "dashboard" | "search" | "rankings" | "watchlist" | "portfolio" | "compare" | "alerts" | "methodology";
  label: string;
  icon: React.ReactNode;
}

interface PublicMobileNavItem {
  page: "landing" | "about" | "rankings" | "login" | "signup" | "scanner";
  label: string;
  icon: React.ReactNode;
}

export const MobileNav: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const currentPage = (() => {
    if (typeof window === "undefined") return "landing";
    return new URLSearchParams(window.location.search).get("page") ?? "landing";
  })();

  const isPublicMobile = !isAuthenticated || ["landing", "about", "rankings", "login", "signup"].includes(currentPage);

  const setPage = (pageKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", pageKey);
    params.delete("id");
    window.history.pushState({}, "", `?${params.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  const handlePublicNav = (page: PublicMobileNavItem["page"]) => setPage(page);

  const tabs: MobileNavItem[] = [
    { page: "dashboard", label: "Home", icon: <Home className="icon-nav" /> },
    { page: "search", label: "Search", icon: <Search className="icon-nav" /> },
    { page: "rankings", label: "Rankings", icon: <Sparkles className="icon-nav" /> },
    { page: "watchlist", label: "Watchlist", icon: <Eye className="icon-nav" /> },
    { page: "portfolio", label: "Portfolio", icon: <TrendingUp className="icon-nav" /> },
  ];

  const compareRoute = { page: "compare" as const, label: "Compare", icon: <ArrowLeftRight className="icon-nav" /> };
  const alertsRoute = { page: "alerts" as const, label: "Alerts", icon: <Activity className="icon-nav" /> };

  const publicTabs: PublicMobileNavItem[] = [
    { page: "landing", label: "Home", icon: <Home className="icon-nav" /> },
    { page: "scanner", label: "Scanner", icon: <Search className="icon-nav" /> },
    { page: "about", label: "Product", icon: <Info className="icon-nav" /> },
    { page: "login", label: "Sign in", icon: <LogIn className="icon-nav" /> },
  ];

  return (
    <nav className="bottom-nav md:hidden" aria-label="Mobile navigation">
      {isPublicMobile
        ? publicTabs.map((tab) => {
            const isActive = currentPage === tab.page;
            return (
              <button
                key={tab.page}
                type="button"
                onClick={() => handlePublicNav(tab.page)}
                className={`bottom-tab ${isActive ? "bottom-tab-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })
        : (<>{tabs.map((tab) => {
            const isActive = currentPage === tab.page;
            return (
              <button
                key={tab.page}
                type="button"
                onClick={() => setPage(tab.page)}
                className={`bottom-tab ${isActive ? "bottom-tab-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button
            key="compare"
            type="button"
            onClick={() => setPage("compare")}
            className={`bottom-tab ${currentPage === "compare" ? "bottom-tab-active" : ""}`}
            aria-current={currentPage === "compare" ? "page" : undefined}
          >
            {compareRoute.icon}
            <span>{compareRoute.label}</span>
          </button>
          <button
            key="alerts"
            type="button"
            onClick={() => setPage("alerts")}
            className={`bottom-tab ${currentPage === "alerts" ? "bottom-tab-active" : ""}`}
            aria-current={currentPage === "alerts" ? "page" : undefined}
          >
            {alertsRoute.icon}
            <span>{alertsRoute.label}</span>
          </button>
          </>)}
    </nav>
  );
};

export default MobileNav;