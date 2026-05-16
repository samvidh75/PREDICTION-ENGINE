import type {
  ChartProviderConnectionStatus,
  ChartSeriesKey,
  ChartSeriesProvider,
  ChartSeriesProviderEvent,
  ChartSeriesSubscriber,
} from "./ChartSeriesProvider";
import type { ChartSeries } from "../../../components/charts/chartTypes";

export class NullChartSeriesProvider implements ChartSeriesProvider {
  private status: ChartProviderConnectionStatus = "offline";
  private subscribers: Set<ChartSeriesSubscriber> = new Set();

  subscribe(fn: ChartSeriesSubscriber): () => void {
    this.subscribers.add(fn);

    // Notify immediately so UI can show “offline” / skeleton state.
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
    // Remain offline (no fake live series).
    this.publishStatus("offline");
  }

  stop(): void {
    this.publishStatus("offline");
  }

  requestSeries(key: ChartSeriesKey): void {
    // Explicitly emit an empty series so subscribers can render skeleton/offline.
    // (Actual live provider will override this with real candles + timestamps.)
    const empty: ChartSeries = { candles: [] };
    const ev: ChartSeriesProviderEvent = {
      type: "series_update",
      at: Date.now(),
      key,
      series: empty,
    };
    for (const fn of this.subscribers) fn(ev);
  }

  releaseSeries(_key: ChartSeriesKey): void {
    // No-op for offline provider.
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
