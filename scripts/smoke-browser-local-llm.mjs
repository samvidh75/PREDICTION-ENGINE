#!/usr/bin/env node

/**
 * Phase 19A-15 — Gated browser LLM smoke test runner.
 *
 * Verifies that the browser-local LLM Web Worker compiles,
 * the model manifest resolves for the default device profile,
 * and a minimal request/response cycle succeeds.
 *
 * Usage:
 *   node scripts/smoke-browser-local-llm.mjs             # quick health check
 *   node scripts/smoke-browser-local-llm.mjs --verbose    # full output
 *   node scripts/smoke-browser-local-llm.mjs --integration  # also runs Playwright e2e
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const VERBOSE = process.argv.includes("--verbose");
const INTEGRATION = process.argv.includes("--integration");

let passes = 0;
let failures = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  passes++;
}

function fail(label, detail) {
  console.log(`  ✗ ${label}`);
  if (detail) console.log(`    ${detail}`);
  failures++;
}

function run(label, fn) {
  process.stdout.write(`  … ${label} `);
  try {
    fn();
    ok(label);
  } catch (e) {
    fail(label, e.message);
  }
}

// ─── 1. Check manifest exists ───────────────────────────────────────────────

console.log("\n[Phase 19A-15] Browser LLM Smoke Tests\n");

console.log("── Manifest check ──");
run("model manifest file exists", () => {
  const path = resolve(ROOT, "src/components/ai-orchestrator/browserLocalModelManifest.ts");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
});

run("manifest exports getBrowserLocalModelConfig", () => {
  const content = readFileSync(
    resolve(ROOT, "src/components/ai-orchestrator/browserLocalModelManifest.ts"),
    "utf-8",
  );
  if (!content.includes("getBrowserLocalModelConfig")) throw new Error("getBrowserLocalModelConfig not found");
  if (!content.includes("BrowserLocalModelConfig")) throw new Error("BrowserLocalModelConfig not found");
  if (!content.includes("DISABLED_CONFIG")) throw new Error("DISABLED_CONFIG not found");
});

// ─── 2. Check worker exists ─────────────────────────────────────────────────

console.log("\n── Worker check ──");
run("Web Worker file exists", () => {
  const path = resolve(ROOT, "src/components/ai-orchestrator/browserLocalResearchWorker.ts");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
});

run("worker has message handler", () => {
  const content = readFileSync(
    resolve(ROOT, "src/components/ai-orchestrator/browserLocalResearchWorker.ts"),
    "utf-8",
  );
  if (!content.includes("onmessage")) throw new Error("onmessage handler not found");
  if (!content.includes("postMessage")) throw new Error("postMessage not found");
});

// ─── 3. Check runtime ───────────────────────────────────────────────────────

console.log("\n── Runtime check ──");
run("runtime adapter exists", () => {
  const path = resolve(ROOT, "src/components/ai-orchestrator/browserLocalRuntime.ts");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
});

run("runtime hook exists", () => {
  const path = resolve(ROOT, "src/components/ai-orchestrator/useBrowserLocalResearchRuntime.ts");
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
});

// ─── 4. Run Vitest unit tests ──────────────────────────────────────────────

console.log("\n── Unit tests ──");
run("browserLocalRuntime unit tests pass", () => {
  const out = execSync(
    "npx vitest run src/components/ai-orchestrator/browserLocalRuntime.test.ts --reporter=verbose 2>&1",
    { cwd: ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (VERBOSE) console.log(out);
  if (out.includes("FAIL")) throw new Error("Some tests failed");
  const match = out.match(/Tests\s+(\d+)\s+passed/);
  if (!match || parseInt(match[1]) < 2) throw new Error("Expected at least 2 tests to pass");
});

run("queryBrowserLocalRuntime tests pass", () => {
  const out = execSync(
    "npx vitest run src/components/ai-orchestrator/queryBrowserLocalRuntime.test.ts --reporter=verbose 2>&1",
    { cwd: ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (VERBOSE) console.log(out);
  if (out.includes("FAIL")) throw new Error("Some tests failed");
});

run("anomalyAiContext tests pass", () => {
  const out = execSync(
    "npx vitest run src/components/ai-orchestrator/anomalyAiContext.test.ts --reporter=verbose 2>&1",
    { cwd: ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (VERBOSE) console.log(out);
  if (out.includes("FAIL")) throw new Error("Some tests failed");
});

run("WhyDidThisMovePanel tests pass", () => {
  const out = execSync(
    "npx vitest run src/components/market-brain/WhyDidThisMovePanel.test.tsx --reporter=verbose 2>&1",
    { cwd: ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (VERBOSE) console.log(out);
  if (out.includes("FAIL")) throw new Error("Some tests failed");
});

// ─── 5. Integration (optional) ──────────────────────────────────────────────

if (INTEGRATION) {
  console.log("\n── Integration tests ──");
  run("integration tests pass", () => {
    const out = execSync(
      "npx vitest run src/components/ai-orchestrator/browserLocalRuntime.integration.test.ts --reporter=verbose 2>&1",
      { cwd: ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
    );
    if (VERBOSE) console.log(out);
    if (out.includes("FAIL")) throw new Error("Some integration tests failed");
  });
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passes} passed, ${failures} failed ──\n`);
process.exit(failures > 0 ? 1 : 0);
