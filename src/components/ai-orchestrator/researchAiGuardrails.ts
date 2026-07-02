import type { GuardrailResult, ResearchAiChatMessage, ResearchAiContext, ResearchAiResponse } from "./researchAiTypes";

const QUESTION_MAX_CHARS = 600;
const ANSWER_MAX_CHARS = 900;
const INJECTION_PATTERNS = [
  /ignore previous/i,
  /ignore all/i,
  /system prompt/i,
  /developer message/i,
  /reveal .*prompt/i,
  /override .*instruction/i,
  /return json/i,
  /show .*chain of thought/i,
];

const FORBIDDEN_PATTERNS = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\bstrong buy\b/i,
  /\bguaranteed\b/i,
  /\bsure shot\b/i,
  /\bmultibagger\b/i,
  /\btarget\b/i,
  /\bprovider\b/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bdiagnostics?\b/i,
  /\bcoverage\b/i,
  /\bfreshness\b/i,
  /\blineage\b/i,
  /\bmigration\b/i,
  /\bbackfill\b/i,
  /\bsource pending\b/i,
  /\bsource verified\b/i,
  /\bquote unavailable\b/i,
  /\bhistory unavailable\b/i,
  /\brag\b/i,
  /\bvector\b/i,
  /\bembedding\b/i,
  /\bchunk\b/i,
  /\badapter\b/i,
  /\bnarrativepromptpayload\b/i,
  /\bwebllm\b/i,
  /\bwebgpu\b/i,
  /\bwasm\b/i,
  /\bollama\b/i,
  /\bllama\b/i,
  /\bqwen\b/i,
  /\bphi\b/i,
  /\badapter_unavailable\b/i,
  /\bempty_response\b/i,
  /\bmalformed_response\b/i,
  /\bcritical breakout\b/i,
  /\bpanic selling\b/i,
  /\bzero server load\b/i,
  /\bunlimited prompts\b/i,
  /\bserverless ai\b/i,
];

const INTERNAL_ERROR_PATTERNS = [
  /error:/i,
  /exception/i,
  /traceback/i,
  /stack trace/i,
  /failed to/i,
];

const clampText = (value: string, maxChars: number): string => value.slice(0, maxChars).trim();

const isJsonLike = (input: string): boolean => {
  const trimmed = input.trim();
  return (/^\{[\s\S]*\}$/.test(trimmed) || /^\[[\s\S]*\]$/.test(trimmed)) && /[:[\]{}]/.test(trimmed);
};

export function containsForbiddenResearchAiCopy(input: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(input));
}

export function sanitizeResearchAiQuestion(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = clampText(input.replace(/\s+/g, " "), QUESTION_MAX_CHARS);
  if (!normalized) return null;
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) return null;
  if (containsForbiddenResearchAiCopy(normalized)) return null;
  return normalized;
}

export function sanitizeResearchAiOutput(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = clampText(input.replace(/\s+/g, " "), ANSWER_MAX_CHARS);
  if (!normalized) return null;
  if (containsForbiddenResearchAiCopy(normalized)) return null;
  if (INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))) return null;
  if (isJsonLike(normalized)) return null;
  if (/\b(null|undefined|NaN|Infinity)\b/.test(normalized)) return null;
  return normalized;
}

function firstNonEmpty(items: Array<string | null | undefined> | undefined): string | null {
  if (!items) return null;
  for (const item of items) {
    if (typeof item === "string" && item.trim()) return item.trim();
  }
  return null;
}

export function buildDeterministicFallbackAnswer(context: ResearchAiContext | null): ResearchAiResponse {
  const lines: string[] = [];
  const title = firstNonEmpty([
    context?.headline,
    context?.title,
    context?.healthometer?.state,
  ]);

  if (title) lines.push(title);
  const risk = firstNonEmpty(context?.risksToReview);
  const watch = firstNonEmpty(context?.whatToWatch);
  const evidence = firstNonEmpty(context?.evidenceToReview ?? context?.researchNarrative);

  if (evidence) lines.push(evidence);
  if (risk) lines.push(`Risk to review: ${risk}`);
  if (watch) lines.push(`What to watch: ${watch}`);
  if (lines.length === 0) {
    lines.push("This view is best reviewed through the standard Market Brain summary.");
    lines.push("Review the key risks, evidence, and what to watch before making any decision.");
  }

  const text = sanitizeResearchAiOutput(lines.join(" ")) ?? "Standard summary is available for this view.";

  return {
    ok: true,
    text,
    runtime: "deterministic",
    needsReview: Boolean(risk),
  };
}

export function applyGuardrails(text: string, _context: ResearchAiContext): GuardrailResult {
  const sanitized = sanitizeResearchAiOutput(text) ?? "";
  return {
    allowed: sanitized.length > 0,
    sanitized,
    reason: sanitized.length > 0 ? null : "unsafe_output",
  };
}

export function applyResponseGuardrails(response: ResearchAiResponse, _context: ResearchAiContext): ResearchAiResponse {
  const sanitized = sanitizeResearchAiOutput(response.text);
  return sanitized
    ? { ...response, text: sanitized }
    : { ...response, text: null, needsReview: true, reason: response.reason ?? "unsafe_output" };
}

export function fallbackIfEmpty(text: string | null, context: ResearchAiContext): string {
  if (text && text.trim()) return text;
  return buildDeterministicFallbackAnswer(context).text ?? "Standard summary is available for this view.";
}

export function trimConversation(messages: Array<Pick<ResearchAiChatMessage, "role" | "text">>, maxMessages = 10): Array<Pick<ResearchAiChatMessage, "role" | "text">> {
  return messages.slice(-Math.max(1, maxMessages));
}
