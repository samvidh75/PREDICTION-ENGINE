import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndianSymbolMasterStore } from '../symbols/IndianSymbolMasterStore';
import type { IndianEquitySymbol } from '../symbols/IndianEquitySymbol';

// ---------------------------------------------------------------------------
// The store uses a placeholder runQuery that returns [] — so methods resolve
// to null / 0 / [] instead of throwing.  These tests verify that interface
// contract holds for the placeholder implementation.
// ---------------------------------------------------------------------------

function makeStore(overrides?: Partial<IndianSymbolMasterStore>): IndianSymbolMasterStore {
  const store = new IndianSymbolMasterStore();
  // We're testing the interface shape, not actual DB queries
  return store;
}

describe('IndianSymbolMasterStore', () => {
  const store = makeStore();

  it('implements IndianSymbolMasterStoreLike interface', () => {
    expect(typeof store.upsert).toBe('function');
    expect(typeof store.bulkUpsert).toBe('function');
    expect(typeof store.findBySymbol).toBe('function');
    expect(typeof store.findByAlias).toBe('function');
    expect(typeof store.findByIsin).toBe('function');
    expect(typeof store.findByBseCode).toBe('function');
    expect(typeof store.search).toBe('function');
    expect(typeof store.listActive).toBe('function');
    expect(typeof store.listRetired).toBe('function');
    expect(typeof store.count).toBe('function');
  });

  it('upsert resolves to symbol when not connected to DB', async () => {
    const symbol: IndianEquitySymbol = {
      canonicalSymbol: 'RELIANCE',
      exchange: 'NSE',
      segment: 'EQ',
      isin: 'IN0020200124',
      companyName: 'Reliance Industries Ltd',
      sector: 'Energy',
      industry: 'Oil & Gas',
      listingStatus: 'active',
      aliases: ['RELIANCE', 'RELIANCE.NS'],
      bseCode: '500325',
      nseSymbol: 'RELIANCE',
      faceValue: 10,
      marketCapCr: 1720000,
      marketCapCategory: 'large',
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    const result = await store.upsert(symbol);
    expect(result).toEqual(symbol);
  });

  it('bulkUpsert returns 0 for empty input', async () => {
    const result = await store.bulkUpsert([]);
    expect(result).toBe(0);
  });

  it('findBySymbol returns null when not connected to DB', async () => {
    const result = await store.findBySymbol('RELIANCE');
    expect(result).toBeNull();
  });

  it('findByAlias returns null when not connected to DB', async () => {
    const result = await store.findByAlias('RELIANCE.NS');
    expect(result).toBeNull();
  });

  it('findByIsin returns null when not connected to DB', async () => {
    const result = await store.findByIsin('IN0020200124');
    expect(result).toBeNull();
  });

  it('findByBseCode returns null when not connected to DB', async () => {
    const result = await store.findByBseCode('500325');
    expect(result).toBeNull();
  });

  it('search returns empty array when not connected to DB', async () => {
    const result = await store.search('REL');
    expect(result).toEqual([]);
  });

  it('listActive returns empty array when not connected to DB', async () => {
    const result = await store.listActive();
    expect(result).toEqual([]);
  });

  it('listRetired returns empty array when not connected to DB', async () => {
    const result = await store.listRetired();
    expect(result).toEqual([]);
  });

  it('count returns 0 when not connected to DB', async () => {
    const result = await store.count();
    expect(result).toBe(0);
  });
});
