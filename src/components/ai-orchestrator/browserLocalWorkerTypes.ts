/**
 * Phase 18B — Browser-local Web Worker message contract.
 *
 * These types are shared between the main thread and the Web Worker.
 * The worker uses @mlc-ai/web-llm but that detail is never exposed
 * to the UI — consumers see only "AI Explanation" / "browser_local".
 */

export type WorkerRequestTag =
  | "init"
  | "explain"
  | "checkCapability"
  | "reset"
  | "unload";

export type WorkerResponseTag =
  | "initResult"
  | "explainResult"
  | "capabilityResult"
  | "resetResult"
  | "unloadResult"
  | "progress"
  | "error";

export interface WorkerInitRequest {
  tag: "init";
  /** Optional model key (defaults to a small WebLLM model). */
  model?: string;
}

export interface WorkerExplainRequest {
  tag: "explain";
  prompt: string;
  /** Maximum output tokens (default 512). */
  maxTokens?: number;
}

export interface WorkerCheckCapabilityRequest {
  tag: "checkCapability";
}

export interface WorkerResetRequest {
  tag: "reset";
}

export interface WorkerUnloadRequest {
  tag: "unload";
}

export type BrowserLocalWorkerRequest =
  | WorkerInitRequest
  | WorkerExplainRequest
  | WorkerCheckCapabilityRequest
  | WorkerResetRequest
  | WorkerUnloadRequest;

export interface WorkerInitResult {
  tag: "initResult";
  ok: boolean;
  message: string;
}

export interface WorkerExplainResult {
  tag: "explainResult";
  ok: boolean;
  text: string | null;
  runtimeMs: number;
}

export interface WorkerCapabilityResult {
  tag: "capabilityResult";
  canUseWebLLM: boolean;
  message: string;
}

export interface WorkerResetResult {
  tag: "resetResult";
  ok: boolean;
}

export interface WorkerUnloadResult {
  tag: "unloadResult";
  ok: boolean;
}

export interface WorkerProgress {
  tag: "progress";
  stage: "loading" | "compiling" | "ready" | "generating";
  percent?: number;
  message?: string;
}

export interface WorkerError {
  tag: "error";
  message: string;
  recoverable: boolean;
}

export type BrowserLocalWorkerResponse =
  | WorkerInitResult
  | WorkerExplainResult
  | WorkerCapabilityResult
  | WorkerResetResult
  | WorkerUnloadResult
  | WorkerProgress
  | WorkerError;

/** Thin wrapper to post messages to the worker with a correlation ID. */
export interface WorkerEnvelope<T> {
  correlationId: string;
  payload: T;
}
