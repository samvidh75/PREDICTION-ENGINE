/**
 * Scrapes real sector/subsector classification for every PSE-listed
 * company from PSE Edge's company directory
 * (https://edge.pse.com.ph/companyDirectory/search.ax, paginated HTML,
 * ~282 companies across 6 pages) and writes them to data/pse-sectors.json.
 *
 * The PSE's own six-sector classification (Financials, Holding Firms,
 * Industrial, Mining and Oil, Property, Services) — the same grouping used
 * for the PSEi-30 in api/_lib/data/universe.ts's PSE_SECTORS, but now
 * covering the full ~282-company universe, not just the 30 index members.
 *
 * Confirmed live (2026-08-04): each row has an onclick of
 * cmDetail('cmpyId','securityId') confirming the numeric cmpy_id matches
 * KNOWN_CMPY_IDS in PSEEdgeScraper.ts — so the directory and the
 * disclosure-search endpoints agree on company identity.
 *
 * Run:
 *   npx tsx scripts/scrape-pse-sectors.ts
 *
 * Writes: data/pse-sectors.json
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { scrapeCompanySectors } from '../src/services/scrapers/PSEEdgeScraper.js';

const OUTPUT_PATH = resolve(process.cwd(), 'data/pse-sectors.json');

async function main() {
  console.log('Scraping PSE Edge company directory for sector/subsector data...');

  const companies = await scrapeCompanySectors();

  if (companies.length === 0) {
    console.error('No companies scraped — aborting.');
    process.exit(1);
  }

  // Build the results map keyed by symbol, plus a sector→symbol listing
  const results: Record<string, {
    symbol: string;
    companyName: string;
    sector: string;
    subsector: string;
    cmpyId: number | null;
    securityId: number | null;
    listingDate: string;
    sourceUrl: string;
  }> = {};

  for (const entry of companies) {
    results[entry.symbol] = {
      symbol: entry.symbol,
      companyName: entry.companyName,
      sector: entry.sector,
      subsector: entry.subsector,
      cmpyId: entry.cmpyId,
      securityId: entry.securityId,
      listingDate: entry.listingDate,
      sourceUrl: entry.sourceUrl,
    };
  }

  // Sector coverage summary
  const sectorCounts: Record<string, number> = {};
  for (const entry of companies) {
    sectorCounts[entry.sector] = (sectorCounts[entry.sector] ?? 0) + 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'edge.pse.com.ph',
    totalCompanies: companies.length,
    sectorBreakdown: sectorCounts,
    results,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\nDone: ${companies.length} companies written to ${OUTPUT_PATH}`);
  console.log('Sector breakdown:');
  for (const [sector, count] of Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sector}: ${count}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
