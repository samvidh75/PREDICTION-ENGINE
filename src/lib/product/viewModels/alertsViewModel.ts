import type { AlertsViewData } from "../routeDataContracts";

export function buildAlertsViewModel(
  alertCount: number,
  categories: string[]
): AlertsViewData {
  return {
    hasData: alertCount > 0,
    alertCount,
    categories,
  };
}
