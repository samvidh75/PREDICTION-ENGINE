/**
 * backfill-symbols.ts — populate the `symbols` registry from the real PSE
 * sector scrape (data/pse-sectors.json, produced by scripts/fetch_pse_data.ts).
 *
 * Ensures the research endpoint, healthometer and factor engines can resolve a
 * symbol's sector/industry from real PSE data instead of empty strings.
 *
 * Usage:
 *   SQLITE_DB_PATH=dev.db npx tsx scripts/backfill-symbols.ts
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dbAdapter } from '../src/db/DatabaseAdapter';

const SECTORS_PATH = resolve(process.cwd(), 'data/pse-sectors.json');

interface SectorEntry {
  symbol: string;
  companyName?: string | null;
  sector?: string | null;
  subsector?: string | null;
}

async function main() {
  await dbAdapter.initialize();
  if (dbAdapter.kind === 'unavailable') {
    console.error('[backfill-symbols] Database unavailable — aborting');
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(readFileSync(SECTORS_PATH, 'utf-8')) as {
    results?: Record<string, SectorEntry>;
    totalCompanies?: number;
  };
  const results = raw.results ?? {};
  const entries = Object.values(results);
  console.log(`[backfill-symbols] ${entries.length} symbols from ${SECTORS_PATH} (db: ${dbAdapter.kind})`);

  let ok = 0;
  for (const e of entries) {
    const symbol = (e.symbol || '').toUpperCase().trim();
    if (!symbol) continue;
    await dbAdapter.query(
      `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
       VALUES ($1, 'PSE', $2, $3, $4, 'Active')
       ON CONFLICT (symbol) DO UPDATE SET
         company_name=EXCLUDED.company_name,
         sector=EXCLUDED.sector,
         industry=EXCLUDED.industry`,
      [symbol, e.companyName ?? null, e.sector ?? null, e.subsector ?? null]
    );
    ok++;
  }
  console.log(`[backfill-symbols] Done — ${ok} symbols upserted.`);
}

main();
