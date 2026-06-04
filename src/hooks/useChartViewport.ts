import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartSeriesKey } from "../services/charting/live/ChartSeriesProvider";
import type { ChartViewport } from "../components/charts/chartViewportMemory";
import { loadViewport, saveViewport } from "../components/charts/chartViewportMemory";

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function computeVisibleCount(totalCandles: number, zoomLevel: number, minCount: number, maxCount: number): number {
  if (totalCandles <= 0) return 0;
  const raw = totalCandles / Math.max(0.5, zoomLevel);
  return clampInt(raw, Math.min(minCount, totalCandles), Math.min(maxCount, totalCandles));
}

export type ChartViewportController = {
  viewport: ChartViewport;
  zoomLevel: number;

  setZoomLevel: (nextZoomLevel: number) => void;
  panByCandles: (deltaCandles: number) => void;

  /**
   * Zoom while keeping an anchor candle stable under a given screen ratio.
   * - anchorIndex: global candle index
   * - anchorRatioX: 0..1 position inside chart width
   */
  zoomAt: (nextZoomLevel: number, anchorIndex: number, anchorRatioX: number) => void;

  /**
   * For cases where parent wants deterministic initialization after series changes.
   */
  resetToDefault: (defaultZoomLevel?: number) => void;
};

export function useChartViewport(args: {
  seriesKey: ChartSeriesKey;
  totalCandles: number;
  minCount?: number;
  maxCount?: number;
  defaultZoomLevel?: number;
}): ChartViewportController {
  const {
    seriesKey,
    totalCandles,
    minCount = 20,
    maxCount = 160,
    defaultZoomLevel = 1,
  } = args;

  const [zoomLevel, setZoomLevelState] = useState<number>(defaultZoomLevel);
  const [viewport, setViewportState] = useState<ChartViewport>(() => ({
    start: 0,
    count: 0,
  }));

  const pendingSaveRef = useRef<number | null>(null);

  const maxStart = useMemo(() => {
    if (totalCandles <= 0) return 0;
    if (viewport.count <= 0) return 0;
    return Math.max(0, totalCandles - viewport.count);
  }, [totalCandles, viewport.count]);

  const recomputeCountFromZoom = useCallback(
    (nextZoom: number, total: number) => computeVisibleCount(total, nextZoom, minCount, maxCount),
    [minCount, maxCount]
  );

  const clampViewport = useCallback(
    (next: ChartViewport, total: number) => {
      if (total <= 0) return { start: 0, count: 0 };
      const count = clampInt(next.count, 1, Math.min(maxCount, total));
      const start = clampInt(next.start, 0, Math.max(0, total - count));
      return { start, count };
    },
    [maxCount]
  );

  const resetToDefault = useCallback(
    (nextDefaultZoom = defaultZoomLevel) => {
      const count = recomputeCountFromZoom(nextDefaultZoom, totalCandles);
      const start = 0;
      setZoomLevelState(nextDefaultZoom);
      setViewportState(clampViewport({ start, count }, totalCandles));
    },
    [clampViewport, defaultZoomLevel, recomputeCountFromZoom, totalCandles]
  );

  // Initialize from persisted viewport when we have data.
  useEffect(() => {
    if (totalCandles <= 0) return;

    const saved = loadViewport(seriesKey);
    if (saved) {
      const count = clampInt(saved.count, 1, Math.min(maxCount, totalCandles));
      const start = clampInt(saved.start, 0, Math.max(0, totalCandles - count));

      setViewportState({ start, count });

      // Derive an approximate zoomLevel for future zoomAt math.
      // zoomLevel is "inverted" by the count formula.
      const approxZoom = totalCandles / Math.max(1, count);
      setZoomLevelState(clamp(approxZoom, 0.5, 5));
      return;
    }

    resetToDefault(defaultZoomLevel);
  }, [seriesKey, totalCandles, maxCount, resetToDefault, defaultZoomLevel]);

  // Keep viewport valid when totalCandles changes.
  useEffect(() => {
    if (totalCandles <= 0) return;

    setViewportState((prev) => {
      const nextCount = recomputeCountFromZoom(zoomLevel, totalCandles);
      if (nextCount === 0) return { start: 0, count: 0 };
      const nextStart = clampInt(prev.start, 0, Math.max(0, totalCandles - nextCount));
      return { start: nextStart, count: nextCount };
    });
  }, [totalCandles, zoomLevel, recomputeCountFromZoom]);

  // Persist viewport with debounce.
  useEffect(() => {
    if (totalCandles <= 0) return;
    if (viewport.count <= 0) return;

    if (pendingSaveRef.current) window.clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = window.setTimeout(() => {
      saveViewport(seriesKey, viewport);
      pendingSaveRef.current = null;
    }, 260);

    return () => {
      if (pendingSaveRef.current) window.clearTimeout(pendingSaveRef.current);
    };
  }, [seriesKey, viewport, totalCandles]);

  const panByCandles = useCallback(
    (deltaCandles: number) => {
      if (totalCandles <= 0 || viewport.count <= 0) return;

      const delta = Math.round(deltaCandles);
      if (delta === 0) return;

      setViewportState((prev) => {
        const nextStart = clampInt(prev.start + delta, 0, Math.max(0, totalCandles - prev.count));
        return { ...prev, start: nextStart };
      });
    },
    [totalCandles, viewport.count]
  );

  const setZoomLevel = useCallback(
    (nextZoomLevel: number) => {
      if (totalCandles <= 0) return;
      const nextZoom = clamp(nextZoomLevel, 0.5, 5);
      const nextCount = recomputeCountFromZoom(nextZoom, totalCandles);
      const centerIndex = viewport.count > 0 ? viewport.start + Math.floor(viewport.count / 2) : Math.floor(totalCandles / 2);

      const nextStart = clampInt(centerIndex - Math.floor(nextCount / 2), 0, Math.max(0, totalCandles - nextCount));
      setZoomLevelState(nextZoom);
      setViewportState({ start: nextStart, count: nextCount });
    },
    [recomputeCountFromZoom, totalCandles, viewport.count, viewport.start]
  );

  const zoomAt = useCallback(
    (nextZoomLevel: number, anchorIndex: number, anchorRatioX: number) => {
      if (totalCandles <= 0 || viewport.count <= 0) return;

      const nextZoom = clamp(nextZoomLevel, 0.5, 5);
      const nextCount = recomputeCountFromZoom(nextZoom, totalCandles);
      if (nextCount <= 0) return;

      const aIdx = clampInt(anchorIndex, 0, totalCandles - 1);
      const ratio = clamp(anchorRatioX, 0, 1);

      const anchorOffsetInView = Math.floor(ratio * nextCount);
      const nextStart = clampInt(aIdx - anchorOffsetInView, 0, Math.max(0, totalCandles - nextCount));

      setZoomLevelState(nextZoom);
      setViewportState({ start: nextStart, count: nextCount });
    },
    [recomputeCountFromZoom, totalCandles, viewport.count]
  );

  return {
    viewport,
    zoomLevel,
    setZoomLevel,
    panByCandles,
    zoomAt,
    resetToDefault,
  };
}
