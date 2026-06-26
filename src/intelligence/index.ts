/**
 * Intelligence module barrel.
 * Re-exports from canonical locations — stockstory engines, intelligence prediction/narrative modules.
 */

export { ExplainabilityEngine } from "./ExplainabilityEngine";
export { NarrativeEngine } from "./NarrativeEngine";

export { PredictionEngineAdapter, predictionEngineAdapter } from "./prediction/PredictionEngineAdapter";
export type { PredictiveEngineOutput, HealthVector } from "./prediction/PredictionEngineAdapter";
export { DerivedMetricsEngine } from "./prediction/DerivedMetricsEngine";
export type { DerivedMetricsInput, DerivedMetricsOutput } from "./prediction/DerivedMetricsEngine";

export { PredictionDiffEngine, predictionDiffEngine } from "./PredictionDiffEngine";
export { DataFreshnessEngine, dataFreshnessEngine } from "./DataFreshnessEngine";
export type { FreshnessStatus } from "./DataFreshnessEngine";
export type { IntelligenceSignal, PredictionDiffResult, SymbolDiff, FactorDelta, PredictionSnapshot } from "./PredictionDiffEngine";
export { PredictionExplanationEngine, predictionExplanationEngine } from "./PredictionExplanationEngine";
export type { ExplanationOutput, ExplanationDriver, FactorContribution, HistoricalReliability } from "./PredictionExplanationEngine";

// Stock analysis engines (canonical source: stockstory/)
export {
  AccountingEngine, accountingEngine,
  ConfidenceEngine, confidenceEngine,
  GrowthEngine, growthEngine,
  MomentumEngine, momentumEngine,
  QualityEngine, qualityEngine,
  RiskEngine, riskEngine,
  StabilityEngine, stabilityEngine,
  ValuationEngine, valuationEngine,
} from '../stockstory';

// Scoring utilities (canonical source: stockstory/)
export {
  scoreBands, scoreBandsDescending, scoreRanges,
  applyPenalties, createPenalty,
  PercentileEngine, SectorPercentileEngine,
} from '../stockstory';

export type {
  ScoreBand, BandConfig, RangeScore,
  Penalty, PenaltyResult,
} from '../stockstory';
