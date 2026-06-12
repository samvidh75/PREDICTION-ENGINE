/**
 * @vitest-environment node
 *
 * UIUX-P0 stockstory lineage audit.
 * These tests exercise the canonical public API route used by the stock page.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { dbAdapter } from '../../../src/db/DatabaseAdapter';
import { stockstoryRoutes } from '../../../src/backend/web/routes/stockstory';

const TEST_SYMBOL = 'TESTIT';
const TEST_DATE = '2025-06-09';
let dbCounter = 0;

function tempDbPath(): string {
  dbCounter += 1;
  return path.join(os.tmpdir(), `uiux-stockstory-${process.pid}-${Date.now()}-${dbCounter}.db`);
}

function cleanupDb(dbPath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = dbPath + suffix;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

async function initSqlite(dbPath: string): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.DB_ADAPTER = 'sqlite';
  process.env.SQLITE_DB_PATH = dbPath;
  delete process.env.DATABASE_URL;
  await dbAdapter.initialize();
}

async function seedPrediction(): Promise<void> {
  await dbAdapter.query(
    `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
     VALUES ($1, 'NSE', 'Test Integration Inc.', 'Technology', 'Software', 'Active')`,
    [TEST_SYMBOL],
  );

  await dbAdapter.query(
    `INSERT INTO prediction_registry
      (symbol, prediction_date, ranking_score, classification, confidence_score,
       confidence_level, quality_score, growth_score, value_score,
       momentum_score, risk_score, sector_score, price_at_prediction, prediction_horizon, created_by)
     VALUES ($1, $2, 85.0, 'Excellent', 90.0, 'Very High',
       82.0, 78.0, 72.0, 80.0, 12.0, 68.0, 1000.0, 30, 'ManualSnapshot')`,
    [TEST_SYMBOL, TEST_DATE],
  );
}

describe('UIUX-P0 stockstory canonical lineage', () => {
  const originalEnv = { ...process.env };
  let dbPath = '';
  let app: FastifyInstance;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    dbPath = tempDbPath();
    await initSqlite(dbPath);
    await seedPrediction();
    app = Fastify({ logger: false });
    await app.register(stockstoryRoutes);
    await app.ready();
  });

  afterEach(async () => {
    if (app) await app.close();
    await dbAdapter.reset();
    process.env = { ...originalEnv };
    cleanupDb(dbPath);
  });

  it('returns DB values through the API without neutral fallback scores', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/stockstory/${TEST_SYMBOL}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.status).toBe('ok');
    expect(body.mode).toBe('production_real');
    expect(body.data.symbol).toBe(TEST_SYMBOL);
    expect(body.data.predictionDate).toBe(TEST_DATE);
    expect(body.data.predictionHorizon).toBe(30);
    expect(body.data.rankingScore).toBe(85);
    expect(body.data.classification).toBe('Excellent');
    expect(body.data.confidence.level).toBe('Very High');
    expect(body.data.confidence.score).toBe(90);
    expect(body.data.factors.growth.score).toBe(78);
    expect(body.data.factors.quality.score).toBe(82);
    expect(body.data.factors.value.score).toBe(72);
    expect(body.data.factors.momentum.score).toBe(80);
    expect(body.data.factors.risk.score).toBe(12);
    expect(body.data.factors.sector.score).toBe(68);
    expect(body.dataState.lineage.every((entry: any) => entry.isFallback === false)).toBe(true);
    expect(body.dataState.lineage.every((entry: any) => entry.isSynthetic === false)).toBe(true);
  });

  it('does not fabricate a prediction for an unknown symbol', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/stockstory/UNKNOWN_UIUX' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      code: 'SYMBOL_NOT_IN_UNIVERSE',
      symbol: 'UNKNOWN_UIUX',
    });
  });
});
