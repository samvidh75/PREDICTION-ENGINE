import { colors } from "../design/tokens";

interface PricePoint {
  high?: number;
  low?: number;
  close?: number;
  price?: number;
}

/** Horizontal bar showing current price's position between the 52-week low and high,
    derived from the 1-year price history series (no dedicated 52w-high/low field exists). */
export function FiftyTwoWeekRange({ oneYearSeries, currentPrice }: { oneYearSeries: PricePoint[]; currentPrice: number }) {
  if (!oneYearSeries || oneYearSeries.length < 2) return null;

  const highs = oneYearSeries.map((p) => p.high ?? p.close ?? p.price ?? currentPrice);
  const lows = oneYearSeries.map((p) => p.low ?? p.close ?? p.price ?? currentPrice);
  const weekHigh = Math.max(...highs, currentPrice);
  const weekLow = Math.min(...lows, currentPrice);

  if (weekHigh <= weekLow) return null;

  const pct = ((currentPrice - weekLow) / (weekHigh - weekLow)) * 100;
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <div style={{ width: "100%", maxWidth: 420, margin: "18px auto 0", display: "grid", gap: 6 }}>
      <div style={{ position: "relative", height: 6, borderRadius: 999, background: colors.border }}>
        <div
          style={{
            position: "absolute", left: 0, top: "50%", transform: "translate(-50%, -50%)",
            width: 12, height: 12, borderRadius: "50%",
            background: colors.textPrimary, border: `2px solid ${colors.canvas}`,
            marginLeft: `${clampedPct}%`,
          }}
          aria-label="Current price position in 52-week range"
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: colors.textSecondary }}>
        <span>52W Low: ₱{weekLow.toFixed(2)}</span>
        <span>52W High: ₱{weekHigh.toFixed(2)}</span>
      </div>
    </div>
  );
}
