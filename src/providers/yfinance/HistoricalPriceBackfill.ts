/**
 * TRACK-38A — HistoricalPriceBackfill
 * Backfills historical price data for Indian symbols from Yahoo Finance.
 *
 * Works with the YFinanceProvider (single-symbol fetches) and
 * YFinanceBatchProvider (multi-symbol / batch ingestion) to populate
 * the daily_prices table with historical OHLCV data.
 */

import { query } from '../../db';
import type {
  DailyPriceRecord,
  BackfillRange,
} from './types';
import { BACKFILL_RANGES } from './types';
import { IndianSymbolMapper } from './IndianSymbolMapper';

// ---------------------------------------------------------------------------
// Lightweight interfaces for providers owned by sibling agents.
// These match the expected shapes without creating circular imports.
// ---------------------------------------------------------------------------

interface IYFinanceProvider {
  getHistoricalPrices(
    symbol: string,
    period?: string,
    interval?: string,
  ): Promise<DailyPriceRecord[]>;
}

interface IYFinanceBatchProvider {
  ingestBatch(symbols: string[], period?: string): Promise<{
    totalSymbols: number;
    successful: number;
    failed: number;
    rowsIngested: number;
    errors: Array<{ symbol: string; error: string }>;
  }>;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface BackfillSymbolResult {
  symbol: string;
  rowsInserted: number;
  range: string;
  durationMs: number;
}

export interface BackfillUniverseResult {
  totalSymbols: number;
  successful: number;
  failed: number;
  totalRows: number;
  errors: Array<{ symbol: string; error: string }>;
}

export interface ExistingDataInfo {
  earliestDate: string | null;
  latestDate: string | null;
  rowCount: number;
}

// ---------------------------------------------------------------------------
// HistoricalPriceBackfill
// ---------------------------------------------------------------------------

export class HistoricalPriceBackfill {
  private readonly provider: IYFinanceProvider;
  private readonly batchProvider: IYFinanceBatchProvider;

  /**
   * @param provider      — Single-symbol YFinance provider (implements MarketDataProvider).
   * @param batchProvider — Batch ingestion provider for efficient multi-symbol backfill.
   */
  constructor(provider: IYFinanceProvider, batchProvider: IYFinanceBatchProvider) {
    this.provider = provider;
    this.batchProvider = batchProvider;
  }

  // -----------------------------------------------------------------------
  // backfillSymbol
  // -----------------------------------------------------------------------

  /**
   * Backfill historical price data for a single symbol.
   *
   * The symbol can be a raw ticker (e.g. "RELIANCE") or a Yahoo-style
   * symbol (e.g. "RELIANCE.NS"). Raw symbols are resolved via
   * {@link IndianSymbolMapper.resolveSymbol}.
   *
   * @param symbol — Raw or Yahoo-format symbol.
   * @param range  — Pre-defined backfill range label (1D through Max).
   * @returns Result with symbol, rows inserted, range, and wall-clock duration.
   */
  async backfillSymbol(
    symbol: string,
    range: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'Max',
  ): Promise<BackfillSymbolResult> {
    const start = Date.now();

    const yahooSymbol = IndianSymbolMapper.resolveSymbol(symbol);

    // Determine the period string expected by yfinance
    const period = HistoricalPriceBackfill.rangeToPeriod(range);

    // Fetch from provider — returns already-mapped DailyPriceRecord[]
    const records = await this.provider.getHistoricalPrices(yahooSymbol, period, '1d');

    const rowsInserted = await this.insertDailyPrices(records);

    return {
      symbol: yahooSymbol,
      rowsInserted,
      range,
      durationMs: Date.now() - start,
    };
  }

  // -----------------------------------------------------------------------
  // backfillUniverse
  // -----------------------------------------------------------------------

