/**
 * GitHub Actions runner — Phase 2: Factor Refresh
 * Verifies factor_snapshots freshness.
 */
import pool from '../db/index';

async function main() {
  console.info('[Phase 2] Checking factor freshness...');
  const result = await pool.query(
    `SELECT MAX(trade_date) as latest, COUNT(DISTINCT symbol) as symbols FROM factor_snapshots`
  );
  const row = result.rows[0] || { latest: null, symbols: 0 };
  if (row.latest) {
    const daysAgo = Math.floor((Date.now() - new Date(row.latest).getTime()) / 86400000);
    console.info(`[Phase 2] Latest factors: ${row.latest} (${daysAgo}d ago), ${row.symbols} symbols`);
    if (daysAgo > 2) console.warn('[Phase 2] WARNING: Factor data is stale (>2 days).');
  } else {
    console.warn('[Phase 2] WARNING: No factor snapshots found.');
  }
  process.exit(0);
}

main().catch(err => {
  console.error('[Phase 2] Fatal:', err.message);
  process.exit(1);
});
