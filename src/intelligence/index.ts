/**
 * Intelligence module barrel.
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

// Stock analysis engines and scoring (canonical source: stockstory)
export {
  AccountingEngine, ConfidenceEngine, GrowthEngine, MomentumEngine,
  QualityEngine, qualityEngine, RiskEngine, StabilityEngine, ValuationEngine,
  scoreBands, scoreBandsDescending, scoreRanges,
  applyPenalties, createPenalty,
  PercentileEngine, SectorPercentileEngine,
} from '../stockstory';
