/**
 * TRACK-34 Pre-Flight Reality Check
 * Determines whether data can actually be populated or if the DB is unreachable.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-34');
fs.mkdirSync(REPORT_DIR, { recursive: true });

async function main() {
  const report = [];

  // 1. Connection test
  report.push('# TRACK-34: Pre-Flight Reality Check\n');
  report.push(`**Generated:** ${new Date().toISOString()}\n`);

  report.push('## 1. Database Connection\n');
  for (const key of ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPORT', 'DATABASE_URL']) {
    const val = process.env[key];
    report.push(`- **${key}**: ${val ? (key.includes('URL') ? val.replace(/\/\/.*@/, '//***@') : val) : 'NOT SET'}`);
  }

  let dbOk = false;
  let existingTables = [];
  const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    connectionTimeoutMillis: 5000,
  });

  try {
    await pool.query('SELECT 1');
    report.push('\n✅ **Database connection: SUCCESS**\n');
    dbOk = true;
  } catch (e) {
    report.push(`\n❌ **Database connection: FAILED** — ${e.message}\n`);
  }

  if (dbOk) {
    // 2. Table inventory
    report.push('## 2. Table Inventory\n');
    try {
      const tables = await pool.query(
        "SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as cols FROM information_schema.tables t WHERE table_schema = 'public' ORDER BY table_name"
      );
      report.push('| Table | Columns | Rows |');
      report.push('|-------|---------|------|');
      for (const t of tables.rows) {
        let rowCount = '?';
        try {
          const r = await pool.query(`SELECT COUNT(*) as c FROM ${t.table_name}`);
          rowCount = String(r.rows[0].c);
        } catch (e) { rowCount = 'ERR'; }
        existingTables.push({ name: t.table_name, cols: t.cols, rows: rowCount });
        report.push(`| ${t.table_name} | ${t.cols} | ${rowCount} |`);
      }
    } catch (e) {
      report.push(`\n❌ Table discovery failed: ${e.message}`);
    }
  }

  // 3. Provider capability check (API keys)
  report.push('\n## 3. Provider API Keys\n');
  const providers = [
    { name: 'Yahoo (YAHOO_API_KEY)', key: process.env.YAHOO_API_KEY || process.env.VITE_YAHOO_API_KEY },
    { name: 'Finnhub (FINNHUB_API_KEY)', key: process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY },
    { name: 'Upstox (UPSTOX_ACCESS_TOKEN)', key: process.env.UPSTOX_ACCESS_TOKEN || process.env.VITE_UPSTOX_ACCESS_TOKEN },
    { name: 'Screener', key: 'NONE_REQUIRED' },
  ];
  for (const p of providers) {
    report.push(`- **${p.name}**: ${p.key ? '✅ CONFIGURED' : '❌ MISSING'}`);
  }

  // 4. Verdict
  report.push('\n## 4. Verdict\n');

  if (!dbOk) {
    report.push('**INSUFFICIENT EVIDENCE** — Database is unreachable. Cannot populate any data.\n');
    report.push('### Required Actions\n');
    report.push('1. Start PostgreSQL service\n');
    report.push('2. Verify PG* environment variables in .env\n');
    report.push('3. Ensure network access to DB host\n');
    report.push('4. Create database and run migrations\n');
  } else {
    const hasData = existingTables.some(t => parseInt(t.rows) > 0 && ['daily_prices', 'factor_snapshots', 'financial_snapshots', 'feature_snapshots'].includes(t.name));
    if (hasData) {
      report.push('**Data exists** — proceed with targeted backfill for gaps.\n');
    } else {
      report.push('**Empty database** — full population required. Run `populate-real-universe.ts`.\n');
      report.push('### Population Sequence\n');
      report.push('1. `tsx src/scripts/populate-real-universe.ts` — fetches financials + prices from providers\n');
      report.push('2. FeatureEngine recomputation\n');
      report.push('3. FactorEngine recomputation\n');
      report.push('4. `tsx src/predictions/HistoricalRankingRebuilder.ts` — seeds prediction_registry\n');
      report.push('5. Allow prediction horizons to mature\n');
      report.push('6. Re-run TRACK-33 for alpha validation\n');
    }
  }

  report.push(`\n**Summary:** DB=${dbOk ? 'OK' : 'OFFLINE'}, Tables=${existingTables.length}, DataExists=${existingTables.some(t => parseInt(t.rows) > 0)}\n`);

  fs.writeFileSync(path.join(REPORT_DIR, '00-RealityCheck.md'), report.join('\n'), 'utf-8');
  console.log(report.join('\n'));
  await pool.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
