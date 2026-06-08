/**
 * TRACK-95T — Prediction Explanation Engine
 * 
 * Every prediction, score change, upgrade, downgrade, and alert must answer:
 * "Why did this score change? What factors contributed? What changed since yesterday?
 *  How accurate has this signal been historically?"
 * 
 * Input: Two prediction_registry snapshots (today + previous) for a symbol.
 * Output: Human-readable explanation with factor breakdowns, reliability data.
 * 
 * Backed by: prediction_registry deltas + SignalValidationEngine results.
 * No opaque scores. No unexplained upgrades. No black-box classifications.
 */
import pool from '../db/index';
import { signalValidator, type SignalAccuracyResult } from './SignalValidationEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExplanationDriver {
  factor: string;
  previous: number;
  current: number;
  delta: number;
  percentContribution: number;   // % of total absolute change driven by this factor
  importanceRank: number;
}

export interface ExplanationOutput {
  summary: string;
  drivers: ExplanationDriver[];
  positives: string[];
  negatives: string[];
  healthScore: {
    previous: number | null;
    current: number;
    delta: number | null;
  };
  classification: {
    from: string | null;
    to: string;
    changed: boolean;
  };
  // Factor contribution analysis
  factorContributions: FactorContribution[];
  // Historical reliability from SignalValidationEngine
  historicalReliability: HistoricalReliability | null;
}

export interface FactorContribution {
  factor: string;
  delta: number;
  percentContribution: number;
  importanceRank: number;
  direction: 'positive' | 'negative';
}

export interface HistoricalReliability {
  signalType: string;
  successRate: number;
  sampleSize: number;
  avgAlphaPct: number;
  predictivePower: 'Strong' | 'Moderate' | 'Weak' | 'Not Predictive';
}

export interface PredictionSnapshot {
  symbol: string;
  predictionDate: string;
  classification: string;
  rankingScore: number;
  confidenceScore: number;
  qualityScore: number;
  growthScore: number;
  valueScore: number;
  momentumScore: number;
  riskScore: number;
  sectorScore: number;
}

// ---------------------------------------------------------------------------
// Factor definitions
// ---------------------------------------------------------------------------

const FACTOR_MAP: Record<string, { label: string; humanLabel: string }> = {
  qualityScore: { label: 'Quality', humanLabel: 'Quality Score' },
  growthScore: { label: 'Growth', humanLabel: 'Growth Score' },
  valueScore: { label: 'Value', humanLabel: 'Value Score' },
  momentumScore: { label: 'Momentum', humanLabel: 'Momentum Score' },
  riskScore: { label: 'Risk', humanLabel: 'Risk Score' },
  sectorScore: { label: 'Sector', humanLabel: 'Sector Score' },
  confidenceScore: { label: 'Confidence', humanLabel: 'Confidence' },
};

