import type { DashboardViewData } from "../routeDataContracts";

export function buildDashboardViewModel(
  recentCompanies: string[],
  trackedCompanies: Array<{ symbol: string; companyName: string; score: number | null }>,
  signals: Array<{ symbol: string; type: string; severity: "critical" | "important" | "monitor"; explanation: string }>,
  hasWatchlist: boolean,
  hasPortfolio: boolean,
  hasAlerts: boolean
): DashboardViewData {
  return {
    searchQuery: "",
    recentCompanies: recentCompanies.slice(0, 6),
    trackedCompanies: trackedCompanies.slice(0, 8).map((c) => ({
      symbol: c.symbol,
      companyName: c.companyName || "",
      score: typeof c.score === "number" && Number.isFinite(c.score) ? Math.round(c.score) : null,
    })),
    signals: signals.slice(0, 5),
    hasWatchlist,
    hasPortfolio,
    hasAlerts,
  };
}
