import { clampScore, type ConfidenceEngineOutput, type ConfidenceLevel, type EngineInputs } from '../types';
import type { DataQualityResult } from '../../services/quality/DataQualityEngine';
import type { ProviderHealthSnapshot } from '../../services/providers/ProviderHealthService';

export interface ConfidenceEngineV2Context {
  providerHealth?: ProviderHealthSnapshot[];
  dataQuality?: DataQualityResult;
  rankingConfidence?: number | null;
}

export class ConfidenceEngineV2 {
  evaluate(inputs: EngineInputs, context: ConfidenceEngineV2Context = {}): ConfidenceEngineOutput {
    const providerConfidence = this.computeProviderConfidence(context.providerHealth ?? []);
    const snapshotConfidence = context.dataQuality?.score ?? this.computeSnapshotConfidence(inputs);
    const rankingConfidence = context.rankingConfidence ?? this.computeRankingConfidence(inputs);

    const score = clampScore(providerConfidence * 0.35 + snapshotConfidence * 0.4 + rankingConfidence * 0.25);
    const level = this.toLevel(score);

    return {
      level,
      score,
      dataCompleteness: snapshotConfidence,
      signalAgreement: rankingConfidence,
      riskConsistency: providerConfidence,
      historicalStability: rankingConfidence,
      commentary: this.commentary(level, providerConfidence, snapshotConfidence, rankingConfidence),
    };
  }

  private computeProviderConfidence(health: ProviderHealthSnapshot[]): number {
    if (health.length === 0) return 50;
    const weighted = health.map(item => {
      const availability = item.status === 'Healthy' ? 100 : item.status === 'Degraded' ? 60 : item.status === 'RateLimited' ? 35 : 10;
      const reliability = Math.max(0, 100 - item.errorRate * 100);
      const completeness = Math.max(0, Math.min(100, item.completenessAverage * 100));
      return availability * 0.4 + reliability * 0.35 + completeness * 0.25;
    });
    return clampScore(weighted.reduce((sum, value) => sum + value, 0) / weighted.length);
  }

  private computeSnapshotConfidence(inputs: EngineInputs): number {
    const financials = Object.values(inputs.financials);
    const features = Object.values(inputs.features);
    const all = [...financials, ...features];
    const populated = all.filter(value => value !== null && value !== undefined && (typeof value !== 'number' || Number.isFinite(value))).length;
    return clampScore((populated / Math.max(1, all.length)) * 100);
  }

  private computeRankingConfidence(inputs: EngineInputs): number {
    const scores = Object.values(inputs.factors).filter(Number.isFinite);
    if (scores.length === 0) return 50;
    const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const variance = scores.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / scores.length;
    return clampScore(100 - Math.sqrt(variance) * 2);
  }

  private toLevel(score: number): ConfidenceLevel {
    if (score >= 80) return 'Very High';
    if (score >= 65) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }

  private commentary(level: ConfidenceLevel, provider: number, snapshot: number, ranking: number): string {
    return `${level} confidence. Provider reliability ${provider}/100, snapshot quality ${snapshot}/100, ranking consistency ${ranking}/100.`;
  }
}

export default ConfidenceEngineV2;
