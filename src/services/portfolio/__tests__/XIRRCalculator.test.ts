import { describe, it, expect } from 'vitest';
import { XIRRCalculator, CashFlow } from '../XIRRCalculator';

const calculator = new XIRRCalculator();

describe('XIRRCalculator', () => {
  it('should calculate XIRR for lump sum investment', () => {
    const result = calculator.calculateLumpSum(100000, '2024-01-01', 110000);
    expect(result.xirr).toBeGreaterThan(0);
    expect(result.totalInvested).toBe(100000);
    expect(result.currentValue).toBe(110000);
    expect(result.absoluteReturn).toBe(10000);
  });

  it('should calculate XIRR for SIP', () => {
    const result = calculator.calculateSIP(10000, 12, 135000);
    expect(result.xirr).not.toBeNaN();
    expect(result.totalInvested).toBe(120000);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.converged).toBe(true);
  });

  it('should calculate XIRR with irregular cash flows', () => {
    const cashFlows: CashFlow[] = [
      { date: new Date('2024-01-01'), amount: -100000, note: 'Buy' },
      { date: new Date('2024-06-01'), amount: -50000, note: 'Buy more' },
    ];
    const result = calculator.calculate(cashFlows, 180000);
    expect(result.xirr).toBeGreaterThan(-100);
    expect(result.xirr).toBeLessThan(1000);
    expect(result.totalInvested).toBe(150000);
    expect(result.converged).toBe(true);
  });

  it('should calculate from holdings', () => {
    const result = calculator.portfolioFromHoldings([
      { symbol: 'RELIANCE', quantity: 10, buyDate: '2024-01-15', buyPrice: 2500, currentPrice: 2800 },
      { symbol: 'TCS', quantity: 5, buyDate: '2024-03-01', buyPrice: 3500, currentPrice: 3600 },
    ]);
    expect(result.xirr).not.toBeNaN();
    expect(result.totalInvested).toBe(10 * 2500 + 5 * 3500);
    expect(result.currentValue).toBe(10 * 2800 + 5 * 3600);
    expect(result.yearsHeld).toBeGreaterThan(0);
  });

  it('should return non-negative absolute return for profitable investment', () => {
    const result = calculator.calculate([
      { date: new Date('2024-01-01'), amount: -50000 },
    ], 60000);
    expect(result.absoluteReturn).toBe(10000);
    expect(result.absoluteReturnPercent).toBeGreaterThan(0);
  });

  it('should handle single cash flow', () => {
    const result = calculator.calculate([
      { date: new Date('2024-06-15'), amount: -100000, note: 'Initial' },
    ], 105000);
    expect(result.totalInvested).toBe(100000);
    expect(result.converged).toBe(true);
  });

  it('should return negative return for losing investment', () => {
    const result = calculator.calculateLumpSum(100000, '2024-01-01', 80000);
    expect(result.absoluteReturn).toBe(-20000);
    expect(result.absoluteReturnPercent).toBeLessThan(0);
  });
});
