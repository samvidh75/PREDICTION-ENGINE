// src/components/ai-orchestrator/researchAiRuntimeRegistry.ts
// Phase 18 — Runtime capability registry that reports what AI runtimes are
// available in the current environment.
//
// No server-side discovery — this is entirely compile-time gating
// and browser environment detection.
// =========================================================================

import type { ResearchAiRuntime, RuntimeCapability } from './researchAiTypes';

/* ── Runtime capability descriptors ─────────────────────────── */

const REGISTRY: Record<ResearchAiRuntime, RuntimeCapability> = {
  'deterministic': {
    runtime: 'deterministic',
    available: true,
    ready: true,
    label: 'Algorithmic assessment',
  },
  'browser-edge': {
    runtime: 'browser-edge',
    available: false,
    ready: false,
    label: 'Edge AI (in-browser)',
  },
  'user-local': {
    runtime: 'user-local',
    available: false,
    ready: false,
    label: 'Local LLM (Ollama)',
  },
  'server-local': {
    runtime: 'server-local',
    available: false,
    ready: false,
    label: 'Server-side inference',
  },
};

/* ── Optimistic detection flags ─────────────────────────────── */

/** Does the browser support Web Workers with transferables? */
function supportsWorkers(): boolean {
  try {
    return typeof Worker !== 'undefined';
  } catch {
    return false;
  }
}

/** Is there enough client memory to run a small LLM (WebNN/WebGPU)? */
function hasClientAICapability(): boolean {
  if (!('navigator' in globalThis)) return false;
  // Check for WebNN API
  if (typeof (navigator as unknown as Record<string, unknown>).ml !== 'undefined') return true;
  // Check for WebGPU
  if (typeof (navigator as unknown as Record<string, unknown>).gpu !== 'undefined') return true;
  return false;
}

/* ── Initialisation (run once on load) ──────────────────────── */

/**
 * Detect and activate runtimes at app boot.
 * This is safe to call from module scope — it only checks
 * browser capabilities, doesn't load any model weights.
 */
export function initRuntimeRegistry(): void {
  // Reset all AI runtimes to default (disabled) state
  REGISTRY['browser-edge'].available = false;
  REGISTRY['browser-edge'].ready = false;
  REGISTRY['user-local'].available = false;
  REGISTRY['user-local'].ready = false;
  REGISTRY['server-local'].available = false;
  REGISTRY['server-local'].ready = false;

  // Browser Edge AI
  if (supportsWorkers() && hasClientAICapability()) {
    REGISTRY['browser-edge'].available = true;
    REGISTRY['browser-edge'].ready = true;
  }

  // User-local (Ollama) — purely env-flag gated
  const localLlmEnv = (typeof process !== 'undefined' && process.env?.LOCAL_LLM_EXPLAINER_ENABLED) === 'true';
  if (localLlmEnv) {
    REGISTRY['user-local'].available = true;
    // Not "ready" until we can actually ping the Ollama endpoint (lazy check)
  }
}

/**
 * Set server-local runtime as available.
 * Called by the app shell once it knows the backend can serve inference.
 */
export function enableServerLocalRuntime(): void {
  REGISTRY['server-local'].available = true;
  REGISTRY['server-local'].ready = true;
}

/* ── Queries ────────────────────────────────────────────────── */

/** Get the full registry snapshot. */
export function getRuntimeRegistry(): Record<ResearchAiRuntime, RuntimeCapability> {
  return Object.fromEntries(
    Object.entries(REGISTRY).map(([key, cap]) => [key, { ...cap }]),
  ) as Record<ResearchAiRuntime, RuntimeCapability>;
}

/** Get all runtimes in fallback order. */
export function getFallbackOrder(): ResearchAiRuntime[] {
  return ['browser-edge', 'user-local', 'server-local', 'deterministic'];
}

/** Is a specific runtime available? */
export function isRuntimeAvailable(runtime: ResearchAiRuntime): boolean {
  return REGISTRY[runtime]?.available === true;
}

/** Get the best currently-available runtime. */
export function getBestAvailableRuntime(): ResearchAiRuntime {
  for (const rt of getFallbackOrder()) {
    if (REGISTRY[rt]?.available) return rt;
  }
  return 'deterministic';
}

/** Has any AI-capable runtime been activated? */
export function hasAIRuntime(): boolean {
  return REGISTRY['browser-edge'].available ||
         REGISTRY['user-local'].available ||
         REGISTRY['server-local'].available;
}
