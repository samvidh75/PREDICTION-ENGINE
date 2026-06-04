import type { ChartTimeframe } from "../components/charts/chartTypes";
import { chartSeriesStore } from "../services/charting/live/chartSeriesStore";

const DEFAULT_PREFETCH_TIMEFRAME: ChartTimeframe = "1M";

export type PrefetchForStockArgs = {
  ticker: string;
  timeframe?: ChartTimeframe;
};

/**
 * RoutePrefetchController
 * - centralized prefetch triggers for navigation continuity
 * - keeps it intentionally small: charts only (series store already isolates + throttles)
 */
export function prefetchForStock(args: PrefetchForStockArgs): void {
  const raw = args.ticker?.toUpperCase().trim();
  if (!raw) return;

  const timeframe = args.timeframe ?? DEFAULT_PREFETCH_TIMEFRAME;
  chartSeriesStore.prefetch({ ticker: raw, timeframe });
}
