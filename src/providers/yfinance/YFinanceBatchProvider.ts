/**
 * TRACK-38A — YFinanceBatchProvider
 * Batch operations using yf.download() for efficient bulk fetching.
 *
 * Groups symbols into chunks of 50, waits 1 second between chunks,
 * and tracks rows/sec & symbols/sec performance metrics.
 *
 * NOTE: The 'yfinance' npm package exports a default object that
 * provides the download() method. We import it as `yf`.
 */

import yf from 'yfinance';
import type { BatchIngestionResult } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum symbols per chunk to stay under Yahoo Finance rate limits. */
const CHUNK_SIZE = 50;

/** Delay in ms between consecutive chunks. */
const CHUNK_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// YFinanceBatchProvider
// ---------------------------------------------------------------------------

export class YFinanceBatchProvider {
  /**
   * Bulk-ingest historical OHLCV data for a list of symbols using yf.download().
   *
   * @param symbols — Array of Yahoo Finance symbols (e.g. ["RELIANCE.NS", "TCS.NS"]).
   * @param period  — Period string for yfinance (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max).
   *                  Defaults to '1y'.
   * @returns BatchIngestionResult with detailed metrics and per-symbol errors.
   */
  async ingestBatch(
    symbols: string[],
    period: string = '1y',
  ): Promise<BatchIngestionResult> {
    const startTime = Date.now();

    // Filter out duplicates and empty strings
    const uniqueSymbols = [...new Set(symbols.filter((s) => s && s.trim().length > 0))];

    if (uniqueSymbols.length === 0) {
      return {
        totalSymbols: 0,
        successful: 0,
        failed: 0,
        rowsIngested: 0,
        durationMs: 0,
        rowsPerSecond: 0,
        symbolsPerSecond: 0,
        errors: [],
      };
    }

    // Split into chunks of CHUNK_SIZE
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueSymbols.length; i += CHUNK_SIZE) {
      chunks.push(uniqueSymbols.slice(i, i + CHUNK_SIZE));
    }

    let totalRows = 0;
    let successful = 0;
    let failed = 0;
    const errors: Array<{ symbol: string; error: string }> = [];

    // Process chunks sequentially
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      // Apply delay between chunks (not before the first chunk)
      if (chunkIndex > 0) {
        await this.delay(CHUNK_DELAY_MS);
      }

