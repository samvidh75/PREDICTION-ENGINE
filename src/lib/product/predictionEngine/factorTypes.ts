export type FactorCategory =
  | "valuation"
  | "profitability"
  | "growth"
  | "balance_sheet"
  | "cash_flow"
  | "capital_efficiency"
  | "dividends"
  | "momentum"
  | "volatility"
  | "liquidity"
  | "trend_strength"
  | "drawdown"
  | "sector_context"
  | "peer_context"
  | "earnings_quality"
  | "governance_risk"
  | "ownership"
  | "events"
  | "technical_indicators"
  | "macro_regime";

export type FactorAvailability = "active" | "planned" | "unavailable";

export type FactorVisibility = "public" | "internal";

export interface FactorDefinition {
  id: string;
  label: string;
  category: FactorCategory;
  description: string;
  expectedInputField: string;
  availability: FactorAvailability;
  visibility: FactorVisibility;
  riskOfMisuse?: string;
}

export type PublicResearchStance =
  | "High conviction"
  | "Watch"
  | "Needs review"
  | "Risk rising"
  | "Thesis improving"
  | "Avoid for now"
  | "Partial research context"
  | "Not enough information";
