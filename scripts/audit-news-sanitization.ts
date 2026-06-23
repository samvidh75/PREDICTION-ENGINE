/**
 * audit-news-sanitization.ts — Verifies news HTML sanitization.
 * Run: npx tsx scripts/audit-news-sanitization.ts
 */

export {};
const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

const SYMBOLS = ["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK"];

function hasHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text) || /&lt;|&gt;|&amp;|&quot;|&#x27;|&#x2F;/.test(text);
}

async function main() {
  console.log("News Sanitization Audit");
  console.log("───────────────────────\n");

  let passed = 0;
  let failed = 0;

  for (const symbol of SYMBOLS) {
    try {
      const res = await fetch(
        `${BASE_URL}/api/news/${symbol}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      const items = data.items || [];

      const htmlIssues = items.filter((item: any) =>
        hasHtml(item.headline || "") || hasHtml(item.summary || "") || hasHtml(item.publisher || "")
      );

      if (htmlIssues.length === 0) {
        console.log(`  ✓ ${symbol} — ${items.length} items, no HTML leakage`);
        passed++;
      } else {
        console.log(`  ✗ ${symbol} — ${htmlIssues.length}/${items.length} items have HTML`);
        for (const issue of htmlIssues.slice(0, 3)) {
          console.log(`     Headline: ${issue.headline}`);
        }
        failed++;
      }
    } catch (err: any) {
      console.log(`  ✗ ${symbol} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
