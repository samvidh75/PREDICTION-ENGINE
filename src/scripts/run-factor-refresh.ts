/**
 * Runner: Factor Refresh
 * Called by GitHub Actions daily-pipeline.yml Phase 2
 */
import pool from '../db/index';

async function main() {
  console.log('[FACTOR-REFRESH] Checking factor freshness...');
  
  const latestFactors = await pool.query(
    `SELECT MAX(trade_date) as latest FROM factor_snapshots`
  );
  
  console.log(`  Latest factor data: ${latestFactors.rows[0]?.latest || 'NONE'}`);
  
  const factorCount = await pool.query(
    `SELECT COUNT(*) as cnt FROM factor_snapshots`
  );
  
  console.log(`  Total factor snapshots: ${factorCount.rows[0]?.cnt || 0}`);
  console.log('[FACTOR-REFRESH] Complete');
}

main().catch(err => { console.error(err); process.exit(1); });
