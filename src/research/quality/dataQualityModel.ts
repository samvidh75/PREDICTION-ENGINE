export interface DataQualityReport {
  symbol: string;
  presence: PresenceScore;
  freshness: FreshnessScore;
  consistency: ConsistencyScore;
  numericValidity: NumericValidityScore;
  completeness: CompletenessScore;
  confidence: ConfidenceScore;
  summary: QualitySummary;
}

export interface PresenceScore {
  quoteAvailable: boolean;
  fundamentalsAvailable: boolean;
  priceHistoryAvailable: boolean;
  overall: AvailabilityLevel;
}

export interface FreshnessScore {
  quoteAgeHours: number | null;
  fundamentalsAgeDays: number | null;
  priceHistoryAgeDays: number | null;
  quoteFresh: boolean;
  fundamentalsFresh: boolean;
  priceHistoryFresh: boolean;
  overall: FreshnessLevel;
}

export interface ConsistencyScore {
  quoteFundamentalsConsistent: boolean;
  crossProviderMatch: boolean;
  overall: ConsistencyLevel;
}

export interface NumericValidityScore {
  invalidNumericFields: string[];
  nanFields: string[];
  infinityFields: string[];
  overall: boolean;
}

export interface CompletenessScore {
  totalExpected: number;
  totalAvailable: number;
  completenessRatio: number;
  missingCritical: string[];
  overall: CompletenessLevel;
}

export interface ConfidenceScore {
  inputConfidence: number;
  coverageConfidence: number;
  freshnessConfidence: number;
  overallConfidence: number;
}

export interface QualitySummary {
  level: DataQualityLevel;
  pass: boolean;
  reasons: string[];
}

export type AvailabilityLevel = "Full" | "Partial" | "Minimal" | "None";
export type FreshnessLevel = "Current" | "Recent" | "Stale" | "Unknown";
export type ConsistencyLevel = "Consistent" | "Minor issues" | "Inconsistent" | "Unknown";
export type CompletenessLevel = "Complete" | "Partial" | "Insufficient";
export type DataQualityLevel = "High" | "Medium" | "Low" | "Insufficient";

export type ProductDataState = "Available" | "Partial" | "Research signals pending" | "Needs research";

export function productDataState(quality: DataQualityLevel): ProductDataState {
  switch (quality) {
    case "High": return "Available";
    case "Medium": return "Partial";
    case "Low": return "Research signals pending";
    case "Insufficient": return "Needs research";
  }
}
