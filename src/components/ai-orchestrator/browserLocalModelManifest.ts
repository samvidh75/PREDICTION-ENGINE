/**
 * Phase 18E — Internal-only model/runtime configuration.
 *
 * Never render model ID or runtime name in public UI.
 * The manifest is consumed only by the Web Worker and runtime adapter.
 */

export type BrowserLocalModelProfile = "disabled" | "small-chat";

export interface BrowserLocalModelConfig {
  profile: BrowserLocalModelProfile;
  /** Internal model identifier — never render in public UI. */
  modelId: string;
  /** Internal label for reports and debugging — never render in public UI. */
  displayNameForInternalReports: string;
  /** Maximum characters allowed for compressed research context. */
  maxInputChars: number;
  /** Maximum tokens the worker may request from the engine. */
  maxOutputTokens: number;
  /** LLM temperature — low values keep output factual. */
  temperature: number;
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
}

const DEFAULT_CONFIG: BrowserLocalModelConfig = {
  profile: "small-chat",
  modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  displayNameForInternalReports: "browser-small-chat-qwen-1.5b",
  maxInputChars: 3000,
  maxOutputTokens: 180,
  temperature: 0.2,
  timeoutMs: 30_000,
};

const DISABLED_CONFIG: BrowserLocalModelConfig = {
  profile: "disabled",
  modelId: "",
  displayNameForInternalReports: "disabled",
  maxInputChars: 0,
  maxOutputTokens: 0,
  temperature: 0,
  timeoutMs: 0,
};

/**
 * Return the active model configuration.
 *
 * In unsupported build environments (e.g., SSR, test runner without
 * Web Worker support) this may return a disabled fallback.
 */
export function getBrowserLocalModelConfig(): BrowserLocalModelConfig {
  const isDisabled =
    typeof Worker === "undefined" ||
    typeof self === "undefined";

  if (isDisabled) return DISABLED_CONFIG;

  return DEFAULT_CONFIG;
}
