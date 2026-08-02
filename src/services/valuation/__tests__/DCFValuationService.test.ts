import { describe, it, expect } from 'vitest';
import { DCFValuationService } from '../DCFValuationService';

const service = new DCFValuationService();

describe('DCFValuationService', () => {
  it('should compute fair value with valid inputs', () => {
    const result = service.compute({
      freeCashFlow: 10000000000,
      fcfGrowthRate: 0.15,
      growthDeclineYears: 10,
      terminalGrowthRate: 0.04,
      discountRate: 0.12,
      netDebt: 50000000000,
      sharesOutstanding: 1000000000,
      cashAndEquivalents: 10000000000,
      marginOfSafety: 0.20,
    }, 2500);

    expect(result.fairValuePerShare).toBeGreaterThan(0);
    expect(result.years.length).toBe(10);
    expect(['undervalued', 'fairly_valued', 'overvalued', 'significantly_undervalued', 'significantly_overvalued']).toContain(result.assessment);
  });

  it('should handle missing data gracefully', () => {
    const result = service.estimateFromFinancials(0, 0, 0, 0, 0, 0, 1, 100);
    expect(result.fairValuePerShare).toBeGreaterThanOrEqual(0);
  });

  it('should return positive equity value for profitable company', () => {
    const result = service.estimateFromFinancials(
      50000000000, 0.2, 0.10, 500000000000, 10000000000, 5000000000, 1000000000, 500,
    );
    expect(result.fairValuePerShare).toBeGreaterThan(0);
    expect(result.equityValue).toBeGreaterThan(0);
  });

  it('should produce correct year structure', () => {
    const result = service.compute({
      freeCashFlow: 10000000000,
      fcfGrowthRate: 0.10,
      growthDeclineYears: 5,
      terminalGrowthRate: 0.03,
      discountRate: 0.10,
      netDebt: 0,
      sharesOutstanding: 1000000000,
      cashAndEquivalents: 0,
      marginOfSafety: 0.20,
    }, 200);

    expect(result.years).toHaveLength(5);
    for (const y of result.years) {
      expect(y.year).toBeGreaterThanOrEqual(1);
      expect(y.fcf).toBeGreaterThan(0);
      expect(y.discountFactor).toBeGreaterThan(0);
      expect(y.discountFactor).toBeLessThanOrEqual(1);
    }
    expect(result.terminalValue).toBeGreaterThan(0);
  });

  it('should correctly assess undervalued when price is far below fair value', () => {
    const result = service.compute({
      freeCashFlow: 10000000000,
      fcfGrowthRate: 0.15,
      growthDeclineYears: 10,
      terminalGrowthRate: 0.04,
      discountRate: 0.12,
      netDebt: 50000000000,
      sharesOutstanding: 1000000000,
      cashAndEquivalents: 10000000000,
      marginOfSafety: 0.20,
    }, 1);

    expect(result.assessment).toBe('significantly_undervalued');
    expect(result.upside).toBeGreaterThan(0);
  });
});
