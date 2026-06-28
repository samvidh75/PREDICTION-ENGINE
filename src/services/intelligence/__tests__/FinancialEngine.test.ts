import { FinancialEngine } from '../engines/FinancialEngine';
import type { FinancialMetrics } from '../types';

describe('Financial Engine', () => {
  const engine = new FinancialEngine();

  describe('Excellent Fundamentals', () => {
    it('should score TCS-like metrics correctly', async () => {
      const tcsMetrics: FinancialMetrics = {
        roe: 48,
        operatingMargin: 24,
        netMargin: 22,
        revenueGrowth: 6.3,
        epsGrowth: 8.1,
        debtToEquity: 0.15,
        interestCoverage: 45,
        lastUpdated: new Date(),
        fiscalYear: 2026,
      };

      const result = await engine.analyze(tcsMetrics);

      console.log(`TCS Score: ${result.overall}/100`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`Reasoning: ${result.reasoning}`);

      expect(result.overall).toBeGreaterThanOrEqual(80);
      expect(result.qualityScore).toBeGreaterThanOrEqual(32);
      expect(result.growthScore).toBeGreaterThanOrEqual(14);
      expect(result.debtScore).toBe(10);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.dataCompleteness).toBe(1.0);
    });
  });

  describe('Good Fundamentals', () => {
    it('should score INFY-like metrics correctly', async () => {
      const infyMetrics: FinancialMetrics = {
        roe: 32,
        operatingMargin: 18,
        netMargin: 15,
        revenueGrowth: 8.2,
        epsGrowth: 9.5,
        debtToEquity: 0.30,
        interestCoverage: 35,
        lastUpdated: new Date(),
        fiscalYear: 2026,
      };

      const result = await engine.analyze(infyMetrics);

      console.log(`INFY Score: ${result.overall}/100`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

      expect(result.overall).toBeGreaterThanOrEqual(70);
      expect(result.overall).toBeLessThanOrEqual(80);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Weak Fundamentals', () => {
    it('should score poor metrics correctly', async () => {
      const weakMetrics: FinancialMetrics = {
        roe: 5,
        operatingMargin: 3,
        netMargin: 1,
        revenueGrowth: -2,
        epsGrowth: -5,
        debtToEquity: 2.5,
        interestCoverage: 1.0,
        lastUpdated: new Date(),
        fiscalYear: 2026,
      };

      const result = await engine.analyze(weakMetrics);

      console.log(`Weak Score: ${result.overall}/100`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

      expect(result.overall).toBeLessThanOrEqual(20);
      expect(result.debtScore).toBe(0);
      expect(result.reasoning).toContain('weak');
    });
  });

  describe('Partial Data', () => {
    it('should handle missing metrics gracefully', async () => {
      const partialMetrics: FinancialMetrics = {
        roe: 35,
        revenueGrowth: 8,
        debtToEquity: 0.8,
        lastUpdated: new Date(),
        fiscalYear: 2026,
      };

      const result = await engine.analyze(partialMetrics);

      console.log(`Partial Data Score: ${result.overall}/100`);
      console.log(`Completeness: ${(result.dataCompleteness * 100).toFixed(0)}%`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

      expect(result.overall).toBeGreaterThan(0);
      expect(result.dataCompleteness).toBeLessThan(1.0);
      expect(result.dataCompleteness).toBeGreaterThan(0.3);
      expect(result.confidence).toBeGreaterThan(0.60);
    });
  });

  describe('Major Indian Stocks', () => {
    it('should score 5 major stocks correctly', async () => {
      const testStocks = [
        { name: 'TCS', roe: 48, om: 24, nm: 22, rg: 6.3, eg: 8.1, de: 0.15, ic: 45 },
        { name: 'INFY', roe: 32, om: 18, nm: 15, rg: 8.2, eg: 9.5, de: 0.30, ic: 35 },
        { name: 'WIPRO', roe: 24, om: 16, nm: 12, rg: 4.1, eg: 5.2, de: 0.05, ic: 40 },
        { name: 'HCLTECH', roe: 35, om: 20, nm: 16, rg: 7.5, eg: 8.8, de: 0.20, ic: 38 },
        { name: 'RELIANCE', roe: 25, om: 15, nm: 10, rg: 5, eg: 6, de: 1.2, ic: 8 },
      ];

      const results = await Promise.all(
        testStocks.map(stock =>
          engine.analyze({
            roe: stock.roe,
            operatingMargin: stock.om,
            netMargin: stock.nm,
            revenueGrowth: stock.rg,
            epsGrowth: stock.eg,
            debtToEquity: stock.de,
            interestCoverage: stock.ic,
            lastUpdated: new Date(),
            fiscalYear: 2026,
          })
        )
      );

      results.forEach((result, i) => {
        const stock = testStocks[i];
        console.log(
          `${stock.name}: Score ${result.overall}/100, Confidence ${(result.confidence * 100).toFixed(0)}%`
        );

        expect(result.overall).toBeGreaterThan(0);
        expect(result.overall).toBeLessThanOrEqual(100);
        expect(result.confidence).toBeGreaterThan(0.80);
      });

      expect(results[0].overall).toBeGreaterThan(results[4].overall);
      expect(results[1].overall).toBeGreaterThan(results[2].overall);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero metrics', async () => {
      const zeroMetrics: FinancialMetrics = {
        roe: 0,
        operatingMargin: 0,
        netMargin: 0,
        revenueGrowth: 0,
        epsGrowth: 0,
        debtToEquity: 0,
        lastUpdated: new Date(),
        fiscalYear: 2026,
      };

      const result = await engine.analyze(zeroMetrics);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThan(20);
    });

    it('should handle negative metrics', async () => {
      const negMetrics: FinancialMetrics = {
        roe: -10,
        operatingMargin: -5,
        netMargin: -3,
        revenueGrowth: -20,
        epsGrowth: -15,
        debtToEquity: 3,
        lastUpdated: new Date(),
        fiscalYear: 2026,
      };

      const result = await engine.analyze(negMetrics);
      expect(result.overall).toBeLessThan(15);
    });
  });
});
