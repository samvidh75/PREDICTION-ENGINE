/**
 * audit-production-trust.ts — Verifies production trust baseline.
 * Run: npx tsx scripts/audit-production-trust.ts
 */

export {};
const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface CheckResult {
  check: string;
  passed: boolean;
  detail: string;
}

async function check(url: string, label: string): Promise<CheckResult> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return { check: label, passed: res.ok, detail: `${res.status} ${res.statusText}` };
  } catch (err: any) {
    return { check: label, passed: false, detail: err.message };
  }
}

async function checkJson(url: string, label: string, validate: (data: any) => boolean): Promise<CheckResult> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { check: label, passed: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    const valid = validate(data);
    return { check: label, passed: valid, detail: valid ? "Valid" : "Validation failed: " + JSON.stringify(data).slice(0, 200) };
  } catch (err: any) {
    return { check: label, passed: false, detail: err.message };
  }
}

async function main() {
  console.log("Production Trust Audit");
  console.log("─────────────────────\n");

  const results: CheckResult[] = [
    await check(`${BASE_URL}/healthz`, "/healthz returns 200"),
    await check(`${BASE_URL}/readyz`, "/readyz returns 200/503"),
    await checkJson(`${BASE_URL}/api/research/scanner?preset=Quality%20compounders&limit=5`,
      "Scanner returns valid result set",
      (d) => {
        if (!d.data || !Array.isArray(d.data)) return false;
        const symbols = d.data.map((r: any) => r.symbol);
        const unique = new Set(symbols);
        if (unique.size !== symbols.length) return false;
        const hasNullScore = d.data.some((r: any) => r.score === null);
        if (hasNullScore) return false;
        const hasPending = d.data.some((r: any) =>
          (r.conviction || "").includes("Research signals pending") ||
          (r.keyReason || "").includes("Research signals pending")
        );
        if (hasPending) return false;
        return true;
      }
    ),
    await checkJson(`${BASE_URL}/api/search/universal?query=RELIANCE`,
      "RELIANCE search top result is Reliance Industries",
      (d) => {
        const results = d.data?.results || d.results || d;
        if (Array.isArray(results) && results.length > 0) {
          return results[0].ticker === "RELIANCE" || (results[0].title || "").includes("Reliance Industries");
        }
        return false;
      }
    ),
    await checkJson(`${BASE_URL}/api/market-data/quote/RELIANCE`,
      "RELIANCE quote available",
      (d) => d && (d.price !== undefined || d.lastPrice !== undefined)
    ),
    await checkJson(`${BASE_URL}/api/news/RELIANCE`,
      "News has no HTML leakage",
      (d) => {
        if (!d.items || !Array.isArray(d.items)) return true;
        return !d.items.some((i: any) =>
          /<[a-z][\s\S]*>/i.test(i.headline || "") || /&lt;/.test(i.headline || "")
        );
      }
    ),
  ];

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.passed ? "✓" : "✗";
    console.log(`  ${icon} ${r.check}`);
    console.log(`     ${r.detail}`);
    if (r.passed) passed++; else failed++;
    console.log();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
