import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndianEodIngestionPipeline } from '../ingestion/IndianEodIngestionPipeline';
import type { EodDataCacheLike, RawCandleInput } from '../ingestion/IndianEodIngestionPipeline';
import type { IndianSymbolResolver } from '../symbols/IndianSymbolResolver';
import type { SymbolResolutionResult } from '../symbols/IndianSymbolResolver';
import type { IndianEodCandle } from '../eod/IndianEodCandle';
import type { IndianEquitySymbol } from '../symbols/IndianEquitySymbol';

// ---------------------------------------------------------------------------
// Mocks
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
    resolveByIsin: vi.fn(async (_isin: string) => null),
    resolveByBseCode: vi.fn(async (_code: string) => null),
    listActive: vi.fn(async () => []),
  };
}

function makeCache(): EodDataCacheLike {
  return {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
  };
}

let resolver: IndianSymbolResolver;
let cache: EodDataCacheLike;
let pipeline: IndianEodIngestionPipeline;

const RESOLVABLE = 'RELIANCE';
const UNRESOLVED = 'UNKNOWN123';

beforeEach(() => {
  resolver = makeResolver({
    [RESOLVABLE]: { status: 'exact' as const, symbol: makeSymbol(RESOLVABLE) as IndianEquitySymbol },
  });
  cache = makeCache();
  pipeline = new IndianEodIngestionPipeline(resolver, cache);
});

describe('IndianEodIngestionPipeline', () => {
  it('processes valid candles through the pipeline', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: RESOLVABLE, date: '2026-06-17', open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000 },
    ];
    const result = await pipeline.ingest(inputs);
    expect(result.totalCandles).toBe(1);
    expect(result.acceptedCandles).toBe(1);
    expect(result.rejectedCandles).toBe(0);
  });

  it('caches accepted candles to EodDataCacheService', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: RESOLVABLE, date: '2026-06-17', open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000 },
    ];
    await pipeline.ingest(inputs);
    expect(cache.set).toHaveBeenCalledTimes(1);
    const [key, value] = (cache.set as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(key).toContain(RESOLVABLE);
    expect(key).toContain('2026-06-17');
    expect(value).toHaveProperty('close', 2540);
  });

  it('rejects unresolvable symbols', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: UNRESOLVED, date: '2026-06-17', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
    ];
    const result = await pipeline.ingest(inputs);
    expect(result.rejectedCandles).toBe(1);
    expect(result.results[0].accepted).toBe(false);
  });

  it('rejects invalid candle data', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: RESOLVABLE, date: '2026-06-17', open: -100, high: 100, low: -100, close: 50, volume: 0 },
    ];
    const result = await pipeline.ingest(inputs);
    expect(result.rejectedCandles).toBe(1);
  });

  it('handles mixed batch (some accepted, some rejected)', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: RESOLVABLE, date: '2026-06-17', open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000 },
      { symbol: UNRESOLVED, date: '2026-06-17', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { symbol: RESOLVABLE, date: '2026-06-17', open: -1, high: -1, low: -1, close: -1, volume: 0 },
    ];
    const result = await pipeline.ingest(inputs);
    expect(result.totalCandles).toBe(3);
    expect(result.acceptedCandles).toBe(1);
    expect(result.rejectedCandles).toBe(2);
  });

  it('deduplicates identical candles within the same batch', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: RESOLVABLE, date: '2026-06-17', open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000 },
      { symbol: RESOLVABLE, date: '2026-06-17', open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000 },
    ];
    const result = await pipeline.ingest(inputs);
    expect(result.totalCandles).toBe(2);
    expect(result.acceptedCandles).toBe(1);
    expect(result.rejectedCandles).toBe(1);
    // Only one set call for the accepted candle
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it('ingestFromCache uses previous results for chain processing', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: RESOLVABLE, date: '2026-06-17', open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000 },
    ];
    const result = await pipeline.ingestFromCache(inputs);
    // ingestFromCache filters to only cache misses, so with no cache data, should process all
    expect(result.totalCandles).toBe(1);
    expect(result.acceptedCandles).toBe(1);
  });

  it('stores result in batchId format', async () => {
    const inputs: RawCandleInput[] = [
      { symbol: RESOLVABLE, date: '2026-06-17', open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000 },
    ];
    const result = await pipeline.ingest(inputs);
    const batchEntry = pipeline.getBatch(result.batchId);
    expect(batchEntry).toBeDefined();
    expect(batchEntry!.batchId).toBe(result.batchId);
  });

  it('getBatch returns undefined for unknown batch', () => {
    expect(pipeline.getBatch('nonexistent')).toBeUndefined();
  });
});
