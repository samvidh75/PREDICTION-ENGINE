import { ensureWorker, requestExplanation } from "./browserLocalRuntime";
import { detectDeviceAiCapability } from "./deviceAiCapability";
import { compressResearchAiContext } from "./researchAiContext";
import {
  buildDeterministicFallbackAnswer,
  sanitizeResearchAiOutput,
  sanitizeResearchAiQuestion,
} from "./researchAiGuardrails";
import type { ResearchAiRequest, ResearchAiResponse } from "./researchAiTypes";

/**
 * Build a concise prompt for the browser-local model from compressed context.
 * Returns null if there's insufficient context to ask a meaningful question.
 */
function buildBrowserLocalPrompt(
  _compressed: string,
  context: ResearchAiRequest["context"],
): string | null {
  const symbol = context.symbol;
  const companyName = context.companyName;
  const name = companyName ?? symbol;
  if (!name) return null;

  const lines: string[] = [`Provide a brief research analysis of ${name}.`];

  if (context.sector) {
    lines.push(`Sector: ${context.sector}.`);
  }
  if (context.narrative?.length) {
    const snippet = context.narrative.slice(0, 3).join(" ");
    lines.push(`Context: ${snippet}`);
  }
  if (context.researchNarrative?.length) {
    lines.push(context.researchNarrative.join(" "));
  }
  if (context.healthometer?.explanation?.length) {
    lines.push(context.healthometer.explanation.join(" "));
  }

  lines.push("Keep the answer concise (2-4 sentences), factual, and educational.");
  return lines.join("\n");
}

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

  // Build a concise prompt from the compressed context
  const prompt = buildBrowserLocalPrompt(compressed, request.context);
  if (!prompt) {
    return deterministic;
  }

  const result = await requestExplanation(prompt, 512);
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
