import { ConfidenceStatus } from '../../types/stock';

export class ConfidenceScoreEngine {
  public static calculateConfidence(peRatio: number, symbol: string): { score: number; status: ConfidenceStatus } {
    // Model predictive confidence proxy: evaluates dataset completeness based on ticker size and evaluation bounds
    let score = 75; // baseline

    // evaluate ticker string size for data density proxy
    if (symbol.length <= 4) score += 10;
    
    // stable PE environments have higher predictability confidence
    if (peRatio > 12 && peRatio < 30) {
      score += 8;
    } else if (peRatio > 60 || peRatio <= 0) {
      score -= 15;
    }

    const finalScore = Math.min(100, Math.max(0, score));
    return {
      score: finalScore,
      status: this.deriveStatus(finalScore)
    };
  }

  private static deriveStatus(score: number): ConfidenceStatus {
    if (score >= 85) return 'strong';
    if (score >= 70) return 'rising';
    if (score >= 55) return 'neutral';
    if (score >= 40) return 'weak';
    return 'veryWeak';
  }
}

export default ConfidenceScoreEngine;
