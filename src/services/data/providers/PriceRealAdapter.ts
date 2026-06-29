/**
 * Price Real Adapter
 *
 * Reads daily price candles from the local SQLite (stockstory.db) daily_prices
 * table.  No external API calls are made — all data comes from the bundled
 * database that is seeded during ingestion.
 *
 * The daily_prices table has the schema:
 *   symbol TEXT NOT NULL, trade_date TEXT NOT NULL,
 *   open REAL, high REAL, low REAL, close REAL, adjusted_close REAL, volume REAL,
 *   PRIMARY KEY (symbol, trade_date)
 */

import type {
  AdapterResult,
  PriceAdapter,
  PriceCandle,
  PriceQueryOptions,
  PriceTimeframe,
} from '../dataAdapterTypes';
import { adapterOk, adapterErr } from '../adapterResult';
import { normalizeAdapterSymbol } from '../normalizeDataRecord';
import { dbAdapter } from '../../../db/DatabaseAdapter';

// ─── Adapter ─────────────────────────────────────────────────────────────────

export class PriceRealAdapter implements PriceAdapter {
  private _kind: string;

  constructor() {
    this._kind = dbAdapter.kind;
  }

  /** The underlying DB kind (sqlite | postgres | unavailable). */
  get kind(): string {
    return this._kind;
  }

  async getDailyCandles(
    symbol: string,
    options?: PriceQueryOptions,
  ): Promise<AdapterResult<PriceCandle[]>> {
    const normalized = normalizeAdapterSymbol(symbol);
    if (!normalized) {
      return adapterErr('INVALID_SYMBOL', [
        { code: 'INVALID_SYMBOL', message: `Invalid symbol: "${symbol}"` },
      ]);
    }

    try {
      let sql = `SELECT trade_date, open, high, low, close, adjusted_close, volume
                 FROM daily_prices
                 WHERE symbol = ?
                 ORDER BY trade_date ASC`;
      const params: unknown[] = [normalized];

      if (options?.start) {
        sql = sql.replace(
          'ORDER BY trade_date ASC',
          `AND trade_date >= ? ORDER BY trade_date ASC`,
        );
        params.push(options.start);
      }
      if (options?.end) {
        sql = sql.replace(
          'ORDER BY trade_date ASC',
          `AND trade_date <= ? ORDER BY trade_date ASC`,
        );
        params.push(options.end);
      }

      const result = await dbAdapter.query(sql, params);

      if (!result.rows || result.rows.length === 0) {
        return adapterErr('EMPTY_RESPONSE', [
          { code: 'EMPTY_RESPONSE', message: `No price data found for "${normalized}"` },
        ]);
      }

      let candles: PriceCandle[] = result.rows.map((row: Record<string, unknown>) => ({
        symbol: normalized,
        timeframe: '1d' as PriceTimeframe,
        timestamp: String(row.trade_date ?? ''),
        open: Number(row.open ?? 0),
        high: Number(row.high ?? 0),
        low: Number(row.low ?? 0),
        close: Number(row.close ?? 0),
        volume: row.volume !== null && row.volume !== undefined ? Number(row.volume) : null,
        adjustedClose: row.adjusted_close !== null && row.adjusted_close !== undefined
          ? Number(row.adjusted_close) : null,
      }));

      // Apply limit after fetching (PostgreSQL limit pushed in query)
      if (options?.limit && options.limit > 0 && candles.length > options.limit) {
        candles = candles.slice(-options.limit);
      }

      return adapterOk(candles);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return adapterErr('UNKNOWN_ADAPTER_ERROR', [
        { code: 'UNKNOWN_ADAPTER_ERROR', message },
      ]);
    }
  }

  async getIntradayCandles(
    _symbol: string,
    _timeframe: Extract<PriceTimeframe, '1m' | '5m' | '15m' | '1h'>,
    _options?: PriceQueryOptions,
  ): Promise<AdapterResult<PriceCandle[]>> {
    // No intraday data available in the local DB
    return adapterErr('EMPTY_RESPONSE', [
      { code: 'EMPTY_RESPONSE', message: 'Intraday data is not available from the local database' },
    ]);
  }
}
