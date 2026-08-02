// src/components/ai-orchestrator/serverLocalRuntime.ts
// Phase 18 — Server-local inference wrapper for the orchestrator.
//
// Sends requests to a local /api/ai/infer endpoint when the backend provides
// server-side inference. The endpoint is not yet implemented — this stub
// allows the orchestrator to fall through to deterministic gracefully.
// =========================================================================

import type { ResearchAiRequest, ResearchAiResponse } from './researchAiTypes';
import { applyGuardrails } from './researchAiGuardrails';

const ENDPOINT = '/api/ai/infer';
const TIMEOUT_MS = 10000;

/**
 * Attempt inference via the server-local endpoint.
 * Returns null if the endpoint is unreachable or returns 404.
 */
export async function queryServerLocalRuntime(
  request: ResearchAiRequest,
): Promise<ResearchAiResponse | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: request.context.symbol,
        companyName: request.context.companyName,
        question: request.question,
        narrative: request.context.narrative ?? [],
        risks: request.context.risksToReview ?? [],
        watchItems: request.context.whatToWatch ?? [],
        sector: request.context.sector ?? '',
        currentPrice: request.context.currentPrice ?? 0,
        changePercent: request.context.changePercent ?? 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      text?: string;
      reply?: string;
    };
    const raw = data.text ?? data.reply ?? '';

    if (!raw.trim()) return null;

    const { sanitized } = applyGuardrails(raw, request.context);
    if (!sanitized) {
      return { ok: true, text: null, needsReview: true, runtime: 'server-local' };
    }

    return {
      ok: true,
      text: sanitized,
      needsReview: false,
      runtime: 'server-local',
    };
  } catch {
    return null;
  }
}
