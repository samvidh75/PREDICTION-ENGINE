/**
 * DataQualityTypes — types for data quality, freshness, and completeness scoring.
 *
 * Scores are computed internally and drive research confidence levels
 * and the product-facing limitation label.
 */

// ---------------------------------------------------------------------------
// Scored dimensions
// ---------------------------------------------------------------------------

export type QualityDimension =
  | "financial_completeness"
  | "price_completeness"
  | "technical_completeness"
  | "news_availability"
  | "filings_availability"
  | "results_availability"
  | "document_availability"
  | "peer_sector_completeness"
  | "freshness"
  | "conflict_rate"
  | "confidence";

// ---------------------------------------------------------------------------
// Quality score
// ---------------------------------------------------------------------------

export interface DataQualityScore {
  /** Overall quality score 0–1. */
  overall: number;

  /** Per-dimension scores 0–1. */
  dimensions: Partial<Record<QualityDimension, number>>;

  /** Internal fields that are missing or incomplete. */
  missingFields: string[];

  /** Internal freshness detail. */
  freshnessDetail: string;

  /** Safe public-facing limitation text. */
  publicLimitation: string;

  /** When this score was computed. */
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

export interface DataFreshnessInfo {
  /** Freshness score 0–1. */
  score: number;

  /** Human-readable internal detail. */
  detail: string;

  /**
   * Known staleness per dataset category.
   * Key is a logical dataset name (e.g. "market_prices", "fundamentals").
   */
  stalenessByDataset: Record<string, StalenessInfo | undefined>;

  /** Whether any critical dataset is stale. */
  hasCriticalStaleness: boolean;
}

export interface StalenessInfo {
  /** Age of the most recent data point in milliseconds. */
  ageMs: number;

  /** Expected maximum age before data is considered stale. */
  maxAcceptableAgeMs: number;

  /** Human-readable label (e.g. "2d stale", "current"). */
  label: string;
}

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

export interface DataCompleteness {
  /** Completeness score 0–1. */
  score: number;

  /** Per-category completeness. */
  byCategory: Record<string, number | undefined>;

  /** Fields or data points that are missing. */
  gaps: DataGap[];

  /** Whether the overall picture is considered sufficient for research. */
  isResearchable: boolean;
}

export interface DataGap {
  /** Logical field or dataset name. */
  field: string;

  /** Severity of the gap. */
  severity: "info" | "warning" | "critical";

  /** Human-readable description. */
  description: string;
}

// ---------------------------------------------------------------------------
// Research confidence tier
// ---------------------------------------------------------------------------

export type ResearchConfidenceTier =
  | "high"
  | "medium"
  | "low"
  | "limited"
  | "insufficient";

export function toConfidenceTier(overall: number): ResearchConfidenceTier {
  if (overall >= 0.8) return "high";
  if (overall >= 0.6) return "medium";
  if (overall >= 0.4) return "low";
  if (overall >= 0.2) return "limited";
  return "insufficient";
}

export function toPublicLimitation(tier: ResearchConfidenceTier): string {
  switch (tier) {
    case "high":
      return "This research view is based on available information.";
    case "medium":
      return "This research view has limited information.";
    case "low":
      return "This research view has limited information.";
    case "limited":
      return "This research view has limited information.";
    case "insufficient":
      return "This research view has limited information.";
  }
}
