export type ResearchAiRuntime =
  | "deterministic"
  | "browser-edge"
  | "browser_local"
  | "user-local"
  | "user_local"
  | "server-local"
  | "server_local"
  | "unavailable";

export type ResearchAiCapability =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "loading"
  | "ready"
  | "failed"
  | "deterministic"
  | "browser-edge"
  | "user-local"
  | "server-local";

export type ResearchAiSurface =
  | "stock"
  | "healthometer"
  | "market_brain"
  | "why_move"
  | "scanner"
  | "compare"
  | "watchlist"
  | "alerts"
  | "portfolio"
  | "methodology";

export interface ResearchAiContext {
  surface: ResearchAiSurface;
  symbol?: string | null;
  companyName?: string | null;
  narrative?: string[];
  title?: string | null;
  headline?: string | null;
  sector?: string | null;
  currentPrice?: number | null;
  changeAbs?: number | null;
  changePercent?: number | null;
  extraContext?: string | null;
  healthometer?: {
    score?: number | null;
    state?: string | null;
    explanation?: string[];
    factors?: string[];
  } | null;
  researchNarrative?: string[];
  whatChanged?: string[];
  whyItMatters?: string[];
  evidenceToReview?: string[];
  risksToReview?: string[];
  whatToWatch?: string[];
  scannerContext?: string[];
  comparisonContext?: string[];
  watchlistContext?: string[];
  alertContext?: string[];
  historicalContext?: string[];
  methodologyNote?: string | null;
}

export interface ResearchAiRequest {
  surface?: ResearchAiSurface;
  question: string;
  context: ResearchAiContext;
  preferredRuntime?: ResearchAiRuntime;
}

export interface ResearchAiResponse {
  ok: boolean;
  text: string | null;
  runtime: ResearchAiRuntime;
  needsReview: boolean;
  reason?:
    | "unsupported"
    | "disabled"
    | "not_ready"
    | "unsafe_output"
    | "timeout"
    | "failed"
    | "no_context";
}

export interface GuardrailResult {
  allowed: boolean;
  sanitized: string;
  reason: string | null;
}

export interface ResearchAiChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: number;
}

export interface RuntimeCapability {
  runtime: ResearchAiRuntime;
  available: boolean;
  ready: boolean;
  label: string;
}
