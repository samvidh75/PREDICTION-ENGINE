/**
 * Market Cap Calibrator
 * Phase 7 — Adjusts growth expectations, liquidity factors,
 * and scoring weights based on market cap buckets.
 */
import { DEFAULT_CALIBRATION, type CalibrationConfig, type MarketCapBucket } from './CalibrationTypes';

export class MarketCapCalibrator {
  private config: CalibrationConfig;

  constructor(config?: CalibrationConfig) {
    this.config = config ?? DEFAULT_CALIBRATION;
  }

  /** Find the bucket for a given market cap (PKR crores) */
  getBucket(marketCapCr: number): MarketCapBucket {
    for (const bucket of this.config.marketCapBuckets) {
      if (marketCapCr >= bucket.minCap && marketCapCr <= bucket.maxCap) {
        return bucket;
      }
    }
    return this.config.marketCapBuckets[this.config.marketCapBuckets.length - 1];
  }

  /** Check if revenue growth is realistic for market cap size */
  isGrowthRealistic(marketCapCr: number, growthRate: number): boolean {
    const bucket = this.getBucket(marketCapCr);
    return growthRate >= bucket.expectedGrowth.min && growthRate <= bucket.expectedGrowth.max;
  }

  /** Get liquidity factor for scoring adjustments */
  getLiquidityFactor(marketCapCr: number): number {
    return this.getBucket(marketCapCr).liquidityFactor;
  }

  /** Get expected growth range */
  getExpectedGrowth(marketCapCr: number): { min: number; max: number } {
    return this.getBucket(marketCapCr).expectedGrowth;
  }

  /** Get bucket label */
  getBucketLabel(marketCapCr: number): string {
    return this.getBucket(marketCapCr).label;
  }
}
