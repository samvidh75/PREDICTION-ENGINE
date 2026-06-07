/**
 * Runner: Daily Feed Generation
 * Called by GitHub Actions daily-pipeline.yml Phase 6
 */
import pool from '../db/index';

async function main() {
  console.log('[DAILY-FEED] Generating daily feed...');
  
  const today = new Date().toISOString().split('T')[0];
  const todayPreds = await pool.query(
    `SELECT COUNT(*) as cnt FROM prediction_registry WHERE prediction_date = $1`,
    [today]
  );
  
  console.log(`  Today's predictions: ${todayPreds.rows[0]?.cnt || 0}`);
  console.log('[DAILY-FEED] Complete');
}

main().catch(err => { console.error(err); process.exit(1); });
