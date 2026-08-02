/**
 * Seed the PSE stock universe from data/official-symbols.json into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-pse-universe.ts
 */

import { readFileSync } from 'fs';
import { dbAdapter } from '../src/db/DatabaseAdapter';

async function main() {
  const raw = readFileSync('data/official-symbols.json', 'utf-8');
  const data = JSON.parse(raw);
  const entries = data.entries || [];

  console.log(`Seeding ${entries.length} PSE symbols...`);

  let count = 0;
  for (const entry of entries) {
    await dbAdapter.query(
      `INSERT INTO stock_universe (symbol, name, exchange, sector, industry, listing_year, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, datetime('now'))
       ON CONFLICT (symbol) DO UPDATE SET
       name = $2, sector = $4, industry = $5, updated_at = datetime('now')`,
      [
        entry.symbol,
        entry.name || entry.symbol,
        entry.exchange || 'PSE',
        entry.sector || 'Unknown',
        entry.industry || 'Unknown',
        entry.listing_year || null,
      ]
    );
    count++;
  }

  console.log(`Seeded ${count} symbols successfully.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
