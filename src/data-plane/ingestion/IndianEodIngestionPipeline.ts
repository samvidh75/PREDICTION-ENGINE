// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — EOD ingestion pipeline
//
// End-to-end pipeline: source → normalise → resolve → validate → dedupe → store.
// All data is written into EodDataCacheService (L2 DB cache).
// Provider calls are not made during this pipeline — it ingests raw data
// from CSV files / permitted sources.
// ─────────────────────────────────────────────────────────────────────────────

import type { IndianEodCandle } from '../eod/IndianEodCandle';
import { validateEodCandle } from '../eod/IndianEodCandle';
import { normalizeTicker } from '../symbols/IndianSymbolNormalizer';
import type { IndianSymbolResolver } from '../symbols/IndianSymbolResolver';
import type {
  EodIngestionBatch,
  EodIngestionResult,
  IngestionTaskRecord,
} from './IndianEodIngestionTypes';

// ---------------------------------------------------------------------------
// EodDataCacheService compatible interface
// ---------------------------------------------------------------------------

export interface EodDataCacheLike {
  get<T>(namespace: string, key: string): Promise<T | null>;
  set<T>(namespace: string, key: string, value: T, ttlSec?: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class IndianEodIngestionPipeline {
  constructor(
    private readonly resolver: IndianSymbolResolver,
    private readonly cache: EodDataCacheLike,
  ) {}

  /**
   * Process a batch of raw candles through the full pipeline:
   * normalise → resolve → validate → dedupe → store.
   *
   * Returns an ingestion result with counts.
   */
  async ingest(
    batch: EodIngestionBatch,
    rawCandles: RawCandleInput[],
  ): Promise<EodIngestionResult> {
    const startMs = Date.now();
    let accepted = 0;
    let rejected = 0;
    let duplicates = 0;
    const sampleRejections: string[] = [];
    const seenKeys = new Set<string>();

    // Process each candle
    for (const raw of rawCandles) {
      // 1. Normalise the ticker
      const symbol = normalizeTicker(raw.ticker);

      // 2. Resolve to canonical symbol
      const resolution = await this.resolver.resolve(symbol);

      if (!resolution.symbol) {
        rejected++;
        if (sampleRejections.length < 50) {
          sampleRejections.push(`Unresolved symbol: ${raw.ticker} (normalized: ${symbol})`);
        }
        continue;
      }

      // 3. Build IndianEodCandle
      const candle: IndianEodCandle = {
        symbol: resolution.symbol.canonicalSymbol,
        exchange: resolution.symbol.exchange,
        date: batch.tradeDate,
        open: raw.open,
        high: raw.high,
        low: raw.low,
        close: raw.close,
        volume: raw.volume,
        deliveryPct: raw.deliveryPct ?? null,
        unadjustedClose: raw.close,
        dividend: raw.dividend ?? 0,
        splitFactor: raw.splitFactor ?? 1,
      };

      // 4. Validate
      const quality = validateEodCandle(candle, seenKeys);
      if (!quality.valid) {
        rejected++;
        if (sampleRejections.length < 50) {
          const reasons = quality.issues.map(i => i.kind === 'negative_price' ? `${i.field}=${i.value}` : i.kind === 'suspicious_change' ? `${i.field} ${i.pctChange}%` : i.message).join('; ');
          sampleRejections.push(`${candle.symbol}|${candle.date}: ${reasons}`);
        }
        continue;
      }

      // 5. Check for existing data in cache (dedupe)
      const existing = await this.cache.get<IndianEodCandle>('eod_history', `${candle.symbol}:${candle.date}`);
      if (existing) {
        // Candle already stored — skip (could optionally update if newer)
        duplicates++;
        continue;
      }

      // 6. Store in cache
      await this.cache.set('eod_history', `${candle.symbol}:${candle.date}`, candle, 7 * 24 * 3600);
      accepted++;
    }

    return {
      batch,
      accepted,
      rejected,
      duplicates,
      durationMs: Date.now() - startMs,
      sampleRejections,
    };
  }

  /**
   * Create an ingestion task record (for audit log).
   */
  async createTaskRecord(task: Omit<IngestionTaskRecord, 'taskId'> & { taskId?: string }): Promise<IngestionTaskRecord> {
    const record: IngestionTaskRecord = {
      taskId: task.taskId ?? crypto.randomUUID(),
      source: task.source,
      tradeDate: task.tradeDate,
      startedAt: task.startedAt,
      completedAt: task.completedAt ?? null,
      status: task.status,
      accepted: task.accepted,
      rejected: task.rejected,
      error: task.error ?? null,
    };
    // Write to ingestion_log table here (future)
    return record;
  }
}

// ---------------------------------------------------------------------------
// Raw input shape (from CSV / provider)
// ---------------------------------------------------------------------------

/**
 * Raw candle input before normalisation and resolution.
 * This is what CSV parsers / provider adapters return.
 */
export interface RawCandleInput {
  /** Raw ticker (any format — may include .NS, -EQ, NSE:, etc.) */
  ticker: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  deliveryPct?: number;
  dividend?: number;
  splitFactor?: number;
}
