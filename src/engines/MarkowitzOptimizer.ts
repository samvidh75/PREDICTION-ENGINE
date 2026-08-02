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

const RISK_FREE_RATE = 0.065;
const MAX_ITERATIONS = 2000;
const CONVERGENCE_TOL = 1e-9;

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

    const mu = assets.map(a => a.expectedReturn);
    const sigma = covMatrix.matrix;
    const minVar = this.solveMeanVariance(mu.map(() => 0), sigma, 1);
    const minVarReturn = this.dot(minVar, mu);
    const maxRet = Math.max(...mu);
    const range = maxRet - minVarReturn || 0.01;

    const frontier: EfficientFrontierPoint[] = [];
    for (let i = 0; i < points; i++) {
      const targetReturn = minVarReturn + (range * i) / Math.max(1, points - 1);
      frontier.push(this.pointForWeights(this.solveTargetReturn(mu, sigma, targetReturn), assets, sigma));
    }

    frontier.sort((a, b) => a.volatility - b.volatility);

    let maxSharpePortfolio = frontier[0];
    let minVolPortfolio = frontier[0];
    for (const point of frontier) {
      if (point.sharpe > maxSharpePortfolio.sharpe) maxSharpePortfolio = point;
      if (point.volatility < minVolPortfolio.volatility) minVolPortfolio = point;
    }

    const tangencyPortfolio = this.maxSharpeRatioPortfolio(assets, covMatrix);

    return {
      efficientFrontier: frontier,
      maxSharpePortfolio,
      minVolatilityPortfolio: minVolPortfolio,
      tangencyPortfolio,
    };
  }

  private maxSharpeRatioPortfolio(
    assets: AssetStats[],
    covMatrix: CovarianceMatrix,
  ): EfficientFrontierPoint {
    const mu = assets.map(a => a.expectedReturn);
    const sigma = covMatrix.matrix;
    const excess = mu.map(m => m - RISK_FREE_RATE);

    // Dense log-spaced grid over risk-aversion lambda; pick the portfolio with the best Sharpe.
    let best: { weights: number[]; sharpe: number } | null = null;
    for (let e = -2; e <= 8; e += 0.5) {
      const lambda = Math.pow(2, e);
      const weights = this.solveMeanVariance(excess, sigma, lambda);
      const ret = this.dot(weights, mu);
      const vol = Math.sqrt(Math.max(this.quadForm(weights, sigma), 1e-16));
      const sharpe = (ret - RISK_FREE_RATE) / vol;
      if (!best || sharpe > best.sharpe) best = { weights, sharpe };
    }
    return this.pointForWeights(best!.weights, assets, sigma);
  }

  private pointForWeights(weights: number[], assets: AssetStats[], sigma: number[][]): EfficientFrontierPoint {
    const mu = assets.map(a => a.expectedReturn);
    const ret = this.dot(weights, mu);
    const vol = Math.sqrt(Math.max(0, this.quadForm(weights, sigma)));
    const sharpe = vol > 0 ? (ret - RISK_FREE_RATE) / vol : 0;
    const allocations: Record<string, number> = {};
    assets.forEach((a, i) => { allocations[a.symbol] = weights[i]; });
    return { return: ret, volatility: vol, sharpe, allocations };
  }

  /**
   * Long-only mean-variance solve via projected gradient descent onto the
   * capped simplex (sum(w)=1, w>=0). Replaces the previous heuristic
   * (non-convex closed-form guess) with a real convergent optimizer.
   */
  private solveMeanVariance(mu: number[], sigma: number[][], lambda: number): number[] {
    const n = mu.length;
    let w = this.projectSimplex(new Array(n).fill(1 / n));
    const sigmaNorm = Math.max(...sigma.map(row => row.reduce((s, v) => s + Math.abs(v), 0)), 1e-12);
    const step = 1 / (2 * lambda * sigmaNorm);

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const grad = this.matVec(sigma, w).map((v, i) => 2 * lambda * v - mu[i]);
      const next = this.projectSimplex(w.map((wi, i) => wi - step * grad[i]));
      const change = next.reduce((s, v, i) => s + (v - w[i]) ** 2, 0);
      w = next;
      if (change < CONVERGENCE_TOL) break;
    }
    return w;
  }

  private solveTargetReturn(mu: number[], sigma: number[][], targetReturn: number): number[] {
    const n = mu.length;
    let w = this.projectSimplex(new Array(n).fill(1 / n));
    const sigmaNorm = Math.max(...sigma.map(row => row.reduce((s, v) => s + Math.abs(v), 0)), 1e-12);
    const muNormSq = this.dot(mu, mu);
    let rho = 100 * Math.max(...sigma.map((row, i) => row[i]), 1e-8);

    for (let round = 0; round < 8; round++) {
      const step = 1 / (2 * (sigmaNorm + rho * muNormSq) + 1e-12);
      for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        const excess = this.dot(w, mu) - targetReturn;
        const grad = this.matVec(sigma, w).map((v, i) => 2 * v + 2 * rho * excess * mu[i]);
        const next = this.projectSimplex(w.map((wi, i) => wi - step * grad[i]));
        const change = next.reduce((s, v, i) => s + (v - w[i]) ** 2, 0);
        w = next;
        if (change < CONVERGENCE_TOL) break;
      }
      const returnScale = Math.max(Math.abs(targetReturn), Math.max(...mu.map(Math.abs)), 1e-6);
      if (Math.abs(this.dot(w, mu) - targetReturn) / returnScale < 1e-3) break;
      rho *= 10;
    }
    return w;
  }

  /** Euclidean projection onto { w : sum(w) = 1, w >= 0 } via bisection. */
  private projectSimplex(v: number[]): number[] {
    const clipSum = (tau: number) => v.reduce((s, vi) => s + Math.max(0, vi - tau), 0);
    let low = Math.min(...v) - 1;
    let high = Math.max(...v);
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      if (clipSum(mid) > 1) low = mid;
      else high = mid;
    }
    const tau = (low + high) / 2;
    return v.map(vi => Math.max(0, vi - tau));
  }

  private matVec(m: number[][], v: number[]): number[] {
    return m.map(row => row.reduce((s, mij, j) => s + mij * v[j], 0));
  }

  private dot(a: number[], b: number[]): number {
    return a.reduce((s, ai, i) => s + ai * b[i], 0);
  }

  private quadForm(w: number[], sigma: number[][]): number {
    return this.dot(w, this.matVec(sigma, w));
  }

  /**
   * Historical/assumed covariance from per-asset volatilities and a fixed
   * cross-asset correlation. Previously used Math.random() here, which made
   * every call to this "deterministic" optimizer non-reproducible and
   * untestable for exact values — replaced with a fixed constant so results
   * are stable given the same inputs.
   */
  computeCovarianceMatrix(assets: AssetStats[], assumedCorrelation = 0.4): CovarianceMatrix {
    const n = assets.length;
    const symbols = assets.map(a => a.symbol);
    const matrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = assets[i].volatility ** 2;
        } else {
          matrix[i][j] = assumedCorrelation * assets[i].volatility * assets[j].volatility;
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
