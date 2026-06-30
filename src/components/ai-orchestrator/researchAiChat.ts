export { useResearchAiChat } from './useResearchAiChat';
export type { ChatState, UseResearchAiChatOptions } from './useResearchAiChat';

export type {
  ChatMessage,
  ChatSession,
  ChatEvent,
  ChatController,
  ChatConfig,
} from './researchAiChatTypes';
export { DEFAULT_CHAT_CONFIG } from './researchAiChatTypes';

export {
  validateChatQuery,
  checkTurnLimit,
  sanitizeChatOutput,
} from './researchAiChatGuardrails';
export type { ChatGuardrailResult } from './researchAiChatGuardrails';
