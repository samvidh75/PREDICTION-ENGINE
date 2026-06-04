import { useEffect, useMemo, useState } from "react";
import type { ChartSeries, ChartTimeframe } from "../components/charts/chartTypes";
import type { ChartProviderConnectionStatus, ChartSeriesKey } from "../services/charting/live/ChartSeriesProvider";
import { chartSeriesStore } from "../services/charting/live/chartSeriesStore";

export function useChartSeries(args: {
  ticker: string;
  timeframe: ChartTimeframe;
  enabled?: boolean;
}): {
  series: ChartSeries;
  status: ChartProviderConnectionStatus;
  lastUpdatedAt: number | null;
} {
  const { ticker, timeframe, enabled = true } = args;

  const key = useMemo<ChartSeriesKey>(() => {
    // chart series identity should not depend on UI overlays / narrative variants.
    return { ticker, timeframe };
  }, [ticker, timeframe]);

  const [state, setState] = useState(() => {
    return {
      series: { candles: [] } as ChartSeries,
      status: chartSeriesStore.getStatus?.() ?? "offline",
      lastUpdatedAt: null as number | null,
    };
  });

  useEffect(() => {
    if (!enabled) return;

    const unsub = chartSeriesStore.subscribe(key, (snap) => {
      setState(snap);
    });

    return () => {
      unsub();
    };
  }, [enabled, key]);

  return state;
}
