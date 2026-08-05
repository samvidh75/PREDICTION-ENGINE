/**
 * Scrapes real insider beneficial-ownership-change filings (form 17-7)
 * per company from PSE Edge and writes them to data/pse-insider-filings.json.
 *
 * See src/services/scrapers/PSEEdgeScraper.ts's ParsedInsiderFiling doc for
 * exactly what's real here (reporting person, relationship, transaction
 * description) and what isn't reliably available (share quantity,
 * transaction value — not present in this filing type's PSE Edge
 * rendering, so not fabricated).
 *
 * Run:
 *   npx tsx scripts/scrape-pse-insider-filings.ts
 *
 * MAX_SYMBOLS env var samples the run for validation (never used in the
 * scheduled production job).
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { getAllCompanies } from '../src/services/data/MasterCompanyRegistry.js';
import { scrapeCompanyInsiderFilings, withRetry, KNOWN_CMPY_IDS, type ParsedInsiderFiling } from '../src/services/scrapers/PSEEdgeScraper.js';

const OUTPUT_PATH = resolve(process.cwd(), 'data/pse-insider-filings.json');
const FILINGS_PER_COMPANY = 5;
const CONCURRENCY = 2;
const DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const symbols = Object.keys(KNOWN_CMPY_IDS).sort();
  const max = process.env.MAX_SYMBOLS ? Number(process.env.MAX_SYMBOLS) : symbols.length;
  const toScrape = symbols.slice(0, max);
  const nameBySymbol = new Map(getAllCompanies().map((c) => [c.symbol, c.companyName]));
  const results: Record<string, ParsedInsiderFiling[]> = {};
  let succeeded = 0;
  let empty = 0;

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        const companyName = nameBySymbol.get(symbol) ?? symbol;
        try {
          const filings = await withRetry(
            () => scrapeCompanyInsiderFilings(symbol, companyName, FILINGS_PER_COMPANY),
            2, 3000,
          );
          console.log(`[${symbol}] (${i + batch.indexOf(symbol) + 1}/${toScrape.length}) ${filings?.length ?? 0} insider filings`);
          return { symbol, filings: filings ?? [] };
        } catch (err) {
          console.error(`[${symbol}] scrape failed:`, err instanceof Error ? err.message : err);
          return { symbol, filings: [] as ParsedInsiderFiling[] };
        }
      }),
    );

    for (const { symbol, filings } of batchResults) {
      results[symbol] = filings;
      if (filings.length > 0) succeeded++;
      else empty++;
    }

    if (i + CONCURRENCY < toScrape.length) await sleep(DELAY_MS);
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'edge.pse.com.ph', results }, null, 2),
  );

  console.log(`\nDone: ${succeeded} with real filings, ${empty} with none, out of ${toScrape.length}.`);
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
