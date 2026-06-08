/**
 * Intelligence module barrel.
 * Single entry point for all intelligence engines, predictions, narratives, and scoring.
 * 
 * Consolidates: src/intelligence/, src/engine/, src/engines/, src/stockstory/engines/, src/stockstory/scoring/
 */

// Explainability & Narratives
export { ExplainabilityEngine } from "./ExplainabilityEngine";
export { NarrativeEngine } from "./NarrativeEngine";

// Prediction engines (originally from src/engine/ and src/engines/)
export { PredictionEngineAdapter, predictionEngineAdapter } from "./prediction/PredictionEngineAdapter";
export type { PredictiveEngineOutput, HealthVector } from "./prediction/PredictionEngineAdapter";
export { DerivedMetricsEngine } from "./prediction/DerivedMetricsEngine";
export type { DerivedMetricsInput, DerivedMetricsOutput } from "./prediction/DerivedMetricsEngine";

// Stock analysis engines (originally from stockstory/engines/)
export { AccountingEngine } from "./scoring/AccountingEngine";
export { ConfidenceEngine } from "./scoring/ConfidenceEngine";
export { GrowthEngine } from "./scoring/GrowthEngine";
export { MomentumEngine } from "./scoring/MomentumEngine";
export { QualityEngine, qualityEngine } from "./scoring/QualityEngine";
export { RiskEngine } from "./scoring/RiskEngine";
export { StabilityEngine } from "./scoring/StabilityEngine";
export { ValuationEngine } from "./scoring/ValuationEngine";

// TRACK-95O — Prediction Diff Engine (real signal generation)
export { PredictionDiffEngine, predictionDiffEngine } from "./PredictionDiffEngine";

// TRACK-96A — Data Freshness Engine
export { DataFreshnessEngine, dataFreshnessEngine } from "./DataFreshnessEngine";
export type { FreshnessStatus } from "./DataFreshnessEngine";
export type { IntelligenceSignal, PredictionDiffResult, SymbolDiff, FactorDelta, PredictionSnapshot } from "./PredictionDiffEngine";

// TRACK-95T — Prediction Explainability Engine
export { PredictionExplanationEngine, predictionExplanationEngine } from "./PredictionExplanationEngine";
export type { ExplanationOutput, ExplanationDriver, FactorContribution, HistoricalReliability } from "./PredictionExplanationEngine";

// Scoring utilities
export { scoreBands, scoreBandsDescending, scoreRanges } from "./scoring/BandScorer";
export type { ScoreBand, BandConfig, RangeScore } from "./scoring/BandScorer";
export { applyPenalties, createPenalty } from "./scoring/PenaltyScorer";
export type { Penalty, PenaltyResult } from "./scoring/PenaltyScorer";
export { PercentileEngine } from "./scoring/PercentileEngine";
export { SectorPercentileEngine } from "./scoring/SectorPercentileEngine";
