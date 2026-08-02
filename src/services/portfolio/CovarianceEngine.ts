import { CovarianceMatrix, CorrelationMatrix } from './types';

/**
 * Computes covariance and correlation matrices from return series,
 * with Ledoit-Wolf shrinkage toward the constant-correlation target
 * for numerically stable estimates on short histories.
 */
export class CovarianceEngine {
  /**
   * @param returns matrix of daily returns: returns[i] is the series for tickers[i].
   *                All series must have equal length >= 2.
   */
  computeCovariance(tickers: string[], returns: number[][], shrinkage = true): CovarianceMatrix {
    this.validateInput(tickers, returns);
    const n = tickers.length;
    const t = returns[0].length;

    const means = returns.map(series => series.reduce((s, r) => s + r, 0) / t);
    const demeaned = returns.map((series, i) => series.map(r => r - means[i]));

    const sample: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let cov = 0;
        for (let k = 0; k < t; k++) {
          cov += demeaned[i][k] * demeaned[j][k];
        }
        cov /= t - 1;
        sample[i][j] = cov;
        sample[j][i] = cov;
      }
    }

    const matrix = shrinkage ? this.ledoitWolfShrink(sample, demeaned, t) : sample;
    return { tickers, matrix, lookbackDays: t };
  }

  computeCorrelation(tickers: string[], returns: number[][]): CorrelationMatrix {
    const { matrix: cov } = this.computeCovariance(tickers, returns, false);
    const stds = cov.map((row, i) => Math.sqrt(row[i]));
    const matrix = cov.map((row, i) =>
      row.map((c, j) => {
        const denom = stds[i] * stds[j];
        if (denom === 0) return i === j ? 1 : 0;
        return Math.max(-1, Math.min(1, c / denom));
      }),
    );
    return { tickers, matrix };
  }

  /** Annualize a daily covariance matrix (252 trading days). */
  annualize(cov: CovarianceMatrix, tradingDays = 252): CovarianceMatrix {
    return {
      ...cov,
      matrix: cov.matrix.map(row => row.map(c => c * tradingDays)),
    };
  }

  private ledoitWolfShrink(sample: number[][], demeaned: number[][], t: number): number[][] {
    const n = sample.length;
    const variances = sample.map((row, i) => row[i]);
    const stds = variances.map(v => Math.sqrt(v));

    // Constant-correlation target: average off-diagonal correlation
    let avgCorr = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const denom = stds[i] * stds[j];
        if (denom > 0) {
          avgCorr += sample[i][j] / denom;
          count++;
        }
      }
    }
    avgCorr = count > 0 ? avgCorr / count : 0;

    const target: number[][] = sample.map((row, i) =>
      row.map((_, j) => (i === j ? variances[i] : avgCorr * stds[i] * stds[j])),
    );

    // Shrinkage intensity: estimate of var(sample cov) relative to misspecification
    let pi = 0; // sum of asymptotic variances of sample cov entries
    let gamma = 0; // squared Frobenius distance between sample and target
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let v = 0;
        for (let k = 0; k < t; k++) {
          const term = demeaned[i][k] * demeaned[j][k] - sample[i][j];
          v += term * term;
        }
        pi += v / t;
        const diff = sample[i][j] - target[i][j];
        gamma += diff * diff;
      }
    }
    const kappa = gamma > 0 ? pi / t / gamma : 0;
    const delta = Math.max(0, Math.min(1, kappa));

    return sample.map((row, i) => row.map((c, j) => delta * target[i][j] + (1 - delta) * c));
  }

  private validateInput(tickers: string[], returns: number[][]): void {
    if (tickers.length === 0 || tickers.length !== returns.length) {
      throw new Error(`CovarianceEngine: tickers (${tickers.length}) and returns (${returns.length}) must be non-empty and equal length`);
    }
    const t = returns[0].length;
    if (t < 2) {
      throw new Error('CovarianceEngine: need at least 2 observations per series');
    }
    for (let i = 0; i < returns.length; i++) {
      if (returns[i].length !== t) {
        throw new Error(`CovarianceEngine: series for ${tickers[i]} has length ${returns[i].length}, expected ${t}`);
      }
      for (const r of returns[i]) {
        if (!Number.isFinite(r)) {
          throw new Error(`CovarianceEngine: non-finite return in series for ${tickers[i]}`);
        }
      }
    }
  }
}
