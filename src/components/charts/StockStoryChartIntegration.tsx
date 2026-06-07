import React, { useEffect, useState } from "react";
import type { ChartTimeframe } from "./chartTypes";
import CinematicChart from "./CinematicChart";
import { chartSeriesStore } from "../../services/charting/live/chartSeriesStore";
import RealtimeRenderIsolationCoordinator from "../../performance/RealtimeRenderIsolationCoordinator";
import CalmSkeletonSurface from "../../performance/CalmSkeletonSurface";

type StockStoryChartIntegrationProps = {
  ticker: string;
  compareTicker?: string | null;
  onClearCompare?: () => void;
  defaultTimeframe?: ChartTimeframe;
};

export default function StockStoryChartIntegration({
  ticker,
  compareTicker = null,
  onClearCompare,
  defaultTimeframe = "1M",
}: StockStoryChartIntegrationProps): JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // No async data fetch yet; this is purely for the “cinematic” loading feel.
    // Text must never be “Loading chart…”.
    const id = window.setTimeout(() => setReady(true), 220);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Route-aware prefetch: prime the default timeframe series so the chart
    // hydrates instantly when it mounts, without poll/re-render chaos.
    chartSeriesStore.prefetch({ ticker, timeframe: defaultTimeframe });

    if (compareTicker) {
      const raw = compareTicker.toUpperCase().trim();
      const sameAsMain = raw && raw === ticker.toUpperCase().trim();
      if (raw && !sameAsMain) {
        chartSeriesStore.prefetch({ ticker: raw, timeframe: defaultTimeframe });
      }
    }
  }, [ticker, compareTicker, defaultTimeframe]);

  return (
    <div className="relative w-full h-[280px] lg:h-[420px]">
      {!ready && (
        <div className="absolute inset-0 z-[2] h-[280px] lg:h-[420px] overflow-hidden rounded-[20px]">
          <CalmSkeletonSurface heightPx={420} ariaLabel="Preparing chart structure" />
        </div>
      )}

      <RealtimeRenderIsolationCoordinator
        featureKey="chart_integration"
        deps={[ticker, compareTicker ?? "", defaultTimeframe]}
      >
        <div className={ready ? "opacity-100 h-full w-full" : "opacity-0 h-0 overflow-hidden"} style={{ transition: "opacity 260ms ease" }}>
          <CinematicChart
            ticker={ticker}
            compareTicker={compareTicker}
            onClearCompare={onClearCompare}
            defaultTimeframe={defaultTimeframe}
          />
        </div>
      </RealtimeRenderIsolationCoordinator>
    </div>
  );
}
