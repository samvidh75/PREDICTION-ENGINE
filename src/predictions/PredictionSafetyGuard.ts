/**
 * TRACK-96D — Prediction Safety Guard
 * 
 * Prevents publication of degraded predictions.
 * Consulted before new rankings are published.
 * 
 * Rules from prediction_registry validated outcomes only.
 */
import { modelHealthEngine } from '../validation/ModelHealthEngine';
import { accuracyEngine } from '../validation/PredictionAccuracyEngine';

export interface SafetyDecision {
  safeToPublish: boolean;
  blockingReasons: string[];
  healthStatus: 'Healthy' | 'Warning' | 'Critical';
  checkedAt: string;
}

export class PredictionSafetyGuard {
  async evaluate(): Promise<SafetyDecision> {
    const blockingReasons: string[] = [];

    const [health, scorecard, calibration] = await Promise.all([
      modelHealthEngine.assess(),
      accuracyEngine.getScorecard(),
      accuracyEngine.getCalibrationCurve(),
    ]);

    // Hit rate check
    if (scorecard.hitRate < 55) {
      blockingReasons.push(`Hit rate below 55% (current: ${scorecard.hitRate}%)`);
    }

    // Calibration error check
    const avgCalibrationError = calibration.length > 0
      ? calibration.reduce((s, c) => s + c.error, 0) / calibration.length
      : 0;
    if (avgCalibrationError > 15) {
      blockingReasons.push(`Calibration error above 15% (current: ${Math.round(avgCalibrationError)}%)`);
    }

    // Critical drift check
    if (health.overallHealth === 'Critical') {
      blockingReasons.push(`Model health critical: ${health.status}`);
    }

    // Factor collapse check — if best factor hit rate is below random (50%)
    const bestFactor = scorecard.factorRanking?.[0];
    if (bestFactor && bestFactor.hitRate < 50) {
      blockingReasons.push(`All factors below random threshold (best: ${bestFactor.factor} at ${bestFactor.hitRate}%)`);
    }

    const safeToPublish = blockingReasons.length === 0;

    return {
      safeToPublish,
      blockingReasons,
      healthStatus: health.overallHealth,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const predictionSafetyGuard = new PredictionSafetyGuard();
export default PredictionSafetyGuard;
