/**
 * Scrapes real public/insider ownership splits for every PSE-listed
 * company with a known `cmpy_id` from PSE Edge's Public Ownership Report
 * (POR-1) filings and writes them to data/pse-ownership.json.
 *
 * Confirmed working live (2026-08-04) — see
 * src/services/scrapers/PSEEdgeScraper.ts's ParsedOwnership doc for
 * exactly what a POR-1 filing reports (outstanding shares, shares held by
 * the public, and a single publicOwnershipPercent figure — NOT a foreign/
 * domestic institutional split, which isn't a real PSE disclosure
 * category). Run:
 *
 *   npx tsx scripts/scrape-pse-ownership.ts
 *
 * Covers KNOWN_CMPY_IDS in PSEEdgeScraper.ts. A `parsed: 0/3` count for a
 * symbol that WAS attempted means PSE Edge's filing text didn't match the
 * label regexes in parsePublicOwnershipText — those need adjusting
 * against the real filing text, not guessed at.
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { getAllCompanies } from '../src/services/data/MasterCompanyRegistry.js';
import { scrapeCompanyOwnership, KNOWN_CMPY_IDS, type ParsedOwnership } from '../src/services/scrapers/PSEEdgeScraper.js';

const OUTPUT_PATH = resolve(process.cwd(), 'data/pse-ownership.json');
const CONCURRENCY = 3; // polite to PSE Edge — don't hammer it with dozens of parallel requests
const DELAY_MS = 3000; // pause between batches (widened after the first run hit rate-limiting partway through)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fieldsPopulated(o: ParsedOwnership): number {
  return [o.outstandingShares, o.sharesOwnedByPublic, o.publicOwnershipPercent].filter((v) => v !== null).length;
}

async function main() {
  const symbols = Object.keys(KNOWN_CMPY_IDS).sort();
  const nameBySymbol = new Map(getAllCompanies().map((c) => [c.symbol, c.companyName]));
  const results: Record<string, ParsedOwnership | { error: string }> = {};
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        const companyName = nameBySymbol.get(symbol) ?? symbol;
        try {
          const ownership = await scrapeCompanyOwnership(symbol, companyName);
          if (!ownership) {
            console.warn(`[${symbol}] no Public Ownership Report found for "${companyName}"`);
            return { symbol, data: { error: 'no_disclosure_found' } };
          }
          console.log(`[${symbol}] (${i + batch.indexOf(symbol) + 1}/${symbols.length}) parsed ${fieldsPopulated(ownership)}/3 fields from ${ownership.sourceUrl}`);
          return { symbol, data: ownership };
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

    if (i + CONCURRENCY < symbols.length) await sleep(DELAY_MS);
  }

  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'edge.pse.com.ph', results }, null, 2),
  );

  console.log(`\nDone: ${succeeded} succeeded, ${failed} failed out of ${symbols.length}.`);
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
