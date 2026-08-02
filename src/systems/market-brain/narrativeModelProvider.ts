// src/systems/market-brain/narrativeModelProvider.ts
// Phase 15 — Model-agnostic provider contract for optional LLM explainer enrichment.
//
// This defines the boundary any local or remote provider must satisfy.
// The default implementation is DisabledNarrativeModelProvider — see
// disabledNarrativeModelProvider.ts. No provider shall replace the
// deterministic engine; all providers are optional enrichments.

export interface NarrativeModelInput {
  /** Stock symbol (normalised, e.g. "TCS") */
  symbol: string;
  /** The deterministic narrative to enrich */
  narrative: string;
  /** Optional context / evidence points */
  context?: string[];
}

export interface NarrativeModelResult {
  ok: boolean;
  content?: string;
  reason?: string;
}

export interface NarrativeModelProvider {
  /** Human-readable provider name (e.g. "ollama", "disabled") */
  readonly name: string;

  /** Whether this provider is currently enabled */
  isEnabled(): boolean;

  /**
   * Enrich the given narrative using the provider model.
   * Returns {ok, content} on success or {ok, reason} on failure.
   * Must never throw — all errors are caught and returned as {ok: false, reason}.
   */
  explain(input: NarrativeModelInput): Promise<NarrativeModelResult>;
}
