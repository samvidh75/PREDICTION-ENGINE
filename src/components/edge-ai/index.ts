// src/components/edge-ai/index.ts
// Edge AI Research Chat — public API barrel export.
// =========================================================================

export { EdgeAiChat } from './EdgeAiChat';
export { useEdgeAiChat } from './useEdgeAiChat';
export { sanitizeChatReply, containsUnsafeChatCopy } from './edgeAiOutputGuardrails';
export { toEdgeAiResearchContext, buildResearchContext } from './edgeAiContextMapper';
export { EdgeAiChatSection } from './EdgeAiChatSection';
export type {
  EdgeAiChatMessage,
  EdgeAiWorkerStatus,
  EdgeAiResearchContext,
  EdgeAiWorkerInput,
  EdgeAiWorkerResult,
} from './edgeAiTypes';
