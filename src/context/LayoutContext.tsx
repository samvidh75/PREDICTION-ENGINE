import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../hooks/auth/useAuth";

export type ViewType = "terminal" | "discovery" | "portfolio" | "watchlist" | "alerts" | "settings";

export type LayoutContextType = {
  currentView: ViewType;
  validViews: ViewType[];
  MapsTo: (targetView: ViewType) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("terminal");

  const validViews: ViewType[] = ["terminal", "discovery", "portfolio", "watchlist", "alerts", "settings"];

  const MapsTo = (targetView: ViewType) => {
    if (validViews.includes(targetView)) {
      let pageKey = "dashboard";
      if (targetView === "terminal") pageKey = "dashboard";
      else if (targetView === "discovery") pageKey = "discovery";
      else if (targetView === "portfolio") pageKey = "portfolio";
      else if (targetView === "watchlist") pageKey = "watchlist";
      else if (targetView === "alerts") pageKey = "alerts";
      else if (targetView === "settings") pageKey = "settings";

      const url = new URL(window.location.href);
      url.searchParams.set("page", pageKey);
      if (pageKey !== "stock" && pageKey !== "explore") {
        url.searchParams.delete("id");
      }

      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new Event("urlchange"));
    }
  };

  const syncViewWithUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    
    if (page === 'dashboard' || page === 'market') setCurrentView('terminal');
    else if (page === 'discovery') setCurrentView('discovery');
    else if (page === 'portfolio') setCurrentView('portfolio');
    else if (page === 'watchlist') setCurrentView('watchlist');
    else if (page === 'alerts') setCurrentView('alerts');
    else if (page === 'settings') setCurrentView('settings');
    else setCurrentView('terminal');
  };

  useEffect(() => {
    syncViewWithUrl();
    window.addEventListener('urlchange', syncViewWithUrl);
    window.addEventListener('popstate', syncViewWithUrl);
    return () => {
      window.removeEventListener('urlchange', syncViewWithUrl);
      window.removeEventListener('popstate', syncViewWithUrl);
    };
  }, []);

  return (
    <LayoutContext.Provider value={{ currentView, validViews, MapsTo }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useNavigation = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a LayoutProvider");
  }
  return context;
};
