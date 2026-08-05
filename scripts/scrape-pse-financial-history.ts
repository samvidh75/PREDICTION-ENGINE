/**
 * Scrapes a REAL multi-quarter financial history (revenue, net income,
 * assets, equity, EPS per quarter) for every PSE-listed company with a known
 * `cmpy_id`, by fetching and parsing the last N quarterly filings from PSE
 * Edge — see PSEEdgeScraper.ts's scrapeCompanyFinancialHistory.
 *
 * This is the ground truth the Financials chart can render instead of the
 * synthetic market-cap/sector-median model. Unlike the weekly fundamentals
 * job (which fetches only the latest quarter), this makes ~N PSE Edge
 * requests per company, so it is intentionally a separate, LESS-FREQUENT
 * (monthly) job — see .github/workflows/pse-financial-history-monthly.yml.
 *
 * Run:
 *   npx tsx scripts/scrape-pse-financial-history.ts
 *
 * Writes: data/pse-financial-history.json
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { getAllCompanies } from '../src/services/data/MasterCompanyRegistry.js';
import { scrapeCompanyFinancialHistory, withRetry, KNOWN_CMPY_IDS, type ParsedFinancialHistory } from '../src/services/scrapers/PSEEdgeScraper.js';

const OUTPUT_PATH = resolve(process.cwd(), 'data/pse-financial-history.json');
const PERIODS_TO_FETCH = 8;
const CONCURRENCY = 2; // heavy: each company makes ~N viewer requests
const DELAY_MS = 2000;  // polite to PSE Edge

async function main() {
    const symbols = Object.keys(KNOWN_CMPY_IDS).sort();
  // MAX_SYMBOLS (env) is a dev/validation override only — the monthly
  // production job runs the full universe; never committed.
  const max = process.env.MAX_SYMBOLS ? Number(process.env.MAX_SYMBOLS) : symbols.length;
  const toScrape = symbols.slice(0, max);
  const nameBySymbol = new Map(getAllCompanies().map((c) => [c.symbol, c.companyName]));
  const results: Record<string, ParsedFinancialHistory | { error: string }> = {};
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        const companyName = nameBySymbol.get(symbol) ?? symbol;
        try {
          const history = await withRetry(
            () => scrapeCompanyFinancialHistory(symbol, companyName, PERIODS_TO_FETCH),
            2, 3000,
          );
          if (!history) {
            console.warn(`[${symbol}] no quarterly filings found`);
            return { symbol, data: { error: 'no_disclosure_found' } as { error: string } };
          }
          const points = history.series.filter((p) => p.revenue !== null || p.netIncome !== null);
          if (points.length === 0) {
            console.warn(`[${symbol}] ${history.series.length} filing(s) found but none parsed real figures`);
            return { symbol, data: history };
          }
          console.log(`[${symbol}] (${i + batch.indexOf(symbol) + 1}/${toScrape.length}) ${points.length}/${PERIODS_TO_FETCH} quarters with real figures`);
          return { symbol, data: history };
        } catch (err) {
          console.error(`[${symbol}] scrape failed:`, err instanceof Error ? err.message : err);
          return { symbol, data: { error: err instanceof Error ? err.message : String(err) } };
        }
      }),
    );

    for (const { symbol, data } of batchResults) {
      results[symbol] = data as any;
      if ('error' in (data as any)) failed++;
      else succeeded++;
    }

    if (i + CONCURRENCY < toScrape.length) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'edge.pse.com.ph', periodsPerCompany: PERIODS_TO_FETCH, results }, null, 2),
  );

  console.log(`\nDone: ${succeeded} with real history, ${failed} failed out of ${toScrape.length}.`);
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
