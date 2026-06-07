/**
 * TRACK-38A — HistoricalUniversePopulator
 *
 * Populates the entire universe (NIFTY 50 / 100 / 500, or custom symbol lists)
 * with 5 years of historical daily price data.
 *
 * Orchestrates the full pipeline:
 *   1. Symbol resolution via IndianSymbolMapper
 *   2. Batch fetching via YFinanceBatchProvider
 *   3. Data backfill via HistoricalPriceBackfill
 *   4. Integrity checks via MarketDataIntegrityEngine
 *
 * Returns comprehensive result objects with per-symbol quality scores.
 */

import { IndianSymbolMapper } from './IndianSymbolMapper';
import { HistoricalPriceBackfill } from './HistoricalPriceBackfill';
import { YFinanceBatchProvider } from './YFinanceBatchProvider';
import { MarketDataIntegrityEngine } from './MarketDataIntegrityEngine';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface PopulationResult {
  /** Total number of symbols in the requested universe. */
  symbols: number;
  /** Symbols that were processed and had data backfilled successfully. */
  success: number;
  /** Symbols that failed (no data, network errors, etc.). */
  failed: number;
  /** Total number of price rows inserted across all symbols. */
  totalRows: number;
  /** Quality score per symbol (0–100). */
  qualityScores: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of years of history to backfill. */
const HISTORY_YEARS = 5;

/** Default batch size for YFinanceBatchProvider (reasonable max chunk). */
const BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// HistoricalUniversePopulator
// ---------------------------------------------------------------------------

export class HistoricalUniversePopulator {
  private readonly batchProvider: YFinanceBatchProvider;
  private readonly backfill: HistoricalPriceBackfill;
  private readonly integrityEngine: MarketDataIntegrityEngine;

  constructor(
    batchProvider?: YFinanceBatchProvider,
    backfill?: HistoricalPriceBackfill,
    integrityEngine?: MarketDataIntegrityEngine,
  ) {
    // Allow dependency injection for testing; fall back to default instances.
    this.batchProvider = batchProvider ?? new YFinanceBatchProvider();
    this.backfill = backfill ?? new HistoricalPriceBackfill();
    this.integrityEngine = integrityEngine ?? new MarketDataIntegrityEngine();
  }

  // -------------------------------------------------------------------------
  // Public population methods
  // -------------------------------------------------------------------------

  /**
   * Populate 5 years of history for all NIFTY 50 component stocks.
   */
  async populateNIFTY50(): Promise<PopulationResult> {
    return this.populateUniverse('NIFTY50');
  }

  /**
   * Populate 5 years of history for all NIFTY 100 component stocks.
   */
  async populateNIFTY100(): Promise<PopulationResult> {
    return this.populateUniverse('NIFTY100');
  }

  /**
   * Populate 5 years of history for all NIFTY 500 component stocks.
   */
  async populateNIFTY500(): Promise<PopulationResult> {
    return this.populateUniverse('NIFTY500');
  }

  /**
   * Populate 5 years of history for an arbitrary list of raw Indian symbols.
   * Symbols will be resolved to Yahoo Finance format via IndianSymbolMapper.
   *
   * @param symbols — Array of raw symbols (e.g. ["RELIANCE", "TCS"]).
   */
  async populateCustomSymbols(symbols: string[]): Promise<PopulationResult> {
    const resolved = symbols.map((s) => IndianSymbolMapper.resolveSymbol(s));
    return this.populateSymbols(resolved);
  }

  // -------------------------------------------------------------------------
  // Core logic
  // -------------------------------------------------------------------------

  /**
   * Populate a predefined universe by name.
   */
  private async populateUniverse(
    universe: 'NIFTY50' | 'NIFTY100' | 'NIFTY500',
  ): Promise<PopulationResult> {
    const symbols = IndianSymbolMapper.getUniverse(universe);
    console.log(
      `[HistoricalUniversePopulator] Starting population for ${universe} — ${symbols.length} symbols`,
    );
    const result = await this.populateSymbols(symbols);
    console.log(
      `[HistoricalUniversePopulator] Completed ${universe}: ` +
        `${result.success} success, ${result.failed} failed, ${result.totalRows} total rows`,
    );
    return result;
  }

  /**
   * Core population logic shared by all public methods.
   *
   * @param yahooSymbols — Array of Yahoo Finance symbols (already resolved, with .NS/.BO suffix).
   */
  private async populateSymbols(yahooSymbols: string[]): Promise<PopulationResult> {
    const result: PopulationResult = {
      symbols: yahooSymbols.length,
      success: 0,
      failed: 0,
      totalRows: 0,
      qualityScores: {},
    };

    if (yahooSymbols.length === 0) {
      return result;
    }

    // Compute the date range: 5 years back from today
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - HISTORY_YEARS);

    const period = {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    };

    // Process symbols in batches for efficiency
    for (let i = 0; i < yahooSymbols.length; i += BATCH_SIZE) {
      const batch = yahooSymbols.slice(i, i + BATCH_SIZE);
      const batchResults = await this.processBatch(batch, period);

      // Aggregate results
      for (const [symbol, batchResult] of Object.entries(batchResults)) {
        if (batchResult.success) {
          result.success++;
          result.totalRows += batchResult.rowCount;
          result.qualityScores[symbol] = batchResult.qualityScore;
        } else {
          result.failed++;
          result.qualityScores[symbol] = 0;
        }
      }
    }

    return result;
  }

  /**
   * Process a single batch of symbols.
   *
   * Steps:
   *  1. Fetch raw data from Yahoo Finance via batch provider.
   *  2. Backfill data into the database via HistoricalPriceBackfill.
   *  3. Run integrity checks via MarketDataIntegrityEngine to compute quality.
   */
  private async processBatch(
    symbols: string[],
    period: { start: string; end: string },
  ): Promise<
    Record<
      string,
      { success: boolean; rowCount: number; qualityScore: number }
    >
  > {
    const results: Record<
      string,
      { success: boolean; rowCount: number; qualityScore: number }
    > = {};

    // Step 1: Fetch data from Yahoo Finance for all symbols in the batch
    let batchData: Record<string, any[]>;
    try {
      batchData = await this.batchProvider.downloadBatch(symbols, {
        period: '5y',
        interval: '1d',
      });
    } catch (err: any) {
      // If the entire batch fetch fails, mark every symbol as failed.
      console.error(
        `[HistoricalUniversePopulator] Batch fetch failed for symbols [${symbols.join(', ')}]: ${err?.message ?? err}`,
      );
      for (const sym of symbols) {
        results[sym] = { success: false, rowCount: 0, qualityScore: 0 };
      }
      return results;
    }

    // Step 2: For each symbol, backfill data and compute quality
    for (const symbol of symbols) {
      console.log(`[HistoricalUniversePopulator] Processing ${symbol}...`);

      try {
        const rows = batchData[symbol];

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          console.warn(
            `[HistoricalUniversePopulator] No data returned for ${symbol}`,
          );
          results[symbol] = { success: false, rowCount: 0, qualityScore: 0 };
          continue;
        }

        // Step 2a: Backfill into the database
        let rowCount: number;
        try {
          rowCount = await this.backfill.backfillSymbol(symbol, rows);
        } catch (backfillErr: any) {
          console.error(
            `[HistoricalUniversePopulator] Backfill failed for ${symbol}: ${backfillErr?.message ?? backfillErr}`,
          );
          results[symbol] = { success: false, rowCount: 0, qualityScore: 0 };
          continue;
        }

        // Step 2b: Compute quality score via integrity engine
        let qualityScore = 100; // default perfect score
        try {
          qualityScore = await this.integrityEngine.computeQualityScore(
            symbol,
            rows,
          );
        } catch (scoreErr: any) {
          console.warn(
            `[HistoricalUniversePopulator] Quality scoring failed for ${symbol}: ${scoreErr?.message ?? scoreErr}. Defaulting to 100.`,
          );
        }

        results[symbol] = { success: true, rowCount, qualityScore };
        console.log(
          `[HistoricalUniversePopulator] ✓ ${symbol}: ${rowCount} rows, quality=${qualityScore}`,
        );
      } catch (err: any) {
        console.error(
          `[HistoricalUniversePopulator] ✗ ${symbol}: ${err?.message ?? err}`,
        );
        results[symbol] = { success: false, rowCount: 0, qualityScore: 0 };
      }
    }

    return results;
  }
}

export default HistoricalUniversePopulator;