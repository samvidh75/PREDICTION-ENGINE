/**
 * SQLiteAdapter — Zero-configuration database adapter.
 * Implements the same interface as pg Pool: query(sql, params?) => { rows[], rowCount }
 * Used as fallback when PostgreSQL is unavailable.
 *
 * TASK 2: DB path is injectable via SQLITE_DB_PATH env var.
 *         closeSQLite() closes the singleton.
 *         resetForTest() allows tests to isolate to a separate DB path.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Returns the effective SQLite DB path, resolving the SQLITE_DB_PATH env var
 * or defaulting to data/stockstory.db relative to cwd.
 */
function resolveDbPath(): string {
  return process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), 'data', 'stockstory.db');
}

let _db: Database.Database | null = null;
let _dbPath: string = resolveDbPath();

function ensureDir(): void {
  const dir = path.dirname(_dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDb(): Database.Database {
  if (_db) return _db;
  _dbPath = resolveDbPath();
  ensureDir();
  _db = new Database(_dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

/**
 * Close the SQLite singleton and null it out.
 * After calling this, the next call to getDb() will re-create the connection.
 */
export function closeSQLite(): void {
  if (_db) {
    try { _db.close(); } catch { /* ignore close errors */ }
    _db = null;
  }
}

/**
 * Reset the SQLite adapter for testing.
 * Closes the existing connection, optionally sets a new DB path (by updating
 * process.env.SQLITE_DB_PATH), and nulls the singleton so the next getDb()
 * opens a fresh connection at the new path.
 *
 * @param dbPath — Optional new path for SQLITE_DB_PATH. If not provided,
 *                 the existing env value is left unchanged.
 */
export function resetForTest(dbPath?: string): void {
  closeSQLite();
  if (dbPath !== undefined) {
    process.env.SQLITE_DB_PATH = dbPath;
  }
  _dbPath = resolveDbPath();
}

const SQLITE_TO_PG_TYPES: Record<string, string> = {
  'SERIAL': 'INTEGER',
  'BIGSERIAL': 'INTEGER',
  'VARCHAR': 'TEXT',
  'TEXT': 'TEXT',
  'INTEGER': 'INTEGER',
  'BIGINT': 'INTEGER',
  'BOOLEAN': 'INTEGER',
  'TIMESTAMP': 'TEXT',
  'DATE': 'TEXT',
  'DECIMAL': 'REAL',
  'NUMERIC': 'REAL',
  'FLOAT': 'REAL',
  'DOUBLE PRECISION': 'REAL',
  'JSONB': 'TEXT',
  'UUID': 'TEXT',
};

function translateSQL(sql: string): string {
  // Replace PostgreSQL-specific with SQLite-compatible
  let translated = sql
    .replace(/SERIAL/gi, 'INTEGER')
    .replace(/BIGSERIAL/gi, 'INTEGER')
    .replace(/\$\d+/g, '?')  // $1, $2 → ?
    .replace(/public\./gi, '')
    .replace(/::(bigint|integer|float|text|boolean|timestamp|date|numeric|decimal|varchar\S*)/gi, '')
    .replace(/GENERATED ALWAYS AS IDENTITY/gi, 'AUTOINCREMENT')
    .replace(/RETURNING \*/gi, '')
    .replace(/ON CONFLICT \(([^)]+)\) DO NOTHING/gi, 'OR IGNORE')
    .replace(/ON CONFLICT \(([^)]+)\) DO UPDATE SET/gi, 'ON CONFLICT($1) DO UPDATE SET')
    .replace(/INFORMATION_SCHEMA\.TABLES/g, 'sqlite_master')
    .replace(/table_schema = 'public'/g, "type = 'table'")
    .replace(/information_schema\.columns/gi, 'pragma_table_info');

  // Handle INSERT ... ON CONFLICT DO UPDATE (upsert) → INSERT OR REPLACE or ignore
  if (/ON CONFLICT.*DO UPDATE/i.test(translated)) {
    translated = translated.replace(/INSERT INTO/i, 'INSERT OR REPLACE INTO');
    translated = translated.replace(/ON CONFLICT.*DO UPDATE SET/gi, 'WHERE NOT EXISTS (SELECT 1 FROM same_table WHERE conflict) THEN UPDATE SET');
    // Simplify: just strip ON CONFLICT DO UPDATE clauses — use INSERT OR REPLACE
    translated = translated.replace(/ON CONFLICT\s*\([^)]*\)\s*DO UPDATE\s*SET\s*[^;]*/gi, '');
    if (translated.includes('INSERT INTO') && !translated.includes('INSERT OR')) {
      translated = translated.replace('INSERT INTO', 'INSERT OR REPLACE INTO');
    }
  }

  // Replace pg-specific functions
  translated = translated
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/NOW/g, "datetime('now')")
    .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
    .replace(/IS NOT TRUE/gi, '= 0')
    .replace(/IS TRUE/gi, '= 1')
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/NULLS LAST/gi, '')
    .replace(/NULLS FIRST/gi, '')
    .replace(/::int/gi, '')
    .replace(/::text/gi, '')
    .replace(/::float/gi, '')
    .replace(/::boolean/gi, '')
    .replace(/EXTRACT\(YEAR FROM/gi, "CAST(strftime('%Y',")
    .replace(/EXTRACT\(MONTH FROM/gi, "CAST(strftime('%m',");

  // Fix: close EXTRACT replacements
  if (translated.includes("strftime('%Y',")) {
    translated = translated.replace(/strftime\('%Y',\s*([^)]+)\)/g, "CAST(strftime('%Y', $1) AS INTEGER)");
    translated = translated.replace(/CAST\(strftime/gi, (match: string) => match);
  }

  // Handle CASE WHEN x IS NOT TRUE (PostgreSQL) → CASE WHEN NOT x (SQLite)
  translated = translated.replace(/IS NOT TRUE/gi, '= 0');

  return translated;
}

interface SQLiteResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

class SQLitePool {
  private db: Database.Database;

  constructor() {
    this.db = getDb();
    this.ensureTables();
  }

  private ensureTables(): void {
    // Create core tables if they don't exist
    const tables = [
      `CREATE TABLE IF NOT EXISTS master_security_registry (
        symbol TEXT PRIMARY KEY, isin TEXT, company_name TEXT, nse_symbol TEXT, bse_symbol TEXT,
        sector TEXT, industry TEXT, market_cap_category TEXT, listing_status TEXT DEFAULT 'Active',
        data_sources TEXT, last_verified TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS symbols (
        symbol TEXT PRIMARY KEY, exchange TEXT, isin TEXT, company_name TEXT,
        sector TEXT, industry TEXT, listing_status TEXT DEFAULT 'Active'
      )`,
      `CREATE TABLE IF NOT EXISTS daily_prices (
        symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
        open REAL, high REAL, low REAL, close REAL, adjusted_close REAL, volume REAL,
        PRIMARY KEY (symbol, trade_date)
      )`,
      `CREATE TABLE IF NOT EXISTS financial_snapshots (
        symbol TEXT NOT NULL, period_end TEXT NOT NULL,
        market_cap REAL, pe_ratio REAL, eps REAL, dividend_yield REAL, beta REAL, free_float REAL,
        fcf_yield REAL, ev_ebitda REAL, roa REAL, roe REAL, roic REAL,
        debt_to_equity REAL, current_ratio REAL,
        revenue_growth REAL, profit_growth REAL, eps_growth REAL, fcf_growth REAL,
        gross_margin REAL, operating_margin REAL, pb_ratio REAL,
        PRIMARY KEY (symbol, period_end)
      )`,
      `CREATE TABLE IF NOT EXISTS factor_snapshots (
        symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
        quality_factor REAL, value_factor REAL, growth_factor REAL,
        momentum_factor REAL, risk_factor REAL, sector_strength_factor REAL,
        factor_score REAL, explanations TEXT,
        PRIMARY KEY (symbol, trade_date)
      )`,
      `CREATE TABLE IF NOT EXISTS feature_snapshots (
        symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
        rsi REAL, macd REAL, macd_signal REAL, macd_histogram REAL,
        adx REAL, atr REAL, bollinger_width REAL, momentum REAL,
        volatility REAL, relative_strength REAL, moving_average_distance REAL,
        trend_strength REAL,
        PRIMARY KEY (symbol, trade_date)
      )`,
      `CREATE TABLE IF NOT EXISTS prediction_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        prediction_date TEXT NOT NULL,
        ranking_score REAL NOT NULL,
        classification TEXT NOT NULL
          CHECK (classification IN ('Exceptional', 'Excellent', 'Good', 'Fair', 'Weak', 'Critical')),
        confidence_score REAL NOT NULL,
        confidence_level TEXT NOT NULL
          CHECK (confidence_level IN ('Very High', 'High', 'Medium', 'Low')),
        quality_score REAL NOT NULL,
        growth_score REAL NOT NULL,
        value_score REAL NOT NULL,
        momentum_score REAL NOT NULL,
        risk_score REAL NOT NULL,
        sector_score REAL NOT NULL,
        price_at_prediction REAL,
        benchmark_level REAL,
        prediction_horizon INTEGER NOT NULL DEFAULT 30
          CHECK (prediction_horizon IN (7, 30, 90, 180, 365)),
        validation_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (validation_status IN ('pending', 'in_progress', 'validated', 'expired')),
        validated_at TEXT,
        future_return REAL,
        benchmark_return REAL,
        alpha REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT NOT NULL DEFAULT 'DailyPredictionCapture'
          CHECK (created_by IN ('DailyPredictionCapture', 'ManualSnapshot')),
        UNIQUE(symbol, prediction_date, prediction_horizon)
      )`,
      `CREATE TABLE IF NOT EXISTS benchmark_observations (
        date TEXT PRIMARY KEY, nifty50 REAL, nifty100 REAL, nifty500 REAL,
        equal_weight REAL, source TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS daily_prediction_snapshots (
        date TEXT NOT NULL, horizon INTEGER,
        top10 TEXT, top25 TEXT, top50 TEXT, bottom10 TEXT, bottom25 TEXT,
        PRIMARY KEY (date, horizon)
      )`,
    ];
    for (const sql of tables) {
      try { this.db.exec(sql); } catch { /* table already exists or similar */ }
    }
  }

  async query(text: string, params?: unknown[]): Promise<SQLiteResult> {
    const translated = translateSQL(text);

    try {
      const isSelect = /^\s*SELECT/i.test(translated) || /^\s*PRAGMA/i.test(translated) ||
        /^\s*WITH\s/i.test(translated);
      const isReturning = /RETURNING/i.test(translated);

      if (isSelect || isReturning) {
        const stmt = this.db.prepare(translated);
        const rows = params ? stmt.all(...params) : stmt.all();
        return { rows: rows as Record<string, unknown>[], rowCount: (rows as unknown[]).length };
      }

      // For INSERT/UPDATE/DELETE — use run
      const stmt = this.db.prepare(translated);
      const result = params ? stmt.run(...params) : stmt.run();
      const rowCount = result.changes;

      // For INSERT with RETURNING, re-query the inserted row
      if (isReturning && translated.includes('INSERT')) {
        const lastId = result.lastInsertRowid;
        if (lastId && lastId > 0) {
          return { rows: [{ id: Number(lastId) }], rowCount };
        }
      }

      return { rows: [], rowCount };
    } catch (err: unknown) {
      // If translation fails, try raw SQL
      try {
        const stmt = this.db.prepare(text.replace(/\$\d+/g, '?'));
        const isSelect = /^\s*SELECT/i.test(text);
        if (isSelect) {
          const rows = params ? stmt.all(...params) : stmt.all();
          return { rows: rows as Record<string, unknown>[], rowCount: (rows as unknown[]).length };
        }
        const result = params ? stmt.run(...params) : stmt.run();
        return { rows: [], rowCount: result.changes };
      } catch (e2: unknown) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        throw new Error(`SQLite query failed: ${msg}\nSQL: ${text.substring(0, 200)}`);
      }
    }
  }

  async end(): Promise<void> {
    closeSQLite();
  }
}

// The exported pool — works like pg Pool
const pool = new SQLitePool();

export default pool;
export { pool, SQLitePool };
export const query = (text: string, params?: unknown[]) => pool.query(text, params);