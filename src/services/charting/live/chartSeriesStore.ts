import type { ChartSeries } from "../../../components/charts/chartTypes";
import type {
  ChartProviderConnectionStatus,
  ChartSeriesKey,
  ChartSeriesProvider,
  ChartSeriesProviderEvent,
  ChartSeriesSubscriber,
} from "./ChartSeriesProvider";
import { SyntheticBootstrapChartSeriesProvider } from "./SyntheticBootstrapChartSeriesProvider";
import { NullChartSeriesProvider } from "./NullChartSeriesProvider";

export type ChartSeriesSnapshot = {
  series: ChartSeries;
  status: ChartProviderConnectionStatus;
  lastUpdatedAt: number | null;
};

function keyToId(key: ChartSeriesKey): string {
  return `${key.ticker}::${key.timeframe}`;
}

class ChartSeriesStore {
  private provider: ChartSeriesProvider;

  private providerStatus: ChartProviderConnectionStatus = "offline";

  private seriesById: Map<string, ChartSeriesSnapshot> = new Map();

  getStatus(): ChartProviderConnectionStatus {
    return this.providerStatus;
  }

  private subscribersById: Map<string, Set<(snap: ChartSeriesSnapshot) => void>> = new Map();
  private refCountById: Map<string, number> = new Map();

  private started = false;

  constructor(args?: { provider?: ChartSeriesProvider }) {
    this.provider = args?.provider ?? new NullChartSeriesProvider();

    this.provider.subscribe((ev: ChartSeriesProviderEvent) => {
      if (ev.type === "provider_status") {
        this.providerStatus = ev.status;
        this.notifyAll();
        return;
      }

      if (ev.type === "series_update") {
        const id = keyToId(ev.key);
        const prev = this.seriesById.get(id);

        const next: ChartSeriesSnapshot = {
          series: ev.series,
          status: this.providerStatus,
          lastUpdatedAt: ev.at,
        };

        // Avoid notifying if nothing changed.
        // (Shallow compare by reference; providers should replace arrays when data changes.)
        if (prev && prev.series === next.series && prev.status === next.status && prev.lastUpdatedAt === next.lastUpdatedAt) {
          return;
        }

        this.seriesById.set(id, next);
        this.notifyOne(id, next);
      }
    });
  }

  subscribe(key: ChartSeriesKey, fn: (snap: ChartSeriesSnapshot) => void): () => void {
    const id = keyToId(key);

    const set = this.subscribersById.get(id) ?? new Set();
    set.add(fn);
    this.subscribersById.set(id, set);

    const count = (this.refCountById.get(id) ?? 0) + 1;
    this.refCountById.set(id, count);

    const existing = this.seriesById.get(id);
    if (!existing) {
      const initial: ChartSeriesSnapshot = {
        series: { candles: [] },
        status: this.providerStatus,
        lastUpdatedAt: null,
      };
      this.seriesById.set(id, initial);
    }

    // Immediate callback.
    fn(this.seriesById.get(id)!);

    // Request series once series is needed.
    this.ensureStarted();
    this.provider.requestSeries(key);

    return () => {
      const nextCount = (this.refCountById.get(id) ?? 1) - 1;
      if (nextCount <= 0) {
        this.refCountById.delete(id);
        this.subscribersById.delete(id);

        // Release only when no more consumers exist for this series key.
        // We keep this conservative: it may reduce polling in real provider.
        this.provider.releaseSeries(key);
      } else {
        this.refCountById.set(id, nextCount);
        const nextSet = this.subscribersById.get(id);
        nextSet?.delete(fn);
      }

      this.maybeStop();
    };
  }

  private ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    this.provider.start();
  }

  private maybeStop(): void {
    if (this.refCountById.size > 0) return;
    if (!this.started) return;
    this.started = false;
    this.provider.stop();
  }

  private notifyOne(id: string, snap: ChartSeriesSnapshot): void {
    const set = this.subscribersById.get(id);
    if (!set) return;
    for (const fn of set) fn(snap);
  }

  private notifyAll(): void {
    for (const [id, set] of this.subscribersById.entries()) {
      const snap = this.seriesById.get(id);
      if (!snap) continue;

      // Update status in snapshot only.
      const next: ChartSeriesSnapshot =
        snap.status === this.providerStatus
          ? snap
          : {
              ...snap,
              status: this.providerStatus,
            };

      if (next !== snap) this.seriesById.set(id, next);
      for (const fn of set) fn(this.seriesById.get(id)!);
    }
  }
}

export const chartSeriesStore = new ChartSeriesStore({ provider: new SyntheticBootstrapChartSeriesProvider() });
