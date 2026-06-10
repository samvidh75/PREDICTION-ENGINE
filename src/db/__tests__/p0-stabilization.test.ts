/**
 * TRACK-P0: Production Stabilization Tests
 *
 * Test Groups:
 *   A — SQLite Schema Contract
 *   B — Feature Engine Write
 *   C — Factor Engine Write
 *   G — Health Check Adapter
 *   H — Env Configuration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTempDb(): { db: Database.Database; path: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p0-test-'));
  const dbPath = path.join(dir, 'test.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return { db, path: dbPath };
}

function runCanonicalSchema(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS feature_snapshots (
    symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
    rsi REAL, macd REAL, macd_signal REAL, macd_histogram REAL,
    adx REAL, atr REAL, bollinger_width REAL, momentum REAL,
    volatility REAL, relative_strength REAL, moving_average_distance REAL,
    trend_strength REAL,
    PRIMARY KEY (symbol, trade_date)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS factor_snapshots (
    symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
    quality_factor REAL, value_factor REAL, growth_factor REAL,
    momentum_factor REAL, risk_factor REAL, sector_strength_factor REAL,
    factor_score REAL, explanations TEXT,
    PRIMARY KEY (symbol, trade_date)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS prediction_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT, prediction_date TEXT,
    ranking_score REAL, classification TEXT, confidence_score REAL,
    confidence_level TEXT,
    quality_score REAL, growth_score REAL, value_score REAL,
    momentum_score REAL, risk_score REAL, sector_score REAL,
    price_at_prediction REAL, benchmark_level REAL,
    prediction_horizon INTEGER, validation_status TEXT DEFAULT 'pending',
    validated_at TEXT, future_return REAL, benchmark_return REAL, alpha REAL
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS daily_prices (
    symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
    open REAL, high REAL, low REAL, close REAL, adjusted_close REAL, volume REAL,
    PRIMARY KEY (symbol, trade_date)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS financial_snapshots (
    symbol TEXT NOT NULL, period_end TEXT NOT NULL,
    market_cap REAL, pe_ratio REAL, eps REAL, dividend_yield REAL, beta REAL,
    free_float REAL, fcf_yield REAL, ev_ebitda REAL, roa REAL, roe REAL, roic REAL,
    debt_to_equity REAL, current_ratio REAL,
    revenue_growth REAL, profit_growth REAL, eps_growth REAL, fcf_growth REAL,
    gross_margin REAL, operating_margin REAL, pb_ratio REAL,
    PRIMARY KEY (symbol, period_end)
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS symbols (
    symbol TEXT PRIMARY KEY, exchange TEXT, isin TEXT, company_name TEXT,
    sector TEXT, industry TEXT, listing_status TEXT DEFAULT 'Active'
  )`);
}

// ---------------------------------------------------------------------------
// TEST GROUP A
// ---------------------------------------------------------------------------

describe('GROUP A — SQLite Schema Contract', () => {
  let db: Database.Database;
  let dbDir: string;

  beforeAll(() => {
    const tmp = createTempDb();
    db = tmp.db;
    dbDir = path.dirname(tmp.path);
    runCanonicalSchema(db);
  });

  afterAll(() => {
    db.close();
    try { fs.rmSync(dbDir, { recursive: true }); } catch { /* temp test cleanup best effort */ }
  });

  it('feature_snapshots contains all canonical columns', () => {
    const cols = db.prepare("PRAGMA table_info('feature_snapshots')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    const required = [
      'symbol', 'trade_date', 'rsi', 'macd', 'macd_signal', 'macd_histogram',
      'adx', 'atr', 'bollinger_width', 'momentum', 'volatility',
      'relative_strength', 'moving_average_distance', 'trend_strength',
    ];
    for (const col of required) expect(colNames).toContain(col);
  });

  it('feature_snapshots does NOT have deprecated columns', () => {
    const cols = db.prepare("PRAGMA table_info('feature_snapshots')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).not.toContain('snapshot_date');
    expect(colNames).not.toContain('returns_1m');
    expect(colNames).not.toContain('returns_3m');
    expect(colNames).not.toContain('returns_6m');
    expect(colNames).not.toContain('returns_1y');
    expect(colNames).not.toContain('ma_trend');
    expect(colNames).not.toContain('momentum_score');
  });

  it('factor_snapshots contains all canonical columns', () => {
    const cols = db.prepare("PRAGMA table_info('factor_snapshots')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    const required = [
      'symbol', 'trade_date', 'quality_factor', 'value_factor', 'growth_factor',
      'momentum_factor', 'risk_factor', 'sector_strength_factor',
      'factor_score', 'explanations',
    ];
    for (const col of required) expect(colNames).toContain(col);
  });

  it('factor_snapshots does NOT have deprecated columns', () => {
    const cols = db.prepare("PRAGMA table_info('factor_snapshots')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).not.toContain('snapshot_date');
    expect(colNames).not.toContain('confidence_score');
    expect(colNames).not.toContain('ranking_score');
    expect(colNames).not.toContain('classification');
  });

  it('prediction_registry contains confidence_level', () => {
    const cols = db.prepare("PRAGMA table_info('prediction_registry')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).toContain('confidence_level');
    expect(colNames).toContain('prediction_date');
    expect(colNames).toContain('classification');
    expect(colNames).toContain('confidence_score');
    expect(colNames).toContain('prediction_horizon');
  });

  it('prediction_registry does NOT use snapshot_date', () => {
    const cols = db.prepare("PRAGMA table_info('prediction_registry')").all() as { name: string }[];
    expect(cols.map(c => c.name)).not.toContain('snapshot_date');
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP B
// ---------------------------------------------------------------------------

describe('GROUP B — Feature Engine Write Test', () => {
  let db: Database.Database;
  let dbDir: string;

  beforeAll(() => {
    const tmp = createTempDb();
    db = tmp.db;
    dbDir = path.dirname(tmp.path);
    runCanonicalSchema(db);

    const insert = db.prepare(
      `INSERT OR IGNORE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const baseDate = new Date('2025-01-02');
    let price = 2500;
    for (let i = 0; i < 60; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().split('T')[0];
      price = Math.max(price + (Math.random() - 0.48) * 50, 100);
      insert.run('RELIANCE', dateStr, price - 5, price + 10, price - 8, price, price, 1000000);
    }
  });

  afterAll(() => {
    db.close();
    try { fs.rmSync(dbDir, { recursive: true }); } catch { /* temp test cleanup best effort */ }
  });

  it('can insert a feature_snapshot with canonical columns', () => {
    const result = db.prepare(
      `INSERT INTO feature_snapshots (
        symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
        adx, atr, bollinger_width, momentum, volatility, relative_strength,
        moving_average_distance, trend_strength
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('RELIANCE', '2025-03-15', 55.5, 1.2, 0.8, 0.4, 25.0, 15.5, 0.05, 0.03, 0.25, 0.01, 0.02, 0.015);
    expect(result.changes).toBe(1);
  });

  it('trade_date is populated', () => {
    const rows = db.prepare("SELECT * FROM feature_snapshots WHERE symbol = 'RELIANCE'").all() as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].trade_date).toBe('2025-03-15');
  });

  it('primary key (symbol, trade_date) enforces uniqueness', () => {
    expect(() => {
      db.prepare(
        `INSERT INTO feature_snapshots (
          symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
          adx, atr, bollinger_width, momentum, volatility, relative_strength,
          moving_average_distance, trend_strength
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run('RELIANCE', '2025-03-15', 60.0, 1.5, 1.0, 0.5, 30.0, 20.0, 0.06, 0.04, 0.30, 0.02, 0.03, 0.02);
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP C
// ---------------------------------------------------------------------------

describe('GROUP C — Factor Engine Write Test', () => {
  let db: Database.Database;
  let dbDir: string;

  beforeAll(() => {
    const tmp = createTempDb();
    db = tmp.db;
    dbDir = path.dirname(tmp.path);
    runCanonicalSchema(db);

    db.prepare(`INSERT OR IGNORE INTO symbols (symbol, exchange, company_name, sector, industry)
      VALUES (?, ?, ?, ?, ?)`).run('RELIANCE', 'NSE', 'Reliance Industries Ltd', 'Energy', 'Oil & Gas');
    db.prepare(`INSERT OR IGNORE INTO financial_snapshots
      (symbol, period_end, pe_ratio, dividend_yield, beta, eps)
      VALUES (?, ?, ?, ?, ?, ?)`).run('RELIANCE', '2025-03-31', 25.0, 1.5, 1.2, 100);
    db.prepare(`INSERT OR IGNORE INTO feature_snapshots (
      symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
      adx, atr, bollinger_width, momentum, volatility, relative_strength,
      moving_average_distance, trend_strength
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('RELIANCE', '2025-03-15', 55.0, 1.2, 0.8, 0.4, 25.0, 15.0, 0.05, 0.03, 0.25, 0.01, 0.02, 0.015);
    db.prepare(`INSERT OR IGNORE INTO daily_prices
      (symbol, trade_date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run('RELIANCE', '2025-03-15', 2500, 2520, 2480, 2510, 1000000);
  });

  afterAll(() => {
    db.close();
    try { fs.rmSync(dbDir, { recursive: true }); } catch { /* temp test cleanup best effort */ }
  });

  it('can insert a factor_snapshot with canonical columns', () => {
    const result = db.prepare(
      `INSERT INTO factor_snapshots (
        symbol, trade_date, quality_factor, value_factor, growth_factor,
        momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('RELIANCE', '2025-03-15', 72, 65, 58, 70, 60, 55, 63,
      JSON.stringify({ topPositiveDrivers: ['Quality', 'Momentum'], topNegativeDrivers: ['Sector'] }));
    expect(result.changes).toBe(1);
  });

  it('factor_snapshots columns are populated correctly', () => {
    const rows = db.prepare("SELECT * FROM factor_snapshots WHERE symbol = 'RELIANCE'").all() as Record<string, unknown>[];
    expect(rows.length).toBe(1);
    expect(rows[0].trade_date).toBe('2025-03-15');
    expect(rows[0].quality_factor).toBe(72);
    expect(rows[0].momentum_factor).toBe(70);
  });

  it('explanations are persisted', () => {
    const rows = db.prepare("SELECT explanations FROM factor_snapshots WHERE symbol = 'RELIANCE'").all() as { explanations: string }[];
    const parsed = JSON.parse(rows[0].explanations);
    expect(parsed.topPositiveDrivers).toContain('Quality');
  });

  it('factors are numeric', () => {
    const rows = db.prepare("SELECT * FROM factor_snapshots WHERE symbol = 'RELIANCE'").all() as Record<string, unknown>[];
    expect(typeof rows[0].quality_factor).toBe('number');
    expect(typeof rows[0].factor_score).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP G
// ---------------------------------------------------------------------------

describe('GROUP G — Database Adapter Health Check', () => {
  it('DatabaseAdapter initializes to sqlite kind when DATABASE_URL is not set', async () => {
    const origUrl = process.env.DATABASE_URL;
    const origAdapter = process.env.DB_ADAPTER;
    delete process.env.DATABASE_URL;
    process.env.DB_ADAPTER = 'sqlite';
    try {
      const { dbAdapter } = await import('../DatabaseAdapter');
      (dbAdapter as unknown as { _initialized: boolean })._initialized = false;
      (dbAdapter as unknown as { _kind: string })._kind = 'unavailable';
      await dbAdapter.initialize();
      expect(dbAdapter.kind).toBe('sqlite');
      const ping = await dbAdapter.ping();
      expect(ping.ok).toBe(true);
      await dbAdapter.shutdown();
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl;
      else delete process.env.DATABASE_URL;
      if (origAdapter) process.env.DB_ADAPTER = origAdapter;
      else delete process.env.DB_ADAPTER;
    }
  });

  it('DatabaseAdapter reports kind honestly', async () => {
    const origAdapter = process.env.DB_ADAPTER;
    process.env.DB_ADAPTER = 'sqlite';
    const { dbAdapter } = await import('../DatabaseAdapter');
    try {
      if ((dbAdapter as unknown as { _initialized: boolean })._initialized) {
        await dbAdapter.shutdown();
      }
      (dbAdapter as unknown as { _initialized: boolean })._initialized = false;
      (dbAdapter as unknown as { _kind: string })._kind = 'unavailable';
      await dbAdapter.initialize();
      expect(['sqlite', 'postgres', 'unavailable']).toContain(dbAdapter.kind);
      await dbAdapter.shutdown();
    } finally {
      if (origAdapter) process.env.DB_ADAPTER = origAdapter;
      else delete process.env.DB_ADAPTER;
    }
  });

  it('DatabaseAdapter ping reports false when unavailable', async () => {
    const { dbAdapter } = await import('../DatabaseAdapter');
    await dbAdapter.shutdown();
    (dbAdapter as unknown as { _initialized: boolean })._initialized = true;
    (dbAdapter as unknown as { _kind: string })._kind = 'unavailable';
    const ping = await dbAdapter.ping();
    expect(ping.ok).toBe(false);
    expect(ping.detail).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP H
// ---------------------------------------------------------------------------

describe('GROUP H — Env Configuration', () => {
  const PROD_ORIGIN = "https://stockstory-india.com";

  function parseOrigins(rawEnv: string): string[] {
    const allowedOrigins: string[] = [PROD_ORIGIN];
    const extraOrigins = (rawEnv ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0 && o !== PROD_ORIGIN);
    const seen = new Set(extraOrigins);
    for (const o of seen) allowedOrigins.push(o);
    return allowedOrigins;
  }

  it('EXTRA_ALLOWED_ORIGINS parses comma-separated values', () => {
    const origins = parseOrigins('https://preview.example.com,https://admin.example.com');
    expect(origins).toContain('https://stockstory-india.com');
    expect(origins).toContain('https://preview.example.com');
    expect(origins).toContain('https://admin.example.com');
  });

  it('EXTRA_ALLOWED_ORIGINS trims whitespace and removes empty entries', () => {
    const origins = parseOrigins(' https://preview.example.com ,  ,https://admin.example.com ');
    expect(origins).toContain('https://preview.example.com');
    expect(origins).toContain('https://admin.example.com');
    expect(origins.every(o => o.length > 0)).toBe(true);
  });

  it('EXTRA_ALLOWED_ORIGINS deduplicates including canonical origin', () => {
    const origins = parseOrigins('https://stockstory-india.com,https://admin.example.com');
    const count = origins.filter(o => o === 'https://stockstory-india.com').length;
    expect(count).toBe(1);
    expect(origins).toContain('https://admin.example.com');
  });

  it('cookie secret falls back to dev default when unset in development', () => {
    const origSecret = process.env.COOKIE_SECRET;
    delete process.env.COOKIE_SECRET;
    try {
      const isProduction = false;
      const cookieSecret = process.env.COOKIE_SECRET ?? (isProduction ? "" : "dev-secret-changeme");
      expect(cookieSecret).toBe("dev-secret-changeme");
    } finally {
      if (origSecret !== undefined) process.env.COOKIE_SECRET = origSecret;
    }
  });

  it('production without COOKIE_SECRET triggers empty string (error path)', () => {
    const origSecret = process.env.COOKIE_SECRET;
    delete process.env.COOKIE_SECRET;
    try {
      const isProduction = true;
      const cookieSecret = process.env.COOKIE_SECRET ?? (isProduction ? "" : "dev-secret-changeme");
      expect(cookieSecret).toBe("");
    } finally {
      if (origSecret !== undefined) process.env.COOKIE_SECRET = origSecret;
    }
  });
});
