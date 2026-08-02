/**
 * Calibration — TRACK-34 barrel export.
 * EngineCalibrationEngine (Phase 3) + DynamicWeightEngine (Phase 4).
 */

export { EngineCalibrationEngine, engineCalibrationEngine } from './EngineCalibrationEngine';
export type {
  CalibrationIssue,
  CalibrationRecommendation,
  CalibrationReport,
  EngineCorrelationStats,
} from './EngineCalibrationEngine';

export { DynamicWeightEngine, dynamicWeightEngine } from './DynamicWeightEngine';
export type { MarketRegime, EngineWeights } from './DynamicWeightEngine';