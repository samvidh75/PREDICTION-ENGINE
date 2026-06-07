/**
 * Runner: Trust Metrics Refresh
 * Called by GitHub Actions daily-pipeline.yml Phase 5
 */
import pool from '../db/index';

async function main() {
  console.log('[TRUST-METRICS] Computing trust metrics...');
  
  const validated = await pool.query(
    `SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'validated'`
  );
  const total = await pool.query(`SELECT COUNT(*) as cnt FROM prediction_registry`);
  
  console.log(`  Validated: ${validated.rows[0]?.cnt || 0}`);
  console.log(`  Total: ${total.rows[0]?.cnt || 0}`);
  
  // Compute hit rates by horizon
  const hitRates = await pool.query(`
    SELECT prediction_horizon,
           SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as hit_rate,
           COUNT(*) as n
    FROM prediction_registry
    WHERE validation_status = 'validated' AND alpha IS NOT NULL
    GROUP BY prediction_horizon
    ORDER BY prediction_horizon
  `);
  
  console.log('  Hit rates by horizon:');
  hitRates.rows.forEach((r: any) => console.log(`    ${r.prediction_horizon}d: ${parseFloat(r.hit_rate).toFixed(1)}% (n=${r.n})`));
  
  console.log('[TRUST-METRICS] Complete');
}

main().catch(err => { console.error(err); process.exit(1); });
