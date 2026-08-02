/**
 * Phase 18F — queryBrowserLocalRuntime unit tests.
 *
 * Covers bridge function: availability gate, lazy-init, context compression,
 * guardrails application, and error handling.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResearchAiRequest, ResearchAiContext } from "./researchAiTypes";

/* ─── Hoisted mocks ──────────────────────────────────────────────── */
const mockIsRuntimeAvailable = vi.fn();
const mockEnsureWorker = vi.fn();
const mockRequestExplanation = vi.fn();
const mockCompress = vi.fn();
const mockApplyGuardrails = vi.fn();
const mockEvaluateAnswerQuality = vi.fn();

vi.mock("./researchAiRuntimeRegistry", () => ({
  isRuntimeAvailable: (...args: unknown[]) => mockIsRuntimeAvailable(...args),
}));

vi.mock("./browserLocalRuntime", () => ({
  ensureWorker: (...args: unknown[]) => mockEnsureWorker(...args),
  requestExplanation: (...args: unknown[]) => mockRequestExplanation(...args),
}));

vi.mock("./researchAiContext", () => ({
  compressResearchAiContext: (...args: unknown[]) => mockCompress(...args),
}));

vi.mock("./researchAiGuardrails", () => ({
  applyGuardrails: (...args: unknown[]) => mockApplyGuardrails(...args),
}));

vi.mock("./researchAiQualityGate", () => ({
  evaluateAnswerQuality: (...args: unknown[]) => mockEvaluateAnswerQuality(...args),
}));

import { queryBrowserLocalRuntime } from "./queryBrowserLocalRuntime";

function makeRequest(overrides: Partial<ResearchAiRequest> = {}): ResearchAiRequest {
  return {
    question: "How are margins?",
    context: {
      surface: "stock",
      symbol: "TCS",
      companyName: "TCS Ltd",
      narrative: ["Revenue grew."],
    } as ResearchAiContext,
    ...overrides,
  };
}

describe("queryBrowserLocalRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRuntimeAvailable.mockReturnValue(true);
    mockEnsureWorker.mockResolvedValue(undefined);
    mockCompress.mockReturnValue("compressed: Revenue grew.");
    mockApplyGuardrails.mockReturnValue({ allowed: true, sanitized: "Safe output", reason: null });
    mockEvaluateAnswerQuality.mockReturnValue({ accepted: true, reasons: [], sanitizedAnswer: "Safe output", confidence: "high", fallbackRequired: false });
    mockRequestExplanation.mockResolvedValue({ ok: true, text: "Safe output" });
  });

  /* 1 */ it("returns null when runtime is unavailable", async () => {
    mockIsRuntimeAvailable.mockReturnValue(false);
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result).toBeNull();
    expect(mockEnsureWorker).not.toHaveBeenCalled();
  });

  /* 2 */ it("returns null when context compression yields empty string", async () => {
    mockCompress.mockReturnValue("");
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result).toEqual({
      ok: true,
      text: null,
      runtime: "browser_local",
      needsReview: false,
      reason: "no_context",
    });
  });

  /* 3 */ it("calls requestExplanation with compressed context and question", async () => {
    await queryBrowserLocalRuntime(makeRequest({ question: "What about risks?" }));
    expect(mockCompress).toHaveBeenCalled();
    expect(mockRequestExplanation).toHaveBeenCalledWith(
      expect.any(String),
      "What about risks?",
    );
  });

  /* 4 */ it("returns sanitised output on success", async () => {
    mockRequestExplanation.mockResolvedValue({ ok: true, text: "Raw LLM output" });
    mockApplyGuardrails.mockReturnValue({ allowed: true, sanitized: "Sanitised output", reason: null });
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result).toEqual({
      ok: true,
      text: "Sanitised output",
      needsReview: false,
      runtime: "browser_local",
    });
  });

  /* 5 */ it("returns needsReview when guardrails strip all content", async () => {
    mockRequestExplanation.mockResolvedValue({ ok: true, text: "Buy now guarantee" });
    mockApplyGuardrails.mockReturnValue({ allowed: false, sanitized: "", reason: "unsafe_output" });
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result).toEqual({
      ok: true,
      text: null,
      needsReview: true,
      runtime: "browser_local",
    });
  });

  /* 6 */ it("returns null when requestExplanation returns non-ok", async () => {
    mockRequestExplanation.mockResolvedValue({ ok: false, text: null });
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result).toBeNull();
  });

  /* 7 */ it("returns null when requestExplanation returns null text", async () => {
    mockRequestExplanation.mockResolvedValue({ ok: true, text: null });
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result).toBeNull();
  });

  /* 8 */ it("returns null when requestExplanation throws", async () => {
    mockRequestExplanation.mockRejectedValue(new Error("Timeout"));
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result).toBeNull();
  });

  /* 9 */ it("uses the browser_local runtime tag in response", async () => {
    const result = await queryBrowserLocalRuntime(makeRequest());
    expect(result?.runtime).toBe("browser_local");
  });
});

/**
 * Tests that depend on fresh module state (_initAttempted === false).
 * We use vi.resetModules + dynamic import so the module-level `let _initAttempted`
 * starts at false for each test in this block.
 */
describe("lazy-init and error handling (fresh module state)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRuntimeAvailable.mockReturnValue(true);
    mockEnsureWorker.mockResolvedValue(undefined);
    mockCompress.mockReturnValue("compressed: Revenue grew.");
    mockApplyGuardrails.mockReturnValue({ allowed: true, sanitized: "Safe output", reason: null });
    mockEvaluateAnswerQuality.mockReturnValue({ accepted: true, reasons: [], sanitizedAnswer: "Safe output", confidence: "high", fallbackRequired: false });
    mockRequestExplanation.mockResolvedValue({ ok: true, text: "Safe output" });
  });

  it("lazy-initialises the worker on first call only", async () => {
    vi.resetModules();
    const { queryBrowserLocalRuntime: qbl } = await import("./queryBrowserLocalRuntime");
    await qbl(makeRequest());
    expect(mockEnsureWorker).toHaveBeenCalledTimes(1);
    await qbl(makeRequest());
    expect(mockEnsureWorker).toHaveBeenCalledTimes(1);
  });

  it("returns null when ensureWorker throws", async () => {
    vi.resetModules();
    mockEnsureWorker.mockRejectedValue(new Error("Worker init failed"));
    const { queryBrowserLocalRuntime: qbl } = await import("./queryBrowserLocalRuntime");
    const result = await qbl(makeRequest());
    expect(result).toBeNull();
  });
});
