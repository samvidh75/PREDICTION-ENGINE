/**
 * audit-release-candidate.ts — One command to verify all release-candidate checks.
 *
 * Runs all critical audit scripts and reports pass/fail for each.
 * Exits non-zero if any critical check fails.
 *
 * Usage:
 *   npx tsx scripts/audit-release-candidate.ts
 */

import { execSync } from "child_process";

interface AuditCheck {
  name: string;
  command: string;
  critical: boolean;
}

const CHECKS: AuditCheck[] = [
  { name: "search_quality", command: "npx tsx scripts/audit-search-quality.ts", critical: true },
  { name: "scanner_quality", command: "npx tsx scripts/audit-scanner-quality.ts", critical: true },
  { name: "market_data_consistency", command: "npx tsx scripts/audit-market-data-consistency.ts", critical: true },
  { name: "news_sanitization", command: "npx tsx scripts/audit-news-sanitization.ts", critical: true },
  { name: "public_copy", command: "npx tsx scripts/audit-public-copy.ts", critical: true },
  { name: "health_readiness", command: "npx tsx scripts/audit-health-readiness.ts", critical: true },
];

async function runCheck(check: AuditCheck): Promise<boolean> {
  process.stdout.write(`  ${check.name}... `);
  try {
    execSync(check.command, { stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
    console.log("PASS");
    return true;
  } catch (err: any) {
    const message = err.stderr?.toString() || err.stdout?.toString() || err.message || "";
    const lines = message.split("\n").filter((l: string) => l.trim()).slice(-3).join("; ");
    console.log(`FAIL: ${lines}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Release Candidate Audit");
  console.log("=======================\n");

  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;

  for (const check of CHECKS) {
    const ok = await runCheck(check);
    if (ok) {
      passed++;
    } else {
      failed++;
      if (check.critical) criticalFailed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed (${criticalFailed} critical)`);

  if (criticalFailed > 0) {
    console.log("\nRelease candidate NOT ready — critical checks failed.");
    process.exit(1);
  }
  if (failed > 0) {
    console.log("\nRelease candidate ready with non-critical warnings.");
    process.exit(0);
  }
  console.log("\nRelease candidate ready — all checks pass.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
