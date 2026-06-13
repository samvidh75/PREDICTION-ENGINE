import { describe, expect, it } from 'vitest';
import { serializeCostBasisPositions } from './PortfolioDoctor';

describe('serializeCostBasisPositions', () => {
  it('serializes normalized positive weights for the portfolio intelligence route', () => {
    expect(serializeCostBasisPositions([
      { symbol: 'reliance', weight: 0.25, costBasis: 1000 },
      { symbol: 'INFY', weight: 0.75, costBasis: 3000 },
    ])).toBe('RELIANCE:0.25000000,INFY:0.75000000');
  });

  it('omits invalid positions rather than sending malformed weights', () => {
    expect(serializeCostBasisPositions([
      { symbol: 'RELIANCE', weight: 0, costBasis: 1000 },
      { symbol: '', weight: 1, costBasis: 1000 },
      { symbol: 'INFY', weight: Number.NaN, costBasis: 1000 },
    ])).toBe('');
  });
});
