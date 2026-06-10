/**
 * SQLiteAdapter — Cross-platform WASM-based adapter using sql.js.
 * Implements same interface as pg Pool: query(sql, params?) => { rows[], rowCount }
 * TRACK-PORTABILITY-R3: Hardened sql.js with prepared statements, no manual interpolation.
 */

import { join, dirname } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cwd } from 'node:process';

let SQL: any = null;

async function initSqlJs(): Promise<any> {
  if (!SQL) {
    const sqlModule = await import('sql.js');
    SQL = await sqlModule.default();
  }
  return SQL;
}

function resolveDbPath(): string {
  return process.env.SQLITE_DB_PATH ?? join(cwd(), 'data', 'stockstory.db');
}

let _db: any = null;
let _dbPath: string = resolveDbPath();
let _sqlLib: any = null;

function ensureDir(): void {
  const dir = dirname(_dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function getDb(): Promise<any> {
  if (_db) return _db;
  _sqlLib = await initSqlJs();
  _dbPath = resolveDbPath();
  ensureDir();

  const isMemory = _dbPath === ':memory:';
  if (isMemory) {
    _db = new _sqlLib.Database();
  } else {
    let buffer: Uint8Array | undefined;
    if (existsSync(_dbPath)) {
      buffer = new Uint8Array(readFileSync(_dbPath));
    }
    _db = new _sqlLib.Database(buffer);
    const origClose = _db.close.bind(_db);
    _db.close = () => {
      const data = _db.export();
      writeFileSync(_dbPath, Buffer.from(data));
      origClose();
    };
  }

  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');
  return _db;
}

export async function closeSQLite(): Promise<void> {
  if (_db) {
    try { _db.close(); } catch { /* close */ }
    _db = null;
  }
}

let _poolRef: SQLitePool | null = null;

export async function resetForTest(dbPath?: string): Promise<void> {
  await closeSQLite();
  if (dbPath !== undefined) process.env.SQLITE_DB_PATH = dbPath;
  _dbPath = resolveDbPath();
  if (_poolRef) { _poolRef.resetConnection(); }
}

function translateSQL(sql: string): string {
  let translated = sql
    .replace(/\$\d+/g, '?')
    .replace(/SERIAL/gi, 'INTEGER')
    .replace(/BIGSERIAL/gi, 'INTEGER')
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
    .replace(/ILIKE/gi, 'LIKE');
  return translated;
}

interface SQLiteResult { rows: Record<string, unknown>[]; rowCount: number; }

export class SQLitePool {
  private db: any = null;
  private initialized = false;

  async getConnection(): Promise<any> {
    if (!this.db) {
      this.db = await getDb();
      if (!this.initialized) {
        await this.ensureTables();
        this.initialized = true;
      }
    }
    return this.db;
  }

  private async ensureTables(): Promise<void> {
    const db = await this.getConnection();
    const tables = [
      `CREATE TABLE IF NOT EXISTS prediction_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT NOT NULL,
        prediction_date TEXT NOT NULL, ranking_score REAL NOT NULL,
        classification TEXT NOT NULL, confidence_score REAL NOT NULL,
        confidence_level TEXT NOT NULL, quality_score REAL NOT NULL,
        growth_score REAL NOT NULL, value_score REAL NOT NULL,
        momentum_score REAL NOT NULL, risk_score REAL NOT NULL,
        sector_score REAL NOT NULL, price_at_prediction REAL,
        benchmark_level REAL, prediction_horizon INTEGER NOT NULL DEFAULT 30,
        validation_status TEXT NOT NULL DEFAULT 'pending',
        validated_at TEXT, future_return REAL, benchmark_return REAL,
        alpha REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT NOT NULL DEFAULT 'DailyPredictionCapture'
      )`,
    ];
    for (const sql of tables) {
      try { db.run(sql); } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`SQLite schema initialization failed: ${message}`);
      }
    }
  }

  async query(text: string, params?: unknown[]): Promise<SQLiteResult> {
    const db = await this.getConnection();
    const translated = translateSQL(text);
    const isSelect = /^\s*SELECT|^\s*PRAGMA|^\s*WITH\s/i.test(translated);

    try {
      const stmt = db.prepare(translated);
      try {
        if (params && params.length > 0) stmt.bind(params);
        if (isSelect) {
          const rows: Record<string, unknown>[] = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          return { rows, rowCount: rows.length };
        } else {
          stmt.step();
          return { rows: [], rowCount: db.getRowsModified() };
        }
      } finally { stmt.free(); }
    } catch {
      // Fallback: use db.run / db.exec for compatibility
    }

    if (isSelect) {
      try {
        const result = db.exec(translated);
        const cols = result[0]?.columns || [];
        const vals = result[0]?.values || [];
        const rows = vals.map((r: any[]) => { const obj: any = {}; cols.forEach((c: string, i: number) => obj[c] = r[i]); return obj; });
        return { rows, rowCount: vals.length };
      } catch { /* final fallback */ }
    } else {
      try { db.run(translated); return { rows: [], rowCount: db.getRowsModified() }; } catch { /* final fallback */ }
    }
    throw new Error(`SQLite query failed: ${text.substring(0, 200)}`);
  }

  async executeScript(sql: string): Promise<void> {
    const db = await this.getConnection();
    db.exec(sql);
  }

  async end(): Promise<void> { await closeSQLite(); this.db = null; }

  resetConnection(): void { this.db = null; }
}

const _instance = new SQLitePool();
_poolRef = _instance;
export default _instance;
export { _instance as pool };
export const query = (text: string, params?: unknown[]) => _instance.query(text, params);
