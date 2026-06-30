// src/components/ai-orchestrator/userLocalRuntime.ts
// Phase 18 — User-local Ollama bridge for the orchestrator.
//
// Talks to a local Ollama endpoint (localhost:11434) when the user has
// opted in via the LOCAL_LLM_EXPLAINER_ENABLED flag and has Ollama running.
// =========================================================================

import type { ResearchAiRequest, ResearchAiResponse } from './researchAiTypes';
import { applyGuardrails } from './researchAiGuardrails';
import { isRuntimeAvailable, enableServerLocalRuntime } from './researchAiRuntimeRegistry';

const OLLAMA_BASE = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2:1b';
const TIMEOUT_MS = 8000;

function buildPrompt(request: ResearchAiRequest): string {
  const { context, question } = request;
  return [
    `You are a research assistant analysing ${context.companyName} (${context.symbol}).`,
    'Help the user understand the research. Do NOT make predictions or give recommendations.',
    '',
    'RULES:',
    '- No buy/sell/hold recommendations or target prices.',
    '- No disclaimers or "I am an AI" statements.',
    '- Stick to the research context provided.',
    '- Keep replies under 600 characters.',
    '',
    'CONTEXT:',
    ...(context.narrative ?? []),
    '',
    `Sector: ${context.sector ?? ''} | Price: ₹${(context.currentPrice ?? 0).toFixed(2)} (${(context.changePercent ?? 0) >= 0 ? '+' : ''}${(context.changePercent ?? 0).toFixed(2)}%)`,
    '',
    'Risks:',
    ...((context.risksToReview ?? []).length > 0
      ? (context.risksToReview ?? []).map((r) => `- ${r}`)
      : ['- None highlighted']),
    '',
    'User question:',
    question,
    '',
    'Provide a concise, factual answer based only on the above context:',
  ].join('\n');
}

/**
 * Attempt inference via a local Ollama instance.
 * Returns null if Ollama is not reachable or times out.
 */
export async function queryUserLocalRuntime(
  request: ResearchAiRequest,
): Promise<ResearchAiResponse | null> {
  if (!isRuntimeAvailable('user-local')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: buildPrompt(request),
        stream: false,
        options: {
          num_predict: 512,
          temperature: 0.3,
          top_p: 0.85,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { response?: string };
    const raw = data.response ?? '';

    if (!raw.trim()) return null;

    const { sanitized } = applyGuardrails(raw, request.context);
    if (!sanitized) {
      return { ok: true, text: null, needsReview: true, runtime: 'user-local' };
    }

    return {
      ok: true,
      text: sanitized,
      needsReview: false,
      runtime: 'user-local',
    };
  } catch {
    return null;
  }
}

/**
 * Ping Ollama to check availability.
 * Falls back to deterministic runtime if unreachable.
 */
export async function pingUserLocalRuntime(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Lazy-activate the user-local runtime. Call this from the settings page
 * when the user explicitly enables local LLM.
 */
export async function tryActivateUserLocalRuntime(): Promise<boolean> {
  const reachable = await pingUserLocalRuntime();
  if (reachable) {
    enableServerLocalRuntime(); // re-use to mark as available
    return true;
  }
  return false;
}
