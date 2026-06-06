/**
 * TRACK-13: Database Readiness Report
 * Verifies all required tables have data before running the calibration audit.
 */
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stockstory'
  });

  try {
    console.log('=== TRACK-13: Database Readiness Report ===\n');
    
    // 1. Check connectivity
    console.log('Testing connectivity...');
    const testResult = await pool.query('SELECT 1 AS status');
    console.log(`  Status: ${testResult.rows[0].status === 1 ? 'CONNECTED' : 'FAILED'}\n`);

    // 2. Table row counts
    const tables = [
      'symbols',
      'financial_snapshots',
      'feature_snapshots',
      'factor_snapshots',
      'daily_prices',
    ];

    console.log('Table Row Counts:');
    console.log('| Table | Row Count |');
    console.log('| --- | --- |');
    for (const table of tables) {
      try {
        const res = await pool.query(`SELECT COUNT(*) as cnt FROM ${table}`);
        console.log(`| ${table} | ${res.rows[0].cnt} |`);
      } catch (e) {
        console.log(`| ${table} | ERROR: ${e.message} |`);
      }
    }

    // 3. Latest snapshot dates
    console.log('\nData Freshness (latest snapshots):');
    console.log('| Table | Max Date |');
    console.log('| --- | --- |');
    
    const dateChecks = [
      ['financial_snapshots', 'period_end'],
      ['feature_snapshots', 'trade_date'],
      ['factor_snapshots', 'trade_date'],
      ['daily_prices', 'trade_date'],
    ];
    for (const [table, col] of dateChecks) {
      try {
        const res = await pool.query(`SELECT MAX(${col}) as max_date FROM ${table}`);
        console.log(`| ${table} | ${res.rows[0].max_date ? res.rows[0].max_date.toISOString().split('T')[0] : 'NULL'} |`);
      } catch (e) {
        console.log(`| ${table} | ERROR |`);
      }
    }

    // 4. Active symbols count
    const activeSymbols = await pool.query(
      `SELECT COUNT(*) as cnt FROM symbols WHERE listing_status = 'Active'`
    );
    console.log(`\nActive symbols: ${activeSymbols.rows[0].cnt}`);

    // 5. Symbols with complete snapshots (have at minimum financial + factor)
    const completeRes = await pool.query(`
      SELECT COUNT(DISTINCT s.symbol) as cnt
      FROM symbols s
      WHERE s.listing_status = 'Active'
      AND EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol)
      AND EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol)
    `);
    console.log(`Symbols with financial + factor snapshots: ${completeRes.rows[0].cnt}`);

    // 6. Symbols with feature snapshots
    const featRes = await pool.query(`
      SELECT COUNT(DISTINCT s.symbol) as cnt
      FROM symbols s
      WHERE s.listing_status = 'Active'
      AND EXISTS (SELECT 1 FROM feature_snapshots fs WHERE fs.symbol = s.symbol)
    `);
    console.log(`Symbols with feature snapshots: ${featRes.rows[0].cnt}`);

    // 7. ROA data availability
    const roaRes = await pool.query(`
      SELECT COUNT(*) as cnt FROM financial_snapshots WHERE roa IS NOT NULL
    `);
    const roaCount = roaRes.rows[0].cnt;
    console.log(`\nFinancial snapshots with ROA populated: ${roaCount}`);

    // 8. Key financial metric coverage
    console.log('\nFinancial Metric Coverage (non-null rows):');
    const metrics = ['roe', 'roa', 'roic', 'pe_ratio', 'debt_to_equity', 'revenue_growth', 'profit_growth', 'operating_margin', 'gross_margin', 'market_cap'];
    console.log('| Metric | Count | % of snapshots |');
    console.log('| --- | --- | --- |');
    const totalFinSnaps = await pool.query(`SELECT COUNT(*) as cnt FROM financial_snapshots`);
    const totalCount = totalFinSnaps.rows[0].cnt;
    for (const metric of metrics) {
      const res = await pool.query(`SELECT COUNT(*) as cnt FROM financial_snapshots WHERE ${metric} IS NOT NULL`);
      const count = res.rows[0].cnt;
      console.log(`| ${metric} | ${count} | ${(count/totalCount*100).toFixed(1)}% |`);
    }

    // 9. Sector distribution of active symbols
    console.log('\nSector Distribution (top 10):');
    const sectorRes = await pool.query(`
      SELECT sector, COUNT(*) as cnt
      FROM symbols
      WHERE listing_status = 'Active'
      GROUP BY sector
      ORDER BY cnt DESC
      LIMIT 10
    `);
    console.log('| Sector | Count |');
    console.log('| --- | --- |');
    for (const row of sectorRes.rows) {
      console.log(`| ${row.sector} | ${row.cnt} |`);
    }

    // 10. Missing data issues
    console.log('\nMissing Data Issues:');
    
    // Symbols with no snapshots at all
    const noDataRes = await pool.query(`
      SELECT COUNT(*) as cnt FROM symbols s
      WHERE s.listing_status = 'Active'
      AND NOT EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol)
      AND NOT EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol)
      AND NOT EXISTS (SELECT 1 FROM feature_snapshots fs2 WHERE fs2.symbol = s.symbol)
    `);
    console.log(`  Symbols with zero snapshots: ${noDataRes.rows[0].cnt}`);
    
    // Symbols with missing factor data
    const noFactorRes = await pool.query(`
      SELECT COUNT(*) as cnt FROM symbols s
      WHERE s.listing_status = 'Active'
      AND NOT EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol)
    `);
    console.log(`  Symbols without factor_snapshots: ${noFactorRes.rows[0].cnt}`);

    // Symbols with missing financial data
    const noFinRes = await pool.query(`
      SELECT COUNT(*) as cnt FROM symbols s
      WHERE s.listing_status = 'Active'
      AND NOT EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol)
    `);
    console.log(`  Symbols without financial_snapshots: ${noFinRes.rows[0].cnt}`);

    // Overall readiness verdict
    const totalActive = activeSymbols.rows[0].cnt;
    const withFinAndFactor = completeRes.rows[0].cnt;
    const readiness = withFinAndFactor / totalActive * 100;
    
    console.log(`\n## Readiness Verdict`);
    console.log(`  Active symbols: ${totalActive}`);
    console.log(`  Complete data (financial + factor): ${withFinAndFactor} (${readiness.toFixed(0)}%)`);
    console.log(`  ROA column exists: YES (migration 006)`);
    console.log(`  ROA data populated: ${roaCount} rows`);
    
    if (withFinAndFactor >= 50) {
      console.log(`  Status: READY for TRACK-13 audit (${withFinAndFactor} stocks have complete data)`);
    } else if (withFinAndFactor >= 20) {
      console.log(`  Status: MARGINAL — ${withFinAndFactor} stocks, but can proceed with caveats`);
    } else {
      console.log(`  Status: INSUFFICIENT DATA — only ${withFinAndFactor} stocks have required snapshots`);
    }

    await pool.end();
  } catch (err) {
    console.error('Database readiness check failed:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

main();
