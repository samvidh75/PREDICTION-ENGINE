/**
 * Scrapes real fundamentals for all PSEi-30 companies from PSE Edge
 * (edge.pse.com.ph, the PSE's own public disclosure system) and writes them
 * to data/pse-fundamentals.json for the app to read at request time.
 *
 * Confirmed working live (2026-08-04) — see
 * src/services/scrapers/PSEEdgeScraper.ts's module doc for exactly how the
 * company-specific search filter was reverse-engineered (a numeric
 * `cmpy_id`, not free-text keyword). Run:
 *
 *   npx tsx scripts/scrape-pse-fundamentals.ts
 *
 * Symbols without a known `cmpy_id` (see KNOWN_CMPY_IDS in
 * PSEEdgeScraper.ts — currently the PSEi-30 plus a few extras) return
 * `no_disclosure_found`, not a crash; that's the honest "not resolvable
 * yet" state, not a scraping failure. A `parsed: 0/7` fields count for a
 * symbol that DID resolve means PSE Edge's filing text didn't match the
 * label regexes in parseFinancialStatementText for that specific filer's
 * formatting — those need adjusting against the real filing text, not
 * guessed at.
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { PSEI_30 } from '../api/_lib/data/universe.js';
import { getAllCompanies } from '../src/services/data/MasterCompanyRegistry.js';
import { scrapeCompanyFundamentals, type ParsedFundamentals } from '../src/services/scrapers/PSEEdgeScraper.js';

const OUTPUT_PATH = resolve(process.cwd(), 'data/pse-fundamentals.json');
const CONCURRENCY = 3; // polite to PSE Edge — don't hammer it with 30 parallel requests
const DELAY_MS = 1500; // pause between batches

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fieldsPopulated(f: ParsedFundamentals): number {
  return [f.totalAssets, f.totalLiabilities, f.totalEquity, f.netIncome, f.revenue, f.eps, f.sharesOutstanding]
    .filter((v) => v !== null).length;
}

async function main() {
  const nameBySymbol = new Map(getAllCompanies().map((c) => [c.symbol, c.companyName]));
  const results: Record<string, ParsedFundamentals | { error: string }> = {};
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < PSEI_30.length; i += CONCURRENCY) {
    const batch = PSEI_30.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        const companyName = nameBySymbol.get(symbol) ?? symbol;
        try {
          const fundamentals = await scrapeCompanyFundamentals(symbol, companyName);
          if (!fundamentals) {
            console.warn(`[${symbol}] no 17-Q disclosure found for "${companyName}"`);
            return { symbol, data: { error: 'no_disclosure_found' } };
          }
          console.log(`[${symbol}] parsed ${fieldsPopulated(fundamentals)}/7 fields from ${fundamentals.sourceUrl}`);
          return { symbol, data: fundamentals };
        } catch (err) {
          console.error(`[${symbol}] scrape failed:`, err instanceof Error ? err.message : err);
          return { symbol, data: { error: err instanceof Error ? err.message : String(err) } };
        }
      }),
    );

    for (const { symbol, data } of batchResults) {
      results[symbol] = data;
      if ('error' in data) failed++;
      else succeeded++;
    }

    if (i + CONCURRENCY < PSEI_30.length) await sleep(DELAY_MS);
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'edge.pse.com.ph', results }, null, 2),
  );

  console.log(`\nDone: ${succeeded} succeeded, ${failed} failed out of ${PSEI_30.length}.`);
  console.log(`Written to ${OUTPUT_PATH}`);
  if (failed > 0) {
    console.log('Failures are expected on first run if PSE Edge\'s markup differs from the assumptions in PSEEdgeScraper.ts — inspect the errors above.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
