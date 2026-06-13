/**
 * Prediction Engine Adapter for samvidh75/prediction-engine_22
 * This module provides a compatible interface to prediction-engine_22
 * For systems without external dependency, uses Stage 11 PredictionEngine as fallback
 */

import { ICompanyTelemetry, HealthStatus } from '../types/market';
import PredictionEngine from '../services/PredictionEngine';

export interface HealthVector {
  volatility: number;
  liquidity: number;
  priceChange: number;
  volumeRatio: number;
  peRatio: number;
  dividendYield: number;
}

export interface PredictiveEngineOutput {
  healthStatus: HealthStatus;
  confidenceScore: number;
  probabilityDistribution: {
    veryHealthy: number;
    healthy: number;
    stable: number;
    weakening: number;
    unhealthy: number;
  };
  riskMetrics: {
    volatilityIndex: number;
    liquidityScore: number;
    correlationIndex: number;
  };
  trendVector: {
    direction: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL';
    magnitude: number;
    momentum: number;
  };
}

/**
 * Adaptive prediction engine that bridges to samvidh75/prediction-engine_22
 * Falls back to Stage 11 logic if external engine unavailable
 */
export class PredictionEngineAdapter {
  private externalEngine: any = null;
  private useExternal: boolean = false;

  constructor() {
    this.initializeEngine();
  }

  /**
   * Initialize external engine if available
   */
  private initializeEngine(): void {
    try {
      // Attempt to import external engine
      // In production, this would be: import { predictionEngine } from 'samvidh75/prediction-engine_22';
      // For now, we'll gracefully degrade to Stage 11
      this.useExternal = false;
    } catch (error) {
      console.warn(
        '⚠️ External prediction-engine_22 not available. Using Stage 11 fallback.',
        error
      );
      this.useExternal = false;
    }
  }

  /**
   * Evaluate market health from telemetry data
   */
  async evaluateHealth(telemetry: ICompanyTelemetry): Promise<PredictiveEngineOutput> {
    try {
      if (this.useExternal && this.externalEngine) {
        return await this.evaluateWithExternalEngine(telemetry);
      }

      // Fall back to Stage 11 prediction logic
      return this.evaluateWithStage11(telemetry);
    } catch (error) {
      console.error('Health evaluation error:', error);
      return this.generateDefaultOutput(telemetry);
    }
  }

  /**
   * Batch evaluate multiple telemetries
   */
  async evaluateBatch(telemetries: ICompanyTelemetry[]): Promise<Map<string, PredictiveEngineOutput>> {
    const results = new Map<string, PredictiveEngineOutput>();

    for (const telemetry of telemetries) {
      const output = await this.evaluateHealth(telemetry);
      results.set(telemetry.symbol, output);
    }

    return results;
  }

  /**
   * Evaluate using external engine (when available)
   */
  private async evaluateWithExternalEngine(
    telemetry: ICompanyTelemetry
  ): Promise<PredictiveEngineOutput> {
    const healthVector = this.convertToHealthVector(telemetry);
    const engineOutput = await this.externalEngine.evaluateHealth(healthVector);

    return {
      healthStatus: engineOutput.status,
      confidenceScore: engineOutput.confidence,
      probabilityDistribution: engineOutput.probabilities,
      riskMetrics: engineOutput.risks,
      trendVector: engineOutput.trend,
    };
  }

  /**
   * Evaluate using Stage 11 prediction engine
   */
  private evaluateWithStage11(telemetry: ICompanyTelemetry): PredictiveEngineOutput {
    // Use Stage 11 prediction
    const prediction = PredictionEngine.generatePrediction(telemetry);

    // Calculate probability distribution
    const healthScore =
      prediction.healthStatus === 'VERY_HEALTHY'
        ? 0.85
        : prediction.healthStatus === 'HEALTHY'
          ? 0.70
          : prediction.healthStatus === 'STABLE'
            ? 0.50
            : prediction.healthStatus === 'WEAKENING'
              ? 0.30
              : 0.10;

    // Distribute probabilities around calculated health score
    const distribution = this.calculateProbabilityDistribution(healthScore);

    return {
      healthStatus: prediction.healthStatus,
      confidenceScore: prediction.confidenceScore,
      probabilityDistribution: distribution,
      riskMetrics: {
        volatilityIndex: prediction.volatilityIndex,
        liquidityScore: this.calculateLiquidityScore(telemetry),
        correlationIndex: this.calculateCorrelationIndex(telemetry),
      },
      trendVector: {
        direction: prediction.trendDirection,
        magnitude: Math.abs(telemetry.priceChangePercent),
        momentum: this.calculateMomentum(telemetry),
      },
    };
  }