const SCORE_FIELDS = [
  'qualityScore', 'growthScore', 'valueScore', 'momentumScore', 'riskScore', 'sectorScore',
] as const;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class PredictionExplanationEngine {

  /**
   * Generate a full explanation for a symbol's prediction change.
   * Compares today's prediction_registry row with yesterday's.
   */
  async explain(symbol: string, options?: {
    todayDate?: string;
    previousDate?: string;
  }): Promise<ExplanationOutput> {
    const today = options?.todayDate ?? new Date().toISOString().split('T')[0];
    const upperSymbol = symbol.toUpperCase().trim();

    // Fetch today's snapshot
    const todaySnap = await this.fetchSnapshot(upperSymbol, today);
    if (!todaySnap) {
      throw new Error(`No prediction found for ${upperSymbol} on ${today}`);
    }

    // Fetch previous (most recent before today)
    const previousDate = options?.previousDate ?? await this.getPreviousDate(upperSymbol, today);
    const previousSnap = previousDate ? await this.fetchSnapshot(upperSymbol, previousDate) : null;

    // Compute factor contributions
    const factorContributions = this.computeFactorContributions(todaySnap, previousSnap);

    // Build drivers (sorted by absolute contribution)
    const drivers: ExplanationDriver[] = factorContributions
      .map(fc => ({
        factor: fc.factor,
        previous: previousSnap ? (previousSnap as any)[this.getFieldKey(fc.factor)] ?? 0 : 0,
        current: (todaySnap as any)[this.getFieldKey(fc.factor)] ?? 0,
        delta: fc.delta,
        percentContribution: fc.percentContribution,
        importanceRank: fc.importanceRank,
      }))
      .sort((a, b) => b.percentContribution - a.percentContribution);

    // Positives and negatives
    const positives: string[] = [];
    const negatives: string[] = [];
    for (const d of drivers) {
      if (Math.abs(d.delta) >= 3) {
        const label = FACTOR_MAP[this.getFieldKey(d.factor)]?.humanLabel ?? d.factor;
        const sign = d.delta > 0 ? '+' : '';
        if (d.delta > 0) {
          positives.push(`${label} ${sign}${d.delta}`);
        } else {
          negatives.push(`${label} ${sign}${d.delta}`);
        }
      }
    }

    // Health score
    const healthDelta = previousSnap ? todaySnap.rankingScore - previousSnap.rankingScore : null;
    // classification
    const classificationChanged = previousSnap ? todaySnap.classification !== previousSnap.classification : false;

    // Build summary text
    const summary = this.buildSummary(upperSymbol, todaySnap, previousSnap, drivers, classificationChanged);

    // Historical reliability
    const historicalReliability = await this.fetchHistoricalReliability(upperSymbol, todaySnap, previousSnap);

    return {
      summary,
      drivers,
      positives,
      negatives,
      healthScore: {
        previous: previousSnap?.rankingScore ?? null,
        current: todaySnap.rankingScore,
        delta: healthDelta,
      },
      classification: {
        from: previousSnap?.classification ?? null,
        to: todaySnap.classification,
        changed: classificationChanged,
      },
      factorContributions,
      historicalReliability,
    };
  }

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  private async fetchSnapshot(symbol: string, date: string): Promise<PredictionSnapshot | null> {
    try {
      const result = await pool.query(
        `SELECT symbol, prediction_date, classification, ranking_score,
         confidence_score, quality_score, growth_score, value_score,
         momentum_score, risk_score, sector_score
         FROM prediction_registry
         WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = 30
         LIMIT 1`,
        [symbol, date]
      );
      if (result.rows.length === 0) return null;
      const r = result.rows[0];
      return {
        symbol: r.symbol,
        predictionDate: r.prediction_date instanceof Date
          ? r.prediction_date.toISOString().split('T')[0]
          : String(r.prediction_date),
        classification: r.classification,
        rankingScore: Number(r.ranking_score),
        confidenceScore: Number(r.confidence_score),
        qualityScore: Number(r.quality_score),
        growthScore: Number(r.growth_score),
        valueScore: Number(r.value_score),
        momentumScore: Number(r.momentum_score),
        riskScore: Number(r.risk_score),
        sectorScore: Number(r.sector_score),
      };
    } catch {
      return null;
    }
  }

  private async getPreviousDate(symbol: string, today: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT prediction_date FROM prediction_registry
         WHERE symbol = $1 AND prediction_date < $2 AND prediction_horizon = 30
         ORDER BY prediction_date DESC LIMIT 1`,
        [symbol, today]
      );
      if (result.rows.length > 0) {
        const d = result.rows[0].prediction_date;
        return d instanceof Date ? d.toISOString().split('T')[0] : String(d);
      }
      return null;
    } catch {
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Factor contribution analysis
  // -----------------------------------------------------------------------

  private getFieldKey(factor: string): string {
    // Map from human label to DB column
    const reverse = Object.entries(FACTOR_MAP).find(([, v]) => v.humanLabel === factor || v.label === factor);
    return reverse?.[0] ?? `${factor.toLowerCase()}Score`;
  }

  private computeFactorContributions(
    today: PredictionSnapshot,
    previous: PredictionSnapshot | null
  ): FactorContribution[] {
    if (!previous) {
      // No baseline — contribution is 100% "first data point"
      return [
        {
          factor: 'Baseline (first prediction)',
          delta: 0,
          percentContribution: 0,
          importanceRank: 0,
          direction: 'positive',
        },
      ];
    }

    const contributions: FactorContribution[] = [];

    for (const field of SCORE_FIELDS) {
      const curr = today[field] as number;
      const prev = previous[field] as number;
      const delta = curr - prev;
      contributions.push({
        factor: FACTOR_MAP[field]?.humanLabel ?? field,
        delta,
        percentContribution: 0, // computed below
        importanceRank: 0,
        direction: delta >= 0 ? 'positive' : 'negative',
      });
    }

    const totalAbsDelta = contributions.reduce((sum, c) => sum + Math.abs(c.delta), 0);

    if (totalAbsDelta > 0) {
      for (const c of contributions) {
        c.percentContribution = Math.round((Math.abs(c.delta) / totalAbsDelta) * 100);
      }
    }

    // Rank by absolute contribution
    contributions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    contributions.forEach((c, i) => { c.importanceRank = i + 1; });

    return contributions;
  }

  // -----------------------------------------------------------------------
  // Summary builder
  // -----------------------------------------------------------------------

  private buildSummary(
    symbol: string,
    today: PredictionSnapshot,
    previous: PredictionSnapshot | null,
    drivers: ExplanationDriver[],
    classificationChanged: boolean
  ): string {
    if (!previous) {
      return `${symbol} is ${today.classification} with a health score of ${today.rankingScore}. No prior prediction for comparison.`;
    }

    const parts: string[] = [];
    const scoreDelta = today.rankingScore - previous.rankingScore;
    const scoreDir = scoreDelta > 0 ? 'improved' : scoreDelta < 0 ? 'declined' : 'held steady';

    if (classificationChanged) {
      parts.push(`${symbol} ${scoreDelta > 0 ? 'upgraded' : 'downgraded'} from ${previous.classification} → ${today.classification}`);
    } else {
      parts.push(`${symbol} is ${today.classification}`);
    }

    if (Math.abs(scoreDelta) >= 3) {
      parts.push(`Health score ${scoreDir} ${scoreDelta > 0 ? '+' : ''}${scoreDelta}`);
    }

    // Top 3 drivers
    const topDrivers = drivers.filter(d => Math.abs(d.delta) >= 3).slice(0, 3);
    if (topDrivers.length > 0) {
      parts.push(`Primary drivers: ${topDrivers.map(d => `${d.factor} ${d.delta > 0 ? '+' : ''}${d.delta}`).join(', ')}`);
    }

    // Largest negative
    const largestNegative = drivers
      .filter(d => d.delta < 0 && Math.abs(d.delta) >= 3)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    if (largestNegative) {
      parts.push(`Largest negative: ${largestNegative.factor} ${largestNegative.delta}`);
    }

    return parts.join('. ') + '.';
  }

  // -----------------------------------------------------------------------
  // Historical reliability
  // -----------------------------------------------------------------------

  private async fetchHistoricalReliability(
    symbol: string,
    today: PredictionSnapshot,
    previous: PredictionSnapshot | null
  ): Promise<HistoricalReliability | null> {
    if (!previous) return null;

    try {
      // Try to match the exact classification transition
      const classificationResults = await signalValidator.validateClassificationChanges();
      const transitionKey = `${previous.classification} → ${today.classification}`;
      const match = classificationResults.find(r => r.signalType === transitionKey);

      if (match) {
        return {
          signalType: transitionKey,
          successRate: match.successRate,
          sampleSize: match.sampleSize,
          avgAlphaPct: match.avgAlphaPct,
          predictivePower: match.predictivePower,
        };
      }

      // Fallback: return aggregate confidence-based reliability
      const confidenceResults = await signalValidator.validateConfidenceChanges();
      const absDiff = Math.abs(today.confidenceScore - previous.confidenceScore);
      let bucket = 'small (5-10pts)';
      if (absDiff > 20) bucket = 'large (21+pts)';
      else if (absDiff > 10) bucket = 'medium (11-20pts)';

      const confMatch = confidenceResults.find(r => r.signalType.includes(bucket));
      if (confMatch) {
        return {
          signalType: `Confidence Δ ${bucket}`,
          successRate: confMatch.successRate,
          sampleSize: confMatch.sampleSize,
          avgAlphaPct: confMatch.avgAlphaPct,
          predictivePower: confMatch.predictivePower,
        };
      }
    } catch {
      // Best-effort
    }

    return null;
  }

  /**
   * Calculate priority score for dashboard ranking.
   * Priority Score = Impact × Reliability × Confidence
   */
  static computePriorityScore(
    impact: number,
    reliability: number,
    confidence: number,
  ): number {
    return impact * (reliability || 0.5) * (confidence || 0.5);
  }
}

export const predictionExplanationEngine = new PredictionExplanationEngine();
export default PredictionExplanationEngine;
