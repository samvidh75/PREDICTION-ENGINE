/**
 * Scrapes each PSE-listed company's most recent real disclosures from PSE
 * Edge (Material Information/Transactions, Press Releases, insider forms,
 * results announcements, etc.) and writes them to data/pse-disclosures.json.
 *
 * These are genuine company filings — every entry carries its real title,
 * filing date, and a link to the actual filing on PSE Edge. This is the
 * honest replacement for the templated placeholder headlines the Fastify
 * apiRouter used to fall back to (see PSEDisclosuresData.ts doc).
 *
 * Run:
 *   npx tsx scripts/scrape-pse-disclosures.ts
 *
 * Writes: data/pse-disclosures.json
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { scrapeAllCompanyDisclosures } from '../src/services/scrapers/PSEEdgeScraper.js';

const OUTPUT_PATH = resolve(process.cwd(), 'data/pse-disclosures.json');
const LIMIT_PER_COMPANY = 8;

async function main() {
  console.log(`Scraping recent PSE Edge disclosures (up to ${LIMIT_PER_COMPANY} per company)...`);

  const results = await scrapeAllCompanyDisclosures(LIMIT_PER_COMPANY);

  const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
  const covered = Object.values(results).filter((arr) => arr.length > 0).length;

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'edge.pse.com.ph',
    totalDisclosures: totalCount,
    companiesWithDisclosures: covered,
    results,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\nDone: ${totalCount} disclosures across ${covered} companies written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
