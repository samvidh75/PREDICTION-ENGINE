import { describe, expect, it } from 'vitest';
import {
  getMapping,
  getDhanSecurityId,
  getUpstoxInstrumentKey,
  getVerifiedSymbols,
  getAllMappings,
  getSymbolByDhanId,
  getSymbolByUpstoxKey,
} from '../../src/providers/instruments/instrumentMap';

describe('instrumentMap', () => {
  describe('verified symbols', () => {
    const symbols = getVerifiedSymbols();

    it('has at least 30 symbols', () => {
      expect(symbols.length).toBeGreaterThanOrEqual(30);
    });

    it('includes key NSE indices', () => {
      expect(symbols).toContain('RELIANCE');
      expect(symbols).toContain('TCS');
      expect(symbols).toContain('INFY');
      expect(symbols).toContain('HDFCBANK');
      expect(symbols).toContain('ICICIBANK');
    });
  });

  describe('mapping lookups', () => {
    it('returns Dhan security_id for RELIANCE', () => {
      const id = getDhanSecurityId('RELIANCE');
      expect(id).toBe('11536');
    });

    it('returns Upstox instrument key for RELIANCE', () => {
      const key = getUpstoxInstrumentKey('RELIANCE');
      expect(key).toBe('NSE_EQ|INE002A01018');
    });

    it('returns null for unknown symbol', () => {
      expect(getDhanSecurityId('UNKNOWN')).toBeNull();
      expect(getUpstoxInstrumentKey('UNKNOWN')).toBeNull();
      expect(getMapping('UNKNOWN')).toBeNull();
    });

    it('returns full mapping for known symbol', () => {
      const mapping = getMapping('TCS');
      expect(mapping).not.toBeNull();
      expect(mapping!.isin).toBe('INE467B01029');
      expect(mapping!.yahooTicker).toBe('TCS.NS');
      expect(mapping!.nseSymbol).toBe('TCS');
      expect(mapping!.mappingSource).toBe('verified');
    });
  });

  describe('reverse lookups', () => {
    it('finds symbol by Dhan security_id', () => {
      expect(getSymbolByDhanId('11536')).toBe('RELIANCE');
    });

    it('finds symbol by Upstox instrument key', () => {
      expect(getSymbolByUpstoxKey('NSE_EQ|INE002A01018')).toBe('RELIANCE');
    });

    it('returns null for unknown Dhan ID', () => {
      expect(getSymbolByDhanId('99999')).toBeNull();
    });
  });

  describe('mapping integrity', () => {
    it('no duplicate Dhan security_ids', () => {
      const ids = getAllMappings().map(m => m.dhanSecurityId).filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('no duplicate Upstox instrument keys', () => {
      const keys = getAllMappings().map(m => m.upstoxInstrumentKey).filter(Boolean);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('all verified symbols have ISIN', () => {
      for (const m of getAllMappings().filter(m => m.mappingSource === 'verified')) {
        expect(m.isin).toBeTruthy();
        expect(m.isin.length).toBeGreaterThanOrEqual(10);
      }
    });

    it('all verified symbols have Yahoo ticker', () => {
      for (const m of getAllMappings()) {
        expect(m.yahooTicker).toMatch(/\.NS$/);
      }
    });
  });
});
