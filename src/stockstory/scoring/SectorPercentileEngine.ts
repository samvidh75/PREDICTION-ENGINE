/**
 * Sector Percentile Engine
 * 
 * Scores a value against its sector peer distribution.
 * Combines PercentileEngine with sector-specific distribution lookups.
 */

import { PercentileEngine, type Distribution, STANDARD_SCORE_MAP, INVERSE_SCORE_MAP } from './PercentileEngine';
import type { SectorType } from '../sectors/SectorWeightEngine';

/** Metric keys that have sector distributions */
export type PercentileMetric =
  | 'roe'
  | 'roic'
  | 'revenueGrowth'
  | 'epsGrowth'
  | 'debtToEquity'
  | 'operatingMargin'
  | 'currentRatio'
  | 'peRatio'
  | 'pbRatio'
  | 'evEbitda'
  | 'fcfYield'
  | 'volatility';

/** Inverse-scored metrics (lower value = higher score) */
const INVERSE_METRICS: Set<PercentileMetric> = new Set([
  'debtToEquity',
  'peRatio',
  'pbRatio',
  'evEbitda',
  'volatility',
]);

/** Distribution store: sector → metric → distribution */
const distributionStore = new Map<string, Map<PercentileMetric, Distribution>>();

/** Sector peer count store: sector → count */
const peerCountStore = new Map<string, number>();

export class SectorPercentileEngine {
  /**
   * Register a sector distribution for a metric.
   */
  static registerDistribution(
    sector: SectorType,
    metric: PercentileMetric,
    values: number[]
  ): void {
    const sectorKey = sector.toLowerCase();
    if (!distributionStore.has(sectorKey)) {
      distributionStore.set(sectorKey, new Map());
    }
    const dist = PercentileEngine.buildDistribution(values);
    distributionStore.get(sectorKey)!.set(metric, dist);
    peerCountStore.set(sectorKey, values.length);
  }

  /**
   * Register a pre-built distribution.
   */
  static registerBuiltDistribution(
    sector: SectorType,
    metric: PercentileMetric,
    distribution: Distribution,
    peerCount: number
  ): void {
    const sectorKey = sector.toLowerCase();
    if (!distributionStore.has(sectorKey)) {
      distributionStore.set(sectorKey, new Map());
    }
    distributionStore.get(sectorKey)!.set(metric, distribution);
    peerCountStore.set(sectorKey, peerCount);
  }

  /**
   * Get the distribution for a sector + metric.
   */
  static getDistribution(
    sector: SectorType,
    metric: PercentileMetric
  ): Distribution | undefined {
    return distributionStore.get(sector.toLowerCase())?.get(metric);
  }

  /**
   * Get peer count for a sector.
   */
  static getPeerCount(sector: string): number {
    return peerCountStore.get(sector.toLowerCase()) ?? 0;
  }

  /**
   * Score a value against its sector peer distribution.
   * Returns 50 if no distribution is registered (graceful fallback).
   */
  static score(
    value: number | null | undefined,
    sector: string,
    metric: PercentileMetric
  ): number {
    const sectorType = sector.toLowerCase();
    const dist = distributionStore.get(sectorType)?.get(metric);

    if (!dist || dist.count < 3) return 50; // Insufficient peers — neutral

    if (INVERSE_METRICS.has(metric)) {
      return PercentileEngine.scoreByPercentileInverse(value, dist, INVERSE_SCORE_MAP);
    }

    return PercentileEngine.scoreByPercentile(value, dist, STANDARD_SCORE_MAP);
  }

  /**
   * Get the percentile rank of a value within its sector.
   */
  static rank(
    value: number,
    sector: string,
    metric: PercentileMetric
  ): number {
    const dist = distributionStore.get(sector.toLowerCase())?.get(metric);
    if (!dist || dist.count === 0) return 0.5;
    return PercentileEngine.percentileRank(value, dist);
  }

  /**
   * Check if sector data is sufficient for percentile scoring.
   */
  static hasSufficientData(sector: string, metric: PercentileMetric): boolean {
    const dist = distributionStore.get(sector.toLowerCase())?.get(metric);
    return dist !== undefined && dist.count >= 3;
  }

  /**
   * Clear all registered distributions.
   */
  static clear(): void {
    distributionStore.clear();
    peerCountStore.clear();
  }
}

export default SectorPercentileEngine;
