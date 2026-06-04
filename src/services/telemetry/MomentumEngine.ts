import { MomentumStatus } from '../../types/stock';

export class MomentumEngine {
  public static calculateMomentum(currentPrice: number, range: { low: number; high: number }): { score: number; status: MomentumStatus } {
    // Momentum tracking proxy evaluating short-term vs long-term range relative positioning
    let score = 50; // baseline

    const rangeSpan = range.high - range.low;
    if (rangeSpan > 0) {
      const positionFactor = (currentPrice - range.low) / rangeSpan;
      score = Math.round(positionFactor * 100);
    }

    return {
      score,
      status: this.deriveStatus(score)
    };
  }

  private static deriveStatus(score: number): MomentumStatus {
    if (score >= 70) return 'accelerating';
    if (score >= 40) return 'stable';
    return 'decelerating';
  }
}

export default MomentumEngine;