  /**
   * Backfill an entire universe (NIFTY50 / NIFTY100 / NIFTY500) using the
   * batch provider for efficiency.
   *
   * @param universe — Which NIFTY basket to backfill.
   * @param range    — Pre-defined backfill range label.
   * @returns Aggregated result across all symbols in the universe.
   */
  async backfillUniverse(
    universe: 'NIFTY50' | 'NIFTY100' | 'NIFTY500',
    range: string,
  ): Promise<BackfillUniverseResult> {
    const symbols = IndianSymbolMapper.getUniverse(universe);

    const period = HistoricalPriceBackfill.rangeToPeriod(range as BackfillRange['label']);

    const batchResult = await this.batchProvider.ingestBatch(symbols, period);

    return {
      totalSymbols: batchResult.totalSymbols,
      successful: batchResult.successful,
      failed: batchResult.failed,
      totalRows: batchResult.rowsIngested,
      errors: batchResult.errors,
    };
  }

  // -----------------------------------------------------------------------
  // insertDailyPrices
  // -----------------------------------------------------------------------

  /**
   * INSERT OR IGNORE a batch of {@link DailyPriceRecord} rows into the
   * `daily_prices` table.
   *
   * Columns written:
   *   symbol | date | open | high | low | close | adj_close | volume |
   *   dividends | stock_splits | source | quality_score | ingested_at
   *
   * @param records — Array of records conforming to DailyPriceRecord.
   * @returns Number of rows actually inserted (ignoring duplicates).
   */
  async insertDailyPrices(records: DailyPriceRecord[]): Promise<number> {
    if (records.length === 0) return 0;

    // Build a multi-row INSERT … ON CONFLICT DO NOTHING so we never
    // overwrite existing data during a backfill run.
    const columns = [
      'symbol',
      'date',
      'open',
      'high',
      'low',
      'close',
      'adj_close',
      'volume',
      'dividends',
      'stock_splits',
      'source',
      'quality_score',
      'ingested_at',
    ];

    const placeholders: string[] = [];
    const values: any[] = [];
    let i = 0;

    for (const r of records) {
      const base = i * columns.length;
      placeholders.push(
        `(${columns.map((_, j) => `$${base + j + 1}`).join(', ')})`,
      );
      values.push(
        r.symbol,
        r.date,
        r.open,
        r.high,
        r.low,
        r.close,
        r.adj_close,
        r.volume,
        r.dividends,
        r.stock_splits,
        r.source,
        r.quality_score,
        r.ingested_at,
      );
      i++;
    }

    const sql = `
      INSERT INTO daily_prices (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (symbol, date) DO NOTHING
    `;

    const result = await query(sql, values);
    return result.rowCount ?? 0;
  }

  // -----------------------------------------------------------------------
  // checkExistingData
  // -----------------------------------------------------------------------

  /**
   * Inspect the `daily_prices` table for existing data about a symbol.
   *
   * @param symbol — Raw or Yahoo-format symbol.
   * @returns Earliest date, latest date, and total row count for the symbol.
   */
  async checkExistingData(symbol: string): Promise<ExistingDataInfo> {
    const yahooSymbol = IndianSymbolMapper.resolveSymbol(symbol);

    const result = await query(
      `
        SELECT
          MIN(date) AS earliest_date,
          MAX(date) AS latest_date,
          COUNT(*)  AS row_count
        FROM daily_prices
        WHERE symbol = $1
      `,
      [yahooSymbol],
    );

    const row = result.rows?.[0] ?? {};

    return {
      earliestDate: row.earliest_date ?? null,
      latestDate: row.latest_date ?? null,
      rowCount: typeof row.row_count === 'number' ? row.row_count : Number(row.row_count ?? 0),
    };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Map a human-friendly range label to the `period` string used by the
   * yfinance library's `download()` / `history()` methods.
   *
   * Valid period strings: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
   */
  private static rangeToPeriod(range: BackfillRange['label']): string {
    switch (range) {
      case '1D':
        return '1d';
      case '1W':
        return '5d';
      case '1M':
        return '1mo';
      case '3M':
        return '3mo';
      case '6M':
        return '6mo';
      case '1Y':
        return '1y';
      case '5Y':
        return '5y';
      case 'Max':
        return 'max';
      default:
        return '1y';
    }
  }
}

export default HistoricalPriceBackfill;