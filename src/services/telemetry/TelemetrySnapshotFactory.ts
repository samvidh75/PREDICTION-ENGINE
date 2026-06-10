import { CompanyTelemetry, TelemetrySnapshot } from '../../types/stock';
import { HealthScoreEngine } from './HealthScoreEngine';
import { ConfidenceScoreEngine } from './ConfidenceScoreEngine';
import { ValuationEngine } from './ValuationEngine';
import { MomentumEngine } from './MomentumEngine';

export class TelemetrySnapshotFactory {
  /**
   * Transforms raw fundamental/technical CompanyTelemetry data into
   * our standardized, SEBI-safe, high-fidelity TelemetrySnapshot structure.
   */
  public static create(data: CompanyTelemetry): TelemetrySnapshot {
    const range = {
      low: data.fiftyTwoWeekRange?.low ?? 0,
      high: data.fiftyTwoWeekRange?.high ?? 1,
      current: data.fiftyTwoWeekRange?.current ?? 0.5,
    };
    const peRatio = data.peRatio ?? 0;
    
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
      
      lastUpdated: new Date().toISOString()
    };
  }
}

export default TelemetrySnapshotFactory;
