/**
 * @vitest-environment node
 *
 * Market-action SQLite integration test.
 * Uses a unique temporary DB and never mutates data/stockstory.db.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { dbAdapter } from '../../db/DatabaseAdapter';
import { resetForTest } from '../../db/SQLiteAdapter';
import { loadMarketActionSnapshot } from '../../services/market/MarketActionService';

function tempDbPath(): string {
  return path.join(os.tmpdir(), `market-action-${Date.now()}-${(globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296).toString(36).slice(2, 8)}.db`);
}

function cleanupDb(dbPath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const file = dbPath + ext;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

async function insertSymbol(symbol: string, companyName: string, sector: string): Promise<void> {
  await dbAdapter.query(
    `IPSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
     VALUES ($1, 'PSE', $2, $3, 'Test Industry', 'Active')`,
    [symbol, companyName, sector],
  );
}

async function insertPrices(symbol: string, previousClose: number, latestClose: number, volume: number): Promise<void> {
  await dbAdapter.query(
    `IPSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES ($1, '2026-06-12', $2, $3, $4, $5, $6, $7)`,
    [symbol, previousClose, previousClose, previousClose, previousClose, previousClose, volume - 100],
  );
  await dbAdapter.query(
    `IPSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
     VALUES ($1, '2026-06-13', $2, $3, $4, $5, $6, $7)`,
    [symbol, latestClose, latestClose, latestClose, latestClose, latestClose, volume],
  );
}

async function insertSnapshots(symbol: string, peRatio: number, marketCap: number, momentum: number, volatility: number): Promise<void> {
  await dbAdapter.query(
    `IPSERT INTO financial_snapshots (symbol, period_end, market_cap, pe_ratio, roe, revenue_growth)
     VALUES ($1, '2026-03-31', $2, $3, 18, 12)`,
    [symbol, marketCap, peRatio],
  );
  await dbAdapter.query(
    `IPSERT INTO feature_snapshots (symbol, trade_date, rsi, momentum, volatility, moving_average_distance)
     VALUES ($1, '2026-06-13', 58, $2, $3, 3)`,
    [symbol, momentum, volatility],
  );
}

describe('market action SQLite integration', () => {
  const originalEnv = { ...process.env };
  let dbPath: string;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.DB_ADAPTER = 'sqlite';
    delete process.env.DATABASE_URL;
    dbPath = tempDbPath();
    resetForTest(dbPath);
    await dbAdapter.reset();
    await dbAdapter.initialize();
  });

  afterEach(async () => {
    await dbAdapter.reset();
    process.env = { ...originalEnv };
    cleanupDb(dbPath);
  });

  it('loads movers and certified scanner fields from SQLite snapshots', async () => {
    await insertSymbol('RELIANCE', 'Reliance Industries', 'Energy');
    await insertSymbol('INFY', 'Infosys', 'Technology');
    await insertPrices('RELIANCE', 100, 102, 1_000_000);
    await insertPrices('INFY', 100, 95, 2_000_000);
    await insertSnapshots('RELIANCE', 22, 19_000_000_000_000, 4, 17);
    await insertSnapshots('INFY', 18, 7_000_000_000_000, -2, 12);

    const response = await loadMarketActionSnapshot();

    expect(response.status).toBe('real');
    expect(response.data.gainers[0]).toMatchObject({ symbol: 'RELIANCE', changePercent: 2 });
    expect(response.data.losers[0]).toMatchObject({ symbol: 'INFY', changePercent: -5 });
    expect(response.data.volumeLeaders[0].symbol).toBe('INFY');
    expect(response.data.scannerPresets.find((preset) => preset.id === 'value-watch')?.items[0].symbol).toBe('INFY');
  });
});
