/**
 * TRACK-33 Phase 1: Infrastructure Audit
 * Verifies TRACK-32 delivery is complete and operational.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function audit() {
  const results = { checks: [], errors: [] };

  // 1. Check tables exist
  const requiredTables = [
    'prediction_registry',
    'daily_prediction_snapshots',
    'benchmark_observations',
    'engine_attribution_results',
    'statistical_validations',
  ];

  for (const table of requiredTables) {
    try {
      const res = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      const exists = res.rows[0].exists;
      results.checks.push({ check: `table_${table}`, passed: exists });
      if (!exists) results.errors.push(`Table ${table} does not exist`);
    } catch (err) {
      results.checks.push({ check: `table_${table}`, passed: false, error: err.message });
      results.errors.push(`Failed checking ${table}: ${err.message}`);
    }
  }

  // 2. Check factor_snapshots data
  try {
    const fsRes = await pool.query(
      `SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date, COUNT(*) as cnt, COUNT(DISTINCT symbol) as symbols FROM factor_snapshots`
    );
    results.checks.push({
      check: 'factor_snapshots_data',
      passed: true,
      detail: fsRes.rows[0],
    });
  } catch (err) {
    results.checks.push({ check: 'factor_snapshots_data', passed: false, error: err.message });
  }

  // 3. Check daily_prices data
  try {
    const dpRes = await pool.query(
      `SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date, COUNT(*) as cnt, COUNT(DISTINCT symbol) as symbols FROM daily_prices`
    );
    results.checks.push({
      check: 'daily_prices_data',
      passed: true,
      detail: dpRes.rows[0],
    });
  } catch (err) {
    results.checks.push({ check: 'daily_prices_data', passed: false, error: err.message });
  }

  // 4. Check NIFTY data in daily_prices
  try {
    const niftyRes = await pool.query(
      `SELECT COUNT(*) as cnt FROM daily_prices WHERE symbol IN ('NIFTY 50', 'NIFTY 100', 'NIFTY 500', '^NSEI', 'NSEI')`
    );
    results.checks.push({
      check: 'nifty_data_available',
      passed: parseInt(niftyRes.rows[0].cnt) > 0,
      detail: { count: parseInt(niftyRes.rows[0].cnt) },
    });
  } catch (err) {
    results.checks.push({ check: 'nifty_data_available', passed: false });
  }

  // 5. Check prediction module imports (verify files exist)
  const fs = require('fs');
  const path = require('path');
  const predictionsDir = path.join(__dirname, '..', 'src', 'predictions');
  const requiredFiles = [
    'types.ts', 'PredictionRegistry.ts', 'DailyPredictionCapture.ts',
    'OutcomeValidationEngine.ts', 'ConfidenceCalibrationEngine.ts',
    'RankingAccuracyEngine.ts', 'EngineAttributionAnalyzer.ts',
    'ConfidenceV2Activator.ts', 'BenchmarkTracker.ts',
    'StatisticalValidationEngine.ts', 'AntiCheatingAuditor.ts',
    'PredictionLedger.ts', 'PredictionCredibilityScorer.ts', 'index.ts',
  ];

  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(predictionsDir, file));
    results.checks.push({ check: `file_${file}`, passed: exists });
    if (!exists) results.errors.push(`File ${file} is missing`);
  }

  // 6. Migration check
  const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', '008_create_prediction_registry.sql');
  const migExists = fs.existsSync(migrationPath);
  results.checks.push({ check: 'migration_008_exists', passed: migExists });

  const allPassed = results.errors.length === 0;
  console.log(JSON.stringify({ status: allPassed ? 'PASSED' : 'FAILED', ...results }, null, 2));
  return allPassed;
}

audit()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(err => {
    console.error('Audit error:', err);
    process.exit(1);
  });
