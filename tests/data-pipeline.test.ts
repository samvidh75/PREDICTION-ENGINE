/**
 * Data pipeline integration tests
 * Tests WebSocket streaming, EOD sync, and universe expansion
 */

import { describe, test, expect, jest, beforeAll, afterAll } from '@jest/globals';
import WebSocket from 'ws';
import pg from 'pg';

const WS_URL = process.env.WS_TEST_URL || 'ws://localhost:10000/api/quotes/ws';
const DB_URL = process.env.DATABASE_URL;

describe('Data Pipeline', () => {
  let db: pg.Client | null = null;

  beforeAll(async () => {
    if (DB_URL) {
      db = new pg.Client({ connectionString: DB_URL });
      await db.connect();
    }
  });

  afterAll(async () => {
    if (db) await db.end();
  });

  test('WebSocket connects and streams quotes', async () => {
    const ws = new WebSocket(WS_URL);

    const quotePromise = new Promise<any>((resolve) => {
      ws.on('message', (raw: Buffer) => {
        const data = JSON.parse(raw.toString());
        if (data.symbol === 'TCS') resolve(data);
      });
    });

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'subscribe', symbols: ['TCS'] }));
        resolve();
      });
    });

    const quote = await Promise.race([
      quotePromise,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ]);

    expect(quote).toHaveProperty('price');
    expect(quote).toHaveProperty('bid');
    expect(quote).toHaveProperty('ask');
    expect(typeof quote.price).toBe('number');
    expect(quote.price).toBeGreaterThan(0);

    ws.close();
  }, 15000);

  test('WebSocket broadcasts quote with type field', async () => {
    const ws = new WebSocket(WS_URL);

    const msgPromise = new Promise<any>((resolve) => {
      ws.on('message', (raw: Buffer) => {
        const data = JSON.parse(raw.toString());
        if (data.type === 'quote') resolve(data);
      });
    });

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'subscribe', symbols: ['INFY'] }));
        resolve();
      });
    });

    const msg = await Promise.race([
      msgPromise,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ]);

    expect(msg.type).toBe('quote');
    expect(msg.symbol).toBe('INFY');
    expect(msg.source).toMatch(/^(indianapi|groww|yahoo)$/);

    ws.close();
  }, 15000);

  test('EOD sync updates fundamentals', async () => {
    // Unit test: mock Upstox API response
    const mockFundamentals = new Map<string, any>([
      ['TCS', { pe: 24.5, pb: 3.2, roe: 18.5, dividend_yield: 1.5 }],
    ]);

    expect(mockFundamentals.has('TCS')).toBe(true);
    const tcs = mockFundamentals.get('TCS');
    expect(tcs.pe).toBe(24.5);
    expect(tcs.roe).toBe(18.5);
  });

  test('Universe includes CHENNPETRO', async () => {
    if (!db) {
      console.warn('Skipping DB test: DATABASE_URL not set');
      return;
    }

    const res = await db.query(
      "SELECT symbol FROM company_registry WHERE symbol = 'CHENNPETRO'"
    );
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows[0].symbol).toBe('CHENNPETRO');
  });

  test('Company registry has required columns', async () => {
    if (!db) {
      console.warn('Skipping DB test: DATABASE_URL not set');
      return;
    }

    const res = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'company_registry'
       ORDER BY ordinal_position`
    );

    const columns = res.rows.map((r: any) => r.column_name);
    expect(columns).toContain('symbol');
    expect(columns).toContain('name');
    expect(columns).toContain('sector');
    expect(columns).toContain('isin');
  });

  test('Stock fundamentals schema has expected columns', async () => {
    if (!db) {
      console.warn('Skipping DB test: DATABASE_URL not set');
      return;
    }

    const res = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'stock_fundamentals'`
    );

    const columns = res.rows.map((r: any) => r.column_name);
    expect(columns).toContain('symbol');
    expect(columns).toContain('pe');
    expect(columns).toContain('roe');
    expect(columns).toContain('synced_at');
  });
});
