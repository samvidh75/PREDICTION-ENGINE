/**
 * OptionsFlow — derivatives market sentiment for F&O stocks.
 * 
 * Shows: Put/Call ratio (PCR), Implied Volatility (IV), Max Pain,
 * Open Interest trends, and options activity summary.
 * 
 * Spec ref: Section "Options Flow" — F&O sentiment signals.
 */

import { Activity, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { colors, radius, animation } from "../design/tokens";

interface OptionsData {
  pcr: number;               // Put/Call ratio
  pcrChange: number;         // Day-over-day PCR change
  impliedVolatility: number; // India VIX proxy for stock
  ivPercentile: number;      // IV rank (0-100)
  maxPain: number;           // Max pain strike
  currentPrice: number;      // CMP
  totalOI: number;           // Total open interest (contracts)
  callOIChange: number;      // % change in call OI
  putOIChange: number;       // % change in put OI
  highestCallOI: number;     // Strike with highest call OI
  highestPutOI: number;      // Strike with highest put OI
}

// Mock data — production fetches from NSE derivatives API
const MOCK_OPTIONS_DATA: OptionsData = {
  pcr: 1.22,
  pcrChange: 0.08,
  impliedVolatility: 28.5,
  ivPercentile: 65,
  maxPain: 340,
  currentPrice: 342.50,
  totalOI: 2450000,
  callOIChange: 12.3,
  putOIChange: 18.7,
  highestCallOI: 360,
  highestPutOI: 320,
};

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatDecimal(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function OptionsFlow() {
  const d = MOCK_OPTIONS_DATA;

  // PCR interpretation
  const pcrSignal = d.pcr > 1.0
    ? { label: "Bullish", color: colors.marketGreen, detail: "More puts than calls = bullish contrarian signal" }
    : d.pcr < 0.7
      ? { label: "Bearish", color: colors.marketRed, detail: "More calls than puts = bearish contrarian signal" }
      : { label: "Neutral", color: colors.marketOrange, detail: "Balanced put/call activity" };

  // IV interpretation
  const ivSignal = d.ivPercentile > 80
    ? { label: "High", color: colors.marketRed, detail: "Elevated fear/uncertainty" }
    : d.ivPercentile < 30
      ? { label: "Low", color: colors.marketGreen, detail: "Complacency — low fear" }
      : { label: "Normal", color: colors.marketOrange, detail: "Average volatility expectations" };

  // Max pain vs current
  const maxPainDelta = ((d.currentPrice - d.maxPain) / d.maxPain) * 100;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Activity size={16} color={colors.textSecondary} />
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: colors.textPrimary }}>
          Options Flow
        </h3>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: colors.textTertiary,
            background: colors.surfaceCard,
            padding: "2px 6px",
            borderRadius: radius.full,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          F&O
        </span>
      </div>

      {/* Key metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {/* PCR */}
        <div
          style={{
            padding: "14px",
            background: colors.surface,
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
          }}
        >
          <div style={{ fontSize: "11px", color: colors.textTertiary, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Put/Call Ratio
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: colors.textPrimary, marginBottom: "2px" }}>
            {formatDecimal(d.pcr, 2)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {d.pcrChange > 0 ? (
              <TrendingUp size={12} color={colors.marketGreen} />
            ) : (
              <TrendingDown size={12} color={colors.marketRed} />
            )}
            <span style={{ fontSize: "12px", fontWeight: 500, color: pcrSignal.color }}>
              {pcrSignal.label}
            </span>
          </div>
        </div>

        {/* Implied Volatility */}
        <div
          style={{
            padding: "14px",
            background: colors.surface,
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
          }}
        >
          <div style={{ fontSize: "11px", color: colors.textTertiary, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Implied Volatility
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: colors.textPrimary, marginBottom: "2px" }}>
            {formatDecimal(d.impliedVolatility, 1)}%
          </div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: ivSignal.color }}>
            {ivSignal.label} · {d.ivPercentile}th %ile
          </div>
        </div>

        {/* Max Pain */}
        <div
          style={{
            padding: "14px",
            background: colors.surface,
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
          }}
        >
          <div style={{ fontSize: "11px", color: colors.textTertiary, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Max Pain
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: colors.textPrimary, marginBottom: "2px" }}>
            ₹{formatNumber(d.maxPain)}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: maxPainDelta > 0 ? colors.marketGreen : colors.marketRed }}>
            {maxPainDelta > 0 ? "+" : ""}{formatDecimal(maxPainDelta, 1)}% vs CMP
          </div>
        </div>

        {/* Total OI */}
        <div
          style={{
            padding: "14px",
            background: colors.surface,
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
          }}
        >
          <div style={{ fontSize: "11px", color: colors.textTertiary, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Total Open Interest
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: colors.textPrimary, marginBottom: "2px" }}>
            {formatNumber(d.totalOI)}
          </div>
          <div style={{ fontSize: "12px", color: colors.textSecondary }}>
            Calls {d.callOIChange > 0 ? "+" : ""}{d.callOIChange}% · Puts {d.putOIChange > 0 ? "+" : ""}{d.putOIChange}%
          </div>
        </div>
      </div>

      {/* Key strikes */}
      <div
        style={{
          padding: "12px 14px",
          background: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BarChart3 size={14} color={colors.textSecondary} />
          <span style={{ fontSize: "13px", color: colors.textSecondary }}>Key Strikes:</span>
        </div>
        <div>
          <span style={{ fontSize: "12px", color: colors.textTertiary }}>Highest Call OI: </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: colors.marketRed }}>₹{d.highestCallOI}</span>
          <span style={{ fontSize: "11px", color: colors.textTertiary, marginLeft: "4px" }}>
            (resistance)
          </span>
        </div>
        <div>
          <span style={{ fontSize: "12px", color: colors.textTertiary }}>Highest Put OI: </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: colors.marketGreen }}>₹{d.highestPutOI}</span>
          <span style={{ fontSize: "11px", color: colors.textTertiary, marginLeft: "4px" }}>
            (support)
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: "12px", fontSize: "11px", color: colors.textTertiary, lineHeight: "1.5", fontStyle: "italic" }}>
        Options data is for informational purposes only. Derivatives involve substantial risk.
        Max Pain theory is not a reliable predictor of price movement.
      </div>
    </div>
  );
}
