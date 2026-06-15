import React, { createContext, useContext, useEffect, useState } from "react";

export type ViewType =
  | "terminal"
  | "search"
  | "rankings"
  | "portfolio"
  | "watchlist"
  | "trust"
  | "settings";

export type LayoutContextType = {
  currentView: ViewType;
  validViews: ViewType[];
  MapsTo: (targetView: ViewType) => void;
};

export const VIEW_TO_PAGE: Record<ViewType, string> = {
  terminal: "dashboard",
  search: "search",
  rankings: "rankings",
  portfolio: "portfolio",
  watchlist: "watchlist",
  trust: "methodology",
  settings: "settings",
};

export const NAVIGATION_VIEWS = Object.keys(VIEW_TO_PAGE) as ViewType[];

const PAGE_TO_VIEW: Record<string, ViewType> = {
  market: "terminal",
  dashboard: "terminal",
  explore: "terminal",
  discovery: "terminal",
  search: "search",
  rankings: "rankings",
  portfolio: "portfolio",
  watchlist: "watchlist",
  trust: "trust",
  methodology: "trust",
  validation: "trust",
  settings: "settings",
};

export function mapViewToPage(view: ViewType): string {
  return VIEW_TO_PAGE[view];
}

export function mapPageToView(page: string | null): ViewType {
  const normalized = (page ?? "dashboard").toLowerCase().trim();
  return PAGE_TO_VIEW[normalized] ?? "terminal";
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>("terminal");
  const validViews = NAVIGATION_VIEWS;

  const MapsTo = (targetView: ViewType) => {
    if (!validViews.includes(targetView)) return;

    const pageKey = mapViewToPage(targetView);
    const url = new URL(window.location.href);
    url.searchParams.set("page", pageKey);

    ["id", "symbol", "ticker", "companyId"].forEach((param) => {
      url.searchParams.delete(param);
    });

    if (pageKey !== "search") {
      url.searchParams.delete("q");
    }

    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new Event("urlchange"));
  };

  const syncViewWithUrl = () => {
    const params = new URLSearchParams(window.location.search);
    setCurrentView(mapPageToView(params.get("page")));
  };

  useEffect(() => {
    syncViewWithUrl();
    window.addEventListener("urlchange", syncViewWithUrl);
    window.addEventListener("popstate", syncViewWithUrl);
    return () => {
      window.removeEventListener("urlchange", syncViewWithUrl);
      window.removeEventListener("popstate", syncViewWithUrl);
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
