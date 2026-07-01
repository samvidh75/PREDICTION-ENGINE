import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndianSymbolMasterStore } from '../symbols/IndianSymbolMasterStore';
import type { IndianEquitySymbol } from '../symbols/IndianEquitySymbol';
import type { Database } from 'bun:sqlite';

// ---------------------------------------------------------------------------
// Mock the database
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

  it('upsert throws when not connected to DB', async () => {
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
    await expect(store.upsert(symbol)).rejects.toThrow();
  });

  it('bulkUpsert throws when not connected to DB', async () => {
    await expect(store.bulkUpsert([])).rejects.toThrow();
  });

  it('findBySymbol throws when not connected to DB', async () => {
    await expect(store.findBySymbol('RELIANCE')).rejects.toThrow();
  });

  it('findByAlias throws when not connected to DB', async () => {
    await expect(store.findByAlias('RELIANCE.NS')).rejects.toThrow();
  });

  it('findByIsin throws when not connected to DB', async () => {
    await expect(store.findByIsin('IN0020200124')).rejects.toThrow();
  });

  it('findByBseCode throws when not connected to DB', async () => {
    await expect(store.findByBseCode('500325')).rejects.toThrow();
  });

  it('search throws when not connected to DB', async () => {
    await expect(store.search('REL')).rejects.toThrow();
  });

  it('listActive throws when not connected to DB', async () => {
    await expect(store.listActive()).rejects.toThrow();
  });

  it('listRetired throws when not connected to DB', async () => {
    await expect(store.listRetired()).rejects.toThrow();
  });

  it('count throws when not connected to DB', async () => {
    await expect(store.count()).rejects.toThrow();
  });
});
