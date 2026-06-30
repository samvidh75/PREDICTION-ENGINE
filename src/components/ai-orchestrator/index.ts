// src/components/ai-orchestrator/index.ts
// Phase 18 — Barrel export for the AI inference orchestrator.
// =========================================================================

export type {
  ResearchAiSurface,
  ResearchAiCapability,
  ResearchAiRuntime,
  GuardrailResult,
  ResearchAiContext,
  ResearchAiRequest,
  ResearchAiResponse,
  ResearchAiChatMessage,
  RuntimeCapability,
} from './researchAiTypes';

export {
  buildStockResearchContext,
  buildScannerContext,
  buildCompareContext,
  buildWatchlistContext,
  buildAlertContext,
  compressResearchContext,
} from './researchAiContext';

export {
  applyGuardrails,
  applyResponseGuardrails,
  fallbackIfEmpty,
  trimConversation,
} from './researchAiGuardrails';

export {
  initRuntimeRegistry,
  getRuntimeRegistry,
  getFallbackOrder,
  isRuntimeAvailable,
  getBestAvailableRuntime,
  hasAIRuntime,
  enableServerLocalRuntime,
} from './researchAiRuntimeRegistry';

export {
  useResearchAiOrchestrator,
} from './useResearchAiOrchestrator';

export type {
  UseResearchAiOrchestratorReturn,
} from './useResearchAiOrchestrator';

export {
  queryBrowserEdgeWorker,
} from './browserEdgeRuntime';

export {
  queryUserLocalRuntime,
  pingUserLocalRuntime,
  tryActivateUserLocalRuntime,
} from './userLocalRuntime';

export {
  queryServerLocalRuntime,
} from './serverLocalRuntime';

export {
  executeTask,
} from './researchWorkerTasks';

export type {
  ResearchWorkerTask,
  ResearchWorkerResult,
} from './researchWorkerTasks';

export {
  ResearchAiChatPanel,
} from './ResearchAiChatPanel';

export {
  ResearchAiExplanationPanel,
} from './ResearchAiExplanationPanel';
