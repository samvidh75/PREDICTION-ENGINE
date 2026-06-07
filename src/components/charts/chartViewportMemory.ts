import type { ChartSeriesKey } from "../../services/charting/live/ChartSeriesProvider";

export type ChartViewport = {
  // inclusive start index into the candles array
  start: number;
  // number of candles visible
  count: number;
};

const STORAGE_KEY_BASE = "stockstory_chart_viewport_v1";

function keyToStorageId(seriesKey: ChartSeriesKey): string {
  return `${STORAGE_KEY_BASE}_${seriesKey.ticker}__${seriesKey.timeframe}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadViewport(seriesKey: ChartSeriesKey): ChartViewport | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(keyToStorageId(seriesKey));
  const parsed = safeParse<ChartViewport>(raw);
  if (!parsed) return null;

  if (!Number.isFinite(parsed.start) || !Number.isFinite(parsed.count)) return null;
  if (parsed.start < 0 || parsed.count <= 0) return null;

  return parsed;
}

export function saveViewport(seriesKey: ChartSeriesKey, viewport: ChartViewport): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(keyToStorageId(seriesKey), JSON.stringify(viewport));
}
