import { describe, expect, it } from 'vitest';
import { validatePortfolioPositions } from './PortfolioPositionValidator';

describe('validatePortfolioPositions', () => {
  it('rejects empty symbols and non-positive or non-finite weights', () => {
    const result = validatePortfolioPositions([
      { symbol: '', weight: 1 },
      { symbol: 'INFY', weight: 0 },
      { symbol: 'TCS', weight: -1 },
      { symbol: 'HDFCBANK', weight: Number.NaN },
    ]);

    expect(result.positions).toEqual([]);
    expect(result.rejected).toEqual([
      { symbol: '(empty)', reason: 'EMPTY_SYMBOL' },
      { symbol: 'INFY', reason: 'INVALID_WEIGHT' },
      { symbol: 'TCS', reason: 'INVALID_WEIGHT' },
      { symbol: 'HDFCBANK', reason: 'INVALID_WEIGHT' },
    ]);
  });

  it('merges duplicate symbols and normalizes remaining weights', () => {
    const result = validatePortfolioPositions([
      { symbol: ' reliance ', weight: 1 },
      { symbol: 'RELIANCE', weight: 1 },
      { symbol: 'INFY', weight: 2 },
    ]);

    expect(result.rejected).toEqual([]);
    expect(result.positions).toEqual([
      { symbol: 'RELIANCE', weight: 0.5 },
      { symbol: 'INFY', weight: 0.5 },
    ]);
    expect(result.positions.reduce((sum, position) => sum + position.weight, 0)).toBe(1);
  });

  it('keeps valid positions while reporting rejected rows', () => {
    const result = validatePortfolioPositions([
      { symbol: 'INFY', weight: 3 },
      { symbol: 'TCS', weight: 'bad' },
    ]);

    expect(result.positions).toEqual([{ symbol: 'INFY', weight: 1 }]);
    expect(result.rejected).toEqual([{ symbol: 'TCS', reason: 'INVALID_WEIGHT' }]);
  });
});
