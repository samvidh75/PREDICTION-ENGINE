import type { WatchlistViewData } from "../routeDataContracts";

export function buildWatchlistViewModel(
  trackedCompanies: string[],
  categories: Record<string, string[]>
): WatchlistViewData {
  return {
    trackedCompanies,
    hasData: trackedCompanies.length > 0,
    categories,
  };
}