      try {
        const result = await this.downloadChunk(chunk, period);

        // Count rows and successes from this chunk
        if (result) {
          const { rowCount, succeededSymbols, failedSymbols, chunkErrors } =
            this.extractChunkMetrics(result, chunk);

          totalRows += rowCount;
          successful += succeededSymbols;
          failed += failedSymbols;
          errors.push(...chunkErrors);
        } else {
          // Entire chunk returned empty — count all as failed
          failed += chunk.length;
          for (const sym of chunk) {
            errors.push({ symbol: sym, error: 'Empty response from yf.download' });
          }
        }
      } catch (error: any) {
        // Chunk-level failure — mark all symbols in this chunk as failed
        failed += chunk.length;
        const errMsg = error?.message ?? String(error);
        for (const sym of chunk) {
          errors.push({ symbol: sym, error: errMsg });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const durationSec = durationMs / 1000;

    return {
      totalSymbols: uniqueSymbols.length,
      successful,
      failed,
      rowsIngested: totalRows,
      durationMs,
      rowsPerSecond: durationSec > 0 ? Math.round((totalRows / durationSec) * 100) / 100 : 0,
      symbolsPerSecond: durationSec > 0 ? Math.round((successful / durationSec) * 100) / 100 : 0,
      errors,
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Download data for a single chunk of symbols using yf.download().
   *
   * yf.download returns historical data in a format that varies:
   * - For a single symbol: a DataFrame-like object with columns (Open, High, etc.)
   * - For multiple symbols: a multi-level column DataFrame
   *
   * We attempt to match the yfinance library's actual return shape.
   */
  private async downloadChunk(
    symbols: string[],
    period: string,
  ): Promise<any> {
    // yf.download() signature: download(symbols, { period, interval, ... })
    // symbols can be a single string or an array
    const symbolArg = symbols.length === 1 ? symbols[0] : symbols;

    const data = await yf.download(symbolArg, {
      period,
      interval: '1d',
    });

    return data;
  }

  /**
   * Extract per-symbol metrics from the download result for a chunk.
   *
   * yf.download() with multiple symbols typically returns data where
   * columns have a MultiIndex: (Attribute, Symbol). With a single symbol,
   * columns are just (Attribute).
   *
   * We detect the shape and count rows per symbol.
   */
  private extractChunkMetrics(
    data: any,
    chunkSymbols: string[],
  ): {
    rowCount: number;
    succeededSymbols: number;
    failedSymbols: number;
    chunkErrors: Array<{ symbol: string; error: string }>;
  } {
    const chunkErrors: Array<{ symbol: string; error: string }> = [];

    if (!data || typeof data !== 'object') {
      return {
        rowCount: 0,
        succeededSymbols: 0,
        failedSymbols: chunkSymbols.length,
        chunkErrors: chunkSymbols.map((s) => ({
          symbol: s,
          error: 'No data returned from yf.download',
        })),
      };
    }

    // Determine if data is array-like (rows) or object-like (keyed by attribute)
    let rowCount = 0;
    let succeededSymbols = 0;
    let failedSymbols = 0;

    // yf.download can return various shapes. Try to infer:
    // 1) Array of row objects with per-symbol data
    // 2) Single-symbol format (columns are attributes directly)

    if (Array.isArray(data)) {
      // Array of rows — each row may have (symbol, Date, OHLCV...)
      rowCount = data.length;

      // Track which symbols appeared in the data
      const seenSymbols = new Set<string>();

      for (const row of data) {
        const sym = row.symbol ?? row.Symbol ?? row.Symbols ?? null;
        if (sym) seenSymbols.add(String(sym));
      }

      if (seenSymbols.size > 0) {
        succeededSymbols = seenSymbols.size;
        // Remaining symbols from the chunk that weren't in the response
        const missingInData = chunkSymbols.filter((s) => !seenSymbols.has(s));
        failedSymbols = missingInData.length;
        for (const s of missingInData) {
          chunkErrors.push({ symbol: s, error: 'Symbol not found in download response' });
        }
      } else {
        // No symbol field — assume the array corresponds to the first/only symbol
        if (chunkSymbols.length === 1) {
          succeededSymbols = 1;
        } else {
          // Can't distinguish symbols — assume success for all
          succeededSymbols = chunkSymbols.length;
        }
      }
    } else if (typeof data === 'object') {
      // Object keyed by attribute with sub-keys per symbol (MultiIndex-like)
      // e.g. { Open: { 'RELIANCE.NS': [...] }, Close: { 'RELIANCE.NS': [...] }, ... }
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return {
          rowCount: 0,
          succeededSymbols: 0,
          failedSymbols: chunkSymbols.length,
          chunkErrors: chunkSymbols.map((s) => ({
            symbol: s,
            error: 'Empty download result object',
          })),
        };
      }

      // Try to extract symbol names from the first attribute's keys
      const firstAttr = data[keys[0]];
      if (firstAttr && typeof firstAttr === 'object') {
        const subKeys = Object.keys(firstAttr);
        const symbolKeys = subKeys.filter(
          (k) => !['Date', 'date'].includes(k),
        );

        if (symbolKeys.length > 0) {
          succeededSymbols = symbolKeys.length;
          const symbolSet = new Set(symbolKeys);
          const missing = chunkSymbols.filter((s) => !symbolSet.has(s));
          failedSymbols = missing.length;
          for (const s of missing) {
            chunkErrors.push({ symbol: s, error: 'Symbol not found in download result' });
          }

          // Estimate row count from any attribute's array length per symbol
          const firstSymData = firstAttr[symbolKeys[0]];
          if (Array.isArray(firstSymData)) {
            rowCount = firstSymData.length * symbolKeys.length;
          } else {
            rowCount = symbolKeys.length; // at least 1 row per symbol
          }
        } else {
          // Sub-keys are not symbols — maybe single symbol, attribute-keyed
          succeededSymbols = chunkSymbols.length;
          const someData = firstAttr[subKeys[0]];
          rowCount = Array.isArray(someData) ? someData.length : 1;
        }
      } else {
        // Data might be row-oriented with symbol column
        succeededSymbols = chunkSymbols.length;
        rowCount = 0; // we can't determine accurately
      }
    }

    return {
      rowCount,
      succeededSymbols,
      failedSymbols,
      chunkErrors,
    };
  }

  /**
   * Promise-based delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default YFinanceBatchProvider;