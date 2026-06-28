/**
 * Ranking Backtester
 *
 * Measures whether StockStory factor scores have historical usefulness
 * by comparing scores at time T with future returns.
 */

import type { BacktestConfig, BacktestResult, FactorSnapshot, ForwardReturn, ScoreBucket } from './BacktestTypes';

export class RankingBacktester {
  /**
   * Run a full backtest: load snapshots, compute returns, bucket, analyze.
   */
  async backtest(
    config: BacktestConfig,
    snapshots: FactorSnapshot[],
    priceLookup: (symbol: string, date: string, forwardDays: number) => Promise<ForwardReturn | null>,
  ): Promise<BacktestResult> {
    const dateFiltered = snapshots.filter(
      (s) => s.tradeDate >= config.fromDate && s.tradeDate <= config.toDate,
    );

    // Compute forward returns for each snapshot
    const forwardReturns: ForwardReturn[] = [];
    for (const snap of dateFiltered) {
      for (const windowDays of config.forwardWindows) {
        const fr = await priceLookup(snap.symbol, snap.tradeDate, windowDays);
        if (fr) forwardReturns.push(fr);
      }
    }

    // Bucket by score
    const buckets = this.createBuckets(dateFiltered, forwardReturns, config);

    // Overall stats
    const validReturns = forwardReturns.filter((r) => r.returnPct !== null).map((r) => r.returnPct!);
    const overall = {
      avgReturn: validReturns.length > 0
        ? validReturns.reduce((a, b) => a + b, 0) / validReturns.length
        : null,
      medianReturn: validReturns.length > 0
        ? this.median(validReturns)
        : null,
      hitRate: validReturns.length > 0
        ? validReturns.filter((r) => r.positive === true).length / validReturns.length
        : null,
      sharpeRatio: this.computeSharpe(validReturns),
      correlationScoreReturn: null, // requires snapshot-level pairing
    };

    return {
      config,
      totalSymbols: new Set(dateFiltered.map((s) => s.symbol)).size,
      snapshotCount: dateFiltered.length,
      dateRange: { from: config.fromDate, to: config.toDate },
      buckets,
      overall,
      limitations: [
        'Historical score snapshots may be limited in count',
        'Forward returns use available price data only',
        'Survivorship bias may affect results',
        'No forward-looking claims should be made from preliminary results',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  private createBuckets(
    snapshots: FactorSnapshot[],
    returns: ForwardReturn[],
    config: BacktestConfig,
  ): ScoreBucket[] {
    const scoreField = config.scoreField as keyof FactorSnapshot;
    const withScore = snapshots.filter((s) => s[scoreField] !== null);
    if (withScore.length === 0) return [];

    const scores = withScore.map((s) => s[scoreField] as number).sort((a, b) => a - b);
    const min = scores[0];
    const max = scores[scores.length - 1];
    const range = max - min || 1;
    const bucketSize = range / config.bucketCount;

    const buckets: ScoreBucket[] = [];
    for (let i = 0; i < config.bucketCount; i++) {
      const lower = min + i * bucketSize;
      const upper = lower + bucketSize;
      const inBucket = withScore.filter((s) => {
        const v = s[scoreField] as number;
        return v >= lower && (i === config.bucketCount - 1 ? v <= upper : v < upper);
      });

      const bucketSymbols = inBucket.map((s) => s.symbol);
      const bucketReturns = returns.filter((r) => bucketSymbols.includes(r.symbol));
      const validReturns = bucketReturns.filter((r) => r.returnPct !== null).map((r) => r.returnPct!);

      buckets.push({
        bucketIndex: i,
        bucketLabel: `Q${i + 1}${i === 0 ? ' (Lowest)' : i === config.bucketCount - 1 ? ' (Highest)' : ''}`,
        symbolCount: inBucket.length,
        avgScore: inBucket.length > 0
          ? inBucket.reduce((a, s) => a + (s[scoreField] as number), 0) / inBucket.length
          : 0,
        avgForwardReturn: validReturns.length > 0
          ? validReturns.reduce((a, b) => a + b, 0) / validReturns.length
          : null,
        avgVolatility: null,
        avgMaxDrawdown: null,
        hitRate: validReturns.length > 0
          ? validReturns.filter((r) => r > 0).length / validReturns.length
          : null,
        medianReturn: validReturns.length > 0 ? this.median(validReturns) : null,
      });
    }

    return buckets;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private computeSharpe(returns: number[]): number | null {
    if (returns.length < 5) return null;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    return stdDev > 0 ? mean / stdDev : null;
  }
}
