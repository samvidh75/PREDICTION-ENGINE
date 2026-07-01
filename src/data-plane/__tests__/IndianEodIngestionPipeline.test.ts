import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndianEodIngestionPipeline } from '../ingestion/IndianEodIngestionPipeline';
import type { EodDataCacheLike, RawCandleInput } from '../ingestion/IndianEodIngestionPipeline';
import type { IndianSymbolResolver, SymbolResolutionResult } from '../symbols/IndianSymbolResolver';
import type { IndianEquitySymbol } from '../symbols/IndianEquitySymbol';
import type { EodIngestionBatch } from '../ingestion/IndianEodIngestionTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSymbol(canonicalSymbol: string): IndianEquitySymbol & { canonicalSymbol: string } {
  return {
    canonicalSymbol,
    exchange: 'NSE',
    segment: 'EQ',
    isin: '',
    companyName: '',
    sector: null,
    industry: null,
    listingStatus: 'active',
    aliases: [canonicalSymbol, `${canonicalSymbol}.NS`, `${canonicalSymbol}-EQ`],
    bseCode: null,
    nseSymbol: canonicalSymbol,
    faceValue: null,
    marketCapCr: null,
    marketCapCategory: null,
    firstSeenAt: Date.now() - 3600 * 1000,
    lastSeenAt: Date.now(),
  };
}

function makeResolver(results: Record<string, SymbolResolutionResult>): IndianSymbolResolver {
  return {
    resolve: vi.fn(async (raw: string) => {
      const norm = raw.replace(/\.(NS|NSE|BO|EQ)$/i, '').toUpperCase();
      return results[norm] ?? results[raw] ?? { status: 'not_found', symbol: null };
    }),
    resolveByIsin: vi.fn(async () => null),
    resolveByBseCode: vi.fn(async () => null),
    listActive: vi.fn(async () => []),
  };
}

function makeCache(): EodDataCacheLike {
  return { get: vi.fn(async () => null), set: vi.fn(async () => {}) };
}

function makeBatch(tradeDate = '2026-06-17'): EodIngestionBatch {
  return {
    batchId: crypto.randomUUID(),
    source: 'nse_bhavcopy',
    tradeDate,
    count: 0,
    createdAt: new Date().toISOString(),
    label: `test-${tradeDate}`,
  };
}

function candleInput(ticker: string, overrides: Partial<RawCandleInput> = {}): RawCandleInput {
  return { ticker, open: 2500, high: 2550, low: 2480, close: 2540, volume: 5_000_000, ...overrides };
}

const RESOLVABLE = 'RELIANCE';
const UNRESOLVED = 'UNKNOWN123';

describe('IndianEodIngestionPipeline', () => {
  let resolver: IndianSymbolResolver;
  let cache: EodDataCacheLike;
  let pipeline: IndianEodIngestionPipeline;

  beforeEach(() => {
    resolver = makeResolver({
      [RESOLVABLE]: { status: 'exact' as const, symbol: makeSymbol(RESOLVABLE) as IndianEquitySymbol },
    });
    cache = makeCache();
    pipeline = new IndianEodIngestionPipeline(resolver, cache);
  });

  it('processes valid candles through the pipeline', async () => {
    const inputs = [candleInput(RESOLVABLE)];
    const result = await pipeline.ingest(makeBatch(), inputs);
    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(0);
    expect(result.duplicates).toBe(0);
  });

  it('caches accepted candles to EodDataCacheService', async () => {
    const inputs = [candleInput(RESOLVABLE)];
    await pipeline.ingest(makeBatch(), inputs);

    expect(cache.set).toHaveBeenCalledTimes(1);
    const [namespace, key] = (cache.set as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(key).toContain(RESOLVABLE);
    expect(key).toContain('2026-06-17');
  });

  it('rejects unresolvable symbols', async () => {
    const inputs = [candleInput(UNRESOLVED)];
    const result = await pipeline.ingest(makeBatch(), inputs);
    expect(result.rejected).toBe(1);
    expect(result.accepted).toBe(0);
  });

  it('rejects invalid candle data (negative price)', async () => {
    const inputs = [candleInput(RESOLVABLE, { open: -100, high: 100, low: -100, close: 50, volume: 0 })];
    const result = await pipeline.ingest(makeBatch(), inputs);
    expect(result.rejected).toBe(1);
    expect(result.accepted).toBe(0);
  });

  it('handles mixed batch (some accepted, some rejected)', async () => {
    const inputs = [
      candleInput(RESOLVABLE),
      candleInput(UNRESOLVED),
      candleInput(RESOLVABLE, { open: -1, high: -1, low: -1, close: -1, volume: 0 }),
    ];
    const result = await pipeline.ingest(makeBatch(), inputs);
    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(2);
    expect(result.duplicates).toBe(0);
  });

  it('deduplicates candles already in cache', async () => {
    // First call: cache miss → accepted
    const inputs = [candleInput(RESOLVABLE)];
    const r1 = await pipeline.ingest(makeBatch(), inputs);
    expect(r1.accepted).toBe(1);
    expect(r1.duplicates).toBe(0);

    // Second call: cache hit → duplicate
    (cache.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ close: 2540 });
    const r2 = await pipeline.ingest(makeBatch(), inputs);
    expect(r2.accepted).toBe(0);
    expect(r2.duplicates).toBe(1);
  });

  it('returns sample rejection reasons for rejected candles', async () => {
    const inputs = [candleInput(UNRESOLVED)];
    const result = await pipeline.ingest(makeBatch(), inputs);
    expect(result.sampleRejections.length).toBeGreaterThan(0);
    expect(result.sampleRejections[0]).toContain(UNRESOLVED);
  });

  it('tracks durationMs in result', async () => {
    const inputs = [candleInput(RESOLVABLE)];
    const result = await pipeline.ingest(makeBatch(), inputs);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns batch descriptor in result', async () => {
    const batch = makeBatch('2026-06-17');
    const inputs = [candleInput(RESOLVABLE)];
    const result = await pipeline.ingest(batch, inputs);
    expect(result.batch.batchId).toBe(batch.batchId);
    expect(result.batch.tradeDate).toBe('2026-06-17');
    expect(result.batch.source).toBe('nse_bhavcopy');
  });

  it('createTaskRecord produces valid task record', async () => {
    const startedAt = new Date().toISOString();
    const record = await pipeline.createTaskRecord({
      source: 'nse_bhavcopy',
      tradeDate: '2026-06-17',
      startedAt,
      status: 'running',
      accepted: 5,
      rejected: 0,
    });
    expect(record.taskId).toBeDefined();
    expect(record.source).toBe('nse_bhavcopy');
    expect(record.status).toBe('running');
    expect(record.accepted).toBe(5);
  });
});
