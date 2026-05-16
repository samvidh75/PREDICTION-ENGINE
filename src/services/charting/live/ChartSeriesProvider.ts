import type { ChartSeries, ChartTimeframe } from "../../../components/charts/chartTypes";

export type ChartProviderConnectionStatus = "offline" | "connecting" | "connected" | "reconnecting";

export type ChartSeriesKey = {
  ticker: string;
  timeframe: ChartTimeframe;
};

export type ChartSeriesStatus = {
  status: ChartProviderConnectionStatus;
  lastUpdatedAt: number | null;
  // When provider cannot supply live data, we may still serve cached series.
  canServeCached: boolean;
};

export type ChartSeriesProviderEvent =
  | {
      type: "series_update";
      at: number;
      key: ChartSeriesKey;
      series: ChartSeries;
    }
  | {
      type: "provider_status";
      at: number;
      status: ChartProviderConnectionStatus;
    };

export type ChartSeriesSubscriber = (ev: ChartSeriesProviderEvent) => void;

export interface ChartSeriesProvider {
  subscribe(fn: ChartSeriesSubscriber): () => void;

  getStatus(): ChartProviderConnectionStatus;

  start(): void;
  stop(): void;

  /**
   * Hint that a given series is needed; provider can decide to start fetching/pushing.
   * (No polling required in initial version; we’ll keep it architecture-compatible.)
   */
  requestSeries(key: ChartSeriesKey): void;

  /**
   * Hint that a given series is no longer needed by active components.
   */
  releaseSeries(key: ChartSeriesKey): void;
}
