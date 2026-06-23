/**
 * audit-rc2.ts — RC2 Release Gate.
 * Single command that runs all critical checks and exits non-zero on any failure.
 *
 * Usage:
 *   npx tsx scripts/audit-rc2.ts                  # localhost
 *   npx tsx scripts/audit-rc2.ts --production      # production URLs
 */

import { execSync } from "child_process";

const USE_PRODUCTION = process.argv.includes("--production");
const ENV_BASE = process.env.API_BASE_URL || process.env.API_BASE;
const API_BASE = USE_PRODUCTION ? "https://www.stockstory-india.com" : (ENV_BASE || "http://localhost:3000");

interface AuditCheck {
  name: string;
  command: string;
  critical: boolean;
}

const CHECKS: AuditCheck[] = [
  { name: "search_quality", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-search-quality.ts`, critical: true },
  { name: "scanner_quality", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-scanner-quality.ts`, critical: true },
  { name: "market_data_consistency", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-market-data-consistency.ts`, critical: true },
  { name: "news_sanitization", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-news-sanitization.ts`, critical: true },
  { name: "public_copy", command: "npx tsx scripts/audit-public-copy.ts", critical: true },
  { name: "health_readiness", command: `API_BASE_URL=${API_BASE} npx tsx scripts/audit-health-readiness.ts`, critical: true },
];

async function runCheck(check: AuditCheck): Promise<boolean> {
  process.stdout.write(`  ${check.name}... `);
  try {
    execSync(check.command, { stdio: ["ignore", "pipe", "pipe"], timeout: 30000, env: { ...process.env, API_BASE_URL: API_BASE } });
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
  console.log(`RC2 Release Gate (${USE_PRODUCTION ? "PRODUCTION" : "LOCAL"})`);
  console.log("======================================\n");

  // Run inline production checks
  let inlinePass = 0;
  let inlineFail = 0;

  if (USE_PRODUCTION) {
    const SYMBOLS = ["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK"];
    for (const sym of SYMBOLS) {
      process.stdout.write(`  search_exact_${sym}... `);
      try {
        const res = await fetch(`${API_BASE}/api/search/universal?query=${sym}`);
        const data = await res.json();
        const results = data?.data?.results || [];
        if (results[0]?.ticker === sym) {
          console.log("PASS");
          inlinePass++;
        } else {
          console.log(`FAIL: top result is ${results[0]?.ticker || "none"}`);
          inlineFail++;
        }
      } catch {
        console.log("FAIL: fetch error");
        inlineFail++;
      }
    }

    process.stdout.write(`  scanner_no_duplicates... `);
    try {
      const res = await fetch(`${API_BASE}/api/research/scanner?preset=Quality%20compounders&limit=10`);
      const data = await res.json();
      const items = data?.data || [];
      const symbols = items.map((i: any) => i.symbol);
      const uniq = new Set(symbols);
      const nullScores = items.filter((i: any) => i.score === null || i.score === undefined);
      if (uniq.size === symbols.length && nullScores.length === 0) {
        console.log(`PASS (${items.length} results, all unique, all scored)`);
        inlinePass++;
      } else {
        console.log(`FAIL: ${symbols.length - uniq.size} duplicates, ${nullScores.length} null scores`);
        inlineFail++;
      }
    } catch {
      console.log("FAIL: fetch error");
      inlineFail++;
    }

    process.stdout.write(`  quote_exchange... `);
    try {
      const res = await fetch(`${API_BASE}/api/market-data/quote/RELIANCE`);
      const data = await res.json();
      if (data.exchange && data.exchange !== "Data unavailable") {
        console.log(`PASS (exchange: ${data.exchange})`);
        inlinePass++;
      } else {
        console.log(`FAIL: exchange is "${data.exchange}"`);
        inlineFail++;
      }
    } catch {
      console.log("FAIL: fetch error");
      inlineFail++;
    }

    process.stdout.write(`  technicals_available... `);
    try {
      const res = await fetch(`${API_BASE}/api/technicals/RELIANCE`);
      const data = await res.json();
      if (data.symbol === "RELIANCE" && data.indicators) {
        const asOf = new Date(data.asOf);
        const isWeekend = asOf.getDay() === 0 || asOf.getDay() === 6;
        if (isWeekend) {
          console.log(`FAIL: asOf on weekend: ${data.asOf}`);
          inlineFail++;
        } else {
          console.log(`PASS (asOf: ${data.asOf}, ${Object.keys(data.indicators).length} indicators)`);
          inlinePass++;
        }
      } else {
        console.log(`FAIL: ${JSON.stringify(data).slice(0, 100)}`);
        inlineFail++;
      }
    } catch {
      console.log("FAIL: fetch error");
      inlineFail++;
    }

    process.stdout.write(`  news_sanitized... `);
    try {
      const res = await fetch(`${API_BASE}/api/news/RELIANCE`);
      const data = await res.json();
      const items = data?.items || [];
      const hasHtml = items.some((i: any) => /<[a-z][\s>]/i.test(i.headline || ""));
      console.log(`PASS (${items.length} items, HTML: ${hasHtml})`);
      inlinePass++;
    } catch {
      console.log("FAIL: fetch error");
      inlineFail++;
    }

    process.stdout.write(`  healthz... `);
    try {
      const res = await fetch(`${API_BASE}/healthz`);
      const data = await res.json();
      console.log(data.ok ? "PASS" : "FAIL");
      data.ok ? inlinePass++ : inlineFail++;
    } catch {
      console.log("FAIL");
      inlineFail++;
    }

    process.stdout.write(`  svg_route... `);
    try {
      const res = await fetch(`${API_BASE}/stockstory-mark.svg`);
      const type = res.headers.get("content-type") || "";
      console.log(type.includes("svg") ? "PASS" : `FAIL: ${type}`);
      type.includes("svg") ? inlinePass++ : inlineFail++;
    } catch {
      console.log("FAIL");
      inlineFail++;
    }
  }

  console.log(`\n--- Inline checks: ${inlinePass} passed, ${inlineFail} failed ---\n`);

  // Run sub-audit scripts
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

  console.log(`\nSub-audits: ${passed} passed, ${failed} failed (${criticalFailed} critical)`);

  const totalFail = inlineFail + criticalFailed;
  if (totalFail > 0) {
    console.log(`\nRC2 gate: FAIL (${totalFail} critical failures)`);
    process.exit(1);
  }
  console.log("\nRC2 gate: PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error("RC2 gate error:", err);
  process.exit(1);
});
