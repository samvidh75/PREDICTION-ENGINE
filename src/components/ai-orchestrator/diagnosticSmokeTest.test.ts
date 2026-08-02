import { describe, it, expect } from "vitest";
import {
  SMOKE_TEST_CONTEXT,
  SMOKE_TEST_QUESTION,
  SMOKE_TEST_ASSET,
  HEALTHYTAT_EXPECTED_SIGNALS,
  formatSmokeTestResult,
} from "./diagnosticSmokeTest";
import type { SmokeTestResult } from "./diagnosticSmokeTest";

describe("DiagnosticSmokeTest", () => {
  it("uses HEALTHYTAT as the test asset ticker", () => {
    expect(SMOKE_TEST_ASSET).toBe("HEALTHYTAT");
  });

  it("includes all required fields in the smoke test context", () => {
    const lower = SMOKE_TEST_CONTEXT.toLowerCase();
    expect(lower).toContain("healthytat");
    expect(lower).toContain("price");
    expect(lower).toContain("day change");
    expect(lower).toContain("p/e ratio");
    expect(lower).toContain("debt/equity");
    expect(lower).toContain("promoter pledging");
    expect(lower).toContain("auditor");
    expect(lower).toContain("shell companies");
  });

  it("includes the value-trap question to test model reasoning", () => {
    expect(SMOKE_TEST_QUESTION).toContain("12.4");
    expect(SMOKE_TEST_QUESTION).toContain("4.5%");
    expect(SMOKE_TEST_QUESTION).toContain("cheap");
    expect(SMOKE_TEST_QUESTION).toContain("buy");
  });

  it("expected signals include governance red flags", () => {
    expect(HEALTHYTAT_EXPECTED_SIGNALS).toContain("do not buy");
    expect(HEALTHYTAT_EXPECTED_SIGNALS).toContain("promoter pledging");
    expect(HEALTHYTAT_EXPECTED_SIGNALS).toContain("corporate governance");
    expect(HEALTHYTAT_EXPECTED_SIGNALS).toContain("shell company");
    expect(HEALTHYTAT_EXPECTED_SIGNALS).toContain("auditor");
  });

  it("expected signals exclude bullish phrases", () => {
    const allSignals = HEALTHYTAT_EXPECTED_SIGNALS.join(" ");
    expect(allSignals).not.toContain("buy the dip");
    expect(allSignals).not.toContain("strong buy");
  });

  it("formatSmokeTestResult formats a passing result correctly", () => {
    const result: SmokeTestResult = {
      passed: true,
      timestamp: "2026-07-01T10:00:00.000Z",
      phases: [
        {
          name: "WebGPU / Worker Capability",
          passed: true,
          detail: "navigator.gpu detected",
          durationMs: 2,
        },
        {
          name: "Local SLM Engine Initialization",
          passed: true,
          detail: "Status: ready",
          durationMs: 3500,
        },
        {
          name: "AI Accuracy: Corporate Governance Flag",
          passed: true,
          detail: "Correctly flagged governance risk",
          durationMs: 2800,
        },
      ],
      modelResponse:
        "Do not buy this dip. Despite the low P/E ratio of 12.4, the asset carries extreme risk due to a high debt-to-equity ratio of 2.1 and massive promoter pledging of 65%.",
    };

    const output = formatSmokeTestResult(result);
    expect(output).toContain("PASS");
    expect(output).toContain("HEALTHYTAT");
    expect(output).toContain("All checks passed");
  });

  it("formatSmokeTestResult formats a failing result correctly", () => {
    const result: SmokeTestResult = {
      passed: false,
      timestamp: "2026-07-01T10:00:00.000Z",
      phases: [
        {
          name: "WebGPU / Worker Capability",
          passed: true,
          detail: "navigator.gpu detected",
          durationMs: 2,
        },
        {
          name: "Local SLM Engine Initialization",
          passed: false,
          detail: "Status: failed — Engine crashed",
          durationMs: 5000,
        },
        {
          name: "AI Accuracy: Corporate Governance Flag",
          passed: false,
          detail: "Skipped — engine not ready",
          durationMs: 0,
        },
      ],
      modelResponse: "[SKIPPED] Engine not ready",
    };

    const output = formatSmokeTestResult(result);
    expect(output).toContain("FAIL");
    expect(output).toContain("Some checks failed");
  });

  it("verifies the console smoke test function is importable", async () => {
    const { runSmokeTestFromConsole } = await import("./diagnosticSmokeTest");
    expect(typeof runSmokeTestFromConsole).toBe("function");
  });
});
