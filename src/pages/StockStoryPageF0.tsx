import React, { useState } from "react";
import StockWorkspaceBar from "../components/company/StockWorkspaceBar";
import StockStoryPage from "./StockStoryPage";

const HORIZONS = [7, 30, 90, 180, 365] as const;
type PredictionHorizon = (typeof HORIZONS)[number];

function readHorizonFromUrl(): PredictionHorizon {
  if (typeof window === "undefined") return 30;
  const parsed = Number.parseInt(new URLSearchParams(window.location.search).get("horizon") ?? "", 10) as PredictionHorizon;
  return HORIZONS.includes(parsed) ? parsed : 30;
}

function readTickerFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") ?? params.get("symbol") ?? params.get("ticker") ?? params.get("companyId") ?? "")
    .toUpperCase()
    .trim();
}



/**
 * F0 compatibility boundary for the existing StockStory page.
 *
 * Provides the URL-backed horizon selector. The horizon is written
 * to URL params so StockStoryPage reads it directly via window.location.
 */
export default function StockStoryPageF0(): JSX.Element {
  const [horizon, setHorizon] = useState<PredictionHorizon>(() => readHorizonFromUrl());
  const ticker = readTickerFromUrl();

  const selectHorizon = (nextHorizon: PredictionHorizon) => {
    const params = new URLSearchParams(window.location.search);
    params.set("horizon", String(nextHorizon));
    window.history.replaceState({}, "", `?${params.toString()}`);
    setHorizon(nextHorizon);
  };

  return (
    <>
      <StockWorkspaceBar ticker={ticker} horizon={horizon} />
      <section
        aria-label="Prediction horizon"
        className="mx-auto mb-5 flex w-full max-w-7xl flex-wrap items-center gap-3 rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass px-5 py-3 text-slate-900"
      >
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Horizon</span>
        {HORIZONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => selectHorizon(option)}
            aria-pressed={horizon === option}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
               horizon === option ? "bg-accent-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
             }`}
          >
            {option}D
          </button>
        ))}
      </section>
      <StockStoryPage key={horizon} />
    </>
  );
}
