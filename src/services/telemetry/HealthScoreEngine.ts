import { HealthStatus } from '../../types/stock';

export class HealthScoreEngine {
  public static calculateHealth(peRatio: number, currentPrice: number, range: { low: number; high: number }): { score: number; status: HealthStatus } {
    // Standardized 150-parameter pipeline proxy: evaluating price stability and relative PE valuation
    let score = 70; // baseline

    // PE evaluation
    if (peRatio > 0) {
      if (peRatio < 15) score += 15;
      else if (peRatio < 25) score += 8;
      else if (peRatio > 50) score -= 15;
    }

    // 52-week position evaluation
    const rangeSpan = range.high - range.low;
    if (rangeSpan > 0) {
      const relativePos = (currentPrice - range.low) / rangeSpan;
      if (relativePos > 0.8) score += 5; // positive momentum stability
      else if (relativePos < 0.2) score -= 10; // weakening structure
    }

    const finalScore = Math.min(100, Math.max(0, score));
    return {
      score: finalScore,
      status: this.deriveStatus(finalScore)
    };
  }

  private static deriveStatus(score: number): HealthStatus {
    if (score >= 85) return 'veryHealthy';
    if (score >= 70) return 'healthy';
    if (score >= 55) return 'stable';
    if (score >= 40) return 'weakening';
    return 'unhealthy';
  }
}

export default HealthScoreEngine;
