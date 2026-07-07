import { MasterCompanyRegistry } from '../../services/data/MasterCompanyRegistry';
import { DataIntegrityEngine } from '../../services/data/DataIntegrityEngine';

describe('Security Master V2 Data Quality & Validation Tests', () => {
  const registry = MasterCompanyRegistry.getInstance();
  const integrity = new DataIntegrityEngine();

  it('contains no duplicate symbols', () => {
    const symbols = registry.getAllSymbols();
    const uniqueSymbols = new Set(symbols.map(s => s.toUpperCase()));
    expect(symbols.length).toBe(uniqueSymbols.size);
  });

  it('contains no duplicate ISINs among verified entries', () => {
    const entries = registry.getAllEntries();
    const isins = entries.map(e => e.isin).filter((isin): isin is string => !!isin);
    const uniqueIsins = new Set(isins.map(i => i.toUpperCase()));
    expect(isins.length).toBe(uniqueIsins.size);
  });

  it('contains no blank sectors', () => {
    const entries = registry.getAllEntries();
    entries.forEach(entry => {
      expect(entry.sector).toBeDefined();
      expect(entry.sector.trim().length).toBeGreaterThan(0);
    });
  });

  it('contains no blank industries', () => {
    const entries = registry.getAllEntries();
    entries.forEach(entry => {
      expect(entry.industry).toBeDefined();
      expect(entry.industry.trim().length).toBeGreaterThan(0);
    });
  });

  it('contains no invalid exchanges', () => {
    const entries = registry.getAllEntries();
    entries.forEach(entry => {
      expect(entry.exchange).toBeDefined();
      const norm = integrity.normaliseExchange(entry.exchange);
      expect(['PSE', 'PSE']).toContain(norm);
    });
  });
});
