export type FactorStatus = "active" | "inactive_missing_data" | "inactive_not_supported" | "experimental_internal" | "deprecated";

export type Directionality = "higher_is_better" | "lower_is_better" | "range_is_better" | "context_dependent";

export type FactorCategory =
  | "profitability_and_margins"
  | "growth_quality"
  | "balance_sheet_and_solvency"
  | "cash_flow_quality"
  | "valuation_context"
  | "price_momentum_and_trend"
  | "volatility_and_risk"
  | "liquidity_and_market_quality"
  | "capital_allocation_and_dividend"
  | "sector_and_peer_relative"
  | "data_quality_and_confidence";

export type FactorDimension =
  | "business_quality"
  | "financial_strength"
  | "growth_quality"
  | "valuation_context"
  | "risk_context"
  | "momentum"
  | "stability"
  | "capital_efficiency"
  | "data_confidence";

export type MissingDataBehavior = "return_null" | "reduce_confidence" | "use_default" | "skip_factor" | "warn_only";

export type NormalizationMethod = "identity" | "zscore" | "minmax" | "percentile" | "winsorize" | "log" | "inverse" | "binary_flag" | "sigmoid" | "decay";

export interface FactorDefinition {
  id: string;
  publicName: string;
  description: string;
  category: FactorCategory;
  dimension: FactorDimension;
  directionality: Directionality;
  requiredRawInputs: string[];
  unit: string;
  normalization: NormalizationMethod;
  winsorizeMin?: number;
  winsorizeMax?: number;
  missingDataBehavior: MissingDataBehavior;
  status: FactorStatus;
  displayable: boolean;
  minDataDays: number;
  confidenceImpact: "high" | "medium" | "low";
  staleAfterDays: number;
}

export interface FactorInput {
  symbol: string;
  sector: string | null;
  financials: Record<string, number | null | undefined>;
  prices: Record<string, number | null | undefined>;
  metrics: Record<string, number | null | undefined>;
  fundamentals: Record<string, number | null | undefined>;
}

export interface FactorResult {
  factorId: string;
  value: number | null;
  score: number | null;
  status: FactorStatus;
  active: boolean;
  reason: string | null;
}

export interface DimensionScore {
  dimension: FactorDimension;
  score: number | null;
  activeFactorCount: number;
  totalFactorCount: number;
  coverageRatio: number;
}

export interface PredictedFeature {
  factorId: string;
  value: number | null;
  score: number | null;
  directionality: Directionality;
  dimension: FactorDimension;
}

export interface PredictionV2Output {
  symbol: string;
  modelVersion: string;
  generatedAt: string;
  researchState: string;
  score: number | null;
  confidence: number | null;
  activeFactorCount: number;
  totalFactorCount: number;
  factorCoverageRatio: number;
  dimensionScores: DimensionScore[];
  topPositiveDrivers: string[];
  topRiskDrivers: string[];
  missingContextSummary: string[];
  explanation: string;
  validationStatus: "unvalidated" | "directionally_supported" | "mixed_evidence";
}
