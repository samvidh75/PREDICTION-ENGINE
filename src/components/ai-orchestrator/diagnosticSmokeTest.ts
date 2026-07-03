import { ensureWorker, requestExplanation, getStatus, unloadWorker } from "./browserLocalRuntime";

export const SMOKE_TEST_ASSET = "HEALTHYTAT";

export const SMOKE_TEST_CONTEXT =
  "Asset: HEALTHYTAT | Price: ₹420 (Day Change: -4.5%) | " +
  "P/E Ratio: 12.4 | Debt/Equity: 2.1 | Promoter Pledging: 65% | " +
  'News/Auditor Log: "Statutory auditors have resigned mid-term citing ' +
  'inability to verify off-balance sheet transactions with group shell companies."';

export const SMOKE_TEST_QUESTION =
  "The P/E ratio looks very cheap at 12.4 and the price dropped 4.5%. Should I buy this value dip right now?";

export const HEALTHYTAT_EXPECTED_SIGNALS = [
  "do not buy",
  "extreme risk",
  "high debt",
  "debt-to-equity",
  "promoter pledging",
  "65%",
  "auditor",
  "resignation",
  "shell company",
  "corporate governance",
];

export interface SmokeTestPhase {
  name: string;
  passed: boolean;
  detail: string;
  durationMs: number;
}

export interface SmokeTestResult {
  passed: boolean;
  timestamp: string;
  phases: SmokeTestPhase[];
  modelResponse: string;
}

function elapsed(start: number): number {
  return Math.round(performance.now() - start);
}

export async function runDiagnosticSmokeTest(
  onProgress?: (phase: string, status: string) => void,
): Promise<SmokeTestResult> {
  const phases: SmokeTestPhase[] = [];
  const start = performance.now();

  onProgress?.("setup", "Checking browser capability...");

  const phase1Start = performance.now();

  const capCheck =
    typeof Worker !== "undefined" && typeof navigator !== "undefined" && "gpu" in navigator;

  phases.push({
    name: "WebGPU / Worker Capability",
    passed: capCheck,
    detail: capCheck
      ? "navigator.gpu detected, Worker API available"
      : "WebGPU or Worker not available — will use WASM/proxy fallback",
    durationMs: elapsed(phase1Start),
  });

  if (!capCheck) {
    onProgress?.("capability", "FAIL: WebGPU not detected");
  }

  onProgress?.("loading", "Initializing local AI engine...");
  const phase2Start = performance.now();

  let engineReady = false;

  try {
    const state = await ensureWorker((s) => {
      onProgress?.(s.status, s.statusMessage);
    });

    engineReady = state.status === "ready";
    const engineDetail = `Status: ${state.status} — ${state.statusMessage}`;
    phases.push({
      name: "Local SLM Engine Initialization",
      passed: engineReady,
      detail: engineDetail,
      durationMs: elapsed(phase2Start),
    });
  } catch (e) {
    phases.push({
      name: "Local SLM Engine Initialization",
      passed: false,
      detail: `Engine init failed: ${e instanceof Error ? e.message : String(e)}`,
      durationMs: elapsed(phase2Start),
    });
  }

  if (!engineReady) {
    phases.push({
      name: "AI Accuracy: Corporate Governance Flag",
      passed: false,
      detail: "Skipped — engine not ready",
      durationMs: 0,
    });
    return {
      passed: false,
      timestamp: new Date().toISOString(),
      phases,
      modelResponse: "[SKIPPED] Engine not ready",
    };
  }

  onProgress?.("ready", "Sending diagnostic query to local SLM...");

  const phase3Start = performance.now();
  let modelResponse: string;
  let accuracyPassed = false;

  try {
    const result = await requestExplanation(SMOKE_TEST_CONTEXT, SMOKE_TEST_QUESTION);

    if (result.ok && result.text) {
      modelResponse = result.text;
      const lower = result.text.toLowerCase();

      const matchedSignals = HEALTHYTAT_EXPECTED_SIGNALS.filter((sig) => lower.includes(sig));
      const falsePositive =
        lower.includes("buy the dip") &&
        !lower.includes("do not buy") &&
        !lower.includes("not a buy");

      accuracyPassed = matchedSignals.length >= 4 && !falsePositive;
    } else {
      modelResponse = `[FAILED] ${result.reason ?? "unknown error"}`;
    }
  } catch (e) {
    modelResponse = `[ERROR] ${e instanceof Error ? e.message : String(e)}`;
  }

  phases.push({
    name: "AI Accuracy: Corporate Governance Flag",
    passed: accuracyPassed,
    detail: accuracyPassed
      ? "Correctly flagged governance risk despite low P/E"
      : "Failed to detect governance red flags or hallucinated buy signal",
    durationMs: elapsed(phase3Start),
  });

  const overallPassed = phases.every((p) => p.passed);

  return {
    passed: overallPassed,
    timestamp: new Date().toISOString(),
    phases,
    modelResponse,
  };
}

export function formatSmokeTestResult(result: SmokeTestResult): string {
  const lines: string[] = [];
  const passMark = "\u2705";
  const failMark = "\u274c";

  lines.push("");
  lines.push("=".repeat(64));
  lines.push("  STOCKSTORY DIAGNOSTIC SMOKE TEST");
  lines.push("=".repeat(64));
  lines.push(`  Timestamp: ${result.timestamp}`);
  lines.push(`  Asset:     ${SMOKE_TEST_ASSET}`);
  lines.push(`  Overall:   ${result.passed ? passMark + " PASS" : failMark + " FAIL"}`);
  lines.push("");

  for (const phase of result.phases) {
    const icon = phase.passed ? passMark : failMark;
    const time = phase.durationMs < 1000 ? `${phase.durationMs}ms` : `${(phase.durationMs / 1000).toFixed(1)}s`;
    lines.push(`  ${icon} ${phase.name}`);
    lines.push(`     ${phase.detail} [${time}]`);
  }

  lines.push("");
  lines.push("  Model Response:");
  lines.push("  " + "-".repeat(60));
  for (const line of result.modelResponse.split("\n")) {
    lines.push(`  ${line}`);
  }
  lines.push("  " + "-".repeat(60));
  lines.push("");

  if (result.passed) {
    lines.push("  " + passMark + " All checks passed. Edge AI pipeline is fully operational.");
  } else {
    lines.push("  " + failMark + " Some checks failed. Review details above.");
  }

  lines.push("=".repeat(64));
  return lines.join("\n");
}

export async function runSmokeTestFromConsole(): Promise<void> {

  const result = await runDiagnosticSmokeTest((phase, status) => {
  });


  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__SMOKE_TEST_RESULT = result;
  }
}

declare global {
  interface Window {
    __SMOKE_TEST_RESULT?: SmokeTestResult;
  }
}
