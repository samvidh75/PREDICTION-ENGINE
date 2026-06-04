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
import { getCadenceForChart, chartRequestCoordinator, getChartPriority, type ChartCadence } from "../../realtime/chartRealtimeOrchestrator";
import { backgroundThrottleController } from "../../realtime/backgroundThrottleController";

const MARKET_SIMULATION_ENABLED = import.meta.env.VITE_MARKET_SIMULATION === "1";

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

  // stale-while-offline fallback:
  // When the provider emits empty series (offline), serve the last non-empty series briefly.
  private lastNonEmptyById: Map<string, { series: ChartSeries; lastUpdatedAt: number }> = new Map();

  // Maximum time we will keep serving stale data.
  private readonly STALE_MAX_MS = 30_000;

  // When a series is subscribed/needed, we may still revalidate in the background,
  // but we must avoid API/push storms.
  // (The exact cadence is now route+focus+background-aware via ChartRealtimeOrchestrator.)
  private readonly NOTIFY_BATCH_MIN_MS = 450;
  private notifyTimeoutById: Map<string, number> = new Map();
  private pendingSnapById: Map<string, ChartSeriesSnapshot> = new Map();

  private subscribersById: Map<string, Set<(snap: ChartSeriesSnapshot) => void>> = new Map();
  private refCountById: Map<string, number> = new Map();

  private started = false;

  private prefetchStopTimeoutId: number | null = null;

  // Track request pacing per series key.
  private lastRevalidateAtById: Map<string, number> = new Map();
  private revalidateTimeoutById: Map<string, number> = new Map();

  constructor(args?: { provider?: ChartSeriesProvider }) {
    this.provider =
      args?.provider ??
      (MARKET_SIMULATION_ENABLED
        ? new SyntheticBootstrapChartSeriesProvider()
        : new NullChartSeriesProvider());

    this.provider.subscribe((ev: ChartSeriesProviderEvent) => {
      if (ev.type === "provider_status") {
        this.providerStatus = ev.status;
        this.notifyAll();
        return;
      }

      if (ev.type === "series_update") {
        const id = keyToId(ev.key);
        const prev = this.seriesById.get(id);

        // Track last non-empty series for stale-while-offline fallback.
        if (ev.series.candles.length > 0) {
          this.lastNonEmptyById.set(id, { series: ev.series, lastUpdatedAt: ev.at });
        }

        const effective = this.applyStaleFallback({
          id,
          incomingSeries: ev.series,
          incomingAt: ev.at,
        });

        const next: ChartSeriesSnapshot = {
          series: effective.series,
          status: this.providerStatus,
          lastUpdatedAt: effective.at,
        };

        // Avoid notifying if nothing changed.
        if (prev && prev.series === next.series && prev.status === next.status && prev.lastUpdatedAt === next.lastUpdatedAt) {
          return;
        }

        this.seriesById.set(id, next);
        this.notifyOne(id, next);
      }
    });
  }

  getStatus(): ChartProviderConnectionStatus {
    return this.providerStatus;
  }

  private getCadence(key: ChartSeriesKey): ChartCadence {
    return getCadenceForChart(key);
  }

  private now(): number {
    return Date.now();
  }

  private applyStaleFallback(args: { id: string; incomingSeries: ChartSeries; incomingAt: number }): { series: ChartSeries; at: number } {
    const { id, incomingSeries, incomingAt } = args;

    if (incomingSeries.candles.length > 0) return { series: incomingSeries, at: incomingAt };

    const cached = this.lastNonEmptyById.get(id);
    if (!cached) return { series: incomingSeries, at: incomingAt };

    const age = this.now() - cached.lastUpdatedAt;
    if (age > this.STALE_MAX_MS) return { series: incomingSeries, at: incomingAt };

    return { series: cached.series, at: cached.lastUpdatedAt };
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

  private scheduleMaybeStopAfterPrefetch(ms: number): void {
    if (this.prefetchStopTimeoutId) window.clearTimeout(this.prefetchStopTimeoutId);

    this.prefetchStopTimeoutId = window.setTimeout(() => {
      this.prefetchStopTimeoutId = null;
      this.maybeStop();
    }, ms);
  }

  private enqueueRequest(key: ChartSeriesKey): void {
    const priority = getChartPriority(key);

    chartRequestCoordinator.enqueue(key, priority, () => {
      this.provider.requestSeries(key);
    });
  }

  prefetch(key: ChartSeriesKey): void {
    // Background hidden: avoid prefetch storms entirely.
    if (backgroundThrottleController.getState() === "hidden") return;

    const id = keyToId(key);
    const existing = this.seriesById.get(id);
    const nowAt = this.now();
    const cadence = this.getCadence(key);

    const isFresh =
      existing?.lastUpdatedAt != null &&
      existing.series.candles.length > 0 &&
      nowAt - existing.lastUpdatedAt <= cadence.freshMaxMs;

    if (isFresh) return;

    // Avoid spamming revalidations.
    const last = this.lastRevalidateAtById.get(id) ?? 0;
    if (nowAt - last < cadence.revalidateMinGapMs) return;

    this.ensureStarted();
    this.enqueueRequest(key);

    this.lastRevalidateAtById.set(id, nowAt);

    // Keep provider alive long enough for a coordinated request to execute.
    const keepAliveMs = Math.max(cadence.prefetchKeepAliveMs, cadence.requestRateMinGapMs + 500);
    this.scheduleMaybeStopAfterPrefetch(keepAliveMs);
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

    // immediate callback
    fn(this.seriesById.get(id)!);

    const nowAt = this.now();
    const snap = this.seriesById.get(id)!;
    const hasCandles = snap.series.candles.length > 0;

    const cadence = this.getCadence(key);
    const isFresh = snap.lastUpdatedAt != null && hasCandles && nowAt - snap.lastUpdatedAt <= cadence.freshMaxMs;

    this.ensureStarted();

    if (!isFresh) {
      this.enqueueRequest(key);
      this.lastRevalidateAtById.set(id, nowAt);
    }

    // Background revalidate when fresh TTL expires (still subscribed).
    // Skip scheduling when tab is hidden to preserve battery.
    if (
      backgroundThrottleController.getState() !== "hidden" &&
      hasCandles &&
      snap.lastUpdatedAt != null
    ) {
      const age = nowAt - snap.lastUpdatedAt;
      const delay = Math.max(0, cadence.freshMaxMs - age);

      if (this.revalidateTimeoutById.has(id)) {
        window.clearTimeout(this.revalidateTimeoutById.get(id)!);
      }

      const t = window.setTimeout(() => {
        this.revalidateTimeoutById.delete(id);

        // Only revalidate if still subscribed.
        if ((this.subscribersById.get(id)?.size ?? 0) === 0) return;

        const latest = this.seriesById.get(id);
        if (!latest) return;

        const nowAtInner = this.now();
        const last = this.lastRevalidateAtById.get(id) ?? 0;

        // Recompute cadence in case route/focus/background changed.
        const cadenceInner = this.getCadence(key);

        if (nowAtInner - last < cadenceInner.revalidateMinGapMs) return;

        this.enqueueRequest(key);
        this.lastRevalidateAtById.set(id, nowAtInner);
      }, delay);

      this.revalidateTimeoutById.set(id, t);
    }

    // Subscribing cancels any prefetch stop timer.
    if (this.prefetchStopTimeoutId) {
      window.clearTimeout(this.prefetchStopTimeoutId);
      this.prefetchStopTimeoutId = null;
    }

    return () => {
      const nextCount = (this.refCountById.get(id) ?? 1) - 1;
      if (nextCount <= 0) {
        this.refCountById.delete(id);
        this.subscribersById.delete(id);

        // Release only when no more consumers exist for this series key.
        this.provider.releaseSeries(key);

        // Cancel any scheduled revalidation for this series key.
        const rt = this.revalidateTimeoutById.get(id);
        if (rt) window.clearTimeout(rt);
        this.revalidateTimeoutById.delete(id);
      } else {
        this.refCountById.set(id, nextCount);
        const nextSet = this.subscribersById.get(id);
        nextSet?.delete(fn);
      }

      this.maybeStop();
    };
  }

  private notifyOne(id: string, snap: ChartSeriesSnapshot): void {
    const set = this.subscribersById.get(id);
    if (!set) return;

    // Always keep the latest snapshot, but batch delivery.
    this.pendingSnapById.set(id, snap);

    // If a notification is already scheduled for this series key, just wait.
    const existing = this.notifyTimeoutById.get(id);
    if (existing) return;

    const t = window.setTimeout(() => {
      this.notifyTimeoutById.delete(id);

      const pending = this.pendingSnapById.get(id);
      this.pendingSnapById.delete(id);

      if (!pending) return;

      const latestSet = this.subscribersById.get(id);
      if (!latestSet) return;

      for (const fn of latestSet) fn(pending);
    }, this.NOTIFY_BATCH_MIN_MS);

    this.notifyTimeoutById.set(id, t);
  }

  private notifyAll(): void {
    for (const [id, set] of this.subscribersById.entries()) {
      const snap = this.seriesById.get(id);
      if (!snap) continue;

      // If provider status flips to offline while we currently have an empty series,
      // re-apply stale-while-offline fallback.
      let next: ChartSeriesSnapshot = snap;

      const shouldRehydrateStale =
        snap.series.candles.length === 0 &&
        this.providerStatus !== "connecting" &&
        this.providerStatus !== "connected";

      if (shouldRehydrateStale) {
        const effective = this.applyStaleFallback({
          id,
          incomingSeries: snap.series,
          incomingAt: this.now(),
        });

        next = {
          series: effective.series,
          status: this.providerStatus,
          lastUpdatedAt: effective.at,
        };
      } else if (snap.status !== this.providerStatus) {
        next = {
          ...snap,
          status: this.providerStatus,
        };
      }

      if (next !== snap) this.seriesById.set(id, next);
      for (const fn of set) fn(this.seriesById.get(id)!);
    }
  }
}

export const chartSeriesStore = new ChartSeriesStore({
  provider: MARKET_SIMULATION_ENABLED ? new SyntheticBootstrapChartSeriesProvider() : new NullChartSeriesProvider(),
});
