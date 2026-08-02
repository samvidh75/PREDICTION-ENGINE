#!/usr/bin/env node
/**
 * render-smoke-check.mjs
 *
 * Post-deployment smoke test for StockEX on Render.
 * Verifies the live backend is running the expected commit,
 * health endpoints respond, DB is connected, and static assets are served.
 *
 * Usage:
 *   node scripts/deployment/render-smoke-check.mjs <deploy-url>
 *
 * Example:
 *   node scripts/deployment/render-smoke-check.mjs https://stockstory-api.onrender.com
 *
 * Returns exit code 0 if all checks pass, 1 otherwise.
 */

const BASE_URL = process.argv[2] || "https://stockstory-api.onrender.com";
const EXPECTED_COMMIT = process.argv[3] || "";

const ENDPOINTS = [
  { path: "/healthz", label: "Health check" },
  { path: "/readyz", label: "Readiness check" },
  { path: "/version", label: "Version info" },
  { path: "/api/health", label: "API health" },
  { path: "/api/version", label: "API version" },
  { path: "/metrics", label: "Metrics" },
];

const PASS = "\x1b[32m✓ PASS\x1b[0m";
const FAIL = "\x1b[31m✗ FAIL\x1b[0m";
const SKIP = "\x1b[33m— SKIP\x1b[0m";

let exitCode = 0;

async function main() {
  console.log(`\n🔍 Render Deployment Smoke Check — ${new Date().toISOString()}`);
  console.log(`   Target: ${BASE_URL}`);
  if (EXPECTED_COMMIT) console.log(`   Expected commit: ${EXPECTED_COMMIT}\n`);

  for (const { path, label } of ENDPOINTS) {
    const url = `${BASE_URL}${path}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      const body = await res.json();

      const ok = res.ok || (res.status >= 200 && res.status < 400);
      const status = ok ? PASS : FAIL;

      console.log(`  ${status}  [${res.status}] ${label} — ${url}`);

      // Show key fields
      if (body.commitSha || body.commitShaShort) {
        console.log(`         commit: ${body.commitSha ?? body.commitShaShort}`);
      }
      if (body.db || body.dbStatus) {
        console.log(`         db: ${body.db ?? body.dbStatus}`);
      }
      if (body.status) {
        console.log(`         status: ${body.status}`);
      }
      if (body.uptimeSeconds != null) {
        console.log(`         uptime: ${body.uptimeSeconds}s`);
      }
      if (body.env) {
        console.log(`         env: ${body.env}`);
      }
      if (body.nodeVersion || body.node) {
        console.log(`         node: ${body.nodeVersion ?? body.node}`);
      }

      // Check commit if expected one was provided
      if (EXPECTED_COMMIT) {
        const deployedSha = body.commitSha ?? body.commitShaShort ?? "";
        if (!deployedSha.includes(EXPECTED_COMMIT.slice(0, 8))) {
          console.log(`         ${FAIL} Commit mismatch: expected ${EXPECTED_COMMIT.slice(0, 8)}, got ${deployedSha}`);
          exitCode = 1;
        } else {
          console.log(`         ${PASS} Commit matches expected`);
        }
      }

      if (!ok) {
        exitCode = 1;
      }
    } catch (err) {
      console.log(`  ${FAIL}  [ERR]  ${label} — ${url}`);
      console.log(`         ${err instanceof Error ? err.message : String(err)}`);
      exitCode = 1;
    }
  }

  // ── Static asset check: fetch index.html ─────────────────────────────
  console.log();
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(15_000) });
    const html = await res.text();
    if (html.includes("<title>") || html.includes("StockEX")) {
      console.log(`  ${PASS}  [${res.status}] SPA index.html served`);
    } else {
      console.log(`  ${FAIL}  [${res.status}] SPA index.html missing expected content`);
      exitCode = 1;
    }
  } catch (err) {
    console.log(`  ${FAIL}  [ERR]  SPA index.html — ${err instanceof Error ? err.message : String(err)}`);
    exitCode = 1;
  }

  console.log();
  if (exitCode === 0) {
    console.log("✅ All smoke checks passed.");
  } else {
    console.log("❌ Some smoke checks failed.");
  }
  process.exit(exitCode);
}

main();
