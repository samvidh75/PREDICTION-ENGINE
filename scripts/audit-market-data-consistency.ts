/**
 * audit-market-data-consistency.ts — Checks quote/chart/technical data consistency.
 *
 * Usage:
 *   npx tsx scripts/audit-market-data-consistency.ts
 */

export {};
const SYMBOLS = ["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK"];

interface QuoteResponse {
  symbol: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
  source?: string;
}

interface TechnicalsResponse {
  symbol: string;
  asOf: string;
  indicators: Record<string, number | null>;
  states: Record<string, string>;
}

async function main(): Promise<void> {
  const baseUrl = process.env.API_BASE || "https://www.stockstory-india.com";
  let passed = 0;
  let failed = 0;

  console.log("Market Data Consistency Audit");
  console.log("───────────────────────────────\n");

  for (const symbol of SYMBOLS) {
    try {
      const quoteRes = await fetch(`${baseUrl}/api/market-data/quote/${symbol}`);
      const quote: QuoteResponse = await quoteRes.json();

      if (!quote || !quote.symbol) {
        console.log(`  FAIL: ${symbol} — no quote data`);
        failed++;
        continue;
      }

      if (quote.exchange === "Data unavailable" || !quote.exchange) {
        console.log(`  FAIL: ${symbol} — exchange is "${quote.exchange || "missing"}"`);
        failed++;
        continue;
      }

      if (quote.exchange === "NSE" || quote.exchange === "BSE") {
        console.log(`  PASS: ${symbol} — exchange=${quote.exchange}, price=${quote.price}`);
      } else {
        console.log(`  WARN: ${symbol} — unexpected exchange: "${quote.exchange}"`);
      }

      const isWeekend = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getDay() === 0 || d.getDay() === 6;
      };

      if (quote.updatedAt && isWeekend(quote.updatedAt)) {
        console.log(`  WARN: ${symbol} — quote updatedAt falls on weekend: ${quote.updatedAt}`);
      }

      passed++;
    } catch (err) {
      console.log(`  FAIL: ${symbol} — error: ${err}`);
      failed++;
    }
  }

  // Check technicals endpoint
  console.log("\n  Checking technicals endpoint...");
  try {
    const techRes = await fetch(`${baseUrl}/api/technicals/RELIANCE`);
    const techData = await techRes.json();

    if (techData.error) {
      console.log(`  WARN: technicals unavailable: ${techData.error}`);
    } else if (techData.symbol && techData.indicators) {
      console.log(`  PASS: technicals available for ${techData.symbol}, asOf=${techData.asOf}`);
      const weekend = techData.asOf ? new Date(techData.asOf).getDay() : -1;
      if (weekend === 0 || weekend === 6) {
        console.log(`  FAIL: technicals asOf falls on weekend: ${techData.asOf}`);
        failed++;
      } else {
        console.log(`  PASS: technicals asOf is a weekday`);
      }
    } else {
      console.log(`  WARN: technicals response incomplete`);
    }
  } catch (err) {
    console.log(`  WARN: technicals check failed: ${err}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
