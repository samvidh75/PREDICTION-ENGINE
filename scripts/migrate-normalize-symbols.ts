/**
 * TRACK-95R — Symbol Normalization Migration
 * 
 * Merges .NS/.BO duplicate entries into canonical symbols.
 * Idempotent — safe to run multiple times.
 * Preserves all horizons and newest snapshots.
 */
import Database from 'better-sqlite3';

const db = new Database('./data/stockstory.db', { readonly: false });

function normalize(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
}

async function main() {
  // Find all duplicates
  const dupeQuery = `
    SELECT symbol, COUNT(*) as cnt
    FROM prediction_registry
    GROUP BY symbol
    HAVING symbol LIKE '%.NS' OR symbol LIKE '%.BO'
  `;
  const dupes = db.prepare(dupeQuery).all() as { symbol: string; cnt: number }[];

  console.log(`Found ${dupes.length} duplicate symbols:`);
  for (const d of dupes) {
    console.log(`  ${d.symbol} → ${normalize(d.symbol)} (${d.cnt} predictions)`);
  }

  // Merge each duplicate into canonical symbol
  let merged = 0;
  let skipped = 0;

  for (const d of dupes) {
    const canonical = normalize(d.symbol);
    if (canonical === d.symbol) {
      skipped++;
      continue; // Already normalized
    }

    // For each unique (symbol, date, horizon) combination in the duplicate,
    // update to canonical symbol. Skip if canonical already has that combination.
    const updates = db.prepare(`
      SELECT DISTINCT prediction_date, prediction_horizon, id
      FROM prediction_registry
      WHERE symbol = ?
        AND NOT EXISTS (
          SELECT 1 FROM prediction_registry pr2
          WHERE pr2.symbol = ?
            AND pr2.prediction_date = prediction_registry.prediction_date
            AND pr2.prediction_horizon = prediction_registry.prediction_horizon
        )
    `).all(d.symbol, canonical) as { prediction_date: string; prediction_horizon: number; id: string }[];

    if (updates.length === 0) {
      // Canonical already has all predictions — delete duplicates
      const del = db.prepare("DELETE FROM prediction_registry WHERE symbol = ?").run(d.symbol);
      console.log(`  Deleted ${del.changes} duplicate rows for ${d.symbol} (canonical already has ${canonical})`);
      skipped++;
      continue;
    }

    // Update rows to canonical symbol
    for (const u of updates) {
      db.prepare("UPDATE prediction_registry SET symbol = ? WHERE id = ?").run(canonical, u.id);
      merged++;
    }

    console.log(`  Merged ${updates.length} rows: ${d.symbol} → ${canonical}`);
  }

  // Verify
  const finalDupes = db.prepare(`
    SELECT COUNT(DISTINCT REPLACE(REPLACE(symbol, '.NS', ''), '.BO', '')) as canonical_count,
           COUNT(DISTINCT symbol) as total_symbols
    FROM prediction_registry
  `).get() as any;

  console.log(`\nMigration complete:`);
  console.log(`  Merged: ${merged} rows`);
  console.log(`  Skipped: ${skipped} symbols`);
  console.log(`  Total distinct symbols after: ${finalDupes?.total_symbols ?? '?'}`);
  console.log(`  True unique companies: ${finalDupes?.canonical_count ?? '?'}`);
}

main().then(() => {
  db.close();
  console.log('Done.');
}).catch((e) => {
  console.error('Fatal:', e.message);
  db.close();
  process.exit(1);
});
