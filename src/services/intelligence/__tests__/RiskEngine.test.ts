import { RiskEngine } from '../engines/RiskEngine';
import type { RiskMetrics } from '../types';

describe('Risk Engine', () => {
  const engine = new RiskEngine();

  describe('Low-Risk Blue Chip', () => {
    it('should score TCS-like low-risk metrics correctly', () => {
      const metrics: RiskMetrics = {
        volatility: 16,            // Low vol — safe
        beta: 0.65,                // Defensive
        maxDrawdown: 18,           // Moderate drawdown
        weeklyRange: 20,
        debtToEquity: 0.15,        // Minimal debt
        currentRatio: 3.2,         // Strong liquidity
        interestCoverage: 45,      // Excellent coverage
        cashReserves: 18,          // Large cash buffer
        customerConcentration: 8,  // Diversified
        revenuePredictability: 0.85,
        competitiveMoat: 0.85,
        executionRisk: 0.80,
        profitabilityAtMinus20Revenue: true,
        sharpeRatio: 1.6,
        valueAtRisk: 1.2,
        regulatoryRisk: 0.05,
        litigationRisk: 0.05,
        obsolescenceRisk: 0.10,
        disruptionRisk: 0.10,
        lastUpdated: new Date(),
        symbol: 'TCS',
      };

      const result = engine.analyze(metrics);

      console.log(`TCS Risk Score: ${result.overall}/100`);
      console.log(`Risk Profile: ${result.riskProfile}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`Reasoning: ${result.reasoning}`);

      expect(result.overall).toBeGreaterThanOrEqual(75);
      expect(result.riskProfile).toBe('low_risk');
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
      expect(result.dataCompleteness).toBe(1.0);
      expect(result.volatilityScore).toBeGreaterThanOrEqual(18);
      expect(result.financialRiskScore).toBeGreaterThanOrEqual(15);
      expect(result.businessRiskScore).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Moderate Risk', () => {
    it('should score INFY-like moderate risk correctly', () => {
      const metrics: RiskMetrics = {
        volatility: 22,
        beta: 1.05,
        maxDrawdown: 30,
        weeklyRange: 35,
        debtToEquity: 0.30,
        currentRatio: 2.5,
        interestCoverage: 35,
        cashReserves: 10,
        customerConcentration: 15,
        revenuePredictability: 0.70,
        competitiveMoat: 0.70,
        executionRisk: 0.65,
        profitabilityAtMinus20Revenue: false,
        sharpeRatio: 1.1,
        valueAtRisk: 2.0,
        regulatoryRisk: 0.15,
        litigationRisk: 0.10,
        obsolescenceRisk: 0.20,
        disruptionRisk: 0.20,
        lastUpdated: new Date(),
        symbol: 'INFY',
      };

      const result = engine.analyze(metrics);

      console.log(`INFY Risk Score: ${result.overall}/100`);
      console.log(`Risk Profile: ${result.riskProfile}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

      expect(result.overall).toBeGreaterThanOrEqual(60);
      expect(result.overall).toBeLessThanOrEqual(80);
      expect(['low_risk', 'moderate']).toContain(result.riskProfile);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('High Risk Small Cap', () => {
    it('should score a high-risk stock correctly', () => {
      const metrics: RiskMetrics = {
        volatility: 45,
        beta: 1.8,
        maxDrawdown: 55,
        weeklyRange: 60,
        debtToEquity: 2.2,
        currentRatio: 0.7,
        interestCoverage: 1.2,
        cashReserves: 1.5,
        customerConcentration: 55,
        revenuePredictability: 0.20,
        competitiveMoat: 0.15,
        executionRisk: 0.20,
        profitabilityAtMinus20Revenue: false,
        sharpeRatio: 0.3,
        valueAtRisk: 6.5,
        regulatoryRisk: 0.60,
        litigationRisk: 0.55,
        obsolescenceRisk: 0.65,
        disruptionRisk: 0.70,
        lastUpdated: new Date(),
        symbol: 'RISKY',
      };

      const result = engine.analyze(metrics);

      console.log(`Risky Stock Score: ${result.overall}/100`);
      console.log(`Risk Profile: ${result.riskProfile}`);

      expect(result.overall).toBeLessThanOrEqual(35);
      expect(['elevated', 'high', 'dangerous']).toContain(result.riskProfile);
      expect(result.volatilityScore).toBeLessThanOrEqual(10);
      expect(result.financialRiskScore).toBeLessThanOrEqual(7);
      expect(result.tailRiskScore).toBeLessThanOrEqual(5);
    });
  });

  describe('Partial Data', () => {
    it('should handle missing metrics gracefully', () => {
      const partialMetrics: RiskMetrics = {
        volatility: 20,
        debtToEquity: 0.8,
        currentRatio: 1.5,
        lastUpdated: new Date(),
        symbol: 'PARTIAL',
      };

      const result = engine.analyze(partialMetrics);

      console.log(`Partial Data Score: ${result.overall}/100`);
      console.log(`Completeness: ${(result.dataCompleteness * 100).toFixed(0)}%`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.dataCompleteness).toBeLessThan(1.0);
      expect(result.dataCompleteness).toBeGreaterThan(0.1);
      expect(result.confidence).toBeGreaterThan(0.40);
      expect(result.confidence).toBeLessThan(0.99);
    });
  });

  describe('Major Philippine Stocks', () => {
    it('should rank 5 major stocks by risk correctly', () => {
      const testStocks: { name: string; metrics: RiskMetrics }[] = [
        {
          name: 'TCS',
          metrics: {
            volatility: 16, beta: 0.65, maxDrawdown: 18, weeklyRange: 20,
            debtToEquity: 0.15, currentRatio: 3.2, interestCoverage: 45, cashReserves: 18,
            customerConcentration: 8, revenuePredictability: 0.85,
            competitiveMoat: 0.85, executionRisk: 0.80,
            profitabilityAtMinus20Revenue: true, sharpeRatio: 1.6, valueAtRisk: 1.2,
            regulatoryRisk: 0.05, litigationRisk: 0.05,
            obsolescenceRisk: 0.10, disruptionRisk: 0.10,
            lastUpdated: new Date(),
          },
        },
        {
          name: 'HDFCBANK',
          metrics: {
            volatility: 20, beta: 0.9, maxDrawdown: 22, weeklyRange: 28,
            debtToEquity: 3.0, currentRatio: 0.15, interestCoverage: 3.0, cashReserves: 4,
            customerConcentration: 5, revenuePredictability: 0.75,
            competitiveMoat: 0.75, executionRisk: 0.70,
            profitabilityAtMinus20Revenue: true, sharpeRatio: 1.1, valueAtRisk: 2.0,
            regulatoryRisk: 0.25, litigationRisk: 0.15,
            obsolescenceRisk: 0.05, disruptionRisk: 0.15,
            lastUpdated: new Date(),
          },
        },
        {
          name: 'RELIANCE',
          metrics: {
            volatility: 25, beta: 1.1, maxDrawdown: 30, weeklyRange: 35,
            debtToEquity: 1.1, currentRatio: 1.1, interestCoverage: 6.0, cashReserves: 5,
            customerConcentration: 12, revenuePredictability: 0.65,
            competitiveMoat: 0.70, executionRisk: 0.60,
            profitabilityAtMinus20Revenue: false, sharpeRatio: 0.85, valueAtRisk: 3.0,
            regulatoryRisk: 0.30, litigationRisk: 0.20,
            obsolescenceRisk: 0.25, disruptionRisk: 0.25,
            lastUpdated: new Date(),
          },
        },
        {
          name: 'TATAMOTORS',
          metrics: {
            volatility: 32, beta: 1.4, maxDrawdown: 45, weeklyRange: 50,
            debtToEquity: 2.0, currentRatio: 0.9, interestCoverage: 2.5, cashReserves: 3,
            customerConcentration: 30, revenuePredictability: 0.40,
            competitiveMoat: 0.40, executionRisk: 0.35,
            profitabilityAtMinus20Revenue: false, sharpeRatio: 0.5, valueAtRisk: 4.5,
            regulatoryRisk: 0.40, litigationRisk: 0.35,
            obsolescenceRisk: 0.50, disruptionRisk: 0.55,
            lastUpdated: new Date(),
          },
        },
      ];

      const results = testStocks.map(s => ({
        name: s.name,
        result: engine.analyze(s.metrics),
      }));

      results.forEach(({ name, result }) => {
        console.log(`${name}: Risk ${result.overall}/100, ${result.riskProfile}, Confidence ${(result.confidence * 100).toFixed(0)}%`);
        expect(result.overall).toBeGreaterThan(0);
        expect(result.overall).toBeLessThanOrEqual(100);
        expect(['low_risk', 'moderate', 'elevated', 'high', 'dangerous']).toContain(result.riskProfile);
      });

      // TCS should be lowest risk (highest score)
      expect(results[0].result.overall).toBeGreaterThan(results[3].result.overall);
      // Blue chips should be lower risk than Tata Motors
      expect(results[1].result.overall).toBeGreaterThan(results[3].result.overall);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty/undefined metrics', () => {
      const metrics: RiskMetrics = {
        lastUpdated: new Date(),
      };

      const result = engine.analyze(metrics);

      console.log(`Empty Metrics Score: ${result.overall}/100`);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.dataCompleteness).toBe(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeTruthy();
    });

    it('should produce dangerous profile for extreme risk', () => {
      const extremeMetrics: RiskMetrics = {
        volatility: 70,
        beta: 3.5,
        maxDrawdown: 85,
        debtToEquity: 5.0,
        currentRatio: 0.2,
        interestCoverage: 0.3,
        cashReserves: 0.2,
        customerConcentration: 90,
        revenuePredictability: 0.05,
        competitiveMoat: 0.05,
        executionRisk: 0.05,
        profitabilityAtMinus20Revenue: false,
        sharpeRatio: -0.5,
        valueAtRisk: 12,
        regulatoryRisk: 0.95,
        litigationRisk: 0.90,
        obsolescenceRisk: 0.95,
        disruptionRisk: 0.95,
        lastUpdated: new Date(),
        symbol: 'EXTREME',
      };

      const result = engine.analyze(extremeMetrics);

      console.log(`Extreme Risk Score: ${result.overall}/100 — ${result.riskProfile}`);

      expect(result.riskProfile).toBe('dangerous');
      expect(result.overall).toBeLessThan(30);
      expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    });

    it('should handle zero-debt companies well', () => {
      const zeroDebtMetrics: RiskMetrics = {
        volatility: 18,
        beta: 0.80,
        debtToEquity: 0,
        currentRatio: 4.0,
        interestCoverage: 999,
        profitabilityAtMinus20Revenue: true,
        lastUpdated: new Date(),
        symbol: 'ZERODEBT',
      };

      const result = engine.analyze(zeroDebtMetrics);

      console.log(`Zero-Debt Risk Score: ${result.overall}/100`);

      expect(result.overall).toBeGreaterThanOrEqual(30);
      expect(result.financialRiskScore).toBeGreaterThan(10);
      expect(result.details.financialRisk.leverageScore).toBeGreaterThanOrEqual(6);
    });
  });
});
