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
  | "dashboard"
  | "search"
  | "portfolio"
  | "watchlist"
  | "settings"
  | "trust"
  | "methodology"
  | "validation"
  | "predictions"
  | "rankings"
  | "compare";

/** Maps query-param "page" values to canonical PageKey. */
export function getPageKeyFromUrl(): PageKey {
  if (typeof window === "undefined") return "landing";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "landing").toLowerCase().trim();

    const mapping: Record<string, PageKey> = {
      landing: "landing",
      about: "about",
      login: "login",
      signup: "signup",
      company: "company",
      stock: "company",
      dashboard: "dashboard",
      market: "dashboard",
      search: "search",
      portfolio: "portfolio",
      watchlist: "watchlist",
      settings: "settings",
      methodology: "methodology",
      trust: "methodology",
      validation: "methodology",
      predictions: "predictions",
      rankings: "rankings",
      compare: "compare",
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
    const id = (params.get("id") ?? "").trim();
    const q = (params.get("q") ?? "").trim();

    if (page === "search") return `search:${q}`;
    if (id) return `${page}:${id}`;
    return `page:${page}`;
  } catch {
    return "landing";
  }
}

/** Dispatch a urlchange event and ensure URL-sync listeners fire. */
export function notifyUrlChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("urlchange"));
}

/** Protected pages that require authentication. */
export const PROTECTED_PAGES: PageKey[] = [
  "dashboard", "search", "stock", "company",
  "watchlist", "portfolio", "settings",
];

/** Public pages that don't require authentication. */
export const PUBLIC_PAGES: PageKey[] = [
  "landing", "about", "login", "signup", "methodology",
  "rankings", "compare",
];

/**
 * Sanitize a returnTo URL for safe post-auth redirect.
 * Only allows internal relative query-param paths (e.g. "?page=stock&id=RELIANCE").
 * Rejects any URL with a protocol, hostname, or absolute path.
 * Returns null for unsafe/invalid URLs.
 */
export function sanitizeReturnTo(returnTo: string | null): string | null {
  if (!returnTo || typeof returnTo !== "string") return null;
  const trimmed = returnTo.trim();
  if (!trimmed.startsWith("?")) return null;
  if (trimmed.toLowerCase().includes("http:") || trimmed.toLowerCase().includes("https:")) return null;
  if (trimmed.startsWith("//")) return null;
  if (/[\s<>"'()@]/.test(trimmed)) return null;
  // Ensure only valid query param characters
  const queryPart = trimmed.slice(1);
  if (!/^[a-zA-Z0-9&=._~%+-]+$/.test(queryPart)) return null;
  return trimmed;
}

/**
 * Get a human-readable context message for the auth page based on the returnTo URL.
 */
export function getReturnToContext(returnTo: string | null): string | null {
  if (!returnTo) return null;
  try {
    const params = new URLSearchParams(returnTo.replace(/^\?/, ""));
    const targetPage = params.get("page");
    const symbol = params.get("id") || params.get("symbol");
    if (targetPage === "company" || targetPage === "stock") {
      return symbol ? `Sign in to open research for ${symbol.toUpperCase()}.` : "Sign in to open this research view.";
    }
    if (targetPage === "portfolio") return "Sign in to view your portfolio.";
    if (targetPage === "watchlist") return "Sign in to manage your watchlist.";
    if (targetPage === "dashboard") return "Sign in to access your dashboard.";
    return "Sign in to continue using StockStory India.";
  } catch {
    return null;
  }
}

/** Check whether a stock/company ID is present in the URL.
 * Supports multiple parameter name aliases used across the codebase:
 *   id, symbol, ticker, companyId
 */
export function hasStockId(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("id") || params.has("symbol") || params.has("ticker") || params.has("companyId");
}

/** Get the stock/company identifier from URL, normalizing across param aliases. */
export function getStockTicker(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") ?? params.get("symbol") ?? params.get("ticker") ?? params.get("companyId") ?? "").toUpperCase().trim();
}

/** Map a PageKey to a subsystem identifier for error boundaries. */
export function getRouteSubsystem(pageKey: PageKey): string {
  switch (pageKey) {
    case "landing": return "public_landing";
    case "about": return "public_about";
    case "login": return "public_login";
    case "signup": return "public_signup";
    case "stock":
    case "company": return "stock_story";
    case "dashboard": return "market_intelligence_dashboard";
    case "search": return "search_page";
    case "portfolio": return "portfolio_page";
    case "watchlist": return "watchlist_page";
    default: return `route_${pageKey}`;
  }
}
