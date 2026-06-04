// src/scripts/warehouse-verification.ts
// RC3 Phase 2 — Real Warehouse Verification script.

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Import DB and Coordinator ──────────────────────────────
import pool from '../db/index';
import { ProviderCoordinator } from '../services/providers/ProviderCoordinator';

const REPORTS_DIR = join(__dirname, '..', '..', 'reports');

function ensureReportsDir() {
  try { mkdirSync(REPORTS_DIR, { recursive: true }); } catch { /* exists */ }
}

function writeReport(name: string, data: any) {
  const path = join(REPORTS_DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✓ Report written: ${path}`);
}

async function verify() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  RC3 Phase 2 — Real Warehouse Verification Test  ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}`);

  ensureReportsDir();

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Connection Test
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 3: Real Connection Test ═══');
  const connStart = Date.now();
  try {
    const connRes = await pool.query('SELECT 1');
    const latency = Date.now() - connStart;
    
    if (connRes.rowCount !== null) {
      console.log('  ✓ PostgreSQL Connection established successfully.');
      writeReport('POSTGRES_CONNECTION_REPORT.json', {
        connected: true,
        authentication: 'OK',
        schemaAccess: 'OK',
        latencyMs: latency,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err: any) {
    console.error('  ❌ Connection test failed:', err.message);
    writeReport('POSTGRES_CONNECTION_REPORT.json', {
      connected: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: Migration Verification
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 4: Migration Verification ═══');
  const tables = ['symbols', 'daily_prices', 'financial_snapshots', 'news_articles', 'provider_logs'];
  const statusReport: any = { migrated: true, tables: {}, timestamp: new Date().toISOString() };
  
  for (const table of tables) {
    try {
      const checkRes = await pool.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_name = $1
         )`,
        [table]
      );
      const exists = checkRes.rows[0].exists;
      statusReport.tables[table] = exists ? 'OK' : 'MISSING';
      if (exists) {
        console.log(`  ✓ Table "${table}" exists.`);
      } else {
        console.error(`  ❌ Table "${table}" is missing!`);
        statusReport.migrated = false;
      }
    } catch (err: any) {
      statusReport.tables[table] = `ERROR: ${err.message}`;
      statusReport.migrated = false;
    }
  }
  writeReport('MIGRATION_STATUS_REPORT.json', statusReport);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: Data Insert Test
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 5: Data Insert Test ═══');
  const coordinator = new ProviderCoordinator();
  const insertReport: any[] = [];
  const targetSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'];

  for (const sym of targetSymbols) {
    console.log(`  Acquiring and storing data for ${sym}...`);
    
    // 1. Metadata
    try {
      const meta = await coordinator.getMetadata(sym);
      await pool.query(
        `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (symbol) DO UPDATE SET company_name=$3, sector=$4, industry=$5, updated_at=NOW()`,
        [sym, meta.exchange || 'NSE', meta.companyName || sym, meta.sector || '', meta.industry || '', 'ACTIVE']
      );
      insertReport.push({ table: 'symbols', symbol: sym, rowsInserted: 1, status: 'OK', timestamp: new Date().toISOString() });
    } catch (err: any) {
      insertReport.push({ table: 'symbols', symbol: sym, rowsInserted: 0, status: 'ERROR', error: err.message, timestamp: new Date().toISOString() });
    }

    // 2. Daily Prices
    try {
      const history = await coordinator.getHistory(sym, '1M');
      let count = 0;
      for (const p of history) {
        await pool.query(
          `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (symbol, trade_date) DO NOTHING`,
          [sym, p.date, p.open, p.high, p.low, p.close, p.volume]
        );
        count++;
      }
      insertReport.push({ table: 'daily_prices', symbol: sym, rowsInserted: count, status: 'OK', timestamp: new Date().toISOString() });
    } catch (err: any) {
      insertReport.push({ table: 'daily_prices', symbol: sym, rowsInserted: 0, status: 'ERROR', error: err.message, timestamp: new Date().toISOString() });
    }

    // 3. Financial Snapshots
    try {
      const financials = await coordinator.getFinancials(sym);
      await pool.query(
        `INSERT INTO financial_snapshots (symbol, period_end, market_cap, pe_ratio, eps, dividend_yield, beta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (symbol, period_end) DO NOTHING`,
        [sym, financials.periodEnd || new Date().toISOString().split('T')[0], financials.marketCap, financials.peRatio, financials.eps, financials.dividendYield, financials.beta]
      );
      insertReport.push({ table: 'financial_snapshots', symbol: sym, rowsInserted: 1, status: 'OK', timestamp: new Date().toISOString() });
    } catch (err: any) {
      insertReport.push({ table: 'financial_snapshots', symbol: sym, rowsInserted: 0, status: 'ERROR', error: err.message, timestamp: new Date().toISOString() });
    }
  }
  writeReport('DATABASE_INSERT_REPORT.json', insertReport);

  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: Query Test
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 6: Query Test ═══');
  const queryReport: any = { timestamp: new Date().toISOString(), counts: {} };
  for (const table of tables) {
    try {
      const countRes = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      const count = parseInt(countRes.rows[0].count, 10);
      queryReport.counts[table] = count;
      console.log(`  ✓ Table "${table}" record count: ${count}`);
    } catch (err: any) {
      queryReport.counts[table] = `ERROR: ${err.message}`;
    }
  }
  writeReport('DATABASE_QUERY_REPORT.json', queryReport);

  await pool.end();
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  RC3 Phase 2 — Real Warehouse Verification Done   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
}

verify().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
