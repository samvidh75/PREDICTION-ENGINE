import { routeIntensityStore, type RouteIntensity } from "../charting/live/routeIntensityStore";
import { chartFocusStore } from "./chartFocusStore";
import { backgroundThrottleController, type BackgroundState } from "./backgroundThrottleController";
import type { ChartSeriesKey } from "../charting/live/ChartSeriesProvider";

export type ChartRealtimePriority = "high" | "medium" | "low";

export type ChartCadence = {
  freshMaxMs: number;
  revalidateMinGapMs: number;
  prefetchKeepAliveMs: number;
  // Only used for background request spacing (coordination); rendering batching remains unchanged.
  requestRateMinGapMs: number;
};

function routeToBase(route: RouteIntensity): Pick<ChartCadence, "freshMaxMs" | "revalidateMinGapMs" | "prefetchKeepAliveMs"> {
  if (route === "high") return { freshMaxMs: 4_000, revalidateMinGapMs: 900, prefetchKeepAliveMs: 2_500 };
  if (route === "medium") return { freshMaxMs: 9_000, revalidateMinGapMs: 2_500, prefetchKeepAliveMs: 1_800 };
  return { freshMaxMs: 20_000, revalidateMinGapMs: 8_000, prefetchKeepAliveMs: 800 };
}

function priorityToScale(priority: ChartRealtimePriority) {
  if (priority === "high") return { fresh: 0.6, revalidate: 0.7, prefetchKeepAlive: 1.1, requestRate: 0.85 };
  if (priority === "medium") return { fresh: 0.85, revalidate: 0.9, prefetchKeepAlive: 1.0, requestRate: 1.0 };
  return { fresh: 1.35, revalidate: 1.45, prefetchKeepAlive: 0.85, requestRate: 1.35 };
}

function computeChartRealtimePriority(key: ChartSeriesKey, background: BackgroundState): ChartRealtimePriority {
  if (background === "hidden") return "low";

  // Chart focus hints represent user attention inside the chart itself.
  const focus = chartFocusStore.getFocusHint(key); // high | medium | low

  const route = routeIntensityStore.getIntensity();
  if (route === "high" && focus === "high") return "high";
  if (route === "high" && focus === "medium") return "medium";
  if (route === "high" && focus === "low") return "medium";

  if (route === "medium") {
    if (focus === "high") return "medium";
    if (focus === "medium") return "low";
    return "low";
  }

  // route low
  if (focus === "high") return "medium"; // still allow a little chart smoothness
  return "low";
}

export function getCadenceForChart(key: ChartSeriesKey): ChartCadence {
  const background = backgroundThrottleController.getState();
  const route = routeIntensityStore.getIntensity();

  const base = routeToBase(route);

  const priority = computeChartRealtimePriority(key, background);
  const scale = priorityToScale(priority);

  // When background is hidden, stretch TTL to prevent request storms and conserve battery.
  if (background === "hidden") {
    return {
      freshMaxMs: Math.round(base.freshMaxMs * 1.9),
      revalidateMinGapMs: Math.round(base.revalidateMinGapMs * 2.4),
      prefetchKeepAliveMs: Math.round(base.prefetchKeepAliveMs * 0.4),
      requestRateMinGapMs: 3_000,
    };
  }

  const requestRateMinGapMsBase = route === "high" ? 320 : route === "medium" ? 650 : 1_250;

  return {
    freshMaxMs: Math.round(base.freshMaxMs * scale.fresh),
    revalidateMinGapMs: Math.round(base.revalidateMinGapMs * scale.revalidate),
    prefetchKeepAliveMs: Math.round(base.prefetchKeepAliveMs * scale.prefetchKeepAlive),
    requestRateMinGapMs: Math.round(requestRateMinGapMsBase * scale.requestRate),
  };
}

function keyToId(key: ChartSeriesKey): string {
  return `${key.ticker}::${key.timeframe}`;
}

type QueueTask = {
  id: string;
  priority: ChartRealtimePriority;
  run: () => void;
  enqueuedAt: number;
};

function priorityWeight(p: ChartRealtimePriority): number {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

/**
 * Shared request coordinator:
 * - throttles provider.requestSeries calls across multiple series keys
 * - deduplicates per series key (latest enqueue wins, but chartSeriesStore also SWR-throttles)
 */
class ChartRequestCoordinator {
  private queue: QueueTask[] = [];
  private running = false;

  private scheduledIds: Set<string> = new Set();

  private flushTimerId: number | null = null;

  private getNextPriorityMinGapMs(): number {
    const background = backgroundThrottleController.getState();
    if (background === "hidden") return 3_000;

    const route = routeIntensityStore.getIntensity();
    if (route === "high") return 320;
    if (route === "medium") return 650;
    return 1_250;
  }

  private ensureLoop(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  private scheduleNext(): void {
    if (this.flushTimerId != null) window.clearTimeout(this.flushTimerId);
    const gap = this.getNextPriorityMinGapMs();
    this.flushTimerId = window.setTimeout(() => {
      this.flushTimerId = null;
      void this.flushOne();
    }, gap);
  }

  private selectNext(): QueueTask | null {
    if (this.queue.length === 0) return null;

    // Prefer higher priority and older tasks first.
    this.queue.sort((a, b) => {
      const dw = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (dw !== 0) return dw;
      return a.enqueuedAt - b.enqueuedAt;
    });

    return this.queue.shift() ?? null;
  }

  private async flushOne(): Promise<void> {
    const task = this.selectNext();
    if (!task) {
      this.running = false;
      return;
    }

    // Allow cancellation when background is hidden.
    const background = backgroundThrottleController.getState();
    if (background === "hidden") {
      // Keep dedupe semantics: mark as executed (so chartSeriesStore won't re-enqueue too fast).
      this.scheduledIds.delete(task.id);
      this.running = false;
      this.queue = [];
      return;
    }

    this.scheduledIds.delete(task.id);
    try {
      task.run();
    } finally {
      // Keep running if queue isn't empty.
      if (this.queue.length > 0) {
        this.scheduleNext();
      } else {
        this.running = false;
      }
    }
  }

  enqueue(key: ChartSeriesKey, priority: ChartRealtimePriority, run: () => void): void {
    const id = keyToId(key);

    if (this.scheduledIds.has(id)) return;

    this.scheduledIds.add(id);
    this.queue.push({
      id,
      priority,
      run,
      enqueuedAt: Date.now(),
    });

    this.ensureLoop();
  }
}

export const chartRequestCoordinator = new ChartRequestCoordinator();
export function getChartPriority(key: ChartSeriesKey): ChartRealtimePriority {
  const background = backgroundThrottleController.getState();
  return computeChartRealtimePriority(key, background);
}
