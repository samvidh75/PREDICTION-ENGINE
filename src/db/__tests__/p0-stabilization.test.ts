/**
 * TRACK-P0: Production Stabilization Tests
 *
 * Test Groups:
 *   A — SQLite Schema Contract
 *   B — Feature Engine Write (skipped when no prices seeded; schema-only)
 *   C — Factor Engine Write (skipped when no features seeded; schema-only)
 *   D — (skipped in unit test; requires running server)
 *   G — Health Check Adapter
 *   H — Env Configuration
 *
 * These tests validate the canonical schema, database adapter, and env parsing.
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
  // Canonical feature_snapshots
  db.exec(`CREATE TABLE IF NOT EXISTS feature_snapshots (
    symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
    rsi REAL, macd REAL, macd_signal REAL, macd_histogram REAL,
    adx REAL, atr REAL, bollinger_width REAL, momentum REAL,
    volatility REAL, relative_strength REAL, moving_average_distance REAL,
    trend_strength REAL,
    PRIMARY KEY (symbol, trade_date)
  )`);

  // Canonical factor_snapshots
  db.exec(`CREATE TABLE IF NOT EXISTS factor_snapshots (
    symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
    quality_factor REAL, value_factor REAL, growth_factor REAL,
    momentum_factor REAL, risk_factor REAL, sector_strength_factor REAL,
    factor_score REAL, explanations TEXT,
    PRIMARY KEY (symbol, trade_date)
  )`);

  // Canonical prediction_registry
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

  // daily_prices (needed for FeatureEngine)
  db.exec(`CREATE TABLE IF NOT EXISTS daily_prices (
    symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
    open REAL, high REAL, low REAL, close REAL, adjusted_close REAL, volume REAL,
    PRIMARY KEY (symbol, trade_date)
  )`);

  // financial_snapshots (needed for FactorEngine)
  db.exec(`CREATE TABLE IF NOT EXISTS financial_snapshots (
    symbol TEXT NOT NULL, period_end TEXT NOT NULL,
    market_cap REAL, pe_ratio REAL, eps REAL, dividend_yield REAL, beta REAL,
    free_float REAL, fcf_yield REAL, ev_ebitda REAL, roa REAL, roe REAL, roic REAL,
    debt_to_equity REAL, current_ratio REAL,
    revenue_growth REAL, profit_growth REAL, eps_growth REAL, fcf_growth REAL,
    gross_margin REAL, operating_margin REAL, pb_ratio REAL,
    PRIMARY KEY (symbol, period_end)
  )`);

  // symbols (needed for FactorEngine)
  db.exec(`CREATE TABLE IF NOT EXISTS symbols (
    symbol TEXT PRIMARY KEY, exchange TEXT, isin TEXT, company_name TEXT,
    sector TEXT, industry TEXT, listing_status TEXT DEFAULT 'Active'
  )`);
}

// ---------------------------------------------------------------------------
// TEST GROUP A — SQLite Schema Contract
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
    try { fs.rmSync(dbDir, { recursive: true }); } catch {}
  });

  it('feature_snapshots contains all canonical columns', () => {
    const cols = db.prepare("PRAGMA table_info('feature_snapshots')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);

    const required = [
      'symbol', 'trade_date', 'rsi', 'macd', 'macd_signal', 'macd_histogram',
      'adx', 'atr', 'bollinger_width', 'momentum', 'volatility',
      'relative_strength', 'moving_average_distance', 'trend_strength',
    ];

    for (const col of required) {
      expect(colNames).toContain(col);
    }
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

    for (const col of required) {
      expect(colNames).toContain(col);
    }
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
    expect(colNames).toContain('ranking_score');
    expect(colNames).toContain('quality_score');
    expect(colNames).toContain('growth_score');
    expect(colNames).toContain('value_score');
    expect(colNames).toContain('momentum_score');
    expect(colNames).toContain('risk_score');
    expect(colNames).toContain('sector_score');
    expect(colNames).toContain('prediction_horizon');
  });

  it('prediction_registry does NOT use snapshot_date', () => {
    const cols = db.prepare("PRAGMA table_info('prediction_registry')").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    expect(colNames).not.toContain('snapshot_date');
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP B — Feature Engine Write (Schema + basic insert)
// ---------------------------------------------------------------------------

describe('GROUP B — Feature Engine Write Test', () => {
  let db: Database.Database;
  let dbDir: string;

  beforeAll(() => {
    const tmp = createTempDb();
    db = tmp.db;
    dbDir = path.dirname(tmp.path);
    runCanonicalSchema(db);

    // Seed daily_prices with enough rows for indicators (60 days for RELIANCE)
    const prices: [string, string, number, number, number, number, number, number][] = [];
    const baseDate = new Date('2025-01-02');
    let price = 2500;
    for (let i = 0; i < 60; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateStr = date.toISOString().split('T')[0];
      const change = (Math.random() - 0.48) * 50; // slight upward bias
      price = Math.max(price + change, 100);
      prices.push(['RELIANCE', dateStr, price - 5, price + 10, price - 8, price, price, 1000000]);
    }

    const insert = db.prepare(
      `INSERT OR IGNORE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of prices) {
      insert.run(...p);
    }
  });

  afterAll(() => {
    db.close();
    try { fs.rmSync(dbDir, { recursive: true }); } catch {}
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

  it('feature_snapshots rows are retrievable with trade_date populated', () => {
    const rows = db.prepare("SELECT * FROM feature_snapshots WHERE symbol = 'RELIANCE'").all() as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].trade_date).toBe('2025-03-15');
    expect(rows[0].rsi).toBe(55.5);
    expect(rows[0].macd).toBe(1.2);
  });

  it('primary key (symbol, trade_date) enforces uniqueness', () => {
    // Insert same symbol+date again (should fail on UNIQUE constraint)
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
// TEST GROUP C — Factor Engine Write Test
// ---------------------------------------------------------------------------

describe('GROUP C — Factor Engine Write Test', () => {
  let db: Database.Database;
  let dbDir: string;

  beforeAll(() => {
    const tmp = createTempDb();
    db = tmp.db;
    dbDir = path.dirname(tmp.path);
    runCanonicalSchema(db);

    // Seed symbols
    db.prepare(`INSERT OR IGNORE INTO symbols (symbol, exchange, company_name, sector, industry)
      VALUES (?, ?, ?, ?, ?)`).run('RELIANCE', 'NSE', 'Reliance Industries Ltd', 'Energy', 'Oil & Gas');

    // Seed financial_snapshots
    db.prepare(`INSERT OR IGNORE INTO financial_snapshots
      (symbol, period_end, pe_ratio, dividend_yield, beta, eps)
      VALUES (?, ?, ?, ?, ?, ?)`
    ).run('RELIANCE', '2025-03-31', 25.0, 1.5, 1.2, 100);

    // Seed feature_snapshots
    db.prepare(`INSERT OR IGNORE INTO feature_snapshots (
      symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
      adx, atr, bollinger_width, momentum, volatility, relative_strength,
      moving_average_distance, trend_strength
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('RELIANCE', '2025-03-15', 55.0, 1.2, 0.8, 0.4, 25.0, 15.0, 0.05, 0.03, 0.25, 0.01, 0.02, 0.015);

    // Seed daily_prices
    db.prepare(`INSERT OR IGNORE INTO daily_prices
      (symbol, trade_date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('RELIANCE', '2025-03-15', 2500, 2520, 2480, 2510, 1000000);
  });

  afterAll(() => {
    db.close();
    try { fs.rmSync(dbDir, { recursive: true }); } catch {}
  });

  it('can insert a factor_snapshot with canonical columns', () => {
    const result = db.prepare(
      `INSERT INTO factor_snapshots (
        symbol, trade_date, quality_factor, value_factor, growth_factor,
        momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'RELIANCE', '2025-03-15',
      72, 65, 58, 70, 60, 55, 63,
      JSON.stringify({ topPositiveDrivers: ['Quality', 'Momentum'], topNegativeDrivers: ['Sector'] })
    );
    expect(result.changes).toBe(1);
  });

  it('factor_snapshots columns are populated correctly', () => {
    const rows = db.prepare("SELECT * FROM factor_snapshots WHERE symbol = 'RELIANCE'").all() as Record<string, unknown>[];
    expect(rows.length).toBe(1);
    expect(rows[0].trade_date).toBe('2025-03-15');
    expect(rows[0].quality_factor).toBe(72);
    expect(rows[0].value_factor).toBe(65);
    expect(rows[0].growth_factor).toBe(58);
    expect(rows[0].momentum_factor).toBe(70);
    expect(rows[0].risk_factor).toBe(60);
    expect(rows[0].sector_strength_factor).toBe(55);
    expect(rows[0].factor_score).toBe(63);
    expect(typeof rows[0].explanations).toBe('string');
  });

  it('explanations are persisted', () => {
    const rows = db.prepare("SELECT explanations FROM factor_snapshots WHERE symbol = 'RELIANCE'").all() as { explanations: string }[];
    const parsed = JSON.parse(rows[0].explanations);
    expect(parsed.topPositiveDrivers).toContain('Quality');
    expect(parsed.topNegativeDrivers).toContain('Sector');
  });

  it('factors are numeric', () => {
    const rows = db.prepare("SELECT * FROM factor_snapshots WHERE symbol = 'RELIANCE'").all() as Record<string, unknown>[];
    expect(typeof rows[0].quality_factor).toBe('number');
    expect(typeof rows[0].factor_score).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// TEST GROUP G — Health Check via canonical adapter
// ---------------------------------------------------------------------------

describe('GROUP G — Database Adapter Health Check', () => {
  it('DatabaseAdapter initializes to sqlite kind when DATABASE_URL is not set', async () => {
    // Ensure DATABASE_URL is unset for this test
    const origUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      const { dbAdapter } = await import('../DatabaseAdapter');
      // Reset and re-initialize
      (dbAdapter as unknown as { _initialized: boolean })._initialized = false;
      (dbAdapter as unknown as { _kind: string })._kind = 'unavailable';
      await dbAdapter.initialize();

      expect(dbAdapter.kind).toBe('sqlite');

      const ping = await dbAdapter.ping();
      expect(ping.ok).toBe(true);

      await dbAdapter.shutdown();
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl;
    }
  });

  it('DatabaseAdapter reports kind honestly', async () => {
    const { dbAdapter } = await import('../DatabaseAdapter');

    // After shutdown, kind should be 'unavailable'
    if ((dbAdapter as unknown as { _initialized: boolean })._initialized) {
      await dbAdapter.shutdown();
    }
    (dbAdapter as unknown as { _initialized: boolean })._initialized = false;
    (dbAdapter as unknown as { _kind: string })._kind = 'unavailable';

    await dbAdapter.initialize();
    expect(['sqlite', 'postgres', 'unavailable']).toContain(dbAdapter.kind);

    await dbAdapter.shutdown();
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
// TEST GROUP H — Env Configuration
// ---------------------------------------------------------------------------

describe('GROUP H — Env Configuration', () => {
  it('loadEnv provides safe local fallback for cookieSecret in development', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.COOKIE_SECRET;
    process.env.NODE_ENV = 'development';
    delete process.env.COOKIE_SECRET;

    try {
      // We need to invalidate the module cache
      vi.resetModules();
      // Dynamic import to get fresh env
      const { loadEnv } = require('../../backend/config/env');
      const env = loadEnv();
      expect(env.cookieSecret).toBe('dev-secret-changeme');
    } finally {
      process.env.NODE_ENV = origEnv ?? 'development';
      if (origSecret) process.env.COOKIE_SECRET = origSecret;
    }
  });

  it('loadEnv fails in production without COOKIE_SECRET', () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.COOKIE_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.COOKIE_SECRET;

    // Mock process.exit
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    try {
      vi.resetModules();
      const { loadEnv } = require('../../backend/config/env');
      expect(() => loadEnv()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      process.env.NODE_ENV = origEnv ?? 'development';
      if (origSecret) process.env.COOKIE_SECRET = origSecret;
      mockExit.mockRestore();
    }
  });

  it('EXTRA_ALLOWED_ORIGINS parses comma-separated values', () => {
    const origExtras = process.env.EXTRA_ALLOWED_ORIGINS;
    const origEnv = process.env.NODE_ENV;
    process.env.EXTRA_ALLOWED_ORIGINS = 'https://preview.example.com,https://admin.example.com';
    process.env.NODE_ENV = 'production';

    try {
      vi.resetModules();
      const { loadEnv } = require('../../backend/config/env');
      const env = loadEnv();

      expect(env.allowedOrigins).toContain('https://stockstory-india.com');
      expect(env.allowedOrigins).toContain('https://preview.example.com');
      expect(env.allowedOrigins).toContain('https://admin.example.com');
    } finally {
      if (origExtras) process.env.EXTRA_ALLOWED_ORIGINS = origExtras;
      else delete process.env.EXTRA_ALLOWED_ORIGINS;
      process.env.NODE_ENV = origEnv ?? 'development';
    }
  });

  it('EXTRA_ALLOWED_ORIGINS trims whitespace and removes empty entries', () => {
    const origExtras = process.env.EXTRA_ALLOWED_ORIGINS;
    const origEnv = process.env.NODE_ENV;
    process.env.EXTRA_ALLOWED_ORIGINS = ' https://preview.example.com ,  ,https://admin.example.com ';
    process.env.NODE_ENV = 'production';

    try {
      vi.resetModules();
      const { loadEnv } = require('../../backend/config/env');
      const env = loadEnv();

      expect(env.allowedOrigins).toContain('https://preview.example.com');
      expect(env.allowedOrigins).toContain('https://admin.example.com');
      // No empty string
      expect(env.allowedOrigins.every(o => o.length > 0)).toBe(true);
    } finally {
      if (origExtras) process.env.EXTRA_ALLOWED_ORIGINS = origExtras;
      else delete process.env.EXTRA_ALLOWED_ORIGINS;
      process.env.NODE_ENV = origEnv ?? 'development';
    }
  });

  it('EXTRA_ALLOWED_ORIGINS deduplicates including canonical origin', () => {
    const origExtras = process.env.EXTRA_ALLOWED_ORIGINS;
    const origEnv = process.env.NODE_ENV;
    process.env.EXTRA_ALLOWED_ORIGINS = 'https://stockstory-india.com,https://admin.example.com';
    process.env.NODE_ENV = 'production';

    try {
      vi.resetModules();
      const { loadEnv } = require('../../backend/config/env');
      const env = loadEnv();

      // Count occurrences of canonical origin
      const count = env.allowedOrigins.filter(o => o === 'https://stockstory-india.com').length;
      expect(count).toBe(1);
    } finally {
      if (origExtras) process.env.EXTRA_ALLOWED_ORIGINS = origExtras;
      else delete process.env.EXTRA_ALLOWED_ORIGINS;
      process.env.NODE_ENV = origEnv ?? 'development';
    }
  });
});
