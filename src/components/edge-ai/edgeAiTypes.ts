// src/components/edge-ai/edgeAiTypes.ts
// Edge AI Research Chat — type contracts.
//
// All types are safe for public-facing copy. No recommendation language,
// backend/provider terminology, or hype claims.
// =========================================================================

/** Research context extracted from MarketBrain for the chat to reference. */
export interface EdgeAiResearchContext {
  /** Stock symbol (e.g. "TCS") */
  symbol: string;
  /** Company display name */
  companyName: string;
  /** Concatenated lines from the research narrative explanation */
  narrative: string[];
  /** Priority items the research flagged as risks */
  risksToReview: string[];
  /** Items to monitor going forward */
  whatToWatch: string[];
  /** Sector the company belongs to */
  sector: string;
  /** Current market price (in INR) */
  currentPrice: number;
  /** Absolute price change */
  changeAbs: number;
  /** Percentage price change */
  changePercent: number;
}

/** A single chat message in the conversation. */
export interface EdgeAiChatMessage {
  /** Unique message id */
  id: string;
  /** Who sent the message */
  role: 'user' | 'assistant';
  /** Message content (already sanitised) */
  content: string;
  /** When the message was created */
  createdAt: number;
}

/** State of the chat worker / model initialisation. */
export type EdgeAiWorkerStatus =
  | 'uninitialised'
  | 'ready'
  | 'processing'
  | 'error';

/** Result the worker returns after processing a user query. */
export interface EdgeAiWorkerResult {
  /** The reply text (pre-guardrails, to be sanitised) */
  rawReply: string;
}

/** Input the worker receives for processing. */
export interface EdgeAiWorkerInput {
  /** Research context the chat can reference */
  context: EdgeAiResearchContext;
  /** Conversation history (last N messages) */
  history: { role: 'user' | 'assistant'; content: string }[];
  /** The user's latest question */
  query: string;
}

// ── Pattern Scanner Types (Phase 18) ─────────────────────────────

export interface ScannerWorkerInput {
  type: 'scan';
  priceHistory: number[];
  volumeHistory: number[];
}

export interface ScannerWorkerResult {
  type: 'scan';
  healthometer: number;
  scannerFlag: string;
  signalStrength: number;
  technicalMetrics: {
    upperBand: number;
    lowerBand: number;
    middleBand: number;
    macdLine: number;
    divergencePattern: string;
  };
}

export type WorkerMessage = EdgeAiWorkerInput | ScannerWorkerInput;
export type WorkerResponse = EdgeAiWorkerResult | ScannerWorkerResult;
