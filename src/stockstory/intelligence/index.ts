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
