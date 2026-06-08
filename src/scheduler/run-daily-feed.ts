/**
 * GitHub Actions runner — Phase 6: Daily Feed
 */
import pool from '../db/index';

async function main() {
  console.log('[Phase 6] Generating daily feed...');
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT COUNT(*) as cnt, AVG(ranking_score) as avg_score FROM prediction_registry WHERE prediction_date = $1`,
    [today]
  );
  const row = result.rows[0] || { cnt: 0, avg_score: 0 };
  console.log(`[Phase 6] Complete: ${row.cnt} predictions today`);
  process.exit(0);
}

main().catch(err => {
  console.error('[Phase 6] Fatal:', err.message);
  process.exit(1);
});
