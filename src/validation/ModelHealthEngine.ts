/**
 * TRACK-96D — Model Health Engine
 * 
 * Unified health assessment combining hit rate, alpha trend, calibration,
 * and drift into a single actionable health status.
 * 
 * All data from prediction_registry validated outcomes only.
 */
import { accuracyEngine } from './PredictionAccuracyEngine';
import pool from '../db/index';

export interface ModelHealth {
  overallHealth: 'Healthy' | 'Warning' | 'Critical';
  status: string;
  hitRateTrend: number;
  alphaTrend: number;
  calibrationTrend: number;
  driftTrend: number;
  lastUpdated: string;
  details: {
    currentHitRate: number;
    previousHitRate: number;
    currentAlpha: number;
    previousAlpha: number;
    currentCalibrationError: number;
    previousCalibrationError: number;
  };
}

export class ModelHealthEngine {
  async assess(): Promise<ModelHealth> {
    const [scorecard, drift, prevMetrics] = await Promise.all([
      accuracyEngine.getScorecard(),
      accuracyEngine.detectDrift(),
      this.getPreviousPeriodMetrics(),
    ]);

    const currentHitRate = scorecard.hitRate;
    const previousHitRate = prevMetrics.hitRate;
    const hitRateTrend = Math.round((currentHitRate - previousHitRate) * 10) / 10;

    const currentAlpha = scorecard.alphaRate;
    const previousAlpha = prevMetrics.alphaRate;
    const alphaTrend = Math.round((currentAlpha - previousAlpha) * 10) / 10;

    const currentCalibrationError = scorecard.calibration;
    const previousCalibrationError = prevMetrics.calibrationError;
    const calibrationTrend = Math.round((currentCalibrationError - previousCalibrationError) * 10) / 10;

    const driftTrend = drift.hitRateChange;

    let overallHealth: ModelHealth['overallHealth'] = 'Healthy';
    let status = 'All metrics within acceptable ranges.';
    const warnings: string[] = [];

    if (currentHitRate < 55) {
      overallHealth = 'Critical';
      warnings.push(`Hit rate critical: ${currentHitRate}%`);
    } else if (currentHitRate < 60) {
      if (overallHealth === 'Healthy') overallHealth = 'Warning';
      warnings.push(`Hit rate below threshold: ${currentHitRate}%`);
    }

    if (driftTrend < -5) {
      overallHealth = 'Critical';
      warnings.push(`Severe performance drift: ${driftTrend}pp`);
    } else if (driftTrend < -2) {
      if (overallHealth === 'Healthy') overallHealth = 'Warning';
      warnings.push(`Performance declining: ${driftTrend}pp`);
    }

    if (currentCalibrationError > 15) {
      overallHealth = 'Critical';
      warnings.push(`Critical calibration error: ${currentCalibrationError}%`);
    } else if (currentCalibrationError > 10) {
      if (overallHealth === 'Healthy') overallHealth = 'Warning';
      warnings.push(`Elevated calibration error: ${currentCalibrationError}%`);
    }

    if (alphaTrend < -2) {
      if (overallHealth === 'Healthy') overallHealth = 'Warning';
      warnings.push(`Alpha declining: ${alphaTrend}pp`);
    }

    if (warnings.length > 0) status = warnings.join(' | ');

    return {
      overallHealth, status, hitRateTrend, alphaTrend, calibrationTrend, driftTrend,
      lastUpdated: new Date().toISOString(),
      details: { currentHitRate, previousHitRate, currentAlpha, previousAlpha, currentCalibrationError, previousCalibrationError },
    };
  }

  private async getPreviousPeriodMetrics(): Promise<{ hitRate: number; alphaRate: number; calibrationError: number }> {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          ROUND(SUM(CASE WHEN future_return > 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as "hitRate",
          ROUND(AVG(alpha) * 100, 2) as "avgAlpha",
          ROUND(AVG(ABS(confidence_score / 100.0 - CASE WHEN future_return > 0 THEN 1 ELSE 0 END)) * 100, 2) as "calibrationError"
        FROM prediction_registry
        WHERE validation_status = 'validated'
          AND future_return IS NOT NULL
          AND prediction_horizon = 30
          AND prediction_date >= date('now', '-60 days')
          AND prediction_date < date('now', '-30 days')
      `;
      const rows = (await pool.query(query)).rows;
      const r = rows[0] ?? {};
      return { hitRate: Number(r.hitRate ?? 0), alphaRate: Number(r.avgAlpha ?? 0), calibrationError: Number(r.calibrationError ?? 0) };
    } catch {
      return { hitRate: 0, alphaRate: 0, calibrationError: 0 };
    }
  }
}

export const modelHealthEngine = new ModelHealthEngine();
export default ModelHealthEngine;
