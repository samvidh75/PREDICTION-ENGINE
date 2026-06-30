// src/components/ai-orchestrator/researchAiTypes.ts
// Phase 18 — Unified AI inference contracts for research surfaces.
//
// All types are safe for public-facing copy. No recommendation language,
// backend/provider terminology, or hype claims.
// =========================================================================

/** Surface identifier for the research feature requesting AI inference. */
export type ResearchAiSurface =
  | 'stock-detail'
  | 'why-did-this-move'
  | 'scanner'
  | 'compare'
  | 'watchlist'
  | 'alerts';

/** Capability levels a runtime can declare. */
export type ResearchAiCapability =
  | 'deterministic'
  | 'browser-edge'
  | 'user-local'
  | 'server-local';

/** Runtime identifiers for the orchestrator fallback chain. */
export type ResearchAiRuntime =
  | 'browser-edge'
  | 'user-local'
  | 'server-local'
  | 'deterministic';

/** Guardrail check result */
export interface GuardrailResult {
  allowed: boolean;
  sanitized: string;
  reason: string | null;
}

/** Research context shared across all surfaces. */
export interface ResearchAiContext {
  surface: ResearchAiSurface;
  symbol: string;
  companyName: string;
  /** Concatenated research narrative lines */
  narrative: string[];
  /** Flagged risks */
  risksToReview: string[];
  /** Items to watch */
  whatToWatch: string[];
  sector: string;
  currentPrice: number;
  changeAbs: number;
  changePercent: number;
  /** Surface-specific extra context (optional) */
  extraContext?: string;
}

export interface ResearchAiRequest {
  context: ResearchAiContext;
  question: string;
}

export interface ResearchAiResponse {
  ok: boolean;
  text: string | null;
  needsReview: boolean;
  runtime: ResearchAiRuntime;
}

/** A single chat message in the conversation. */
export interface ResearchAiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: number;
}

/** Capability descriptor returned by the registry. */
export interface RuntimeCapability {
  runtime: ResearchAiRuntime;
  available: boolean;
  ready: boolean;
  label: string;
}
