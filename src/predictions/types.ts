/**
 * Prediction Registry — Shared Types
 * TRACK-32: Prediction Registry, Live Forward Validation & Evidence Engine
 * 
 * Immutable prediction records. Append-only. No updates after creation.
 * Predictions are frozen before outcomes occur — no retroactive edits.
 */

export type ValidationStatus = 'pending' | 'in_progress' | 'validated' | 'expired';
export type Classification = 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Critical';
export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export interface CreatePredictionInput {
  symbol: string;
  predictionDate: string;
  rankingScore: number;
  classification: Classification;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  qualityScore: number;
  growthScore: number;
  valueScore: number;
  momentumScore: number;
  riskScore: number;
  sectorScore: number;
  priceAtPrediction: number;
  benchmarkLevel: number;
  predictionHorizon: number;
  createdBy?: string;
}

export interface PredictionRecord {
  id: string;
  symbol: string;
  prediction_date: string;         // ISO date — when prediction was made
  ranking_score: number;           // 0-100 composite StockStory score
  classification: Classification;
  confidence_score: number;        // 0-100 from ConfidenceEngineV2
  confidence_level: ConfidenceLevel;

  // Engine scores (0-100 each)
  quality_score: number;
  growth_score: number;
  value_score: number;
  momentum_score: number;
  risk_score: number;
  sector_score: number;

  // Market context at prediction time
  price_at_prediction: number;
  benchmark_level: number;         // NIFTY 50 level

  // Forward validation
  prediction_horizon: number;      // days (7, 30, 90, 180, 365)
  validation_status: ValidationStatus;
  validated_at: string | null;     // ISO timestamp of validation
  future_return: number | null;    // % return over horizon
  benchmark_return: number | null; // % benchmark return over horizon
  alpha: number | null;            // future_return - benchmark_return

  // Audit
  created_at: string;
  created_by: string;              // 'DailyPredictionCapture' | 'ManualSnapshot'
}

export interface PredictionSlice {
  date: string;
  top10: PredictionRecord[];
  top25: PredictionRecord[];
  top50: PredictionRecord[];
  bottom10: PredictionRecord[];
  bottom25: PredictionRecord[];
  benchmark_level: number;
  n_symbols_ranked: number;
}

export interface ValidationResult {
  prediction_id: string;
  symbol: string;
  horizon_days: number;
  predicted_at: string;
  validated_at: string;
  ranking_score: number;
  future_return: number;
  benchmark_return: number;
  alpha: number;
  hit: boolean;                    // alpha > 0
}

export interface ConfidenceCalibrationBucket {
  level: ConfidenceLevel;
  count: number;
  validated_count: number;
  mean_return: number;
  median_return: number;
  mean_alpha: number;
  volatility: number;
  max_drawdown: number;
  hit_rate: number;
}

export interface RankingAccuracyResult {
  test: string;
  top_cohort: string;
  bottom_cohort: string;
  top_mean_return: number;
  bottom_mean_return: number;
  spread: number;
  top_hit_rate: number;
  bottom_hit_rate: number;
  top_alpha: number;
  bottom_alpha: number;
  verdict: string;
}

export interface EngineAttribution {
  engine: string;
  information_coefficient: number; // rank correlation between engine score and future return
  rank_correlation: number;        // Spearman
  forward_return_correlation: number; // Pearson
  n_predictions: number;
  interpretation: string;
}

export interface StatisticalValidation {
  test_name: string;
  t_statistic: number;
  p_value: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
  information_ratio: number;
  is_significant: boolean;         // p < 0.05
  sample_size: number;
}

export interface BenchmarkObservation {
  date: string;
  nifty50: number;
  nifty100: number;
  nifty500: number;
}

export interface PredictionCredibilityScore {
  overall_score: number;           // 0-100
  components: {
    hit_rate: { score: number; weight: number };
    alpha: { score: number; weight: number };
    confidence_accuracy: { score: number; weight: number };
    statistical_significance: { score: number; weight: number };
    benchmark_outperformance: { score: number; weight: number };
    data_integrity: { score: number; weight: number };
  };
  level: string;                   // 'Insufficient Forward Evidence' | 'Analytical Framework' | etc.
  n_validated_predictions: number;
  threshold_met: boolean;          // >= 30 validated predictions
}

export type PredictionClassification =
  | 'INSUFFICIENT FORWARD EVIDENCE'
  | 'Analytical Framework'
  | 'Research Platform'
  | 'Predictive Research Platform'
  | 'Validated Prediction Engine'
  | 'Institutional Prediction Platform';

export interface LivePredictionCertification {
  classification: PredictionClassification;
  frozen_before_outcomes: boolean;
  confidence_correlates_with_success: boolean;
  top_ranked_outperform: boolean;
  alpha_statistically_significant: boolean;
  independently_reproducible: boolean;
  is_predictive_system: boolean;
  n_validated: number;
  evidence_summary: string;
  generated_at: string;
}
