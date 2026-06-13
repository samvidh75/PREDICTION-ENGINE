import { describe, expect, it } from 'vitest';
import { DataIntegrityEngine } from './DataIntegrityEngine';

describe('DataIntegrityEngine exchange normalization', () => {
  const integrity = new DataIntegrityEngine();

  it('preserves unavailable exchange values instead of defaulting to NSE', () => {
    expect(integrity.normaliseExchange()).toBeUndefined();
    expect(integrity.normaliseExchange('')).toBeUndefined();
    expect(integrity.normaliseExchange('nasdaq')).toBeUndefined();
    expect(integrity.normaliseExchange('unknown-market')).toBeUndefined();
    expect(integrity.formatExchange('')).toBe('Data unavailable');
  });

  it('normalizes known NSE and BSE aliases only', () => {
    expect(integrity.normaliseExchange('NSE')).toBe('NSE');
    expect(integrity.normaliseExchange('nsedata')).toBe('NSE');
    expect(integrity.normaliseExchange('BSE')).toBe('BSE');
    expect(integrity.normaliseExchange('bsesme')).toBe('BSE');
  });

  it('keeps missing exchange unavailable during metadata normalization', () => {
    const normalized = integrity.normalise({
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Ltd',
      sector: 'Energy',
      industry: 'Oil & Gas',
      marketCap: 1,
    });

    expect(normalized.exchange).toBeUndefined();
  });
});
