import { ValuationStatus } from '../../types/stock';

export class ValuationEngine {
  public static calculateValuation(peRatio: number): { score: number; status: ValuationStatus } {
    // Valuation evaluation proxy based on standard trailing P/E bounds
    let score = 50; // baseline

    if (peRatio <= 0) {
      return { score: 0, status: 'overvalued' };
    }

    if (peRatio < 15) {
      score = 80;
    } else if (peRatio < 28) {
      score = 65;
    } else if (peRatio < 45) {
      score = 45;
    } else {
      score = 25;
    }

    return {
      score,
      status: this.deriveStatus(score)
    };
  }

  private static deriveStatus(score: number): ValuationStatus {
    if (score >= 75) return 'undervalued';
    if (score >= 55) return 'fairlyPriced';
    if (score >= 35) return 'premium';
    return 'overvalued';
  }
}

export default ValuationEngine;
