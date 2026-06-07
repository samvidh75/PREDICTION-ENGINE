import type { ChartSeriesKey } from "../charting/live/ChartSeriesProvider";

type VisibilityState = "visible" | "not_visible";

type FocusRecord = {
  visibility: VisibilityState;
  // last pointer interaction time (ms)
  lastPointerAt: number | null;
  // last time we considered this series as the “active chart”
  lastActiveAt: number | null;
  // throttling to avoid excessive writes
  lastWriteAt: number | null;
};

function nowMs(): number {
  return Date.now();
}

function keyToId(key: ChartSeriesKey): string {
  return `${key.ticker}::${key.timeframe}`;
}

class ChartFocusStore {
  private records: Map<string, FocusRecord> = new Map();

  private getOrCreate(id: string): FocusRecord {
    const existing = this.records.get(id);
    if (existing) return existing;
    const next: FocusRecord = {
      visibility: "not_visible",
      lastPointerAt: null,
      lastActiveAt: null,
      lastWriteAt: null,
    };
    this.records.set(id, next);
    return next;
  }

  /**
   * Called by UI when the chart enters/exits viewport.
   * Does not trigger updates on its own; it only updates the focus hints.
   */
  setVisible(key: ChartSeriesKey, visible: boolean): void {
    const id = keyToId(key);
    const rec = this.getOrCreate(id);

    const n = nowMs();
    // reduce churn
    if (rec.lastWriteAt != null && n - rec.lastWriteAt < 250) return;

    rec.visibility = visible ? "visible" : "not_visible";
    rec.lastActiveAt = visible ? n : rec.lastActiveAt;
    rec.lastWriteAt = n;
  }

  /**
   * Called by UI when pointer moves within the chart (or other explicit interaction).
   */
  bumpPointerActivity(key: ChartSeriesKey): void {
    const id = keyToId(key);
    const rec = this.getOrCreate(id);

    const n = nowMs();
    // throttle to avoid flooding
    if (rec.lastWriteAt != null && n - rec.lastWriteAt < 180) return;

    rec.lastPointerAt = n;
    rec.lastActiveAt = n;
    rec.lastWriteAt = n;
  }

  /**
   * Additional helper for cases where UI knows it is “the active chart” even without pointer.
   */
  setActive(key: ChartSeriesKey): void {
    const id = keyToId(key);
    const rec = this.getOrCreate(id);

    const n = nowMs();
    if (rec.lastWriteAt != null && n - rec.lastWriteAt < 300) return;

    // Mark as actively engaged so priority can treat it as "focused".
    rec.visibility = "visible";
    rec.lastActiveAt = n;
    rec.lastWriteAt = n;
  }

  /**
   * Hint used by scheduling logic.
   * - "high": visible and recently interacted
   * - "medium": visible but no recent pointer activity
   * - "low": not visible
   */
  getFocusHint(key: ChartSeriesKey): "high" | "medium" | "low" {
    const id = keyToId(key);
    const rec = this.records.get(id);
    if (!rec) return "low";

    if (rec.visibility !== "visible") return "low";

    const n = nowMs();

    // Recent direct interaction.
    if (rec.lastPointerAt != null && n - rec.lastPointerAt <= 2200) return "high";

    // Active engagement without pointer (e.g. watchlist card focus).
    if (rec.lastActiveAt != null && n - rec.lastActiveAt <= 2200) return "high";

    // visible but not currently being interacted with
    return "medium";
  }

  /**
   * For cleanup / memory: optionally purge very old records.
   */
  gc(maxAgeMs: number): void {
    const n = nowMs();
    for (const [id, rec] of this.records.entries()) {
      const t = rec.lastActiveAt ?? rec.lastPointerAt;
      if (t == null) continue;
      if (n - t > maxAgeMs) this.records.delete(id);
    }
  }
}

export const chartFocusStore = new ChartFocusStore();

// No auto-start: store is passive and only updated by UI + read by services.