  /**
   * Convert telemetry to health vector for external engine
   */
  private convertToHealthVector(telemetry: ICompanyTelemetry): HealthVector {
    return {
      volatility: Math.abs(telemetry.priceChangePercent) * 10,
      liquidity: Math.min((telemetry.volume / telemetry.avgVolume) * 100, 100),
      priceChange: telemetry.priceChangePercent,
      volumeRatio: telemetry.volume / Math.max(telemetry.avgVolume, 1),
      peRatio: telemetry.peRatio || 20,
      dividendYield: telemetry.dividendYield || 0,
    };
  }

  /**
   * Calculate probability distribution across health states
   */
  private calculateProbabilityDistribution(
    healthScore: number
  ): PredictiveEngineOutput['probabilityDistribution'] {
    // Distribute probabilities in a bell curve around the calculated health score
    const total = 1.0;

    if (healthScore >= 0.8) {
      return {
        veryHealthy: 0.40,
        healthy: 0.35,
        stable: 0.15,
        weakening: 0.07,
        unhealthy: 0.03,
      };
    } else if (healthScore >= 0.65) {
      return {
        veryHealthy: 0.15,
        healthy: 0.50,
        stable: 0.25,
        weakening: 0.08,
        unhealthy: 0.02,
      };
    } else if (healthScore >= 0.45) {
      return {
        veryHealthy: 0.05,
        healthy: 0.15,
        stable: 0.60,
        weakening: 0.15,
        unhealthy: 0.05,
      };
    } else if (healthScore >= 0.25) {
      return {
        veryHealthy: 0.02,
        healthy: 0.08,
        stable: 0.25,
        weakening: 0.50,
        unhealthy: 0.15,
      };
    } else {
      return {
        veryHealthy: 0.01,
        healthy: 0.02,
        stable: 0.07,
        weakening: 0.30,
        unhealthy: 0.60,
      };
    }
  }

  /**
   * Calculate liquidity score (0-100)
   */
  private calculateLiquidityScore(telemetry: ICompanyTelemetry): number {
    const volumeRatio = telemetry.volume / Math.max(telemetry.avgVolume, 1);
    return Math.min(volumeRatio * 50 + 50, 100);
  }

  /**
   * Calculate market correlation index
   */
  private calculateCorrelationIndex(telemetry: ICompanyTelemetry): number {
    // Simplified: correlate PE ratio movement with sector
    // In production, this would compare against sector benchmarks
    const pe = telemetry.peRatio ?? 20;
    return Math.min(Math.abs(pe) / 50 * 100, 100);
  }

  /**
   * Calculate price momentum
   */
  private calculateMomentum(telemetry: ICompanyTelemetry): number {
    const changePercent = Math.abs(telemetry.priceChangePercent);
    // Map percentage change to momentum (0-1)
    return Math.min(changePercent / 10, 1.0);
  }

  /**
   * Generate default output when evaluation fails
   */
  private generateDefaultOutput(telemetry: ICompanyTelemetry): PredictiveEngineOutput {
    return {
      healthStatus: 'STABLE',
      confidenceScore: 0.5,
      probabilityDistribution: {
        veryHealthy: 0.05,
        healthy: 0.15,
        stable: 0.60,
        weakening: 0.15,
        unhealthy: 0.05,
      },
      riskMetrics: {
        volatilityIndex: 50,
        liquidityScore: 50,
        correlationIndex: 50,
      },
      trendVector: {
        direction: 'NEUTRAL',
        magnitude: 0,
        momentum: 0,
      },
    };
  }

  /**
   * Get engine status
   */
  getStatus(): { isExternal: boolean; available: boolean } {
    return {
      isExternal: this.useExternal,
      available: this.useExternal && this.externalEngine !== null,
    };
  }
}

/**
 * Singleton instance
 */
export const predictionEngineAdapter = new PredictionEngineAdapter();

export default predictionEngineAdapter;
