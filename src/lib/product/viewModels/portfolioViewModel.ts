import type { PortfolioViewData } from "../routeDataContracts";

export function buildPortfolioViewModel(
  holdingsCount: number,
  isManualOnly: boolean
): PortfolioViewData {
  return {
    hasData: holdingsCount > 0,
    holdings: holdingsCount,
    isManualOnly,
  };
}
