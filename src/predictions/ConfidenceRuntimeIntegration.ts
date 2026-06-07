/**
 * ConfidenceRuntimeIntegration — TRACK-34 Phase 1
 *
 * Activates ConfidenceEngineV2 in the production ranking pipeline.
 * Previously, V1 was active (simple score → level mapping in factor_snapshots).
 * V2 is a 3-dimensional engine: provider confidence × snapshot confidence × ranking confidence.
 *
 * Wiring points:
 *   1. ProviderCoordinator → after fetching financials, invoke V2 with source metadata
 *   2. Ranking pipeline → after factor computation, invoke V2 with factor scores
 *   3. API responses → include confidence_score and confidence_level from V2
 *
 * This integration generates:
 *   - confidence_score (0-100)
 *   - confidence_level (Very High / High / Medium / Low)
 *   - provider_quality (0-1)
 *   - snapshot_quality (0-1)
 *   - ranking_quality (0-1)
 */
import ConfidenceEngineV2 from '../quality/ConfidenceEngineV2';
import type { ConfidenceResult, ConfidenceLevel } from '../quality/ConfidenceEngineV2';

export interface RuntimeConfidenceInput {
  symbol: string;
  fieldsPopulated: number;
  totalFields: number;
  sources: Record<string, string>;
  stalenessDays: number;
  factorScores?: {
    qualityFactor: number;
    growthFactor: number;
    valueFactor: number;
    momentumFactor: number;
    riskFactor: number;
  };
}

export interface RuntimeConfidenceOutput {
  symbol: string;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  provider_quality: number;
  snapshot_quality: number;
  ranking_quality: number;
  data_completeness: number;
  signal_agreement: number;
  commentary: string;
}

export class ConfidenceRuntimeIntegration {
  private v2: ConfidenceEngineV2;

  constructor() {
    this.v2 = new ConfidenceEngineV2();
  }

  /**
   * Compute V2 confidence for a single symbol during the ranking pipeline.
   * Called after ProviderCoordinator populates financial + factor data.
   */
  computeRuntimeConfidence(input: RuntimeConfidenceInput): RuntimeConfidenceOutput {
    const result: ConfidenceResult = this.v2.compute(
      input.fieldsPopulated,
      input.totalFields,
      input.sources,
      input.stalenessDays,
      input.factorScores,
    );

    return {
      symbol: input.symbol,
      confidence_score: result.score,
      confidence_level: result.level,
      provider_quality: result.providerConfidence,
      snapshot_quality: result.snapshotConfidence,
      ranking_quality: result.rankingConfidence,
      data_completeness: result.dataCompleteness,
      signal_agreement: result.signalAgreement,
      commentary: result.commentary,
    };
  }

  /**
   * Batch compute for all symbols in a ranking run.
   * Called at end of daily ranking pipeline.
   */
  computeBatch(inputs: RuntimeConfidenceInput[]): RuntimeConfidenceOutput[] {
    return inputs.map(input => this.computeRuntimeConfidence(input));
  }

  /**
   * Compare V1 (existing factor_snapshots.confidence_score) with V2 output.
   * Returns upgrade recommendations.
   */
  compareWithV1(v1Score: number, v1Level: string, v2Output: RuntimeConfidenceOutput): {
    agreement: boolean;
    delta: number;
    recommendation: 'upgrade_v1' | 'retain_v1' | 'use_v2';
    reason: string;
  } {
    const v2Score = v2Output.confidence_score;
    const delta = v2Score - v1Score;

    // Significant disagreement (>15 points) means V2 has more data to assess
    if (Math.abs(delta) > 15) {
      return {
        agreement: false,
        delta,
        recommendation: 'use_v2',
        reason: `V2 differs from V1 by ${delta} points. V2 incorporates provider quality and snapshot freshness — V1 only uses factor signal agreement. V2 is more reliable.`,
      };
    }

    if (v2Score > v1Score + 5) {
      return {
        agreement: false,
        delta,
        recommendation: 'upgrade_v1',
        reason: `V2 scores ${delta} points higher — provider data quality and snapshot completeness improve confidence over V1's factor-only assessment.`,
      };
    }

    return {
      agreement: true,
      delta,
      recommendation: 'retain_v1',
      reason: `V1 (${v1Score}) and V2 (${v2Score}) agree within ${Math.abs(delta)} points.`,
    };
  }
}

export const confidenceRuntimeIntegration = new ConfidenceRuntimeIntegration();
export default ConfidenceRuntimeIntegration;
