import React, { useEffect, useState } from "react";
import type { ChartTimeframe } from "./chartTypes";
import CinematicChart from "./CinematicChart";

type StockStoryChartIntegrationProps = {
  ticker: string;
  defaultTimeframe?: ChartTimeframe;
};

export default function StockStoryChartIntegration({
  ticker,
  defaultTimeframe = "1M",
}: StockStoryChartIntegrationProps): JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // No async data fetch yet; this is purely for the “cinematic” loading feel.
    // Text must never be “Loading chart…”.
    const id = window.setTimeout(() => setReady(true), 220);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="relative w-full">
      {!ready && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center rounded-[20px] border border-white/10 bg-black/20 backdrop-blur-[20px]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/55">
            Rendering market structure…
          </div>
        </div>
      )}

      <div className={ready ? "opacity-100" : "opacity-0"} style={{ transition: "opacity 260ms ease" }}>
        <CinematicChart ticker={ticker} defaultTimeframe={defaultTimeframe} />
      </div>
    </div>
  );
}
