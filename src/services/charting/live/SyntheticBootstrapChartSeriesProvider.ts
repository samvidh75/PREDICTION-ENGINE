import type {
  ChartProviderConnectionStatus,
  ChartSeriesKey,
  ChartSeriesProvider,
  ChartSeriesProviderEvent,
  ChartSeriesSubscriber,
} from "./ChartSeriesProvider";
import type { ChartSeries } from "../../../components/charts/chartTypes";
import { getSyntheticChartSeries } from "../../../components/charts/chartData";

const MARKET_SIMULATION_ENABLED = import.meta.env.VITE_MARKET_SIMULATION === "1";

export class SyntheticBootstrapChartSeriesProvider implements ChartSeriesProvider {
  private status: ChartProviderConnectionStatus = "offline";
  private subscribers: Set<ChartSeriesSubscriber> = new Set();

  subscribe(fn: ChartSeriesSubscriber): () => void {
    this.subscribers.add(fn);

    const ev: ChartSeriesProviderEvent = {
      type: "provider_status",
      at: Date.now(),
      status: this.status,
    };
    fn(ev);

    return () => {
      this.subscribers.delete(fn);
    };
  }

  getStatus(): ChartProviderConnectionStatus {
    return this.status;
  }

  start(): void {
    // Stay offline: this provider can only serve a deterministic bootstrap snapshot.
    this.publishStatus(this.status);
  }

  stop(): void {
    this.publishStatus(this.status);
  }

  requestSeries(key: ChartSeriesKey): void {
    // “No fake live data” rule:
    // - If simulation is disabled, we must not emit candles (remain empty/offline).
    // - If simulation is explicitly enabled, we emit a deterministic snapshot once.
    if (!MARKET_SIMULATION_ENABLED) {
      const ev: ChartSeriesProviderEvent = {
        type: "series_update",
        at: Date.now(),
        key,
        series: { candles: [] },
      };
      for (const fn of this.subscribers) fn(ev);
      return;
    }

    const series: ChartSeries = getSyntheticChartSeries(key.ticker, key.timeframe);

    const ev: ChartSeriesProviderEvent = {
      type: "series_update",
      at: Date.now(),
      key,
      series,
    };

    for (const fn of this.subscribers) fn(ev);
  }

  releaseSeries(_key: ChartSeriesKey): void {
    // No-op
  }

  private publishStatus(next: ChartProviderConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;

    const ev: ChartSeriesProviderEvent = {
      type: "provider_status",
      at: Date.now(),
      status: this.status,
    };

    for (const fn of this.subscribers) fn(ev);
  }
}
