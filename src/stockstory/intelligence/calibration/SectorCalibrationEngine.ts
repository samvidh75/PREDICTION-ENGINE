/**
 * Sector Calibration Engine
 * Phase 6 — Adjusts scoring weights, PE/PB ranges, and key metrics
 * per sector to match Indian market realities.
 */
import { DEFAULT_CALIBRATION, type CalibrationConfig, type SectorCalibration } from './CalibrationTypes';

export class SectorCalibrationEngine {
  private config: CalibrationConfig;

  constructor(config?: CalibrationConfig) {
    this.config = config ?? DEFAULT_CALIBRATION;
  }

  /** Get calibration for a specific sector */
  getSectorCalibration(sector: string): SectorCalibration {
    const override = this.config.sectorOverrides[sector];
    if (override) return override;

    // Default sector calibration
    return {
      qualityMultiplier: 1.0,
      peRange: { min: 10, max: 30 },
      pbRange: { min: 1, max: 5 },
      keyMetrics: ['revenueGrowth', 'profitMargin', 'roce'],
      deprioritizedMetrics: [],
      maxDebtToEquity: 1.5,
      factorWeights: { quality: 0.30, valuation: 0.30, momentum: 0.20, risk: 0.20 },
    };
  }

  /** Adjust a quality score based on sector calibration */
  adjustQualityScore(sector: string, rawScore: number): number {
    const cal = this.getSectorCalibration(sector);
    return Math.min(1.0, Math.max(0.0, rawScore * cal.qualityMultiplier));
  }

  /** Check if PE is within sector-appropriate range */
  isPERangeValid(sector: string, pe: number): boolean {
    const cal = this.getSectorCalibration(sector);
    return pe >= cal.peRange.min && pe <= cal.peRange.max;
  }

  /** Check if PB is within sector-appropriate range */
  isPBRangeValid(sector: string, pb: number): boolean {
    const cal = this.getSectorCalibration(sector);
    return pb >= cal.pbRange.min && pb <= cal.pbRange.max;
  }

  /** Check if debt-to-equity is acceptable for sector */
  isDebtAcceptable(sector: string, dte: number): boolean {
    const cal = this.getSectorCalibration(sector);
    return dte <= cal.maxDebtToEquity;
  }

  /** Get key metrics that matter for a sector */
  getKeyMetrics(sector: string): string[] {
    return this.getSectorCalibration(sector).keyMetrics;
  }

  /** Get factor weights for composite scoring */
  getFactorWeights(sector: string): Record<string, number> {
    return this.getSectorCalibration(sector).factorWeights;
  }
}
