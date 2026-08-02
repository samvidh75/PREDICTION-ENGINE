/**
 * V5 AGENT 1 — DATA TRUTH LAYER
 *
 * 1. Reads the SQLite DB at PREDICTION-ENGINE/data/stockstory.db
 * 2. Checks if financial_snapshots table exists; if not, creates it with V5 columns
 * 3. Checks if data_quality_registry table exists; if not, creates it
 * 4. Reports current row counts for daily_prices, financial_snapshots,
 *    data_quality_registry, prediction_registry
 * 5. Writes report to PREDICTION-ENGINE/reports/v5/01-DataTruthLayer.md
 *
 * Usage: node scripts/v5_agent1_data_truth.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// --- Paths ---
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'stockstory.db');
const REPORTS_DIR = path.join(ROOT, 'reports', 'v5');
const REPORT_PATH = path.join(REPORTS_DIR, '01-DataTruthLayer.md');

// --- Ensure reports directory exists ---
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// --- Migration SQL for financial_snapshots (inlined for idempotent execution) ---
const CREATE_FINANCIAL_SNAPSHOTS_SQL = `
CREATE TABLE IF NOT EXISTS financial_snapshots (
  symbol TEXT NOT NULL,
  snapshot_date TEXT NOT NULL DEFAULT (date('now')),
  pe_ratio REAL,
  pb_ratio REAL,
  roe REAL,
  roce REAL,
  debt_to_equity REAL,
  operating_margin REAL,
  net_margin REAL,
  market_cap REAL,
  revenue_growth REAL,
  profit_growth REAL,
  fcf_yield REAL,
  ev_ebitda REAL,
  current_ratio REAL,
  PRIMARY KEY (symbol, snapshot_date)
);
`;

const CREATE_FS_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_fs_symbol ON financial_snapshots (symbol);',
  'CREATE INDEX IF NOT EXISTS idx_fs_snapshot_date ON financial_snapshots (snapshot_date DESC);',
  'CREATE INDEX IF NOT EXISTS idx_fs_symbol_date ON financial_snapshots (symbol, snapshot_date DESC);',
];

const CREATE_DATA_QUALITY_REGISTRY_SQL = `
CREATE TABLE IF NOT EXISTS data_quality_registry (
  symbol TEXT NOT NULL,
  field TEXT NOT NULL,
  freshness_date TEXT,
  completeness_pct REAL NOT NULL DEFAULT 0
    CHECK (completeness_pct >= 0 AND completeness_pct <= 100),
  confidence_score REAL NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source TEXT,
  PRIMARY KEY (symbol, field)
);
`;

const CREATE_DQR_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_dqr_symbol ON data_quality_registry (symbol);',
  'CREATE INDEX IF NOT EXISTS idx_dqr_field ON data_quality_registry (field);',
  'CREATE INDEX IF NOT EXISTS idx_dqr_freshness ON data_quality_registry (freshness_date DESC);',
];

// --- Helper: get existing column names for a table ---
function getExistingColumns(db, tableName) {
  try {
    const rows = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    return rows.map(r => r.name);
  } catch (e) {
    return [];
  }
}

// --- Helper: get row count for a table ---
function getRowCount(db, tableName) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`).get();
    return row ? row.cnt : 0;
  } catch (e) {
    return null; // table doesn't exist
  }
}

// --- Helper: get distinct symbol count ---
function getSymbolCount(db, tableName) {
  try {
    const row = db.prepare(`SELECT COUNT(DISTINCT symbol) as cnt FROM "${tableName}"`).get();
    return row ? row.cnt : 0;
  } catch (e) {
    return null;
  }
}

// --- Helper: get date range ---
function getDateRange(db, tableName, dateCol) {
  try {
    const row = db.prepare(
      `SELECT MIN("${dateCol}") as min_date, MAX("${dateCol}") as max_date FROM "${tableName}"`
    ).get();
    return { min: row?.min_date || 'N/A', max: row?.max_date || 'N/A' };
  } catch (e) {
    return { min: 'N/A', max: 'N/A' };
  }
}

// --- Helper: check if table exists ---
function tableExists(db, tableName) {
  try {
    db.prepare(`SELECT 1 FROM "${tableName}" LIMIT 1`).get();
    return true;
  } catch (e) {
    return false;
  }
}

// --- Main execution ---
function main() {
  console.log('V5 Agent 1: Data Truth Layer starting...\n');

  // Check DB file exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`ERROR: Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  console.log(`DB Path: ${DB_PATH}`);
  const dbStats = fs.statSync(DB_PATH);
  console.log(`DB Size: ${(dbStats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`DB Last Modified: ${dbStats.mtime.toISOString()}\n`);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const actions = [];
  const warnings = [];
  const issues = [];

  // =========================================================
  // TASK 1: Ensure financial_snapshots table exists
  // =========================================================
  console.log('--- Financial Snapshots Table ---');
  const fsExists = tableExists(db, 'financial_snapshots');

  if (!fsExists) {
    console.log('  financial_snapshots does NOT exist. Creating...');
    db.exec(CREATE_FINANCIAL_SNAPSHOTS_SQL);
    for (const idxSql of CREATE_FS_INDEXES_SQL) {
      db.exec(idxSql);
    }
    actions.push('Created financial_snapshots table with 14 columns + indexes');
    console.log('  Table created successfully.');
  } else {
    console.log('  financial_snapshots already exists.');
    // Check which columns exist and which are missing
    const existingCols = getExistingColumns(db, 'financial_snapshots');
    console.log(`  Existing columns (${existingCols.length}): ${existingCols.join(', ')}`);

    const v5Columns = [
      'symbol', 'snapshot_date', 'pe_ratio', 'pb_ratio', 'roe', 'roce',
      'debt_to_equity', 'operating_margin', 'net_margin', 'market_cap',
      'revenue_growth', 'profit_growth', 'fcf_yield', 'ev_ebitda', 'current_ratio',
    ];

    const missingCols = v5Columns.filter(c => !existingCols.includes(c));
    if (missingCols.length > 0) {
      console.log(`  Missing columns: ${missingCols.join(', ')}`);
      for (const col of missingCols) {
        try {
          db.exec(`ALTER TABLE financial_snapshots ADD COLUMN "${col}" REAL;`);
          actions.push(`Added missing column: financial_snapshots.${col}`);
          console.log(`  Added column: ${col}`);
        } catch (e) {
          warnings.push(`Failed to add column ${col}: ${e.message}`);
          console.log(`  WARNING: Could not add ${col}: ${e.message}`);
        }
      }
    } else {
      console.log('  All V5 columns present.');
    }

    // Check if indexes exist
    const fsRowCount = getRowCount(db, 'financial_snapshots');
    if (fsRowCount > 0) {
      // Ensure indexes exist (idempotent)
      for (const idxSql of CREATE_FS_INDEXES_SQL) {
        try {
          db.exec(idxSql);
        } catch (e) {
          // Index might already exist in a different form
        }
      }
    }
  }

  const fsCount = getRowCount(db, 'financial_snapshots');
  const fsSymbols = getSymbolCount(db, 'financial_snapshots');
  console.log(`  Current rows: ${fsCount !== null ? fsCount.toLocaleString() : 'N/A'}`);
  console.log(`  Distinct symbols: ${fsSymbols !== null ? fsSymbols : 'N/A'}`);

  // =========================================================
  // TASK 2: Ensure data_quality_registry table exists
  // =========================================================
  console.log('\n--- Data Quality Registry Table ---');
  const dqrExists = tableExists(db, 'data_quality_registry');

  if (!dqrExists) {
    console.log('  data_quality_registry does NOT exist. Creating...');
    db.exec(CREATE_DATA_QUALITY_REGISTRY_SQL);
    for (const idxSql of CREATE_DQR_INDEXES_SQL) {
      db.exec(idxSql);
    }
    actions.push('Created data_quality_registry table with 6 columns + indexes');
    console.log('  Table created successfully.');
  } else {
    console.log('  data_quality_registry already exists.');
    const existingCols = getExistingColumns(db, 'data_quality_registry');
    console.log(`  Existing columns (${existingCols.length}): ${existingCols.join(', ')}`);

    const dqrColumns = [
      'symbol', 'field', 'freshness_date', 'completeness_pct',
      'confidence_score', 'source',
    ];

    const missingCols = dqrColumns.filter(c => !existingCols.includes(c));
    if (missingCols.length > 0) {
      console.log(`  Missing columns: ${missingCols.join(', ')}`);
      for (const col of missingCols) {
        try {
          // completeness_pct and confidence_score need CHECK constraints but SQLite
          // ALTER TABLE doesn't support ADD COLUMN with CHECK in older versions.
          // We add as simple REAL and document the constraint in application logic.
          db.exec(`ALTER TABLE data_quality_registry ADD COLUMN "${col}" REAL;`);
          actions.push(`Added missing column: data_quality_registry.${col}`);
          console.log(`  Added column: ${col} (CHECK constraint enforced by application)`);
        } catch (e) {
          warnings.push(`Failed to add column ${col}: ${e.message}`);
          console.log(`  WARNING: Could not add ${col}: ${e.message}`);
        }
      }
    } else {
      console.log('  All DQR columns present.');
    }
  }

  const dqrCount = getRowCount(db, 'data_quality_registry');
  const dqrSymbols = getSymbolCount(db, 'data_quality_registry');
  console.log(`  Current rows: ${dqrCount !== null ? dqrCount.toLocaleString() : 'N/A'}`);
  console.log(`  Distinct symbols: ${dqrSymbols !== null ? dqrSymbols : 'N/A'}`);

  // =========================================================
  // TASK 3: Report row counts for key tables
  // =========================================================
  console.log('\n--- Key Table Row Counts ---');

  const tables = [
    { name: 'daily_prices', dateCol: 'trade_date' },
    { name: 'financial_snapshots', dateCol: 'snapshot_date' },
    { name: 'data_quality_registry', dateCol: 'freshness_date' },
    { name: 'prediction_registry', dateCol: 'prediction_date' },
    { name: 'master_security_registry', dateCol: null },
    { name: 'daily_prediction_snapshots', dateCol: 'snapshot_date' },
    { name: 'factor_snapshots', dateCol: 'snapshot_date' },
    { name: 'feature_snapshots', dateCol: 'snapshot_date' },
  ];

  const tableStats = [];

  for (const table of tables) {
    const exists = tableExists(db, table.name);
    const rowCount = exists ? getRowCount(db, table.name) : null;
    const symbolCount = exists ? getSymbolCount(db, table.name) : null;
    const dateRange = exists && table.dateCol
      ? getDateRange(db, table.name, table.dateCol)
      : { min: 'N/A', max: 'N/A' };

    const status = exists ? (rowCount > 0 ? 'OK' : 'EMPTY') : 'MISSING';
    const icon = status === 'OK' ? '✓' : status === 'EMPTY' ? '○' : '✗';

    console.log(`  ${icon} ${table.name}: ${rowCount !== null ? rowCount.toLocaleString() : 'N/A'} rows`
      + ` | ${symbolCount !== null ? symbolCount + ' symbols' : 'N/A'}`
      + ` | ${dateRange.min} → ${dateRange.max}`);

    tableStats.push({
      name: table.name,
      status,
      icon,
      rowCount,
      symbolCount,
      dateRange,
    });

    if (status === 'MISSING') {
      issues.push(`Table "${table.name}" does not exist`);
    } else if (status === 'EMPTY' && ['daily_prices', 'prediction_registry'].includes(table.name)) {
      issues.push(`Table "${table.name}" exists but has 0 rows — critical for engine operation`);
    }
  }

  // =========================================================
  // TASK 4: Additional data quality checks
  // =========================================================
  console.log('\n--- Additional Data Quality Checks ---');

  // Check for symbols with prices but no financials
  try {
    const withPricesNotFinancials = db.prepare(`
      SELECT COUNT(DISTINCT p.symbol) as cnt
      FROM daily_prices p
      WHERE p.symbol NOT IN (SELECT DISTINCT symbol FROM financial_snapshots)
    `).get();
    console.log(`  Symbols with prices but NO financial snapshots: ${withPricesNotFinancials?.cnt ?? 'N/A'}`);
  } catch (e) {
    console.log(`  Could not check price-vs-financials gap: ${e.message}`);
  }

  // Check for prediction_registry validation_status distribution
  if (tableExists(db, 'prediction_registry') && getRowCount(db, 'prediction_registry') > 0) {
    try {
      const validationDist = db.prepare(`
        SELECT validation_status, COUNT(*) as cnt
        FROM prediction_registry
        GROUP BY validation_status
        ORDER BY cnt DESC
      `).all();
      console.log('  Prediction validation status distribution:');
      for (const row of validationDist) {
        console.log(`    ${row.validation_status}: ${row.cnt.toLocaleString()}`);
      }
    } catch (e) {
      console.log(`  Could not read validation status: ${e.message}`);
    }
  }

  // Check for recent daily_prices data
  const dpDateRange = getDateRange(db, 'daily_prices', 'trade_date');
  if (dpDateRange.max !== 'N/A') {
    const daysSinceLatest = computeDaysSince(dpDateRange.max);
    console.log(`  Latest daily price date: ${dpDateRange.max} (${daysSinceLatest} days ago)`);
    if (daysSinceLatest > 7) {
      warnings.push(`Daily prices are stale: latest is ${dpDateRange.max} (${daysSinceLatest} days ago)`);
    }
  }

  // =========================================================
  // TASK 5: Generate report
  // =========================================================
  console.log('\n--- Generating Report ---');

  const reportDate = new Date().toISOString();
  const totalDataRows = tableStats.reduce((s, t) => s + (t.rowCount || 0), 0);

  const report = `# Data Truth Layer Report — V5 Agent 1

**Generated:** ${reportDate}
**Database:** stockstory.db (${(dbStats.size / (1024 * 1024)).toFixed(2)} MB)
**Last Modified:** ${dbStats.mtime.toISOString()}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Database Size | ${(dbStats.size / (1024 * 1024)).toFixed(2)} MB |
| Total Data Rows | ${totalDataRows.toLocaleString()} |
| Table Status | ${tableStats.filter(t => t.status === 'OK').length} OK, ${tableStats.filter(t => t.status === 'EMPTY').length} empty, ${tableStats.filter(t => t.status === 'MISSING').length} missing |

---

## Actions Performed

${actions.length > 0 ? actions.map(a => `- ✅ ${a}`).join('\n') : '- ℹ️ No schema changes needed — all tables and columns present'}

${warnings.length > 0 ? `\n## Warnings\n\n${warnings.map(w => `- ⚠️ ${w}`).join('\n')}` : ''}

${issues.length > 0 ? `\n## Issues\n\n${issues.map(i => `- ❌ ${i}`).join('\n')}` : ''}

---

## Table Row Counts

| Table | Status | Rows | Symbols | Date Range |
|-------|--------|------|---------|------------|
${tableStats.map(t =>
  `| ${t.name} | ${t.icon} ${t.status} | ${t.rowCount !== null ? t.rowCount.toLocaleString() : 'N/A'} | ${t.symbolCount !== null ? t.symbolCount : 'N/A'} | ${t.dateRange.min} → ${t.dateRange.max} |`
).join('\n')}

---

## Financial Snapshots Schema

| Column | Type | Description |
|--------|------|-------------|
| symbol | TEXT | Stock symbol (primary key part 1) |
| snapshot_date | TEXT | Date of snapshot in YYYY-MM-DD (primary key part 2) |
| pe_ratio | REAL | Price-to-earnings ratio |
| pb_ratio | REAL | Price-to-book ratio |
| roe | REAL | Return on equity |
| roce | REAL | Return on capital employed |
| debt_to_equity | REAL | Debt-to-equity ratio |
| operating_margin | REAL | Operating profit margin |
| net_margin | REAL | Net profit margin |
| market_cap | REAL | Market capitalization |
| revenue_growth | REAL | Year-over-year revenue growth (%) |
| profit_growth | REAL | Year-over-year profit growth (%) |
| fcf_yield | REAL | Free cash flow yield |
| ev_ebitda | REAL | Enterprise value to EBITDA |
| current_ratio | REAL | Current assets / current liabilities |

---

## Data Quality Registry Schema

| Column | Type | Description |
|--------|------|-------------|
| symbol | TEXT | Stock symbol (primary key part 1) |
| field | TEXT | Field name being tracked (primary key part 2) |
| freshness_date | TEXT | Date of last successful data fetch for this field |
| completeness_pct | REAL | Percentage of symbols with non-null values (0-100) |
| confidence_score | REAL | Confidence in the data quality (0-100) |
| source | TEXT | Data provider/source name |

---

## Data Freshness

| Table | Latest Date | Days Ago |
|-------|-------------|----------|
| daily_prices | ${dpDateRange.max} | ${dpDateRange.max !== 'N/A' ? computeDaysSince(dpDateRange.max) : 'N/A'} |
| financial_snapshots | ${tableStats.find(t => t.name === 'financial_snapshots')?.dateRange.max || 'N/A'} | ${tableStats.find(t => t.name === 'financial_snapshots')?.dateRange.max !== 'N/A' ? computeDaysSince(tableStats.find(t => t.name === 'financial_snapshots').dateRange.max) : 'N/A'} |
| prediction_registry | ${tableStats.find(t => t.name === 'prediction_registry')?.dateRange.max || 'N/A'} | ${tableStats.find(t => t.name === 'prediction_registry')?.dateRange.max !== 'N/A' ? computeDaysSince(tableStats.find(t => t.name === 'prediction_registry').dateRange.max) : 'N/A'} |

---

## Integration Notes

- **financial_snapshots** is the canonical table for fundamental data consumed by Factor V3 engine (Agent 3).
- **data_quality_registry** is the canonical table for data freshness consumed by Cleanup/Compliance agent (Agent 4) and Dashboard (Agent 5).
- All columns use SQLite REAL type (8-byte floating point) — no PostgreSQL NUMERIC/DECIMAL aliases.
- Tables use composite primary keys (symbol + date/field) — no auto-increment surrogate keys.
`;

  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Report written to: ${REPORT_PATH}`);

  // --- Summary ---
  console.log('\n========================================');
  console.log('V5 Agent 1: Data Truth Layer — COMPLETE');
  console.log('========================================');
  console.log(`Actions: ${actions.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Issues: ${issues.length}`);
  console.log(`Report: ${REPORT_PATH}`);

  db.close();
}

function computeDaysSince(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  } catch {
    return 'N/A';
  }
}

main();