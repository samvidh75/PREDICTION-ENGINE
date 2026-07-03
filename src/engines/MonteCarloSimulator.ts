export interface MonteCarloConfig {
  simulations: number;
  timeHorizon: number;
  confidenceLevels: number[];
  seed?: number;
}

export interface MonteCarloInput {
  initialPortfolioValue: number;
  expectedReturn: number;
  volatility: number;
  weights: Record<string, number>;
  assetVolatilities: Record<string, number>;
  correlations: Record<string, Record<string, number>>;
}

export interface MonteCarloPath {
  step: number;
  value: number;
  return_: number;
}

export interface MonteCarloResult {
  expectedFinalValue: number;
  medianFinalValue: number;
  probabilityOfLoss: number;
  probabilityOfTarget: number;
  var95: number;
  var99: number;
  cvar95: number;
  maxDrawdown: number;
  averageDrawdown: number;
  bestCase: number;
  worstCase: number;
  paths: MonteCarloPath[];
  confidenceIntervals: Array<{
    level: number;
    lower: number;
    upper: number;
  }>;
}

const DEFAULT_CONFIG: MonteCarloConfig = {
  simulations: 10000,
  timeHorizon: 252,
  confidenceLevels: [0.95, 0.99],
};

export class MonteCarloSimulator {
  private config: MonteCarloConfig;

  constructor(config: Partial<MonteCarloConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  simulate(input: MonteCarloInput): MonteCarloResult {
    const {
      initialPortfolioValue, expectedReturn, volatility,
      weights, assetVolatilities,
    } = input;

    const allFinalValues: number[] = [];
    const allPaths: number[][] = [];
    let maxDrawdown = 0;
    let totalDrawdown = 0;
    let lossCount = 0;
    let targetCount = 0;

    for (let sim = 0; sim < this.config.simulations; sim++) {
      const path = this.simulatePath(
        initialPortfolioValue, expectedReturn, volatility,
        this.config.timeHorizon,
      );
      const finalValue = path[path.length - 1];
      if (!Number.isFinite(finalValue)) continue;
      allFinalValues.push(finalValue);
      allPaths.push(path);

      const peak = Math.max(...path);
      const final = finalValue;
      const drawdown = (peak - final) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      totalDrawdown += drawdown;

      if (final < initialPortfolioValue) lossCount++;
      if (final >= initialPortfolioValue * 1.1) targetCount++;
    }

    allFinalValues.sort((a, b) => a - b);
    if (allFinalValues.length === 0) allFinalValues.push(initialPortfolioValue);
    const n = allFinalValues.length;

    const expectedFinalValue = allFinalValues.reduce((a, b) => a + b, 0) / n;
    const medianFinalValue = allFinalValues[Math.floor(n / 2)];
    const bestCase = allFinalValues[n - 1];
    const worstCase = allFinalValues[0];

    const var95Index = Math.floor(n * 0.05);
    const var99Index = Math.floor(n * 0.01);
    const var95 = (initialPortfolioValue - allFinalValues[var95Index]) / initialPortfolioValue;
    const var99 = (initialPortfolioValue - allFinalValues[var99Index]) / initialPortfolioValue;

    const cvar95Values = allFinalValues.slice(0, var95Index);
    const cvar95 = cvar95Values.length > 0
      ? (initialPortfolioValue - cvar95Values.reduce((a, b) => a + b, 0) / cvar95Values.length) / initialPortfolioValue
      : 0;

    const confidenceIntervals = this.config.confidenceLevels.map(level => {
      const tail = (1 - level) / 2;
      const lowerIdx = Math.floor(n * tail);
      const upperIdx = Math.floor(n * (1 - tail));
      return {
        level,
        lower: allFinalValues[lowerIdx] ?? 0,
        upper: allFinalValues[upperIdx] ?? 0,
      };
    });

    const samplePaths = n > 0
      ? this.samplePaths(allPaths, Math.min(100, this.config.simulations))
      : [];

    const simulatedCount = this.config.simulations;

    return {
      expectedFinalValue,
      medianFinalValue,
      probabilityOfLoss: lossCount / simulatedCount,
      probabilityOfTarget: targetCount / simulatedCount,
      var95,
      var99,
      cvar95,
      maxDrawdown,
      averageDrawdown: totalDrawdown / n,
      bestCase,
      worstCase,
      paths: samplePaths,
      confidenceIntervals,
    };
  }

  private simulatePath(
    initialValue: number,
    expectedReturn: number,
    volatility: number,
    steps: number,
  ): number[] {
    const path: number[] = [initialValue];
    const dt = 1 / 252;
    const mu = expectedReturn;
    const sigma = volatility;
    let currentValue = initialValue;

    for (let step = 0; step < steps; step++) {
      const drift = mu * dt;
      const shock = sigma * Math.sqrt(dt) * this.normalRandom();
      const return_ = drift + shock;
      currentValue *= (1 + return_);
      if (currentValue < 0) currentValue = 0;
      path.push(currentValue);
    }

    return path;
  }

  private normalRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
  }

  private samplePaths(paths: number[][], count: number): MonteCarloPath[] {
    const step = Math.max(1, Math.floor(paths.length / count));
    const sampled: MonteCarloPath[] = [];

    for (let i = 0; i < paths.length && sampled.length < count; i += step) {
      const path = paths[i];
      if (!path) continue;
      const finalValue = path[path.length - 1];
      const initialValue = path[0];
      sampled.push({
        step: i,
        value: finalValue,
        return_: (finalValue - initialValue) / initialValue,
      });
    }

    return sampled;
  }

  estimateProbabilityOfTarget(
    input: MonteCarloInput,
    targetReturn: number,
  ): number {
    const result = this.simulate(input);
    return result.probabilityOfTarget;
  }
}

export const monteCarloSimulator = new MonteCarloSimulator();
