import initSqlJs, { type SqlJsModule, type SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

let SQL: SqlJsModule | null = null;
let initPromise: Promise<void> | null = null;

async function ensureSql(): Promise<void> {
  if (SQL) return;
  if (!initPromise) {
    initPromise = initSqlJs().then(sql => { SQL = sql; });
  }
  await initPromise;
}

function resolveDbPath(): string {
  return process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), 'data', 'stockstory.db');
}

let _db: SqlJsDatabase | null = null;
let _dbPath: string = resolveDbPath();

function ensureDir(): void {
  const dir = path.dirname(_dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function getDb(): Promise<SqlJsDatabase> {
  if (_db) return _db;
  ensureSql();
  await initPromise;
  _dbPath = resolveDbPath();
  ensureDir();
  if (fs.existsSync(_dbPath)) {
    const buffer = fs.readFileSync(_dbPath);
    _db = new SQL!.Database(buffer);
  } else {
    _db = new SQL!.Database();
  }
  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');
  return _db;
}

function saveDb(): void {
  if (!_db) return;
  const data = _db.export();
  ensureDir();
  fs.writeFileSync(_dbPath, Buffer.from(data));
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveDb(), 100);
}

export function closeSQLite(): void {
  if (_db) {
    saveDb();
    try { _db.close(); } catch { }
    _db = null;
  }
}

let _poolRef: SQLitePool | null = null;

export function resetForTest(dbPath?: string): void {
  closeSQLite();
  if (dbPath !== undefined) {
    process.env.SQLITE_DB_PATH = dbPath;
  }
  _dbPath = resolveDbPath();
  if (_poolRef) {
    _poolRef.resetConnection();
  }
}

function translateSQL(sql: string): string {
  let translated = sql
    .replace(/SERIAL/gi, 'INTEGER')
    .replace(/BIGSERIAL/gi, 'INTEGER')
    .replace(/\$\d+/g, '?')
    .replace(/public\./gi, '')
    .replace(/::(bigint|integer|float|text|boolean|timestamp|date|numeric|decimal|varchar\S*)/gi, '')
    .replace(/GENERATED ALWAYS AS IDENTITY/gi, 'AUTOINCREMENT')
    .replace(/RETURNING \*/gi, '')
    .replace(/ON CONFLICT \(([^)]+)\) DO NOTHING/gi, 'OR IGNORE')
    .replace(/INFORMATION_SCHEMA\.TABLES/g, 'sqlite_master')
    .replace(/table_schema = 'public'/g, "type = 'table'")
    .replace(/information_schema\.columns/gi, 'pragma_table_info');

  if (/ON CONFLICT.*DO UPDATE/i.test(translated)) {
    translated = translated.replace('INSERT INTO', 'INSERT OR REPLACE INTO');
    translated = translated.replace(/ON CONFLICT\s*\([^)]*\)\s*DO UPDATE\s*SET\s*[^;]*/gi, '');
  }

  translated = translated
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
    .replace(/IS NOT TRUE/gi, '= 0')
    .replace(/IS TRUE/gi, '= 1')
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/NULLS LAST/gi, '')
    .replace(/NULLS FIRST/gi, '')
    .replace(/::(int|text|float|boolean)/gi, '')
    .replace(/EXTRACT\(YEAR FROM/gi, "CAST(strftime('%Y',")
    .replace(/EXTRACT\(MONTH FROM/gi, "CAST(strftime('%m',");

  return translated;
}

interface SQLiteResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

function execAndMap(db: SqlJsDatabase, sql: string, params?: unknown[]): SQLiteResult {
  const isSelect = /^\s*SELECT/i.test(sql) || /^\s*PRAGMA/i.test(sql) || /^\s*WITH\s/i.test(sql);
  const isReturning = /RETURNING/i.test(sql);

  if (isSelect || isReturning) {
    if (params && params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, unknown>);
      }
      stmt.free();
      return { rows, rowCount: rows.length };
    }
    const results = db.exec(sql);
    if (!results || results.length === 0) return { rows: [], rowCount: 0 };
    const { columns, values } = results[0];
    const rows = values.map(v => {
      const row: Record<string, unknown> = {};
      columns.forEach((c, i) => { row[c] = v[i]; });
      return row;
    });
    return { rows, rowCount: rows.length };
  }

  if (params && params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  } else {
    db.run(sql);
  }
  const rowCount = db.getRowsModified();

  if (isReturning && /INSERT/i.test(sql)) {
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const lastId = idResult?.[0]?.values?.[0]?.[0];
    if (lastId && Number(lastId) > 0) {
      return { rows: [{ id: Number(lastId) }], rowCount };
    }
  }

  return { rows: [], rowCount };
}

class SQLitePool {
  private db: SqlJsDatabase | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await ensureSql();
  }

  private async getConnection(): Promise<SqlJsDatabase> {
    if (!this.db) {
      this.db = await getDb();
      await this.ensureTables();
    }
    return this.db;
  }

  private async ensureTables(): Promise<void> {
    const db = this.db;
    if (!db) throw new Error('SQLite connection unavailable during schema init');

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
        snapshot_date TEXT NOT NULL DEFAULT (date('now')),
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
      try { db.run(sql); } catch { }
    }
  }

  async query(text: string, params?: unknown[]): Promise<SQLiteResult> {
    const db = await this.getConnection();
    const translated = translateSQL(text);

    try {
      const result = execAndMap(db, translated, params);

      if (!/^\s*SELECT/i.test(translated) && !/^\s*PRAGMA/i.test(translated) && !/^\s*WITH\s/i.test(translated)) {
        debouncedSave();
      }

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const safeText = text.substring(0, 200);
      const translatedText = translated.substring(0, 200);
      const paramCount = Array.isArray(params) ? params.length : 0;
      throw new Error(
        `SQLite query failed: ${msg}\n` +
        `Original SQL: ${safeText}\n` +
        `Translated SQL: ${translatedText}\n` +
        `Parameter count: ${paramCount}`,
        { cause: err },
      );
    }
  }

  async executeScript(sql: string): Promise<void> {
    const db = await this.getConnection();
    db.run(sql);
    debouncedSave();
  }

  async end(): Promise<void> {
    closeSQLite();
    this.db = null;
  }

  resetConnection(): void {
    this.db = null;
  }
}

const pool = new SQLitePool();
_poolRef = pool;

export default pool;
export { pool, SQLitePool };
export const query = (text: string, params?: unknown[]) => pool.query(text, params);
