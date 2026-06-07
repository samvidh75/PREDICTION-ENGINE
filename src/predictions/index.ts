/**
 * Predictions Module — TRACK-32
 *
 * Prediction Registry, Live Forward Validation & Evidence Engine.
 * All exports are immutable-engineered — predictions are frozen before
 * outcomes occur, and validation is always forward-looking.
 *
 * Architecture:
 *   Phase 1:  PredictionRegistry          — immutable record store
 *   Phase 2:  DailyPredictionCapture      — daily snapshot engine
 *   Phase 3:  OutcomeValidationEngine     — forward validation at horizons
 *   Phase 4:  ConfidenceCalibrationEngine — do higher confidences outperform?
 *   Phase 5:  RankingAccuracyEngine       — top vs. bottom performance
 *   Phase 6:  EngineAttributionAnalyzer   — per-engine predictive power
 *   Phase 7:  ConfidenceV2Activator       — activate ConfidenceEngineV2
 *   Phase 8:  BenchmarkTracker            — daily benchmark observations
 *   Phase 9:  StatisticalValidationEngine — t-tests, p-values, IR
 *   Phase 10: AntiCheatingAuditor         — bias detection
 *   Phase 11: PredictionLedger            — public query API
 *   Phase 12: PredictionCredibilityScorer — institutional credibility score
 */

export { PredictionRegistry, predictionRegistry } from './PredictionRegistry';
export { DailyPredictionCapture, dailyPredictionCapture } from './DailyPredictionCapture';
export { OutcomeValidationEngine, outcomeValidationEngine } from './OutcomeValidationEngine';
export { ConfidenceCalibrationEngine, confidenceCalibrationEngine } from './ConfidenceCalibrationEngine';
export { RankingAccuracyEngine, rankingAccuracyEngine } from './RankingAccuracyEngine';
export { EngineAttributionAnalyzer, engineAttributionAnalyzer } from './EngineAttributionAnalyzer';
export { ConfidenceV2Activator, confidenceV2Activator } from './ConfidenceV2Activator';
export { BenchmarkTracker, benchmarkTracker } from './BenchmarkTracker';
export { StatisticalValidationEngine, statisticalValidationEngine } from './StatisticalValidationEngine';
export { AntiCheatingAuditor, antiCheatingAuditor } from './AntiCheatingAuditor';
export { PredictionLedger, predictionLedger } from './PredictionLedger';
export { PredictionCredibilityScorer, predictionCredibilityScorer } from './PredictionCredibilityScorer';
export { HistoricalRankingRebuilder, historicalRankingRebuilder } from './HistoricalRankingRebuilder';
export { ConfidenceRuntimeIntegration, confidenceRuntimeIntegration } from './ConfidenceRuntimeIntegration';

// Re-export all types
export type * from './types';
