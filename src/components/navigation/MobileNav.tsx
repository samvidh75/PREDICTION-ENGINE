import React from "react";
import { ArrowLeftRight, BarChart3, Eye, Home, Info, LogIn, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useNavigation, type ViewType } from "../../context/LayoutContext";
import { useAuth } from "../../context/AuthContext";

interface MobileNavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

interface PublicMobileNavItem {
  page: "landing" | "about" | "rankings" | "predictions" | "trust" | "login" | "signup";
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

  const isPublicMobile = !isAuthenticated || ["landing", "about", "rankings", "predictions", "trust", "login", "signup"].includes(currentPage);

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
    { id: "dashboard", label: "Home", icon: <Home className="icon-nav" /> },
    { id: "search", label: "Search", icon: <Search className="icon-nav" /> },
    { id: "rankings", label: "Rankings", icon: <Sparkles className="icon-nav" /> },
    { id: "watchlist", label: "Watchlist", icon: <Eye className="icon-nav" /> },
    { id: "portfolio", label: "Portfolio", icon: <TrendingUp className="icon-nav" /> },
  ];

  // Compare uses URL navigation since ViewType doesn't include it
  const compareRoute = { id: "compare" as const, label: "Compare", icon: <ArrowLeftRight className="icon-nav" /> };
  const trustRoute = { id: "trust" as const, label: "Trust", icon: <ShieldCheck className="icon-nav" /> };

  const publicTabs: PublicMobileNavItem[] = [
    { page: "landing", label: "Home", icon: <Home className="icon-nav" /> },
    { page: "rankings", label: "Rankings", icon: <Sparkles className="icon-nav" /> },
    { page: "predictions", label: "Signals", icon: <BarChart3 className="icon-nav" /> },
    { page: "trust", label: "Trust", icon: <ShieldCheck className="icon-nav" /> },
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
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNav(tab.id)}
                className={`bottom-tab ${isActive ? "bottom-tab-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button
            key={compareRoute.id}
            type="button"
            onClick={() => setPage("compare")}
            className={`bottom-tab ${currentPage === "compare" ? "bottom-tab-active" : ""}`}
            aria-current={currentPage === "compare" ? "page" : undefined}
          >
            {compareRoute.icon}
            <span>{compareRoute.label}</span>
          </button>
          <button
            key={trustRoute.id}
            type="button"
            onClick={() => setPage("trust")}
            className={`bottom-tab ${currentPage === "trust" ? "bottom-tab-active" : ""}`}
            aria-current={currentPage === "trust" ? "page" : undefined}
          >
            {trustRoute.icon}
            <span>{trustRoute.label}</span>
          </button>
          </>)}
    </nav>
  );
};

export default MobileNav;
