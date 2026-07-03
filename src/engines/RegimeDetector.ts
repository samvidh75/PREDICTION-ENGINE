export type MarketRegime =
  | 'bull_steady'
  | 'bull_volatile'
  | 'bear_steady'
  | 'bear_volatile'
  | 'sideways_low_vol'
  | 'sideways_high_vol'
  | 'crisis'
  | 'recovery';

export interface RegimeFeatures {
  dailyReturns: number[];
  volumes: number[];
  vix: number[];
  breadth: number[];
}

export interface RegimeDetectionResult {
  regime: MarketRegime;
  confidence: number;
  trend: 'bullish' | 'bearish' | 'sideways';
  volatility: 'low' | 'medium' | 'high';
  momentum: number;
  strength: number;
  duration: number;
  transitionProbability: Record<MarketRegime, number>;
}

export class RegimeDetector {
  detect(returns: number[], lookback: number = 252): RegimeDetectionResult {
    const recent = returns.slice(-lookback);
    if (recent.length < 20) {
      return this.fallbackRegime();
    }

    const totalReturn = recent.reduce((a, b) => a + b, 0);
    const annualizedReturn = totalReturn * (252 / recent.length);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((s, r) => s + (r - mean) ** 2, 0) / (recent.length - 1);
    const annVol = Math.sqrt(variance) * Math.sqrt(252);

    const positiveDays = recent.filter(r => r > 0).length;
    const negativeDays = recent.filter(r => r < 0).length;
    const trend = annualizedReturn > 0.05 ? 'bullish'
      : annualizedReturn < -0.05 ? 'bearish' : 'sideways';

    const volLevel = annVol < 0.15 ? 'low' : annVol < 0.30 ? 'medium' : 'high';

    const recentReturns = recent.slice(-20);
    const momentum = recentReturns.reduce((a, b) => a + b, 0);

    const regime = this.classifyRegime(trend, volLevel, annualizedReturn, annVol, momentum, positiveDays, negativeDays);

    const strength = Math.min(Math.abs(annualizedReturn) / Math.max(annVol, 0.01), 2) / 2;

    const confidence = Math.min(recent.length / 252, 1) * (1 - Math.min(variance * 100, 0.5));

    const duration = this.estimateDuration(recent);

    const transitionProbability = this.computeTransitionProbs(regime);

    return {
      regime,
      confidence,
      trend,
      volatility: volLevel,
      momentum,
      strength,
      duration,
      transitionProbability,
    };
  }

  private classifyRegime(
    trend: string,
    vol: string,
    annRet: number,
    annVol: number,
    momentum: number,
    positiveDays: number,
    negativeDays: number,
  ): MarketRegime {
    if (annRet < -0.2 && annVol > 0.35) return 'crisis';
    if (annRet > 0.15 && annVol < 0.2) return 'bull_steady';
    if (annRet > 0.15 && annVol >= 0.2) return 'bull_volatile';
    if (annRet < -0.1 && annVol < 0.2) return 'bear_steady';
    if (annRet < -0.1 && annVol >= 0.2) return 'bear_volatile';
    if (Math.abs(annRet) < 0.05 && annVol < 0.15) return 'sideways_low_vol';
    if (Math.abs(annRet) < 0.05 && annVol >= 0.15) return 'sideways_high_vol';
    if (annRet > 0 && positiveDays > negativeDays * 1.5) return 'recovery';
    return 'sideways_low_vol';
  }

  private estimateDuration(returns: number[]): number {
    const recent = returns.slice(-63);
    const sign = recent[0] > 0 ? 1 : -1;
    let duration = 0;
    for (let i = 1; i < recent.length; i++) {
      if ((recent[i] > 0 ? 1 : -1) === sign) duration++;
      else break;
    }
    return duration;
  }

  private computeTransitionProbs(current: MarketRegime): Record<MarketRegime, number> {
    const allRegimes: MarketRegime[] = [
      'bull_steady', 'bull_volatile', 'bear_steady', 'bear_volatile',
      'sideways_low_vol', 'sideways_high_vol', 'crisis', 'recovery',
    ];
    const probs: Record<string, number> = {};
    const equalProb = 1 / allRegimes.length;

    for (const regime of allRegimes) {
      if (regime === current) {
        probs[regime] = 0.4;
      } else if (
        (current === 'bull_steady' && regime === 'bull_volatile') ||
        (current === 'bull_volatile' && regime === 'sideways_high_vol') ||
        (current === 'crisis' && regime === 'recovery') ||
        (current === 'recovery' && regime === 'bull_steady')
      ) {
        probs[regime] = 0.15;
      } else {
        probs[regime] = equalProb * 0.6;
      }
    }

    const total = Object.values(probs).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(probs)) {
      probs[key] = probs[key] / total;
    }

    return probs as Record<MarketRegime, number>;
  }

  private fallbackRegime(): RegimeDetectionResult {
    const allRegimes: MarketRegime[] = [
      'bull_steady', 'bull_volatile', 'bear_steady', 'bear_volatile',
      'sideways_low_vol', 'sideways_high_vol', 'crisis', 'recovery',
    ];
    const equalProb = 1 / allRegimes.length;
    const transitionProbability = {} as Record<MarketRegime, number>;
    for (const r of allRegimes) transitionProbability[r] = equalProb;

    return {
      regime: 'sideways_low_vol',
      confidence: 0,
      trend: 'sideways',
      volatility: 'low',
      momentum: 0,
      strength: 0,
      duration: 0,
      transitionProbability,
    };
  }
}

export const regimeDetector = new RegimeDetector();
