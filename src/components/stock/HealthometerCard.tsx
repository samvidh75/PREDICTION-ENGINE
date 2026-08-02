import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardLabel } from "../../ui/Card";
import { colors, radius } from "../../design/tokens";

/**
 * Healthometer — A 150-parameter-inspired health scoring engine for PSE stocks.
 * This is a research/analytical tool, NOT investment advice. The score is
 * derived from publicly available fundamental metrics and is purely
 * informational.
 */

export interface HealthometerParams {
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  rsi: number | null;
  marketCap: number | null;
  epsGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
}

export interface HealthScore {
  overall: number;
  category: "Very Healthy" | "Healthy" | "Stable" | "Weakening" | "Unhealthy";
  color: string;
  subScores: {
    valuation: number;
    profitability: number;
    growth: number;
    financialHealth: number;
    momentum: number;
  };
  signals: Array<{ label: string; positive: boolean; weight: number }>;
}

/**
 * Calculate a comprehensive health score for a PSE-listed stock.
 * Multi-factor weighted model across 5 dimensions.
 */
export function calculateHealth(params: HealthometerParams): HealthScore {
  const signals: Array<{ label: string; positive: boolean; weight: number }> = [];

  // ── Valuation Score (0-100) ──
  let valuation = 50;
  if (params.peRatio !== null && params.peRatio > 0) {
    if (params.peRatio < 10) { valuation = 85; signals.push({ label: "Low P/E (<10x)", positive: true, weight: 15 }); }
    else if (params.peRatio < 20) { valuation = 70; signals.push({ label: "Moderate P/E", positive: true, weight: 10 }); }
    else if (params.peRatio < 30) { valuation = 50; signals.push({ label: "Elevated P/E", positive: false, weight: 5 }); }
    else { valuation = 30; signals.push({ label: "High P/E (>30x)", positive: false, weight: 10 }); }
  }
  if (params.pbRatio !== null && params.pbRatio < 1.5) {
    valuation += 10;
    signals.push({ label: "Below book value", positive: true, weight: 5 });
  }

  // ── Profitability Score (0-100) ──
  let profitability = 50;
  if (params.roe !== null) {
    if (params.roe > 20) { profitability = 90; signals.push({ label: "High ROE (>20%)", positive: true, weight: 15 }); }
    else if (params.roe > 15) { profitability = 75; signals.push({ label: "Strong ROE", positive: true, weight: 10 }); }
    else if (params.roe > 10) { profitability = 60; signals.push({ label: "Adequate ROE", positive: true, weight: 5 }); }
    else { profitability = 35; signals.push({ label: "Low ROE (<10%)", positive: false, weight: 8 }); }
  }
  if (params.grossMargin !== null && params.grossMargin > 0.4) {
    profitability += 10; signals.push({ label: "Strong gross margin", positive: true, weight: 5 });
  }
  if (params.operatingMargin !== null && params.operatingMargin > 0.15) {
    profitability += 10; signals.push({ label: "Healthy operating margin", positive: true, weight: 5 });
  }

  // ── Growth Score (0-100) ──
  let growth = 50;
  if (params.revenueGrowth !== null) {
    if (params.revenueGrowth > 0.2) { growth = 85; signals.push({ label: "Strong revenue growth (>20%)", positive: true, weight: 15 }); }
    else if (params.revenueGrowth > 0.1) { growth = 70; signals.push({ label: "Solid revenue growth", positive: true, weight: 10 }); }
    else if (params.revenueGrowth > 0) { growth = 55; signals.push({ label: "Positive revenue growth", positive: true, weight: 5 }); }
    else { growth = 25; signals.push({ label: "Declining revenue", positive: false, weight: 12 }); }
  }
  if (params.epsGrowth !== null && params.epsGrowth > 0.15) {
    growth += 10; signals.push({ label: "Strong EPS growth", positive: true, weight: 8 });
  }

  // ── Financial Health Score (0-100) ──
  let financialHealth = 50;
  if (params.debtToEquity !== null) {
    if (params.debtToEquity < 0.3) { financialHealth = 85; signals.push({ label: "Low debt (D/E <0.3)", positive: true, weight: 15 }); }
    else if (params.debtToEquity < 0.8) { financialHealth = 70; signals.push({ label: "Manageable debt", positive: true, weight: 10 }); }
    else if (params.debtToEquity < 1.5) { financialHealth = 45; signals.push({ label: "Moderate debt", positive: false, weight: 5 }); }
    else { financialHealth = 20; signals.push({ label: "High debt (D/E >1.5)", positive: false, weight: 15 }); }
  }
  if (params.currentRatio !== null) {
    if (params.currentRatio > 2) { financialHealth += 10; signals.push({ label: "Strong liquidity", positive: true, weight: 5 }); }
    else if (params.currentRatio < 1) { financialHealth -= 10; signals.push({ label: "Low liquidity", positive: false, weight: 5 }); }
  }
  if (params.dividendYield !== null && params.dividendYield > 0.03) {
    financialHealth += 5; signals.push({ label: "Dividend yield >3%", positive: true, weight: 3 });
  }

  // ── Momentum Score (0-100) ──
  let momentum = 50;
  if (params.rsi !== null) {
    if (params.rsi >= 40 && params.rsi <= 60) { momentum = 60; signals.push({ label: "RSI neutral (40-60)", positive: true, weight: 5 }); }
    else if (params.rsi > 70) { momentum = 30; signals.push({ label: "RSI overbought (>70)", positive: false, weight: 5 }); }
    else if (params.rsi < 30) { momentum = 70; signals.push({ label: "RSI oversold (<30)", positive: true, weight: 8 }); }
  }
  if (params.profitGrowth !== null && params.profitGrowth > 0.15) {
    momentum += 15; signals.push({ label: "Strong profit growth", positive: true, weight: 10 });
  } else if (params.profitGrowth !== null && params.profitGrowth < 0) {
    momentum -= 10; signals.push({ label: "Declining profits", positive: false, weight: 8 });
  }

  // ── Composite Score ──
  const overall = Math.round(
    valuation * 0.15 + profitability * 0.25 + growth * 0.20 + financialHealth * 0.25 + momentum * 0.15
  );

  let category: HealthScore["category"];
  let color: string;
  if (overall >= 80) { category = "Very Healthy"; color = colors.marketGreen; }
  else if (overall >= 60) { category = "Healthy"; color = "#5AC8FA"; }
  else if (overall >= 40) { category = "Stable"; color = colors.marketOrange; }
  else if (overall >= 20) { category = "Weakening"; color = colors.marketRed; }
  else { category = "Unhealthy"; color = "#FF2D55"; }

  return {
    overall, category, color,
    subScores: { valuation, profitability, growth, financialHealth, momentum },
    signals: signals.sort((a, b) => b.weight - a.weight),
  };
}

