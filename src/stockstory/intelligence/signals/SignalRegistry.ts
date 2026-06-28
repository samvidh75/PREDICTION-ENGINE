/**
 * Signal Registry — Canonical register of every intelligence signal
 *
 * Defines ~30 signals across 19 categories. Each signal has:
 * - Direction rule (positive/negative based on thresholds)
 * - Strength rule (very_strong to weak based on magnitude)
 * - Impact rule (score contribution)
 * - Product-facing explanation template
 * - Required evidence fields
 */

import type { SignalTemplate } from "./SignalTypes";

export const SIGNAL_REGISTRY: Record<string, SignalTemplate> = {

  // ─── Financial Quality ───────────────────────────────────────

  high_roe: {
    id: "high_roe",
    category: "financial_quality",
    name: "High Return on Equity",
    directionRule: { type: "threshold", field: "roe", positiveAbove: 15 },
    strengthRule: { type: "distance", field: "roe", referenceValue: 15, thresholds: { very_strong: 30, strong: 15, moderate: 5 } },
    impactRule: { maxPositive: 8, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "long_term",
    requiredEvidence: ["roe"],
    explanationTemplate: "Return on Equity of {roe}% indicates efficient use of shareholder capital{strength}.",
  },

  high_roic: {
    id: "high_roic",
    category: "financial_quality",
    name: "High Return on Invested Capital",
    directionRule: { type: "threshold", field: "roic", positiveAbove: 12 },
    strengthRule: { type: "distance", field: "roic", referenceValue: 12, thresholds: { very_strong: 25, strong: 12, moderate: 4 } },
    impactRule: { maxPositive: 6, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "long_term",
    requiredEvidence: ["roic"],
    explanationTemplate: "ROIC of {roic}% suggests the business reinvests capital effectively{strength}.",
  },

  improving_roa: {
    id: "improving_roa",
    category: "financial_quality",
    name: "Improving Return on Assets",
    directionRule: { type: "threshold", field: "roa", positiveAbove: 5 },
    strengthRule: { type: "distance", field: "roa", referenceValue: 5, thresholds: { very_strong: 15, strong: 8, moderate: 3 } },
    impactRule: { maxPositive: 5, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["roa"],
    explanationTemplate: "Return on Assets of {roa}% reflects efficient asset utilisation{strength}.",
  },

  // ─── Balance Sheet ───────────────────────────────────────────

  high_debt_to_equity: {
    id: "high_debt_to_equity",
    category: "balance_sheet",
    name: "Elevated Debt-to-Equity",
    directionRule: { type: "threshold", field: "debtToEquity", negativeBelow: 1.5 },
    strengthRule: { type: "distance", field: "debtToEquity", referenceValue: 1.5, thresholds: { very_strong: 3.0, strong: 2.0, moderate: 0.5 } },
    impactRule: { maxPositive: 0, maxNegative: 10, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["debtToEquity"],
    explanationTemplate: "Debt-to-Equity of {debtToEquity}x raises balance sheet concerns{strength}. Review interest coverage and debt servicing ability.",
  },

  low_debt_leader: {
    id: "low_debt_leader",
    category: "balance_sheet",
    name: "Low Debt Leader",
    directionRule: { type: "threshold", field: "debtToEquity", positiveAbove: 0, negativeBelow: 0.5 }, // positive when below 0.5
    strengthRule: { type: "distance", field: "debtToEquity", referenceValue: 0, thresholds: { very_strong: 0.2, strong: 0.5, moderate: 1.0 } },
    impactRule: { maxPositive: 6, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "long_term",
    requiredEvidence: ["debtToEquity"],
    explanationTemplate: "Low debt levels (D/E {debtToEquity}x) provide financial flexibility{strength}.",
  },

  // ─── Profitability ───────────────────────────────────────────

  margin_expansion: {
    id: "margin_expansion",
    category: "profitability",
    name: "Margin Expansion",
    directionRule: { type: "threshold", field: "operatingMargin", positiveAbove: 20 },
    strengthRule: { type: "distance", field: "operatingMargin", referenceValue: 20, thresholds: { very_strong: 35, strong: 15, moderate: 5 } },
    impactRule: { maxPositive: 7, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["operatingMargin", "grossMargin"],
    explanationTemplate: "Operating margin of {operatingMargin}% with gross margin of {grossMargin}% indicates pricing power{strength}.",
  },

  margin_compression: {
    id: "margin_compression",
    category: "profitability",
    name: "Margin Under Pressure",
    directionRule: { type: "threshold", field: "operatingMargin", negativeBelow: 10 },
    strengthRule: { type: "distance", field: "operatingMargin", referenceValue: 10, thresholds: { very_strong: 3, strong: 5, moderate: 8 } },
    impactRule: { maxPositive: 0, maxNegative: 7, scaleWithStrength: true },
    defaultHorizon: "short_term",
    requiredEvidence: ["operatingMargin", "netMargin"],
    explanationTemplate: "Narrow margins (operating {operatingMargin}%, net {netMargin}%) may limit resilience to cost pressure{strength}.",
  },

  // ─── Growth ──────────────────────────────────────────────────

  revenue_acceleration: {
    id: "revenue_acceleration",
    category: "growth",
    name: "Revenue Growth Accelerating",
    directionRule: { type: "threshold", field: "revenueGrowth", positiveAbove: 15 },
    strengthRule: { type: "distance", field: "revenueGrowth", referenceValue: 15, thresholds: { very_strong: 40, strong: 25, moderate: 10 } },
    impactRule: { maxPositive: 7, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["revenueGrowth"],
    explanationTemplate: "Revenue growth of {revenueGrowth}% shows strong demand for the company's offerings{strength}.",
  },

  profit_acceleration: {
    id: "profit_acceleration",
    category: "growth",
    name: "Profit Growth Accelerating",
    directionRule: { type: "threshold", field: "profitGrowth", positiveAbove: 15 },
    strengthRule: { type: "distance", field: "profitGrowth", referenceValue: 15, thresholds: { very_strong: 40, strong: 25, moderate: 10 } },
    impactRule: { maxPositive: 7, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["profitGrowth"],
    explanationTemplate: "Profit growth of {profitGrowth}% indicates improving operating leverage{strength}.",
  },

  // ─── Valuation ───────────────────────────────────────────────

  valuation_expensive_vs_sector: {
    id: "valuation_expensive_vs_sector",
    category: "valuation",
    name: "Valuation Above Sector",
    directionRule: { type: "comparison", fieldA: "peRatio", fieldB: "sectorPE", positiveWhenGreater: false },
    strengthRule: { type: "distance", field: "peRatio", referenceValue: -1, thresholds: { very_strong: 2.0, strong: 1.5, moderate: 0.5 } },
    impactRule: { maxPositive: 0, maxNegative: 8, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["peRatio", "sectorPE"],
    explanationTemplate: "PE of {peRatio}x vs sector median of {sectorPE}x — valuation premium reflects expectations of above-sector growth{strength}.",
  },

  valuation_attractive_vs_quality: {
    id: "valuation_attractive_vs_quality",
    category: "valuation",
    name: "Attractive Valuation Relative to Quality",
    directionRule: { type: "threshold", field: "peRatio", positiveAbove: 0 },
    strengthRule: { type: "custom", evaluate: () => "moderate" },
    impactRule: { maxPositive: 6, maxNegative: 0, scaleWithStrength: false },
    defaultHorizon: "medium_term",
    requiredEvidence: ["peRatio", "roe", "sectorPE"],
    explanationTemplate: "Quality metrics (ROE {roe}%) at PE {peRatio}x vs sector {sectorPE}x — may present research opportunity.",
  },

  dividend_yield_supportive: {
    id: "dividend_yield_supportive",
    category: "valuation",
    name: "Dividend Yield Supportive",
    directionRule: { type: "threshold", field: "dividendYield", positiveAbove: 2 },
    strengthRule: { type: "distance", field: "dividendYield", referenceValue: 2, thresholds: { very_strong: 6, strong: 4, moderate: 2 } },
    impactRule: { maxPositive: 4, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "long_term",
    requiredEvidence: ["dividendYield"],
    explanationTemplate: "Dividend yield of {dividendYield}% provides income support to the research thesis{strength}.",
  },

  dividend_yield_trap_risk: {
    id: "dividend_yield_trap_risk",
    category: "valuation",
    name: "High Yield — Review Sustainability",
    directionRule: { type: "threshold", field: "dividendYield", negativeBelow: 6 },
    strengthRule: { type: "distance", field: "dividendYield", referenceValue: 6, thresholds: { very_strong: 10, strong: 8, moderate: 4 } },
    impactRule: { maxPositive: 0, maxNegative: 5, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["dividendYield", "profitGrowth"],
    explanationTemplate: "Very high dividend yield of {dividendYield}% with profit growth of {profitGrowth}% — review whether payout is sustainable.",
  },

  // ─── Technical / Momentum ────────────────────────────────────

  momentum_improving: {
    id: "momentum_improving",
    category: "technical_momentum",
    name: "Momentum Improving",
    directionRule: { type: "threshold", field: "momentum3m", positiveAbove: 5 },
    strengthRule: { type: "distance", field: "momentum3m", referenceValue: 5, thresholds: { very_strong: 30, strong: 15, moderate: 5 } },
    impactRule: { maxPositive: 5, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "short_term",
    requiredEvidence: ["momentum1m", "momentum3m"],
    explanationTemplate: "Price momentum of {momentum3m}% over 3 months with {momentum1m}% in the last month{strength}.",
  },

  high_volatility: {
    id: "high_volatility",
    category: "volatility",
    name: "Elevated Volatility",
    directionRule: { type: "threshold", field: "volatility", negativeBelow: 40 },
    strengthRule: { type: "distance", field: "volatility", referenceValue: 40, thresholds: { very_strong: 80, strong: 60, moderate: 30 } },
    impactRule: { maxPositive: 0, maxNegative: 6, scaleWithStrength: true },
    defaultHorizon: "short_term",
    requiredEvidence: ["volatility", "beta"],
    explanationTemplate: "Annualised volatility of {volatility}% (beta {beta}) — larger price swings may not suit all research approaches{strength}.",
  },

  deep_drawdown: {
    id: "deep_drawdown",
    category: "volatility",
    name: "Deep Price Drawdown",
    directionRule: { type: "threshold", field: "momentum6m", negativeBelow: -15 },
    strengthRule: { type: "distance", field: "momentum6m", referenceValue: -15, thresholds: { very_strong: -40, strong: -25, moderate: -10 } },
    impactRule: { maxPositive: 0, maxNegative: 5, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["momentum3m", "momentum6m"],
    explanationTemplate: "Price decline of {momentum6m}% over 6 months — review whether thesis still holds{strength}.",
  },

  // ─── Earnings ────────────────────────────────────────────────

  earnings_improved: {
    id: "earnings_improved",
    category: "earnings",
    name: "Earnings Quality Improving",
    directionRule: { type: "threshold", field: "epsGrowth", positiveAbove: 10 },
    strengthRule: { type: "distance", field: "epsGrowth", referenceValue: 10, thresholds: { very_strong: 40, strong: 25, moderate: 10 } },
    impactRule: { maxPositive: 7, maxNegative: 0, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["epsGrowth", "revenueGrowth"],
    explanationTemplate: "EPS growth of {epsGrowth}% supported by revenue growth of {revenueGrowth}% — earnings momentum improving{strength}.",
  },

  earnings_weakened: {
    id: "earnings_weakened",
    category: "earnings",
    name: "Earnings Under Pressure",
    directionRule: { type: "threshold", field: "epsGrowth", negativeBelow: -5 },
    strengthRule: { type: "distance", field: "epsGrowth", referenceValue: -5, thresholds: { very_strong: -30, strong: -15, moderate: -5 } },
    impactRule: { maxPositive: 0, maxNegative: 7, scaleWithStrength: true },
    defaultHorizon: "short_term",
    requiredEvidence: ["epsGrowth", "profitGrowth"],
    explanationTemplate: "EPS declining {epsGrowth}% with profit growth {profitGrowth}% — earnings trajectory needs review{strength}.",
  },

  // ─── Risk ────────────────────────────────────────────────────

  risk_rising: {
    id: "risk_rising",
    category: "risk",
    name: "Risk Profile Rising",
    directionRule: { type: "threshold", field: "debtToEquity", negativeBelow: 1.0 },
    strengthRule: { type: "custom", evaluate: () => "moderate" },
    impactRule: { maxPositive: 0, maxNegative: 8, scaleWithStrength: true },
    defaultHorizon: "medium_term",
    requiredEvidence: ["debtToEquity", "volatility"],
    explanationTemplate: "Multiple risk factors elevated — debt at {debtToEquity}x with volatility of {volatility}%. Review risk tolerance.{strength}",
  },

  thesis_improving: {
    id: "thesis_improving",
    category: "thesis_change",
    name: "Research Thesis Strengthening",
    directionRule: { type: "custom", evaluate: () => "positive" },
    strengthRule: { type: "custom", evaluate: () => "moderate" },
    impactRule: { maxPositive: 5, maxNegative: 0, scaleWithStrength: false },
    defaultHorizon: "medium_term",
    requiredEvidence: ["revenueGrowth", "profitGrowth", "roe"],
    explanationTemplate: "Revenue +{revenueGrowth}%, profit +{profitGrowth}%, ROE {roe}% — fundamentals strengthening across multiple dimensions.",
  },

  // ─── Governance ──────────────────────────────────────────────

  promoter_or_governance_risk_if_data_exists: {
    id: "promoter_or_governance_risk_if_data_exists",
    category: "governance",
    name: "Governance — Review Required",
    directionRule: { type: "custom", evaluate: () => "unknown" },
    strengthRule: { type: "custom", evaluate: () => "unknown" },
    impactRule: { maxPositive: 0, maxNegative: 8, scaleWithStrength: false },
    defaultHorizon: "long_term",
    requiredEvidence: [],
    explanationTemplate: "Governance and promoter data is limited for this company. Research governance independently before investing.",
  },

  // ─── Sector / Peer ───────────────────────────────────────────

  peer_outperformance: {
    id: "peer_outperformance",
    category: "peer_relative",
    name: "Outperforming Sector Peers",
    directionRule: { type: "comparison", fieldA: "roe", fieldB: "peerROE", positiveWhenGreater: true },
    strengthRule: { type: "custom", evaluate: () => "moderate" },
    impactRule: { maxPositive: 5, maxNegative: 0, scaleWithStrength: false },
    defaultHorizon: "medium_term",
    requiredEvidence: ["roe", "peerROE"],
    explanationTemplate: "ROE of {roe}% vs peer median {peerROE}% — stronger capital efficiency than sector peers.",
  },

  sector_leadership: {
    id: "sector_leadership",
    category: "sector_context",
    name: "Sector Leadership Position",
    directionRule: { type: "custom", evaluate: () => "positive" },
    strengthRule: { type: "custom", evaluate: () => "moderate" },
    impactRule: { maxPositive: 6, maxNegative: 0, scaleWithStrength: false },
    defaultHorizon: "long_term",
    requiredEvidence: ["marketCap", "revenueGrowth", "operatingMargin"],
    explanationTemplate: "Market position supported by scale ({marketCap}) and above-sector margins ({operatingMargin}%).",
  },

  // ─── Liquidity ───────────────────────────────────────────────

  low_liquidity_risk: {
    id: "low_liquidity_risk",
    category: "liquidity",
    name: "Low Liquidity — Trading Caution",
    directionRule: { type: "threshold", field: "volumeRatio", negativeBelow: 0.5 },
    strengthRule: { type: "distance", field: "volumeRatio", referenceValue: 0.5, thresholds: { very_strong: 0.15, strong: 0.3, moderate: 0.5 } },
    impactRule: { maxPositive: 0, maxNegative: 5, scaleWithStrength: true },
    defaultHorizon: "short_term",
    requiredEvidence: ["volumeRatio", "avgVolume"],
    explanationTemplate: "Low trading volume relative to average — execution may require patience{strength}.",
  },

  smallcap_risk: {
    id: "smallcap_risk",
    category: "liquidity",
    name: "Small/Micro Cap — Higher Uncertainty",
    directionRule: { type: "threshold", field: "marketCap", negativeBelow: 5000 },
    strengthRule: { type: "custom", evaluate: () => "moderate" },
    impactRule: { maxPositive: 0, maxNegative: 4, scaleWithStrength: false },
    defaultHorizon: "long_term",
    requiredEvidence: ["marketCap"],
    explanationTemplate: "Smaller market capitalisation may involve higher volatility and lower information availability.",
  },

  // ─── Event / Catalyst ────────────────────────────────────────

  negative_regulatory_event: {
    id: "negative_regulatory_event",
    category: "news_event",
    name: "Regulatory Risk — Monitor Developments",
    directionRule: { type: "custom", evaluate: () => "negative" },
    strengthRule: { type: "custom", evaluate: () => "unknown" },
    impactRule: { maxPositive: 0, maxNegative: 6, scaleWithStrength: false },
    defaultHorizon: "medium_term",
    requiredEvidence: [],
    explanationTemplate: "Regulatory developments may affect the operating environment. Review regulatory filings and sector policy.",
  },

  positive_order_win: {
    id: "positive_order_win",
    category: "catalyst",
    name: "Order Win / Business Expansion",
    directionRule: { type: "custom", evaluate: () => "positive" },
    strengthRule: { type: "custom", evaluate: () => "moderate" },
    impactRule: { maxPositive: 4, maxNegative: 0, scaleWithStrength: false },
    defaultHorizon: "medium_term",
    requiredEvidence: [],
    explanationTemplate: "Recent business developments may support revenue growth over the coming quarters. Review order book and execution track record.",
  },
};

export function getSignal(id: string): SignalTemplate | undefined {
  return SIGNAL_REGISTRY[id];
}

export function getSignalsByCategory(category: string): SignalTemplate[] {
  return Object.values(SIGNAL_REGISTRY).filter((s) => s.category === category);
}

export function getAllSignalCategories(): string[] {
  return [...new Set(Object.values(SIGNAL_REGISTRY).map((s) => s.category))];
}
