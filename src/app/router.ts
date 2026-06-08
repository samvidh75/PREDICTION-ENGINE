/**
 * Application router — URL parsing and route mapping.
 * Extracted from App.tsx for clean separation of concerns.
 */

export type PageKey =
  | "landing"
  | "about"
  | "login"
  | "signup"
  | "stock"
  | "company"
  | "explore"
  | "dashboard"
  | "search"
  | "portfolio"
  | "watchlist"
  | "alerts"
  | "discovery"
  | "brief"
  | "settings"
  | "academy"
  | "analysis"
  | "compare"
  | "journal"
  | "trust"
  | "methodology"
  | "validation"
  | "predictions"
  | "rankings"
  | "leaderboard"
  | "workspace"
  | "daily-feed"
  | "portfolio-doctor";

/** Maps query-param "page" values to canonical PageKey. */
export function getPageKeyFromUrl(): PageKey {
  if (typeof window === "undefined") return "landing";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "landing").toLowerCase().trim();

    const mapping: Record<string, PageKey> = {
      "landing": "landing",
      "about": "about",
      "login": "login",
      "signup": "signup",
      "company": "company",
      "stock": "company",
      "explore": "explore",
      "dashboard": "dashboard",
      "market": "dashboard",
      "search": "search",
      "portfolio": "portfolio",
      "watchlist": "watchlist",
      "alerts": "alerts",
      "discovery": "discovery",
      "brief": "brief",
      "settings": "settings",
      "academy": "academy",
      "analysis": "analysis",
      "compare": "compare",
      "journal": "journal",
      "trust": "trust",
      "workspace": "workspace",
      "daily-feed": "daily-feed",
      "portfolio-doctor": "portfolio-doctor",
    };

    return mapping[raw] ?? "landing";
  } catch {
    return "landing";
  }
}

/** Creates a stable route signature for animation/transition layering. */
export function getRouteSignatureFromUrl(): string {
  if (typeof window === "undefined") return "landing";

  try {
    const params = new URLSearchParams(window.location.search);
    const page = (params.get("page") ?? "landing").toLowerCase().trim();
    const kind = (params.get("kind") ?? "").trim();
    const id = (params.get("id") ?? "").trim();
    const q = (params.get("q") ?? "").trim();
    const searchOpen =
      params.get("search") === "1" ||
      params.get("search")?.toLowerCase() === "true";

    const searchSig = searchOpen ? `search:${q}` : "";

    if (page === "explore") return `explore:${kind}:${id}`;
    if (page === "search") return `search:${q}`;
    if (searchSig) return `${page}:${searchSig}`;

    return `page:${page}`;
  } catch {
    return "stock";
  }
}

/** Dispatch a urlchange event and ensure URL-sync listeners fire. */
export function notifyUrlChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("urlchange"));
}

/** Protected pages that require authentication. */
export const PROTECTED_PAGES: PageKey[] = [
  "dashboard", "search", "discovery", "stock", "company",
  "watchlist", "portfolio", "alerts", "settings",
];

/** Public pages that don't require authentication. */
export const PUBLIC_PAGES: PageKey[] = [
  "landing", "about", "login", "signup",
];

/** Check whether a stock/company ID is present in the URL. */
export function hasStockId(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("id");
}

/** Map a PageKey to a subsystem identifier for error boundaries. */
export function getRouteSubsystem(pageKey: PageKey): string {
  switch (pageKey) {
    case "landing": return "public_landing";
    case "about": return "public_about";
    case "login": return "public_login";
    case "signup": return "public_signup";
    case "stock": return "stock_story";
    case "explore": return "explore_discovery";
    case "dashboard": return "market_intelligence_dashboard";
    case "search": return "search_page";
    case "company": return "company_universe";
    case "portfolio": return "portfolio_page";
    case "watchlist": return "watchlist_page";
    default: return `route_${pageKey}`;
  }
}
