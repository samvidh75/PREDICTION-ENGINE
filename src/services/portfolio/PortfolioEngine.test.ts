import { describe, expect, it } from 'vitest';
import {
  SECTOR_UNAVAILABLE,
  buildCostBasisPositions,
  normalizePortfolioSector,
  normalizeUserHolding,
} from './PortfolioEngine';

describe('PortfolioEngine holding normalization', () => {
  it('keeps missing sectors explicitly unavailable', () => {
    expect(normalizePortfolioSector('')).toBe(SECTOR_UNAVAILABLE);
    expect(normalizePortfolioSector(undefined)).toBe(SECTOR_UNAVAILABLE);
    expect(normalizePortfolioSector('  Banking  ')).toBe('Banking');
  });

  it('rejects invalid holdings instead of persisting impossible rows', () => {
    expect(normalizeUserHolding({ symbol: '', shares: 1, avgBuyPrice: 10 })).toBeNull();
    expect(normalizeUserHolding({ symbol: 'INFY', shares: 0, avgBuyPrice: 10 })).toBeNull();
    expect(normalizeUserHolding({ symbol: 'INFY', shares: 1, avgBuyPrice: -10 })).toBeNull();
  });

  it('normalizes valid holdings without fabricating a sector', () => {
    expect(normalizeUserHolding({ symbol: ' infy ', shares: '2', avgBuyPrice: '1500', sector: '' })).toEqual({
      symbol: 'INFY',
      shares: 2,
      avgBuyPrice: 1500,
      sector: SECTOR_UNAVAILABLE,
    });
  });

  it('builds normalized portfolio doctor weights from recorded cost basis', () => {
    const positions = buildCostBasisPositions([
      { symbol: 'RELIANCE', shares: 10, avgBuyPrice: 100, sector: 'Energy' },
      { symbol: 'INFY', shares: 10, avgBuyPrice: 300, sector: 'Technology' },
    ]);

    expect(positions).toEqual([
      { symbol: 'RELIANCE', costBasis: 1000, weight: 0.25 },
      { symbol: 'INFY', costBasis: 3000, weight: 0.75 },
    ]);
    expect(positions.reduce((sum, position) => sum + position.weight, 0)).toBe(1);
  });
});
