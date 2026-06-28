/**
 * StockStory Intelligence — Barrel Export
 *
 * Public API surface for the intelligence sub-system.
 */

export { type IntelligenceInput, type StockIntelligenceReport, IntelligenceError } from './types';
export type {
  FinancialEngineOutput,
  TechnicalEngineOutput,
  ValuationEngineOutput,
  RiskEngineOutput,
  SectorEngineOutput,
  NewsEngineOutput,
  EarningsEngineOutput,
  EventEngineOutput,
  RAGEngineOutput,
  ScoredMetric,
} from './types';

export {
  clampScore,
  toScoreBand,
  weightedAverage,
  zScoreToScore,
  percentileToScore,
  confidenceWeight,
  gradeNumeric,
  linearScale,
  toFinite,
} from './scoring';

// ─── Engines ──────────────────────────────────────────────────────

export { FinancialEngine, financialEngine } from './engines/FinancialEngine';
export { TechnicalEngine, technicalEngine } from './engines/TechnicalEngine';
export { ValuationEngine, valuationEngine } from './engines/ValuationEngine';
export { RiskEngine, riskEngine } from './engines/RiskEngine';
export { SectorEngine, sectorEngine } from './engines/SectorEngine';
export { NewsEngine, newsEngine } from './engines/NewsEngine';
export { EarningsEngine, earningsEngine } from './engines/EarningsEngine';
export { EventEngine, eventEngine } from './engines/EventEngine';
export { RAGEngine, ragEngine } from './engines/RAGEngine';

// ─── RAG / Knowledge ──────────────────────────────────────────────

export { KnowledgeBase, globalKnowledgeBase } from './rag/KnowledgeBase';
export type { KnowledgeDocument, KnowledgeQueryResult } from './rag/KnowledgeBase';

// ─── LLM / Explainability ─────────────────────────────────────────

export {
  LLMExplainer,
  llmExplainer,
  DeterministicExplainProvider,
  CachedExplainProvider,
} from './llm/LLMExplainer';
export type { ExplainProvider, ExplainRequest, ExplainResponse } from './llm/LLMExplainer';

// ─── Orchestrator ─────────────────────────────────────────────────

export { StockStoryOrchestrator, orchestrator } from './orchestrator/StockStoryOrchestrator';
export type { OrchestratorOptions } from './orchestrator/StockStoryOrchestrator';

// ─── Persistence ──────────────────────────────────────────────────

export { IntelligenceCache, globalIntelligenceCache } from './persistence/IntelligenceCache';

// ─── Scenario Simulation ──────────────────────────────────────────

export { ScenarioOrchestrator, scenarioOrchestrator } from './scenario/ScenarioOrchestrator';
export type { ScenarioOrchestrationInput, ScenarioOrchestrationResult, BaseScores } from './scenario/ScenarioOrchestrator';

export type {
  ScenarioKind,
  ScenarioSeverity,
  ScenarioAssumptions,
  ScenarioInput,
  ScenarioOutput,
  ScenarioImpact,
  ScenarioValidationResult,
  SimulationTrait,
  PeerScenarioResult,
  PeerScenarioComparison,
  SimResult,
  FinancialSimResult,
  ValuationSimResult,
  EarningsSimResult,
  RiskSimResult,
  TechnicalSimResult,
  SectorSimResult,
  PeerSimResult,
  ThesisAssessment,
  CompoundThesis,
  TrackedCompanyStress,
  PortfolioStressOutput,
} from './scenario/ScenarioTypes';

export { ScenarioRegistry } from './scenario/ScenarioRegistry';
export { ScenarioValidator } from './scenario/ScenarioValidator';
export {
  SCENARIO_PRESETS,
  buildPresetScenario,
} from './scenario/ScenarioPresets';

export {
  FinancialStressSimulator,
} from './scenario/FinancialStressSimulator';
export {
  ValuationStressSimulator,
} from './scenario/ValuationStressSimulator';
export {
  EarningsStressSimulator,
} from './scenario/EarningsStressSimulator';
export {
  RiskStressSimulator,
} from './scenario/RiskStressSimulator';
export {
  TechnicalStressSimulator,
} from './scenario/TechnicalStressSimulator';
export {
  SectorStressSimulator,
} from './scenario/SectorStressSimulator';
export {
  PeerStressSimulator,
} from './scenario/PeerStressSimulator';

export {
  ThesisLifecycleEngine,
} from './scenario/ThesisLifecycleEngine';
export {
  WatchlistEngine,
} from './scenario/WatchlistEngine';
export type {
  WatchlistReport,
  WatchlistItem,
} from './scenario/WatchlistEngine';
export {
  PortfolioStressEngine,
} from './scenario/PortfolioStressEngine';
export {
  ExplainabilityEngine,
} from './scenario/ExplainabilityEngine';
export type {
  ScenarioExplanation,
  ExplanationSegment,
} from './scenario/ExplainabilityEngine';

export {
  deriveDeltas,
  safeSimulatedScore,
  scoreDelta,
  computeScenarioConfidence,
  containsForbiddenLanguage,
  assertComplianceSafe,
} from './scenario/ScenarioUtils';

// ─── Mappers ──────────────────────────────────────────────────────

export {
  mapCompanyIdentity,
  mapFinancialSnapshot,
  mapTechnicalSnapshot,
  mapNewsItems,
  mapEarningsSnapshot,
  mapSectorContext,
} from './mappers';

export type {
  CompanyIdentityRaw, CompanyIdentityMapped,
  FinancialSnapshotRaw, FinancialSnapshotMapped,
  TechnicalSnapshotRaw, TechnicalSnapshotMapped,
  NewsItemsRaw, SentimentMapped,
  EarningsSnapshotRaw, EarningsSnapshotMapped,
  SectorContextRaw, SectorContextMapped,
} from './mappers';

// ─── API ──────────────────────────────────────────────────────────

export { registerIntelligenceRoutes } from './api/intelligenceRoutes';
