import React, { useState } from "react";
import StockWorkspaceBar from "../components/company/StockWorkspaceBar";
import StockStoryPage from "./StockStoryPage";
import { AppScreen, DataSourcePill, MobilePageHeader, SourceAuditCard } from "../components/premium/PremiumUI";
import { StockRegistry } from "../services/stocks/StockRegistry";

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
  return (params.get("id") ?? params.get("symbol") ?? params.get("ticker") ?? params.get("companyId") ?? "").toUpperCase().trim();
}

export default function StockStoryPageF0(): JSX.Element {
  const [horizon, setHorizon] = useState<PredictionHorizon>(() => readHorizonFromUrl());
  const ticker = readTickerFromUrl();
  const stockInfo = ticker ? StockRegistry.getStock(ticker) : null;

  const selectHorizon = (nextHorizon: PredictionHorizon) => {
    const params = new URLSearchParams(window.location.search);
    params.set("horizon", String(nextHorizon));
    window.history.replaceState({}, "", `?${params.toString()}`);
    setHorizon(nextHorizon);
  };

  return (
    <AppScreen className="antialiased">
      <MobilePageHeader eyebrow="Stock details" title={ticker || "Company research"} body={stockInfo?.companyName || "Company identity is shown when registry data is available."} action={<DataSourcePill label="Research only" tone="ok" />} />
      <SourceAuditCard title="Company source state" rows={[
        { label: "Registry identity", value: stockInfo ? "Available" : "Unavailable", tone: stockInfo ? "ok" : "warn" },
        { label: "Forecast horizon", value: `${horizon} days`, tone: "muted" },
        { label: "Action model", value: "Inspect only", tone: "ok" },
      ]} />
      <StockWorkspaceBar ticker={ticker} horizon={horizon} />
      <section
        aria-label="Prediction horizon"
        className="mb-5 flex w-full flex-wrap items-center gap-3 rounded-xl px-5 py-3"
        style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
      >
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#536471" }}>Horizon</span>
        {HORIZONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => selectHorizon(option)}
            aria-pressed={horizon === option}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              horizon === option ? "text-white shadow-sm" : "hover:bg-white/40"
            }`}
            style={horizon === option ? { background: "#1a6e4a", color: "white" } : { color: "#536471" }}
          >
            {option}D
          </button>
        ))}
      </section>
      <StockStoryPage key={horizon} />
    </AppScreen>
  );
}
