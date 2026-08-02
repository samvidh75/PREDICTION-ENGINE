/**
 * Data Quality Types
 *
 * Scoring system for data quality across dimensions:
 * completeness, freshness, accuracy, consistency, and coverage.
 */

export type QualityDimension = 'completeness' | 'freshness' | 'accuracy' | 'consistency' | 'coverage';

export type QualityTier = 'A' | 'B' | 'C' | 'D' | 'F';

export interface FieldQuality {
  field: string;
  completeness: number; // 0–1
  isRequired: boolean;
  hasValidValue: boolean;
  issues: string[];
}

export interface QualityScore {
  /** Overall score 0–100 */
  score: number;

  /** Tier letter */
  tier: QualityTier;

  /** Dimension scores 0–100 */
  dimensions: Record<QualityDimension, number>;

  /** Per-field quality breakdown */
  fields: FieldQuality[];

  /** Number of issues found */
  issueCount: number;

  /** Quality issues identified */
  issues: string[];

  /** When this score was computed */
  evaluatedAt: string;
}

export interface FreshnessCheck {
  /** What data this check applies to */
  dataType: string;

  /** Symbol or identifier */
  identifier: string;

  /** When data was last updated */
  lastUpdated: string | null;

  /** Expected update frequency */
  expectedFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

  /** Whether data is considered stale */
  isStale: boolean;

  /** Days since last update */
  daysStale: number;

  /** Staleness threshold in days */
  maxAcceptableAgeDays: number;
}

export interface CompletenessReport {
  dataType: string;
  totalExpectedFields: number;
  filledFields: number;
  completenessRatio: number;
  missingRequiredFields: string[];
  missingOptionalFields: string[];
}
