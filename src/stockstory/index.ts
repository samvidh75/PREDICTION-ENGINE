/**
 * StockStory Engine — Barrel Export (RC-ENGINE-003)
 */

// Types
export {
  type EngineInputs,
  type StockStoryOutput,
  type CompanyClassification,
  type ConfidenceLevel,
  type GrowthEngineOutput,
  type QualityEngineOutput,
  type StabilityEngineOutput,
  type MomentumEngineOutput,
  type ValuationEngineOutput,
  type RiskEngineOutput,
  type ConfidenceEngineOutput,
  clampScore,
  weightedAverage,
} from './types';

// Orchestrator
export { StockStoryEngine, stockStoryEngine } from './StockStoryEngine';

// Individual engines
export { GrowthEngine, growthEngine } from './engines/GrowthEngine';
export { QualityEngine, qualityEngine } from './engines/QualityEngine';
export { StabilityEngine, stabilityEngine } from './engines/StabilityEngine';
export { MomentumEngine, momentumEngine } from './engines/MomentumEngine';
export { ValuationEngine, valuationEngine } from './engines/ValuationEngine';
export { RiskEngine, riskEngine } from './engines/RiskEngine';
export { ConfidenceEngine, confidenceEngine } from './engines/ConfidenceEngine';
export { AccountingEngine, accountingEngine } from './engines/AccountingEngine';
export type { AccountingEngineOutput } from './engines/AccountingEngine';

// Sector
export { getSectorProfile, listSectorProfiles } from './SectorAdapter';
export type { SectorProfile } from './SectorAdapter';
export {
  getSectorWeights,
  computeSectorWeightedHealth,
  mapSectorToType,
} from './sectors/SectorWeightEngine';
export type { SectorWeights, SectorType } from './sectors/SectorWeightEngine';

// Scoring
export { normalize, getBand, normalizeScore } from './scoring/ScoreNormalizer';
export type { NormalizedScore, ScoreBand } from './scoring/ScoreNormalizer';
export { scoreBands, scoreBandsDescending, scoreRanges } from './scoring/BandScorer';
export { applyPenalties, createPenalty } from './scoring/PenaltyScorer';

// Risk penalties
export { evaluateAccountingPenalty } from './risk/AccountingPenalty';
export { evaluateDebtPenalty } from './risk/DebtPenalty';
export { evaluateVolatilityPenalty } from './risk/VolatilityPenalty';
export { evaluateGovernancePenalty } from './risk/GovernancePenalty';

// Config
export {
  GROWTH_WEIGHTS,
  QUALITY_WEIGHTS,
  STABILITY_WEIGHTS,
  MOMENTUM_WEIGHTS,
  VALUATION_WEIGHTS,
  RISK_WEIGHTS,
} from './config/EngineWeights';

// Percentile scoring
export { PercentileEngine } from './scoring/PercentileEngine';
export type { Distribution, PercentileScoreMap } from './scoring/PercentileEngine';
export { SectorPercentileEngine } from './scoring/SectorPercentileEngine';
export type { PercentileMetric } from './scoring/SectorPercentileEngine';
export { SectorDistributionEngine } from './analytics/SectorDistributionEngine';

// Healthometer v2
export { HealthometerEngine, healthometerEngine } from './healthometer/HealthometerEngine';
export { buildHealthometerInput } from './healthometer/inputBuilder';
export { classifyHealthometer } from './healthometer/labels';
export type {
  HealthometerLabel,
  HealthometerDimension,
  HealthometerScore,
  HealthometerInput,
} from './healthometer/types';

// Algorithmic Analysis
export { AlgorithmicAnalysisEngine, algorithmicAnalysisEngine } from './analysis/AlgorithmicAnalysisEngine';
export type { AnalysisNarrative, AlgorithmicAnalysisResult } from './analysis/AlgorithmicAnalysisEngine';
