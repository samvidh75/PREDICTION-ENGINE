export interface VaRInput {
  portfolioValue: number;
  positions: Array<{
    symbol: string;
    weight: number;
    volatility: number;
    expectedReturn: number;
  }>;
  confidenceLevel: number;
  timeHorizon: number;
}

export interface VaROutput {
  varAmount: number;
  varPercent: number;
  cvarAmount: number;
  cvarPercent: number;
  expectedShortfall: number;
  marginalVaR: Array<{
    symbol: string;
    marginalVaR: number;
    contribution: number;
  }>;
  componentVaR: Array<{
    symbol: string;
    componentVaR: number;
    pctContribution: number;
  }>;
  diversificationBenefit: number;
}

export interface StressTestScenario {
  name: string;
  marketShock: number;
  volMultiplier: number;
  correlationShift: number;
}

export interface StressTestResult {
  scenario: StressTestScenario;
  portfolioLoss: number;
  portfolioLossPercent: number;
  largestLosers: Array<{ symbol: string; loss: number }>;
  varViolation: boolean;
}

export class ValueAtRiskEngine {
  computeVaR(input: VaRInput): VaROutput {
    const { portfolioValue, positions, confidenceLevel, timeHorizon } = input;

    const n = positions.length;
    const totalWeight = positions.reduce((s, p) => s + p.weight, 0) || 1;

    let portfolioVol = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corr = i === j ? 1 : 0.3;
        portfolioVol +=
          (positions[i].weight / totalWeight) *
          (positions[j].weight / totalWeight) *
          positions[i].volatility *
          positions[j].volatility *
          corr;
      }
    }
    portfolioVol = Math.sqrt(Math.max(portfolioVol, 0.0001));

    const portfolioReturn = positions.reduce(
      (s, p) => s + (p.weight / totalWeight) * p.expectedReturn, 0,
    );

    const zScore = this.normInv(confidenceLevel);
    const scalingFactor = Math.sqrt(timeHorizon / 252);

    const varPercent = -(portfolioReturn * scalingFactor + zScore * portfolioVol * scalingFactor);
    const varAmount = portfolioValue * varPercent;

    const cvarPercent = varPercent * 1.15;
    const cvarAmount = portfolioValue * cvarPercent;

    const marginalVaR = positions.map(p => {
      const weight = p.weight / totalWeight;
      const beta = (p.volatility * 0.3) / Math.max(portfolioVol, 0.0001);
      const mV = varPercent * beta;
      return {
        symbol: p.symbol,
        marginalVaR: mV,
        contribution: weight * mV,
      };
    });

    const totalComponentVaR = marginalVaR.reduce((s, m) => s + m.contribution, 0) || 1;
    const componentVaR = marginalVaR.map(m => ({
      symbol: m.symbol,
      componentVaR: m.contribution,
      pctContribution: m.contribution / totalComponentVaR,
    }));

    const sumIndividualVaR = positions.reduce(
      (s, p) => s + portfolioValue * (p.weight / totalWeight) * varPercent, 0,
    );

    const diversificationBenefit = sumIndividualVaR > 0
      ? (sumIndividualVaR - varAmount) / sumIndividualVaR
      : 0;

    return {
      varAmount,
      varPercent,
      cvarAmount,
      cvarPercent,
      expectedShortfall: cvarAmount,
      marginalVaR,
      componentVaR,
      diversificationBenefit: Math.max(0, diversificationBenefit),
    };
  }

  runStressTest(input: VaRInput, scenarios: StressTestScenario[]): StressTestResult[] {
    return scenarios.map(scenario => {
      const shockedInput: VaRInput = {
        ...input,
        positions: input.positions.map(p => ({
          ...p,
          volatility: p.volatility * scenario.volMultiplier,
          expectedReturn: p.expectedReturn + scenario.marketShock,
        })),
      };

      const varResult = this.computeVaR(shockedInput);

      const largestLosers = [...input.positions]
        .map(p => ({
          symbol: p.symbol,
          loss: p.weight * Math.abs(scenario.marketShock) * (scenario.volMultiplier > 1 ? 1.5 : 1),
        }))
        .sort((a, b) => b.loss - a.loss);

      return {
        scenario,
        portfolioLoss: varResult.varAmount,
        portfolioLossPercent: varResult.varPercent,
        largestLosers,
        varViolation: varResult.varPercent > 0.2,
      };
    });
  }

  private normInv(p: number): number {
    const a1 = -3.969683028665376e+1;
    const a2 = 2.209460984245205e+2;
    const a3 = -2.759285104469687e+2;
    const a4 = 1.383577518672690e+2;
    const a5 = -3.066479806614716e+1;
    const a6 = 2.506628277459239e+0;
    const b1 = -5.447609879822406e+1;
    const b2 = 1.615858368580409e+2;
    const b3 = -1.556989798598866e+2;
    const b4 = 6.680131188771972e+1;
    const b5 = -1.328068155288572e+1;
    const c1 = -7.784894002430293e-3;
    const c2 = -3.223964580411365e-1;
    const c3 = -2.400758277161838e+0;
    const c4 = -2.549732539343734e+0;
    const c5 = 4.374664141464968e+0;
    const c6 = 2.938163982698783e+0;
    const d1 = 7.784695709041462e-3;
    const d2 = 3.224671290700398e-1;
    const d3 = 2.445134137142996e+0;
    const d4 = 3.754408661907416e+0;

    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let x: number;

    if (p < pLow) {
      const q = Math.sqrt(-2 * Math.log(p));
      x = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= pHigh) {
      const q = p - 0.5;
      const r = q * q;
      x = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }

    return x;
  }
}

export const valueAtRiskEngine = new ValueAtRiskEngine();
