import { ensureWorker, requestExplanation } from "./browserLocalRuntime";
import { detectDeviceAiCapability } from "./deviceAiCapability";
import { compressResearchAiContext } from "./researchAiContext";
import {
  buildDeterministicFallbackAnswer,
  sanitizeResearchAiOutput,
  sanitizeResearchAiQuestion,
} from "./researchAiGuardrails";
import type { ResearchAiRequest, ResearchAiResponse } from "./researchAiTypes";

function buildUnavailableResponse(reason: ResearchAiResponse["reason"]): ResearchAiResponse {
  return {
    ok: false,
    text: null,
    runtime: "unavailable",
    needsReview: false,
    reason,
  };
}

export async function answerResearchQuestion(
  request: ResearchAiRequest,
): Promise<ResearchAiResponse> {
  const question = sanitizeResearchAiQuestion(request.question);
  if (!question) {
    return buildUnavailableResponse("unsupported");
  }

  const compressed = compressResearchAiContext(request.context);
  if (!compressed) {
    return buildUnavailableResponse("no_context");
  }

  const deterministic = buildDeterministicFallbackAnswer(request.context);
  if (request.preferredRuntime !== "browser_local") {
    return deterministic;
  }

  const capability = detectDeviceAiCapability();
  if (!capability.canUseBrowserLocalAi) {
    return deterministic;
  }

  // Lazily ensure the Web Worker exists (never on page render)
  const status = await ensureWorker();
  if (status.status !== "ready") {
    return deterministic;
  }

  const result = await requestExplanation(compressed, question);
  if (!result.ok || !result.text) {
    return deterministic;
  }

  const sanitized = sanitizeResearchAiOutput(result.text);
  if (!sanitized) {
    return deterministic;
  }

  return {
    ok: true,
    text: sanitized,
    runtime: "browser_local",
    needsReview: deterministic.needsReview,
  };
}
