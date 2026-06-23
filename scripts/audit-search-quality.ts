/**
 * audit-search-quality.ts — Verifies search quality.
 * Run: npx tsx scripts/audit-search-quality.ts
 */

export {};
const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface SearchCheck {
  query: string;
  expectedTopTicker: string;
}

const CHECKS: SearchCheck[] = [
  { query: "RELIANCE", expectedTopTicker: "RELIANCE" },
  { query: "TCS", expectedTopTicker: "TCS" },
  { query: "INFY", expectedTopTicker: "INFY" },
  { query: "ITC", expectedTopTicker: "ITC" },
  { query: "HDFCBANK", expectedTopTicker: "HDFCBANK" },
];

async function main() {
  console.log("Search Quality Audit");
  console.log("───────────────────\n");

  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/search/universal?query=${encodeURIComponent(check.query)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      const results = data.results || data;
      const top = Array.isArray(results) && results.length > 0 ? results[0] : null;

      const topTicker = top?.ticker || "";
      const topTitle = top?.title || "";
      const isCorrect = topTicker === check.expectedTopTicker ||
        topTitle.toUpperCase().includes(check.expectedTopTicker);

      if (isCorrect) {
        console.log(`  ✓ "${check.query}" → ${topTitle} (${topTicker})`);
        passed++;
      } else {
        console.log(`  ✗ "${check.query}" → expected top ticker ${check.expectedTopTicker}, got ${topTicker || topTitle || "no results"}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`  ✗ "${check.query}" → ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
