import { describe, expect, it } from 'vitest';
import { SECTOR_UNAVAILABLE } from './PortfolioEngine';
import { buildPortfolioReview } from './PortfolioReviewEngine';

const holdings = [
  { symbol: 'RELIANCE', shares: 10, avgBuyPrice: 100, sector: 'Energy' },
  { symbol: 'INFY', shares: 10, avgBuyPrice: 300, sector: SECTOR_UNAVAILABLE },
];

describe('buildPortfolioReview', () => {
  it('withholds total live value and return when any quote is missing', () => {
    const review = buildPortfolioReview(holdings, { RELIANCE: 120 });

    expect(review.availability).toBe('partial');
    expect(review.totalCostBasis).toBe(4000);
    expect(review.coveredMarketValue).toBe(1200);
    expect(review.livePortfolioValue).toBeNull();
    expect(review.totalGainLossPct).toBeNull();
    expect(review.quoteCoverage).toEqual({
      coveredPositions: 1,
      totalPositions: 2,
      coveragePct: 50,
      missingSymbols: ['INFY'],
    });
    expect(review.reviewQueue.map((item) => item.id)).toEqual(expect.arrayContaining([
      'missing-quote:INFY',
      'missing-sector:INFY',
      'concentration:INFY',
    ]));
  });

  it('emits live portfolio performance only when every position has a quote', () => {
    const review = buildPortfolioReview(holdings, { RELIANCE: 120, INFY: 330 });

    expect(review.availability).toBe('real');
    expect(review.livePortfolioValue).toBe(4500);
    expect(review.totalGainLossAmount).toBe(500);
    expect(review.totalGainLossPct).toBe(12.5);
  });

  it('uses recorded cost basis for concentration and sector exposure', () => {
    const review = buildPortfolioReview(holdings, {});

    expect(review.concentration.largestPosition).toEqual({ symbol: 'INFY', weightPct: 75 });
    expect(review.concentration.topThreeWeightPct).toBe(100);
    expect(review.concentration.sectorExposure).toEqual([
      { sector: SECTOR_UNAVAILABLE, costBasis: 3000, weightPct: 75 },
      { sector: 'Energy', costBasis: 1000, weightPct: 25 },
    ]);
  });

  it('returns unavailable for an empty portfolio', () => {
    const review = buildPortfolioReview([], {});
    expect(review.availability).toBe('unavailable');
    expect(review.livePortfolioValue).toBeNull();
    expect(review.quoteCoverage.totalPositions).toBe(0);
  });
});
