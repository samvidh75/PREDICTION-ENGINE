import React, { useMemo } from "react";
import type { ConfidenceState } from "../intelligence/ConfidenceEngine";
import type { ChartTimeframe } from "../charts/chartTypes";
import { getSyntheticChartSeries } from "../charts/chartData";
import IntelligenceMiniChart from "../search/IntelligenceMiniChart";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatINRCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const isNeg = value < 0;
  const sign = isNeg ? "-" : "";

  if (abs >= 1e12) return `${sign}₹${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}₹${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  return `${sign}₹${Math.round(abs).toLocaleString()}`;
}

function conditionForState(state: ConfidenceState): { label: string; glow: string } {
  switch (state) {
    case "ELEVATED_RISK":
      return { label: "High Risk", glow: "rgba(255,120,120,0.55)" };
    case "MOMENTUM_WEAKENING":
      return { label: "Weakening", glow: "rgba(209,107,165,0.55)" };
    case "CONFIDENCE_RISING":
      return { label: "Improving", glow: "rgba(0,255,210,0.50)" };
    case "NEUTRAL_ENVIRONMENT":
      return { label: "Strong", glow: "rgba(0,120,255,0.45)" };
    case "STABLE_CONVICTION":
    default:
      return { label: "Stable", glow: "rgba(123,247,212,0.42)" };
  }
}

type Props = {
  ticker: string;
  confidenceState: ConfidenceState;
  timeframe?: ChartTimeframe; // keep calm; default 1Y
  miniWidthPx?: number;
};

export default function Company52WeekRangeMini({
  ticker,
  confidenceState,
  timeframe = "1Y",
  miniWidthPx = 170,
}: Props): JSX.Element {
  const series = useMemo(() => {
    // Synthetic, deterministic to ticker + timeframe inside getSyntheticChartSeries.
    return getSyntheticChartSeries(ticker, timeframe);
  }, [ticker, timeframe]);

  const { min, max, last, first } = useMemo(() => {
    const candles = series.candles;
    if (!candles.length) return { min: 0, max: 1, first: 1, last: 1 };

    let low = Infinity;
    let high = -Infinity;

    for (const c of candles) {
      low = Math.min(low, c.l);
      high = Math.max(high, c.h);
    }

    const firstClose = candles[0]?.c ?? 1;
    const lastClose = candles[candles.length - 1]?.c ?? firstClose;

    return { min: low, max: high, first: firstClose, last: lastClose };
  }, [series]);

  const position01 = useMemo(() => {
    const span = Math.max(1e-6, max - min);
    return clamp((last - min) / span, 0, 1);
  }, [min, max, last]);

  const rangeChangePct = useMemo(() => {
    const base = Math.max(1e-6, first);
    return ((last - first) / Math.abs(base)) * 100;
  }, [first, last]);

  const cond = useMemo(() => conditionForState(confidenceState), [confidenceState]);

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/25 backdrop-blur-2xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">52-week range</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-[14px] font-semibold text-white/92">{formatINRCompact(last)}</div>
            <div
              className="h-[24px] rounded-full px-[10px] flex items-center text-[10px] uppercase tracking-[0.18em] text-white/70"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 22px ${cond.glow}`,
              }}
            >
              {cond.label}
            </div>
          </div>
          <div className="mt-2 text-[12px] uppercase tracking-[0.18em] text-white/45">
            Low {formatINRCompact(min)} • High {formatINRCompact(max)} • Δ {rangeChangePct >= 0 ? "+" : ""}
            {rangeChangePct.toFixed(2)}%
          </div>
        </div>

        <div className="shrink-0">
          <IntelligenceMiniChart tickerSeed={ticker} confidenceState={confidenceState} widthPx={miniWidthPx} heightPx={62} />
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-[12px] rounded-full bg-white/5 border border-white/10 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 right-0 bg-black"
            style={{
              background: "rgba(255,255,255,0.03)",
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[16px] w-[2px] rounded-full"
            style={{
              left: `${position01 * 100}%`,
              background: cond.glow,
              boxShadow: `0 0 16px ${cond.glow}`,
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45">
          <span>{formatINRCompact(min)}</span>
          <span>{formatINRCompact(max)}</span>
        </div>
      </div>
    </div>
  );
}
