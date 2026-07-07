/**
 * Sector Distribution Engine
 * 
 * Generates sector-specific distributions for percentile scoring.
 * Uses Philippine market empirical reference data as fallback distributions
 * when live data is unavailable.
 * 
 * Each distribution has: P10, P25, P50, P75, P90
 */

import { PercentileEngine, type Distribution } from '../scoring/PercentileEngine';
import { SectorPercentileEngine, type PercentileMetric } from '../scoring/SectorPercentileEngine';
import type { SectorType } from '../sectors/SectorWeightEngine';

// ─── Reference Distributions (Indian Market Empirical Data) ───────

interface MetricDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

type SectorDistributions = Record<PercentileMetric, MetricDistribution>;

/**
 * Philippine market reference distributions.
 * These are empirically derived from NSE-listed company data (2024-2025).
 * Used as fallback when live database queries are unavailable.
 * 
 * profitGrowth, fcfGrowth, grossMargin added in TRACK-P1 as provisional values.
 * SourceDataset: "Original raw dataset not committed; values treated as provisional reference calibration."
 */
const REFERENCE_DISTRIBUTIONS: Record<SectorType, SectorDistributions> = {
  BANKING: {
    roa:              { p10: 0.002, p25: 0.004, p50: 0.008, p75: 0.011, p90: 0.014 },
    roe:              { p10: 0.02, p25: 0.06, p50: 0.11, p75: 0.15, p90: 0.18 },
    roic:             { p10: 0.01, p25: 0.04, p50: 0.08, p75: 0.12, p90: 0.15 },
    revenueGrowth:    { p10: -0.02, p25: 0.05, p50: 0.10, p75: 0.16, p90: 0.22 },
    epsGrowth:        { p10: -0.05, p25: 0.03, p50: 0.12, p75: 0.20, p90: 0.30 },
    profitGrowth:     { p10: -0.08, p25: 0.02, p50: 0.10, p75: 0.18, p90: 0.28 },
    fcfGrowth:        { p10: -0.15, p25: -0.05, p50: 0.05, p75: 0.15, p90: 0.25 },
    grossMargin:      { p10: 0.40, p25: 0.50, p50: 0.60, p75: 0.70, p90: 0.80 },
    debtToEquity:     { p10: 2.0, p25: 4.0, p50: 7.0, p75: 10.0, p90: 14.0 },
    operatingMargin:  { p10: 0.10, p25: 0.18, p50: 0.25, p75: 0.32, p90: 0.40 },
    currentRatio:     { p10: 0.6, p25: 0.8, p50: 1.0, p75: 1.1, p90: 1.2 },
    peRatio:          { p10: 6, p25: 10, p50: 15, p75: 22, p90: 30 },
    pbRatio:          { p10: 0.5, p25: 0.9, p50: 1.5, p75: 2.5, p90: 4.0 },
    evEbitda:         { p10: 5, p25: 8, p50: 12, p75: 18, p90: 25 },
    fcfYield:         { p10: -0.02, p25: 0.01, p50: 0.03, p75: 0.05, p90: 0.08 },
    volatility:       { p10: 0.12, p25: 0.18, p50: 0.25, p75: 0.35, p90: 0.45 },
  },
  IT: {
    roa:              { p10: 0.04, p25: 0.08, p50: 0.14, p75: 0.18, p90: 0.24 },
    roe:              { p10: 0.08, p25: 0.15, p50: 0.22, p75: 0.28, p90: 0.35 },
    roic:             { p10: 0.08, p25: 0.14, p50: 0.20, p75: 0.26, p90: 0.32 },
    revenueGrowth:    { p10: 0.02, p25: 0.08, p50: 0.14, p75: 0.20, p90: 0.28 },
    epsGrowth:        { p10: -0.02, p25: 0.06, p50: 0.12, p75: 0.18, p90: 0.25 },
    profitGrowth:     { p10: -0.05, p25: 0.04, p50: 0.10, p75: 0.16, p90: 0.22 },
    fcfGrowth:        { p10: -0.10, p25: 0.02, p50: 0.10, p75: 0.18, p90: 0.25 },
    grossMargin:      { p10: 0.20, p25: 0.30, p50: 0.40, p75: 0.55, p90: 0.70 },
    debtToEquity:     { p10: 0.0, p25: 0.05, p50: 0.15, p75: 0.40, p90: 0.80 },
    operatingMargin:  { p10: 0.12, p25: 0.18, p50: 0.22, p75: 0.28, p90: 0.35 },
    currentRatio:     { p10: 1.0, p25: 1.5, p50: 2.0, p75: 2.8, p90: 3.5 },
    peRatio:          { p10: 12, p25: 18, p50: 25, p75: 35, p90: 50 },
    pbRatio:          { p10: 1.5, p25: 2.5, p50: 4.0, p75: 6.0, p90: 9.0 },
    evEbitda:         { p10: 8, p25: 12, p50: 18, p75: 25, p90: 35 },
    fcfYield:         { p10: 0.00, p25: 0.02, p50: 0.04, p75: 0.06, p90: 0.09 },
    volatility:       { p10: 0.15, p25: 0.20, p50: 0.28, p75: 0.38, p90: 0.50 },
  },
  FMCG: {
    roa:              { p10: 0.06, p25: 0.10, p50: 0.15, p75: 0.20, p90: 0.26 },
    roe:              { p10: 0.12, p25: 0.20, p50: 0.28, p75: 0.35, p90: 0.45 },
    roic:             { p10: 0.12, p25: 0.18, p50: 0.25, p75: 0.32, p90: 0.40 },
    revenueGrowth:    { p10: 0.02, p25: 0.06, p50: 0.10, p75: 0.14, p90: 0.18 },
    epsGrowth:        { p10: 0.00, p25: 0.05, p50: 0.10, p75: 0.15, p90: 0.22 },
    profitGrowth:     { p10: -0.02, p25: 0.04, p50: 0.10, p75: 0.15, p90: 0.20 },
    fcfGrowth:        { p10: -0.05, p25: 0.02, p50: 0.08, p75: 0.14, p90: 0.20 },
    grossMargin:      { p10: 0.30, p25: 0.40, p50: 0.50, p75: 0.60, p90: 0.70 },
    debtToEquity:     { p10: 0.0, p25: 0.02, p50: 0.10, p75: 0.30, p90: 0.60 },
    operatingMargin:  { p10: 0.10, p25: 0.15, p50: 0.20, p75: 0.25, p90: 0.30 },
    currentRatio:     { p10: 0.8, p25: 1.2, p50: 1.5, p75: 2.0, p90: 2.5 },
    peRatio:          { p10: 25, p25: 35, p50: 45, p75: 55, p90: 65 },
    pbRatio:          { p10: 4, p25: 6, p50: 9, p75: 12, p90: 16 },
    evEbitda:         { p10: 15, p25: 20, p50: 28, p75: 35, p90: 45 },
    fcfYield:         { p10: 0.01, p25: 0.02, p50: 0.03, p75: 0.04, p90: 0.06 },
    volatility:       { p10: 0.12, p25: 0.16, p50: 0.20, p75: 0.28, p90: 0.35 },
  },
  PHARMA: {
    roa:              { p10: 0.02, p25: 0.05, p50: 0.09, p75: 0.13, p90: 0.18 },
    roe:              { p10: 0.04, p25: 0.10, p50: 0.16, p75: 0.22, p90: 0.30 },
    roic:             { p10: 0.05, p25: 0.10, p50: 0.15, p75: 0.20, p90: 0.28 },
    revenueGrowth:    { p10: 0.00, p25: 0.06, p50: 0.12, p75: 0.18, p90: 0.25 },
    epsGrowth:        { p10: -0.03, p25: 0.04, p50: 0.12, p75: 0.20, p90: 0.28 },
    profitGrowth:     { p10: -0.05, p25: 0.02, p50: 0.10, p75: 0.18, p90: 0.25 },
    fcfGrowth:        { p10: -0.10, p25: 0.00, p50: 0.08, p75: 0.15, p90: 0.22 },
    grossMargin:      { p10: 0.40, p25: 0.50, p50: 0.60, p75: 0.70, p90: 0.80 },
    debtToEquity:     { p10: 0.0, p25: 0.05, p50: 0.20, p75: 0.50, p90: 1.0 },
    operatingMargin:  { p10: 0.10, p25: 0.16, p50: 0.22, p75: 0.28, p90: 0.35 },
    currentRatio:     { p10: 0.8, p25: 1.2, p50: 1.8, p75: 2.5, p90: 3.0 },
    peRatio:          { p10: 10, p25: 16, p50: 24, p75: 35, p90: 48 },
    pbRatio:          { p10: 1.0, p25: 2.0, p50: 3.5, p75: 5.5, p90: 8.0 },
    evEbitda:         { p10: 8, p25: 12, p50: 18, p75: 26, p90: 35 },
    fcfYield:         { p10: -0.01, p25: 0.01, p50: 0.03, p75: 0.05, p90: 0.07 },
    volatility:       { p10: 0.15, p25: 0.22, p50: 0.30, p75: 0.40, p90: 0.50 },
  },
  AUTO: {
    roa:              { p10: 0.02, p25: 0.04, p50: 0.08, p75: 0.12, p90: 0.16 },
    roe:              { p10: 0.02, p25: 0.08, p50: 0.14, p75: 0.20, p90: 0.28 },
    roic:             { p10: 0.03, p25: 0.08, p50: 0.13, p75: 0.18, p90: 0.25 },
    revenueGrowth:    { p10: -0.05, p25: 0.02, p50: 0.10, p75: 0.18, p90: 0.25 },
    epsGrowth:        { p10: -0.10, p25: 0.00, p50: 0.10, p75: 0.20, p90: 0.30 },
    profitGrowth:     { p10: -0.12, p25: 0.00, p50: 0.08, p75: 0.18, p90: 0.28 },
    fcfGrowth:        { p10: -0.15, p25: -0.05, p50: 0.05, p75: 0.12, p90: 0.20 },
    grossMargin:      { p10: 0.20, p25: 0.28, p50: 0.35, p75: 0.42, p90: 0.50 },
    debtToEquity:     { p10: 0.0, p25: 0.10, p50: 0.40, p75: 0.80, p90: 1.5 },
    operatingMargin:  { p10: 0.04, p25: 0.08, p50: 0.12, p75: 0.16, p90: 0.22 },
    currentRatio:     { p10: 0.6, p25: 0.9, p50: 1.2, p75: 1.5, p90: 2.0 },
    peRatio:          { p10: 8, p25: 14, p50: 20, p75: 28, p90: 40 },
    pbRatio:          { p10: 0.8, p25: 1.5, p50: 2.5, p75: 4.0, p90: 6.0 },
    evEbitda:         { p10: 6, p25: 10, p50: 15, p75: 22, p90: 30 },
    fcfYield:         { p10: -0.02, p25: 0.01, p50: 0.03, p75: 0.05, p90: 0.08 },
    volatility:       { p10: 0.18, p25: 0.25, p50: 0.32, p75: 0.42, p90: 0.52 },
  },
  ENERGY: {
    roa:              { p10: 0.01, p25: 0.03, p50: 0.07, p75: 0.11, p90: 0.15 },
    roe:              { p10: 0.02, p25: 0.06, p50: 0.12, p75: 0.18, p90: 0.24 },
    roic:             { p10: 0.02, p25: 0.06, p50: 0.10, p75: 0.15, p90: 0.20 },
    revenueGrowth:    { p10: -0.05, p25: 0.00, p50: 0.06, p75: 0.14, p90: 0.22 },
    epsGrowth:        { p10: -0.10, p25: -0.02, p50: 0.06, p75: 0.15, p90: 0.25 },
    profitGrowth:     { p10: -0.15, p25: -0.05, p50: 0.05, p75: 0.12, p90: 0.22 },
    fcfGrowth:        { p10: -0.15, p25: -0.05, p50: 0.05, p75: 0.12, p90: 0.20 },
    grossMargin:      { p10: 0.20, p25: 0.30, p50: 0.40, p75: 0.50, p90: 0.60 },
    debtToEquity:     { p10: 0.2, p25: 0.5, p50: 1.0, p75: 2.0, p90: 3.5 },
    operatingMargin:  { p10: 0.06, p25: 0.12, p50: 0.18, p75: 0.25, p90: 0.32 },
    currentRatio:     { p10: 0.5, p25: 0.8, p50: 1.2, p75: 1.5, p90: 2.0 },
    peRatio:          { p10: 6, p25: 10, p50: 16, p75: 24, p90: 35 },
    pbRatio:          { p10: 0.5, p25: 1.0, p50: 1.8, p75: 3.0, p90: 5.0 },
    evEbitda:         { p10: 5, p25: 8, p50: 14, p75: 20, p90: 28 },
    fcfYield:         { p10: -0.01, p25: 0.02, p50: 0.04, p75: 0.07, p90: 0.10 },
    volatility:       { p10: 0.15, p25: 0.20, p50: 0.28, p75: 0.38, p90: 0.50 },
  },
  GENERAL: {
    roa:              { p10: 0.02, p25: 0.05, p50: 0.10, p75: 0.15, p90: 0.20 },
    roe:              { p10: 0.03, p25: 0.08, p50: 0.14, p75: 0.20, p90: 0.28 },
    roic:             { p10: 0.03, p25: 0.08, p50: 0.13, p75: 0.18, p90: 0.25 },
    revenueGrowth:    { p10: -0.03, p25: 0.03, p50: 0.10, p75: 0.16, p90: 0.24 },
    epsGrowth:        { p10: -0.05, p25: 0.02, p50: 0.10, p75: 0.18, p90: 0.28 },
    profitGrowth:     { p10: -0.10, p25: 0.00, p50: 0.08, p75: 0.15, p90: 0.25 },
    fcfGrowth:        { p10: -0.15, p25: -0.02, p50: 0.06, p75: 0.14, p90: 0.22 },
    grossMargin:      { p10: 0.15, p25: 0.25, p50: 0.35, p75: 0.50, p90: 0.65 },
    debtToEquity:     { p10: 0.0, p25: 0.10, p50: 0.40, p75: 1.0, p90: 2.0 },
    operatingMargin:  { p10: 0.05, p25: 0.10, p50: 0.16, p75: 0.22, p90: 0.30 },
    currentRatio:     { p10: 0.6, p25: 1.0, p50: 1.5, p75: 2.0, p90: 3.0 },
    peRatio:          { p10: 8, p25: 14, p50: 22, p75: 32, p90: 48 },
    pbRatio:          { p10: 0.8, p25: 1.5, p50: 2.8, p75: 5.0, p90: 8.0 },
    evEbitda:         { p10: 6, p25: 10, p50: 16, p75: 24, p90: 35 },
    fcfYield:         { p10: -0.02, p25: 0.01, p50: 0.03, p75: 0.05, p90: 0.08 },
    volatility:       { p10: 0.15, p25: 0.20, p50: 0.28, p75: 0.40, p90: 0.52 },
  },
};