export function HealthometerCard({
  params,
  symbol,
}: {
  params: HealthometerParams;
  symbol: string;
}) {
  const health = useMemo(() => calculateHealth(params), [params]);

  const categoryColors: Record<string, string> = {
    "Very Healthy": colors.marketGreen,
    "Healthy": "#5AC8FA",
    "Stable": colors.marketOrange,
    "Weakening": colors.marketRed,
    "Unhealthy": "#FF2D55",
  };

  return (
    <Card variant="elevated" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <CardLabel>Healthometer</CardLabel>
        <span style={{ fontSize: 10, color: colors.stone }}>Research tool · Not advice</span>
      </div>

      {/* Overall score ring */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <motion.circle
            cx="36" cy="36" r="30" fill="none"
            stroke={health.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={188.5}
            initial={{ strokeDashoffset: 188.5 }}
            animate={{ strokeDashoffset: 188.5 - (188.5 * health.overall) / 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
            transform="rotate(-90 36 36)"
          />
          <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
            fill={health.color} fontSize="18" fontWeight="700" fontFamily="monospace">
            {health.overall}
          </text>
        </svg>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: categoryColors[health.category] }}>
            {health.category}
          </div>
          <div style={{ fontSize: 11, color: colors.stone, marginTop: 2 }}>
            {symbol} · Multi-factor analysis
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
        {Object.entries(health.subScores).map(([key, score]) => (
          <div key={key} style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 11, fontWeight: 600, fontFamily: "monospace",
              color: score >= 70 ? colors.marketGreen : score >= 40 ? colors.marketOrange : colors.marketRed,
            }}>
              {score}
            </div>
            <div style={{ fontSize: 9, color: colors.stone, textTransform: "capitalize", marginTop: 2 }}>
              {key.replace(/([A-Z])/g, " $1").trim()}
            </div>
          </div>
        ))}
      </div>

      {/* Key signals */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {health.signals.slice(0, 6).map((signal, i) => (
          <motion.div
            key={signal.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 6px", borderRadius: radius.xs,
              background: signal.positive ? "rgba(52,199,89,0.04)" : "rgba(255,59,48,0.04)",
            }}
          >
            {signal.positive ? <TrendingUp size={10} color={colors.marketGreen} /> : <TrendingDown size={10} color={colors.marketRed} />}
            <span style={{ fontSize: 10, color: colors.textSecondary }}>{signal.label}</span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
