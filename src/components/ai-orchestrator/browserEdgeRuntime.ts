// src/components/ai-orchestrator/browserEdgeRuntime.ts
// Phase 18 — Wraps the existing browser Edge AI worker (edgeAiWorker.ts)
// into a standard inference interface for the orchestrator.
// =========================================================================

import type { ResearchAiRequest, ResearchAiResponse } from './researchAiTypes';
import { applyGuardrails } from './researchAiGuardrails';

/**
 * Attempt inference via the browser's Edge AI worker.
 * Returns null if the worker is unavailable or times out.
 */
export async function queryBrowserEdgeWorker(
  _request: ResearchAiRequest,
  signal?: AbortSignal,
): Promise<ResearchAiResponse | null> {
  try {
    if (typeof Worker === 'undefined') {
      return null;
    }

    const controller = new AbortController();
    const mergedSignal = signal
      ? AbortSignal.any?.([signal, controller.signal]) ?? controller.signal
      : controller.signal;

    const timeout = setTimeout(() => controller.abort(), 5000);

    // Delegate to the existing edge-ai worker for actual inference
    const workerUrl = new URL(
      '../edge-ai/edgeAiWorker.ts',
      import.meta.url,
    ).href;

    const worker = new Worker(workerUrl, { type: 'module' });

    const result = await new Promise<ResearchAiResponse | null>((resolve) => {
      mergedSignal.addEventListener('abort', () => {
        worker.terminate();
        resolve(null);
      });

      worker.addEventListener('message', (event: MessageEvent) => {
        const rawReply: string =
          event.data?.rawReply ?? event.data?.text ?? event.data ?? '';

        const { sanitized } = applyGuardrails(rawReply, _request.context);

        resolve({
          ok: Boolean(sanitized),
          text: sanitized || null,
          needsReview: false,
          runtime: 'browser-edge',
        });
        worker.terminate();
      });

      worker.addEventListener('error', () => {
        worker.terminate();
        resolve(null);
      });

      const context = _request.context;
      worker.postMessage({
        context: {
          symbol: context.symbol,
          companyName: context.companyName,
          narrative: context.narrative ?? [],
          risksToReview: context.risksToReview ?? [],
          whatToWatch: context.whatToWatch ?? [],
          sector: context.sector ?? '',
          currentPrice: context.currentPrice ?? 0,
          changeAbs: context.changeAbs ?? 0,
          changePercent: context.changePercent ?? 0,
        },
        query: _request.question,
        history: [],
      });
    });

    clearTimeout(timeout);
    return result;
  } catch {
    return null;
  }
}