// ─── Engine ───────────────────────────────────────────────────────

export class SectorDistributionEngine {
  /**
   * Initialise all sector distributions from reference data.
   * Call this once at application startup.
   */
  static initialise(): void {
    const sectors: SectorType[] = ['BANKING', 'IT', 'FMCG', 'PHARMA', 'AUTO', 'ENERGY', 'GENERAL'];

    for (const sector of sectors) {
      const dists = REFERENCE_DISTRIBUTIONS[sector];
      for (const [metric, ref] of Object.entries(dists) as [PercentileMetric, MetricDistribution][]) {
        // Build values array from percentile reference points
        const values = SectorDistributionEngine.percentilesToValues(ref);
        const distribution = PercentileEngine.buildDistribution(values);
        SectorPercentileEngine.registerBuiltDistribution(
          sector,
          metric,
          distribution,
          100 // approximate peer count for reference data
        );
      }
    }
  }

  /**
   * Initialise distributions for a specific sector.
   */
  static initialiseSector(sector: SectorType): void {
    const dists = REFERENCE_DISTRIBUTIONS[sector];
    if (!dists) return;

    for (const [metric, ref] of Object.entries(dists) as [PercentileMetric, MetricDistribution][]) {
      const values = SectorDistributionEngine.percentilesToValues(ref);
      const distribution = PercentileEngine.buildDistribution(values);
      SectorPercentileEngine.registerBuiltDistribution(sector, metric, distribution, 100);
    }
  }

