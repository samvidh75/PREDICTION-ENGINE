/**
 * ConfidenceEngineV2 — TRACK-21 Phase 6 Task 17
 *
 * Computes confidence scores across three dimensions:
 *   1. Provider confidence — trustworthiness of data source per field
 *   2. Snapshot confidence — data completeness + freshness
 *   3. Ranking confidence — signal agreement + extremeness
 *
 * Produces a composite confidence score (0-100) and level (Very High → Low).
 *
 * Confidence Levels:
 *   Very High:  80-100  — 18+ fields from verified APIs, fresh data, clear signal
 *   High:       65-79   — 15+ fields, primarily API-sourced
 *   Medium:     45-64   — 10+ fields, mixed sources
 *   Low:        0-44    — <10 fields, scraping-only, stale
 */

export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export interface ConfidenceResult {
  score: number;                  // 0-100
  level: ConfidenceLevel;
  providerConfidence: number;     // 0-1
  snapshotConfidence: number;     // 0-1
  rankingConfidence: number;      // 0-1
  dataCompleteness: number;       // 0-1 (fields populated / total)
  signalAgreement: number;        // 0-1
  commentary: string;
}

/** Provider base confidence weights (from TRACK-20 scorecards). */
const PROVIDER_WEIGHTS: Record<string, number> = {
  'FinnhubProvider': 0.85,
  'UpstoxFundamentalsProvider': 0.90,
  'YahooProvider': 0.95,
  'DerivedMetricsEngine': 0.80,
  'ScreenerProvider': 0.55,
};

/** Confidence decay over time. */
const FRESHNESS_DECAY: Array<{ maxDays: number; factor: number }> = [
  { maxDays: 30, factor: 1.00 },
  { maxDays: 60, factor: 0.95 },
  { maxDays: 90, factor: 0.85 },
  { maxDays: 180, factor: 0.70 },
  { maxDays: 365, factor: 0.50 },
  { maxDays: Infinity, factor: 0.20 },
];

export class ConfidenceEngineV2 {
  /**
   * Compute confidence for a single symbol.
   */
  compute(
    fieldsPopulated: number,
    totalFields: number,
    sources: Record<string, string>,       // field → provider name
    stalenessDays: number,
    factorScores?: { qualityFactor: number; growthFactor: number; valueFactor: number; momentumFactor: number; riskFactor: number },
  ): ConfidenceResult {
    // Dimension 1: Provider Confidence
    const providerConf = this.computeProviderConfidence(sources);

    // Dimension 2: Snapshot Confidence
    const snapshotConf = this.computeSnapshotConfidence(fieldsPopulated, totalFields, stalenessDays);

    // Dimension 3: Ranking Confidence
    const rankingConf = factorScores ? this.computeRankingConfidence(factorScores) : 0.5;

    // Composite: provider × 0.30 + snapshot × 0.35 + ranking × 0.35
    const score = Math.round((providerConf * 0.30 + snapshotConf * 0.35 + rankingConf * 0.35) * 100);
    const clampedScore = Math.max(0, Math.min(100, score));

    // Determine level
    let level: ConfidenceLevel;
    if (clampedScore >= 80) level = 'Very High';
    else if (clampedScore >= 65) level = 'High';
    else if (clampedScore >= 45) level = 'Medium';
    else level = 'Low';

    // Build commentary
    const completeness = fieldsPopulated / Math.max(totalFields, 1);
    const signalAgreement = rankingConf;
    const commentary = this.buildCommentary(level, fieldsPopulated, totalFields, stalenessDays);

    return {
      score: clampedScore,
      level,
      providerConfidence: Math.round(providerConf * 100) / 100,
      snapshotConfidence: Math.round(snapshotConf * 100) / 100,
      rankingConfidence: Math.round(rankingConf * 100) / 100,
      dataCompleteness: Math.round(completeness * 100) / 100,
      signalAgreement: Math.round(signalAgreement * 100) / 100,
      commentary,
    };
  }

  /**
   * Batch compute confidence for multiple symbols.
   */
  computeBatch(
    entries: Array<{
      symbol: string;
      fieldsPopulated: number;
      totalFields: number;
      sources: Record<string, string>;
      stalenessDays: number;
      factorScores?: { qualityFactor: number; growthFactor: number; valueFactor: number; momentumFactor: number; riskFactor: number };
    }>,
  ): Record<string, ConfidenceResult> {
    const results: Record<string, ConfidenceResult> = {};
    for (const entry of entries) {
      results[entry.symbol] = this.compute(
        entry.fieldsPopulated, entry.totalFields, entry.sources,
        entry.stalenessDays, entry.factorScores,
      );
    }
    return results;
  }

  // ── Private ──────────────────────────────────────────

  private computeProviderConfidence(sources: Record<string, string>): number {
    const entries = Object.entries(sources);
    if (entries.length === 0) return 0;

    let totalWeight = 0;
    for (const [, provider] of entries) {
      totalWeight += PROVIDER_WEIGHTS[provider] ?? 0.50;
    }
    return totalWeight / entries.length;
  }

  private computeSnapshotConfidence(fieldsPopulated: number, totalFields: number, stalenessDays: number): number {
    const completeness = totalFields > 0 ? fieldsPopulated / totalFields : 0;

    // Find freshness factor
    let freshness = 0.50; // default
    for (const level of FRESHNESS_DECAY) {
      if (stalenessDays <= level.maxDays) {
        freshness = level.factor;
        break;
      }
    }

    return completeness * 0.70 + freshness * 0.30;
  }

  private computeRankingConfidence(factors: {
    qualityFactor: number;
    growthFactor: number;
    valueFactor: number;
    momentumFactor: number;
    riskFactor: number;
  }): number {
    const scores = Object.values(factors).filter(v => v !== null && v !== undefined && isFinite(v));
    if (scores.length === 0) return 0.5;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Signal agreement: lower variance = higher confidence
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const maxVariance = 2500;
    const signalAgreement = 1 - Math.min(variance / maxVariance, 1);

    // Extremeness: extreme scores (>80 or <20) have higher confidence
    const extremeness = Math.abs(mean - 50) / 50;

    return signalAgreement * 0.40 + extremeness * 0.60;
  }

  private buildCommentary(level: ConfidenceLevel, fieldsPopulated: number, totalFields: number, stalenessDays: number): string {
    const completeness = totalFields > 0 ? ((fieldsPopulated / totalFields) * 100).toFixed(0) : '0';

    switch (level) {
      case 'Very High':
        return `${completeness}% of fields populated from reliable API providers. Data is ${stalenessDays} days old. Rankings stable.`;
      case 'High':
        return `${completeness}% fields populated. Primary data from verified APIs. ${stalenessDays} days old. Good conviction.`;
      case 'Medium':
        return `${completeness}% fields populated. Mixed sources (some unverified). ${stalenessDays} days old. Use directionally.`;
      case 'Low':
        return `Only ${completeness}% fields populated. Data is ${stalenessDays} days old. Unreliable for decision-making.`;
    }
  }
}

export default ConfidenceEngineV2;
