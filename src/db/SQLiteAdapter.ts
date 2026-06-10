/**
 * SQLiteAdapter — Portable zero-configuration database adapter.
 * Uses sql.js (pure JavaScript/WASM) — no native addon, no node-gyp.
 * Works identically on macOS, Linux, and Windows.
 *
 * Preserves the same public interface:
 *   query(sql, params?) => { rows[], rowCount }
 *   executeScript(sql) => void
 *   end() => void
 *   resetConnection() => void
 *
 * DB path: SQLITE_DB_PATH env var, defaults to data/stockstory.db.
 * File persistence: reads/writes file on disk via fs.
 * :memory: mode: set SQLITE_DB_PATH=:memory: for in-memory DBs (tests).
 *
 * Parameter binding: Uses sql.js prepared statements (stmt.bind + stmt.step)
 * — no manual string interpolation for user-controlled values.
 */
import initSqlJs, { type Database as SqlJsDb, type QueryExecResult } from "sql.js";
import path from "path";
import fs from "fs";

// ── DB path ────────────────────────────────────────────────────────
function resolveDbPath(): string {
  return process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), "data", "stockstory.db");
}
let _dbPath: string = resolveDbPath();
function isMemory(): boolean {
  return _dbPath === ":memory:" || _dbPath.startsWith(":memory:");
}

// ── WASM initialisation (memoised) ─────────────────────────────────
let _SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
async function getSQL() {
  if (_SQL) return _SQL;
  _SQL = await initSqlJs();
  return _SQL;
}

// ── DB singleton ───────────────────────────────────────────────────
let _db: SqlJsDb | null = null;
let _initPromise: Promise<SqlJsDb> | null = null;

async function loadDb(): Promise<SqlJsDb> {
  const sql = await getSQL();
  if (isMemory()) return new sql.Database();
  const dir = path.dirname(_dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(_dbPath)) {
    return new sql.Database(fs.readFileSync(_dbPath));
  }
  return new sql.Database();
}

function saveDb(): void {
  if (_db && !isMemory()) {
    const data = _db.export();
    const dir = path.dirname(_dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(_dbPath, Buffer.from(data));
  }
}

async function getDb(): Promise<SqlJsDb> {
  if (_db) return _db;
  _dbPath = resolveDbPath();
  if (!_initPromise) {
    _initPromise = loadDb().then((db) => {
      db.run("PRAGMA foreign_keys = ON");
      return db;
    });
  }
  _db = await _initPromise;
  return _db;
}

export function closeSQLite(): void {
  if (_db) {
    saveDb();
    try { _db.close(); } catch { /* ignore */ }
    _db = null;
    _initPromise = null;
  }
}

let _poolRef: SQLitePool | null = null;

export function resetForTest(dbPath?: string): void {
  closeSQLite();
  if (dbPath !== undefined) process.env.SQLITE_DB_PATH = dbPath;
  _dbPath = resolveDbPath();
  if (_poolRef) _poolRef.resetConnection();
}

// ── SQL translation (PostgreSQL → SQLite) ─────────────────────────
function translateSQL(sql: string): string {
  let t = sql
    .replace(/SERIAL/gi, "INTEGER")
    .replace(/BIGSERIAL/gi, "INTEGER")
    .replace(/\$\d+/g, "?")
    .replace(/public\./gi, "")
    .replace(/::(bigint|integer|float|text|boolean|timestamp|date|numeric|decimal|varchar\S*)/gi, "")
    .replace(/GENERATED ALWAYS AS IDENTITY/gi, "AUTOINCREMENT")
    .replace(/RETURNING \*/gi, "")
    .replace(/ON CONFLICT \(([^)]+)\) DO NOTHING/gi, "OR IGNORE")
    .replace(/INFORMATION_SCHEMA\.TABLES/g, "sqlite_master")
    .replace(/table_schema = 'public'/g, "type = 'table'")
    .replace(/information_schema\.columns/gi, "pragma_table_info");

  if (/ON CONFLICT.*DO UPDATE/i.test(t)) {
    t = t.replace("INSERT INTO", "INSERT OR REPLACE INTO");
    t = t.replace(/ON CONFLICT\s*\([^)]*\)\s*DO UPDATE\s*SET\s*[^;]*/gi, "");
  }
  return t
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
    .replace(/IS NOT TRUE/gi, "= 0")
    .replace(/IS TRUE/gi, "= 1")
    .replace(/ILIKE/gi, "LIKE")
    .replace(/NULLS LAST/gi, "")
    .replace(/NULLS FIRST/gi, "")
    .replace(/::(int|text|float|boolean)/gi, "")
    .replace(/EXTRACT\(YEAR FROM/gi, "CAST(strftime('%Y',")
    .replace(/EXTRACT\(MONTH FROM/gi, "CAST(strftime('%m',");
}

// ── Prepared-statement exec ────────────────────────────────────────
function execStmt(db: SqlJsDb, sql: string, params?: unknown[]): QueryExecResult[] {
  if (!params || params.length === 0) return db.exec(sql);
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: QueryExecResult[] = [];
    // sql.js Statement doesn't have getColumnNames(), so we use db.exec() approach
    // for SELECT: extract column names from stmt.getAsObject()
    const cols: string[] = [];
    const values: unknown[][] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (cols.length === 0) {
        for (const k of Object.keys(row)) cols.push(k);
      }
      values.push(cols.map(c => (row as Record<string, unknown>)[c]));
    }
    if (cols.length > 0 && values.length > 0) {
      results.push({ columns: cols, values });
    }
    return results;
  } finally {
    stmt.free();
  }
}