  /**
   * Get the reference distribution for a sector + metric.
   */
  static getReference(sector: SectorType, metric: PercentileMetric): MetricDistribution | undefined {
    return REFERENCE_DISTRIBUTIONS[sector]?.[metric];
  }

  /**
   * Convert a MetricDistribution to an array of values suitable for
   * building a full Distribution object.
   * Uses a simple linear interpolation between percentile points.
   */
  private static percentilesToValues(ref: MetricDistribution): number[] {
    const values: number[] = [];
    // Generate 100 values approximating the distribution
    // P10 region: 10 values around p10
    for (let i = 0; i < 10; i++) values.push(ref.p10);
    // P10-P25: 15 values linearly interpolated
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      values.push(ref.p10 + (ref.p25 - ref.p10) * t);
    }
    // P25-P50: 25 values
    for (let i = 0; i < 25; i++) {
      const t = i / 24;
      values.push(ref.p25 + (ref.p50 - ref.p25) * t);
    }
    // P50-P75: 25 values
    for (let i = 0; i < 25; i++) {
      const t = i / 24;
      values.push(ref.p50 + (ref.p75 - ref.p50) * t);
    }
    // P75-P90: 15 values
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      values.push(ref.p75 + (ref.p90 - ref.p75) * t);
    }
    // P90 region: 10 values
    for (let i = 0; i < 10; i++) values.push(ref.p90);
    
    return values;
  }
}

export default SectorDistributionEngine;
