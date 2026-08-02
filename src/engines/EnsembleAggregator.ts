export interface SignalSource {
  name: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  confidence: number;
  weight?: number;
}

export interface EnsembleConfig {
  minSignals: number;
  consensusThreshold: number;
  useConfidenceWeighting: boolean;
}

export interface EnsembleOutput {
  consensusDirection: 'bullish' | 'bearish' | 'neutral';
  consensusStrength: number;
  consensusConfidence: number;
  agreementScore: number;
  signalCount: number;
  contributions: Array<{
    name: string;
    contribution: number;
    weight: number;
  }>;
}

const DEFAULT_CONFIG: EnsembleConfig = {
  minSignals: 2,
  consensusThreshold: 0.5,
  useConfidenceWeighting: true,
};

export class EnsembleAggregator {
  private config: EnsembleConfig;

  constructor(config: Partial<EnsembleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  aggregate(signals: SignalSource[]): EnsembleOutput {
    if (signals.length === 0) {
      return {
        consensusDirection: 'neutral',
        consensusStrength: 0,
        consensusConfidence: 0,
        agreementScore: 0,
        signalCount: 0,
        contributions: [],
      };
    }

    const totalWeight = signals.reduce((sum, s) => {
      const w = s.weight ?? 1;
      return sum + (this.config.useConfidenceWeighting ? w * s.confidence : w);
    }, 0) || 1;

    const weightedScore = signals.reduce((sum, s) => {
      const dir = s.direction === 'bullish' ? 1 : s.direction === 'bearish' ? -1 : 0;
      const w = s.weight ?? 1;
      const effectiveWeight = this.config.useConfidenceWeighting ? w * s.confidence : w;
      return sum + dir * s.strength * effectiveWeight;
    }, 0);

    const rawStrength = weightedScore / totalWeight;
    const consensusStrength = Math.max(-1, Math.min(1, rawStrength));
    const consensusDirection = consensusStrength > this.config.consensusThreshold ? 'bullish'
      : consensusStrength < -this.config.consensusThreshold ? 'bearish' : 'neutral';

    const bullishVotes = signals.filter(s => s.direction === 'bullish').length;
    const bearishVotes = signals.filter(s => s.direction === 'bearish').length;
    const totalVotes = signals.length;
    const maxVoteShare = Math.max(bullishVotes, bearishVotes) / totalVotes;
    const agreementScore = (maxVoteShare - 0.5) * 2;

    const meanConfidence = signals.reduce((s, sig) => s + sig.confidence, 0) / signals.length;
    const strengthMagnitude = Math.abs(consensusStrength);
    const consensusConfidence = 0.5 * meanConfidence + 0.3 * strengthMagnitude + 0.2 * agreementScore;

    const baseline = totalWeight;
    const contributions = signals.map(s => {
      const w = s.weight ?? 1;
      const effectiveWeight = this.config.useConfidenceWeighting ? w * s.confidence : w;
      return {
        name: s.name,
        contribution: effectiveWeight / baseline,
        weight: w,
      };
    });

    return {
      consensusDirection,
      consensusStrength,
      consensusConfidence: Math.max(0, Math.min(1, consensusConfidence)),
      agreementScore,
      signalCount: signals.length,
      contributions,
    };
  }

  weightedAggregate(signals: SignalSource[], weights: Record<string, number>): EnsembleOutput {
    const weighted = signals.map(s => ({
      ...s,
      weight: weights[s.name] ?? s.weight ?? 1,
    }));
    return this.aggregate(weighted);
  }
}

export const ensembleAggregator = new EnsembleAggregator();
