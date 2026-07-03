export interface AssetStats {
  symbol: string;
  expectedReturn: number;
  volatility: number;
}

export interface CovarianceMatrix {
  symbols: string[];
  matrix: number[][];
}

export interface EfficientFrontierPoint {
  return: number;
  volatility: number;
  sharpe: number;
  allocations: Record<string, number>;
}

export interface MarkowitzOutput {
  efficientFrontier: EfficientFrontierPoint[];
  maxSharpePortfolio: EfficientFrontierPoint;
  minVolatilityPortfolio: EfficientFrontierPoint;
  tangencyPortfolio: EfficientFrontierPoint;
}

export class MarkowitzOptimizer {
  computeEfficientFrontier(
    assets: AssetStats[],
    covMatrix: CovarianceMatrix,
    points: number = 50,
  ): MarkowitzOutput {
    const n = assets.length;
    if (n < 2) {
      return this.singleAssetOutput(assets);
    }

    const frontier: EfficientFrontierPoint[] = [];
    const assetMap = new Map(assets.map(a => [a.symbol, a]));

    const maxRet = Math.max(...assets.map(a => a.expectedReturn));
    const minRet = Math.min(...assets.map(a => a.expectedReturn));
    const range = maxRet - minRet || 0.01;

    for (let i = 0; i < points; i++) {
      const targetReturn = maxRet - (range * i) / (points - 1);
      const result = this.optimizeForTarget(assets, covMatrix, targetReturn);
      if (result) frontier.push(result);
    }

    frontier.sort((a, b) => a.volatility - b.volatility);

    let maxSharpePortfolio = frontier[0];
    let minVolPortfolio = frontier[0];

    for (const point of frontier) {
      if (point.sharpe > maxSharpePortfolio.sharpe) maxSharpePortfolio = point;
      if (point.volatility < minVolPortfolio.volatility) minVolPortfolio = point;
    }

    const tangencyPortfolio = this.computeTangencyPortfolio(assets, covMatrix);

    return {
      efficientFrontier: frontier,
      maxSharpePortfolio,
      minVolatilityPortfolio: minVolPortfolio,
      tangencyPortfolio,
    };
  }

  private optimizeForTarget(
    assets: AssetStats[],
    covMatrix: CovarianceMatrix,
    targetReturn: number,
  ): EfficientFrontierPoint | null {
    const n = assets.length;
    const equalWeight = 1 / n;

    const rawAllocations = assets.map(a => {
      const retDiff = a.expectedReturn - targetReturn;
      const base = equalWeight * (1 + retDiff / Math.max(Math.abs(targetReturn) + 0.01, 0.01));
      return Math.max(0, base);
    });

    const totalWeight = rawAllocations.reduce((a, b) => a + b, 0) || n;
    const allocations: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      allocations[assets[i].symbol] = rawAllocations[i] / totalWeight;
    }

    const portfolioReturn = assets.reduce(
      (sum, a) => sum + allocations[a.symbol] * a.expectedReturn, 0,
    );

    let portfolioVariance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cov = covMatrix.matrix[i]?.[j] ?? 0;
        portfolioVariance += allocations[assets[i].symbol] * allocations[assets[j].symbol] * cov;
      }
    }

    const portfolioVol = Math.sqrt(Math.max(portfolioVariance, 0.0001));
    const sharpe = portfolioVol > 0 ? (portfolioReturn - 0.065) / portfolioVol : 0;

    return { return: portfolioReturn, volatility: portfolioVol, sharpe, allocations };
  }

  private computeTangencyPortfolio(
    assets: AssetStats[],
    covMatrix: CovarianceMatrix,
  ): EfficientFrontierPoint {
    return this.maxSharpeRatioPortfolio(assets, covMatrix);
  }

  private maxSharpeRatioPortfolio(
    assets: AssetStats[],
    covMatrix: CovarianceMatrix,
  ): EfficientFrontierPoint {
    const n = assets.length;
    const riskFreeRate = 0.065;

    const excessReturns = assets.map(a => a.expectedReturn - riskFreeRate);
    const totalExcess = Math.abs(excessReturns.reduce((a, b) => a + b, 0)) || n;
    const rawWeights = excessReturns.map(e => Math.max(0, e / totalExcess));
    const totalWeight = rawWeights.reduce((a, b) => a + b, 0) || n;

    const allocations: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      allocations[assets[i].symbol] = rawWeights[i] / totalWeight;
    }

    const portfolioReturn = assets.reduce((s, a) => s + allocations[a.symbol] * a.expectedReturn, 0);
    let variance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cov = covMatrix.matrix[i]?.[j] ?? 0;
        variance += allocations[assets[i].symbol] * allocations[assets[j].symbol] * cov;
      }
    }
    const vol = Math.sqrt(Math.max(variance, 0.0001));
    const sharpe = (portfolioReturn - riskFreeRate) / vol;

    return { return: portfolioReturn, volatility: vol, sharpe, allocations };
  }

  computeCovarianceMatrix(assets: AssetStats[]): CovarianceMatrix {
    const n = assets.length;
    const symbols = assets.map(a => a.symbol);
    const matrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = assets[i].volatility ** 2;
        } else {
          const corr = 0.3 + Math.random() * 0.2;
          matrix[i][j] = corr * assets[i].volatility * assets[j].volatility;
        }
      }
    }

    return { symbols, matrix };
  }

  private singleAssetOutput(assets: AssetStats[]): MarkowitzOutput {
    const point: EfficientFrontierPoint = {
      return: assets[0]?.expectedReturn ?? 0,
      volatility: assets[0]?.volatility ?? 0,
      sharpe: assets[0] ? (assets[0].expectedReturn - 0.065) / Math.max(assets[0].volatility, 0.0001) : 0,
      allocations: assets[0] ? { [assets[0].symbol]: 1 } : {},
    };
    return {
      efficientFrontier: [point],
      maxSharpePortfolio: point,
      minVolatilityPortfolio: point,
      tangencyPortfolio: point,
    };
  }
}

export const markowitzOptimizer = new MarkowitzOptimizer();
