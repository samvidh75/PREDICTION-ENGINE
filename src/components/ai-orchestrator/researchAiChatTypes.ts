/**
 * researchAiChatTypes — Contract types for the AI Research Chat feature.
 *
 * These types augment the core researchAiTypes with chat-specific
 * message formats, session state, and streaming events.
 *
 * ─── Design decisions ───────────────────────────────────────────────
 * 1. Messages are append-only (immutable). Each message gets a unique id.
 * 2. The assistant can send status updates between messages (typing, etc).
 * 3. Session captures the active context for multi-turn Q&A.
 * 4. Everything is serializable — no DOM references, no function closures.
 * =========================================================================
 */

import type { ResearchAiRuntime } from './researchAiTypes';

// ─── Chat Message ──────────────────────────────────────────────────

export interface ChatMessage {
  /** Unique message id (uuid or nanoid) */
  id: string;
  /** Who sent the message */
  role: 'user' | 'assistant';
  /** Message body text */
  text: string;
  /** Epoch ms when the message was dispatched */
  timestamp: number;
}

// ─── Chat Session ──────────────────────────────────────────────────

export interface ChatSession {
  /** Unique session id */
  id: string;
  /** All messages in this session, in chronological order */
  messages: ChatMessage[];
  /** Which runtime was last used */
  activeRuntime: ResearchAiRuntime | null;
  /** Whether the assistant is currently processing */
  processing: boolean;
  /** Epoch ms when the session started */
  createdAt: number;
}

// ─── Chat Events (for streaming / status updates) ──────────────────

export type ChatEvent =
  | { type: 'status'; message: string }
  | { type: 'token'; text: string }
  | { type: 'done'; runtime: ResearchAiRuntime }
  | { type: 'error'; message: string }
  | { type: 'guardrail_blocked'; reason: string }
  ;

// ─── Chat Controller Contract ───────────────────────────────────────

export interface ChatController {
  /** Send a user query → returns the assistant reply text */
  send: (query: string) => Promise<string>;
  /** Current session state (snapshot) */
  getSession: () => ChatSession;
  /** Reset to a fresh session */
  reset: () => void;
  /** Subscribe to streaming events during send() */
  onEvent: (cb: (evt: ChatEvent) => void) => () => void;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface ChatConfig {
  /** Max length of a single user query */
  maxQueryLength: number;
  /** Max conversation turns before auto-reset */
  maxTurns: number;
  /** Max message text length for display */
  maxMessageLength: number;
  /** Whether to log chat events to console */
  debug: boolean;
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  maxQueryLength: 500,
  maxTurns: 20,
  maxMessageLength: 2000,
  debug: false,
};
