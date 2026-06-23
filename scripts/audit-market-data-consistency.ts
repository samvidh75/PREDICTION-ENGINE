/**
 * audit-market-data-consistency.ts — Verifies quote/chart/technical consistency.
 * Run: npx tsx scripts/audit-market-data-consistency.ts
 */

export {};
const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

const SYMBOLS = ["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK"];

async function main() {
  console.log("Market Data Consistency Audit");
  console.log("─────────────────────────────\n");

  let passed = 0;
  let failed = 0;

  for (const symbol of SYMBOLS) {
    try {
      const [quoteRes, technicalRes] = await Promise.all([
        fetch(`${BASE_URL}/api/market-data/quote/${symbol}`, { signal: AbortSignal.timeout(10000) }),
        fetch(`${BASE_URL}/api/technicals/${symbol}/latest`, { signal: AbortSignal.timeout(10000) }).catch(() => null),
      ]);

      const quote = await quoteRes.json();
      const hasValidQuote = quote.lastPrice !== null && quote.lastPrice !== undefined;

      let hasValidTechnicals = true;
      let weekendBars = false;
      if (technicalRes && technicalRes.ok) {
        const technical = await technicalRes.json();
        if (technical.indicators) {
          for (const [key, val] of Object.entries(technical.indicators)) {
            if (val && typeof val === "object" && "data" in (val as any)) {
              const data = (val as any).data as any[];
              if (Array.isArray(data)) {
                for (const point of data) {
                  if (point.date) {
                    const d = new Date(point.date);
                    if (d.getDay() === 6 || d.getDay() === 0) {
                      weekendBars = true;
                    }
                  }
                }
              }
            }
          }
        }
      }

      const errors: string[] = [];
      if (!hasValidQuote) errors.push("no valid quote");
      if (weekendBars) errors.push("weekend bars in technical data");

      if (errors.length === 0) {
        console.log(`  ✓ ${symbol} — quote valid, no weekend bars`);
        passed++;
      } else {
        console.log(`  ✗ ${symbol} — ${errors.join(", ")}`);
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
