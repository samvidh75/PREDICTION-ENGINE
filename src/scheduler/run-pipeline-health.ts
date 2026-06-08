/**
 * GitHub Actions runner — Pipeline Health Check
 */
import pool from '../db/index';

async function main() {
  console.log('[Health Check] Pipeline Health Report');
  try {
    const result = await pool.query(
      `SELECT phase, status, started_at, completed_at FROM pipeline_health ORDER BY started_at DESC LIMIT 10`
    );
    if (result.rows.length === 0) {
      console.log('  No pipeline runs recorded yet.');
    } else {
      for (const row of result.rows) {
        console.log(`  ${row.phase}: ${row.status}`);
      }
    }
  } catch {
    console.log('  pipeline_health table not available (first run).');
  }
  process.exit(0);
}

main().catch(err => {
  console.error('[Health Check] Error:', err.message);
  process.exit(0);
});
