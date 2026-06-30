// Phase 18E-C — Browser-local LLM bridge for the orchestrator.
//
// Wraps the Web Worker runtime (browserLocalRuntime) into the standard
// ResearchAiRequest → ResearchAiResponse interface so the orchestrator
// can use it as a fallback runtime.
// =========================================================================

import type { ResearchAiRequest, ResearchAiResponse } from './researchAiTypes';
import { applyGuardrails } from './researchAiGuardrails';
import { compressResearchAiContext } from './researchAiContext';
import { isRuntimeAvailable } from './researchAiRuntimeRegistry';
import { ensureWorker, requestExplanation } from './browserLocalRuntime';
import { evaluateAnswerQuality } from './researchAiQualityGate';

let _initAttempted = false;

/**
 * Attempt inference via the browser-local Web Worker LLM.
 * Returns null if the worker is unavailable or times out.
 *
 * Lazy-initialises the worker on first call — never blocks app boot.
 */
export async function queryBrowserLocalRuntime(
  request: ResearchAiRequest,
): Promise<ResearchAiResponse | null> {
  if (!isRuntimeAvailable('browser_local')) {
    return null;
  }

  try {
    // Lazy-init worker (ensures manifest is loaded, worker created)
    if (!_initAttempted) {
      _initAttempted = true;
      await ensureWorker();
    }

    const compressedContext = compressResearchAiContext(request.context);
    if (!compressedContext.trim()) {
      return {
        ok: true,
        text: null,
        runtime: 'browser_local',
        needsReview: false,
        reason: 'no_context',
      };
    }

    const result = await requestExplanation(compressedContext, request.question);

    if (result.ok && result.text) {
      const { sanitized } = applyGuardrails(result.text, request.context);
      if (!sanitized) {
        return { ok: true, text: null, needsReview: true, runtime: 'browser_local' };
      }
      // Phase 19C-3: Runtime quality gate — reject low-quality model answers
      const quality = evaluateAnswerQuality(sanitized, compressedContext);
      if (!quality.accepted) {
        return { ok: true, text: null, needsReview: true, runtime: 'browser_local' };
      }
      return {
        ok: true,
        text: sanitized,
        needsReview: false,
        runtime: 'browser_local',
      };
    }

    return null;
  } catch {
    return null;
  }
}