function runStmt(db: SqlJsDb, sql: string, params?: unknown[]): void {
  if (!params || params.length === 0) {
    db.run(sql);
    return;
  }
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    stmt.step();
  } finally {
    stmt.free();
  }
}

// ── Result ─────────────────────────────────────────────────────────
interface SQLiteResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}
function toResult(execResult: QueryExecResult[]): SQLiteResult {
  if (execResult.length === 0) return { rows: [], rowCount: 0 };
  const { columns, values } = execResult[0];
  const rows = values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c, i) => { obj[c] = row[i] ?? null; });
    return obj;
  });
  return { rows, rowCount: rows.length };
}

// ── SQLitePool ─────────────────────────────────────────────────────
class SQLitePool {
  private _db: SqlJsDb | null = null;
  private _initialised = false;

  private async init(): Promise<SqlJsDb> {
    if (this._initialised && this._db) return this._db;
    this._db = await getDb();
    this.ensureTables();
    this._initialised = true;
    return this._db;
  }

  private ensureTables(): void {
    const db = this._db;
    if (!db) throw new Error("SQLite connection unavailable during schema init");
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
        symbol TEXT NOT NULL, prediction_date TEXT NOT NULL,
        ranking_score REAL NOT NULL,
        classification TEXT NOT NULL
          CHECK (classification IN ('Exceptional','Excellent','Good','Fair','Weak','Critical')),
        confidence_score REAL NOT NULL,
        confidence_level TEXT NOT NULL
          CHECK (confidence_level IN ('Very High','High','Medium','Low')),
        quality_score REAL NOT NULL, growth_score REAL NOT NULL, value_score REAL NOT NULL,
        momentum_score REAL NOT NULL, risk_score REAL NOT NULL, sector_score REAL NOT NULL,
        price_at_prediction REAL, benchmark_level REAL,
        prediction_horizon INTEGER NOT NULL DEFAULT 30
          CHECK (prediction_horizon IN (7,30,90,180,365)),
        validation_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (validation_status IN ('pending','in_progress','validated','expired')),
        validated_at TEXT, future_return REAL, benchmark_return REAL, alpha REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT NOT NULL DEFAULT 'DailyPredictionCapture'
          CHECK (created_by IN ('DailyPredictionCapture','ManualSnapshot')),
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
      try {
        db.run(sql);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`SQLite schema initialization failed: ${msg}\nOffending SQL: ${sql.substring(0, 100)}`);
      }
    }
    saveDb();
  }

  async query(text: string, params?: unknown[]): Promise<SQLiteResult> {
    const db = await this.init();
    const translated = translateSQL(text);

    const isSelect =
      /^\s*SELECT/i.test(translated) ||
      /^\s*PRAGMA/i.test(translated) ||
      /^\s*WITH\s/i.test(translated);

    try {
      if (isSelect) {
        const res = execStmt(db, translated, params);
        return toResult(res);
      }
      runStmt(db, translated, params);
      saveDb();
      const changes = db.getRowsModified();
      return { rows: [], rowCount: changes };
    } catch (err) {
      // Fallback: try raw SQL without translation
      try {
        const raw = text.replace(/\$\d+/g, "?");
        if (/^\s*SELECT/i.test(raw) || /^\s*PRAGMA/i.test(raw)) {
          return toResult(execStmt(db, raw, params));
        }
        runStmt(db, raw, params);
        saveDb();
        return { rows: [], rowCount: db.getRowsModified() };
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        throw new Error(`SQLite query failed: ${msg}\nSQL: ${text.substring(0, 200)}`);
      }
    }
  }

  async executeScript(sql: string): Promise<void> {
    const db = await this.init();
    db.exec(sql);
    saveDb();
  }

  async end(): Promise<void> {
    closeSQLite();
    this._db = null;
    this._initialised = false;
  }

  resetConnection(): void {
    this._db = null;
    this._initialised = false;
    _initPromise = null;
  }
}

const pool = new SQLitePool();
_poolRef = pool;

export default pool;
export { pool, SQLitePool };
export const query = (text: string, params?: unknown[]) => pool.query(text, params);
