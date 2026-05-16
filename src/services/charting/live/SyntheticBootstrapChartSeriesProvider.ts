import type {
  ChartProviderConnectionStatus,
  ChartSeriesKey,
  ChartSeriesProvider,
  ChartSeriesProviderEvent,
  ChartSeriesSubscriber,
} from "./ChartSeriesProvider";
import type { ChartSeries } from "../../../components/charts/chartTypes";
import { getSyntheticChartSeries } from "../../../components/charts/chartData";

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
    // Stay offline: this is a single deterministic snapshot bootstrap.
    this.publishStatus(this.status);
  }

  stop(): void {
    this.publishStatus(this.status);
  }

  requestSeries(key: ChartSeriesKey): void {
    // Deterministic snapshot (no live movement updates).
    // We intentionally keep the provider "offline" to avoid implying live market activity.
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
    // No resources held; no-op.
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
