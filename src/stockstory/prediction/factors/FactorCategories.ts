export const FACTOR_CATEGORIES: Record<string, { label: string; minCount: number }> = {
  profitability_and_margins: { label: "Profitability & Margins", minCount: 20 },
  growth_quality: { label: "Growth Quality", minCount: 25 },
  balance_sheet_and_solvency: { label: "Balance Sheet & Solvency", minCount: 25 },
  cash_flow_quality: { label: "Cash Flow Quality", minCount: 20 },
  valuation_context: { label: "Valuation Context", minCount: 30 },
  price_momentum_and_trend: { label: "Price Momentum & Trend", minCount: 30 },
  volatility_and_risk: { label: "Volatility & Risk", minCount: 25 },
  liquidity_and_market_quality: { label: "Liquidity & Market Quality", minCount: 15 },
  capital_allocation_and_dividend: { label: "Capital Allocation & Dividends", minCount: 15 },
  sector_and_peer_relative: { label: "Sector & Peer-Relative Context", minCount: 20 },
  data_quality_and_confidence: { label: "Data Quality & Confidence", minCount: 20 },
};

export const FACTOR_DIMENSIONS: Record<string, { label: string; weight: number; minFactors: number }> = {
  business_quality: { label: "Business Quality", weight: 0.20, minFactors: 5 },
  financial_strength: { label: "Financial Strength", weight: 0.15, minFactors: 5 },
  growth_quality: { label: "Growth Quality", weight: 0.20, minFactors: 5 },
  valuation_context: { label: "Valuation Context", weight: 0.15, minFactors: 3 },
  risk_context: { label: "Risk Context", weight: 0.10, minFactors: 3 },
  momentum: { label: "Momentum", weight: 0.10, minFactors: 3 },
  stability: { label: "Stability", weight: 0.05, minFactors: 2 },
  capital_efficiency: { label: "Capital Efficiency", weight: 0.03, minFactors: 2 },
  data_confidence: { label: "Data Confidence", weight: 0.02, minFactors: 1 },
};
