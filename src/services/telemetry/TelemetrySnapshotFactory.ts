import { CompanyTelemetry, TelemetrySnapshot } from '../../types/stock';
import { HealthScoreEngine } from './HealthScoreEngine';
import { ConfidenceScoreEngine } from './ConfidenceScoreEngine';
import { ValuationEngine } from './ValuationEngine';
import { MomentumEngine } from './MomentumEngine';

function positiveNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export class TelemetrySnapshotFactory {
  /**
   * Transforms source-backed fundamental and technical telemetry into a
   * standardized snapshot. Missing PE or 52-week range inputs make the snapshot
   * unavailable; they are never replaced with neutral-looking placeholder values.
   */
  public static create(data: CompanyTelemetry): TelemetrySnapshot | null {
    const peRatio = positiveNumber(data.peRatio);
    const low = positiveNumber(data.fiftyTwoWeekRange?.low);
    const high = positiveNumber(data.fiftyTwoWeekRange?.high);
    const current = positiveNumber(data.fiftyTwoWeekRange?.current);

    if (peRatio === null || low === null || high === null || current === null || high <= low) {
      return null;
    }

    const range = { low, high, current };

    // 1. Calculate Health score
    const health = HealthScoreEngine.calculateHealth(peRatio, range.current, range);

    // 2. Calculate Confidence score
    const confidence = ConfidenceScoreEngine.calculateConfidence(peRatio, data.symbol);

    // 3. Calculate Valuation score
    const valuation = ValuationEngine.calculateValuation(peRatio);

    // 4. Calculate Momentum score
    const momentum = MomentumEngine.calculateMomentum(range.current, range);

    return {
      healthScore: health.score,
      healthStatus: health.status,

      confidenceScore: confidence.score,
      confidenceStatus: confidence.status,

      valuationScore: valuation.score,
      valuationStatus: valuation.status,

      momentumScore: momentum.score,
      momentumStatus: momentum.status,

      lastUpdated: data.lastUpdated ?? new Date().toISOString(),
    };
  }
}

export default TelemetrySnapshotFactory;
