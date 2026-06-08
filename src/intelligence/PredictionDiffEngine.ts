/**
 * TRACK-P1 — Prediction Diff Engine
 * 
 * TRACK-P1 fixes:
 * - Defect 9: Explicit rank maps instead of Set insertion order
 * - Defect 10: Latest snapshot from prediction_registry, not server UTC date
 * - Deterministic tie-breaker: ranking_score DESC, symbol ASC
 * 
 * Compares prediction_registry snapshots (latest vs previous) for every symbol.
 * Computes classification, confidence, health, quality, growth, momentum,
 * risk, and valuation deltas.
 */
import pool from '../db/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactorDelta {
  name: string;
  previous: number;
  current: number;
  delta: number;
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

export interface SymbolDiff {
  symbol: string;
  today: PredictionSnapshot;
  previous: PredictionSnapshot | null;
  classificationDelta: number;
  classificationFrom: string | null;
  classificationTo: string;
  confidenceDelta: number;
  rankingScoreDelta: number;
  qualityDelta: number;
  growthDelta: number;
  valueDelta: number;
  momentumDelta: number;
  riskDelta: number;
  sectorDelta: number;
  allFactorDeltas: FactorDelta[];
  enteredTop10: boolean;
  leftTop10: boolean;
  currentRank: number | null;
  previousRank: number | null;
}

export interface IntelligenceSignal {
  symbol: string;
  type: 'classification_upgrade' | 'classification_downgrade' |
        'confidence_increase' | 'confidence_decrease' |
        'factor_change' | 'ranking_change';
  severity: 'critical' | 'important' | 'monitor';
  previousValue: number | string;
  currentValue: number | string;
  delta: number | string;
  explanation: string;
  snapshotDate: string;
  validation?: {
    historicalSuccessRate: number | null;
    sampleSize: number | null;
    avgAlpha: number | null;
  };
}

export interface PredictionDiffResult {
  signals: IntelligenceSignal[];
  generatedAt: string;
  snapshotDate: string;
  symbolsAnalyzed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLASSIFICATION_RANK: Record<string, number> = {
  'Exceptional': 5,
  'Excellent': 4,
  'Good': 3,
  'Fair': 2,
  'Weak': 1,
  'Critical': 0,
};

const FACTOR_NAMES: Record<string, string> = {
  qualityScore: 'Quality',
  growthScore: 'Growth',
  valueScore: 'Value',
  momentumScore: 'Momentum',
  riskScore: 'Risk',
  sectorScore: 'Sector',
};

const SCORE_FIELDS = ['qualityScore', 'growthScore', 'valueScore', 'momentumScore', 'riskScore', 'sectorScore'] as const;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class PredictionDiffEngine {

  /**
   * Generate all signals by diffing latest prediction_registry rows
   * against the most recent previous snapshot for each symbol.
   * 
   * TRACK-P1: Uses latest snapshot from prediction_registry, not server UTC.
   */
  async generateSignals(
    options: { limit?: number; symbol?: string; severity?: string } = {}
  ): Promise<PredictionDiffResult> {
    // 1. Get latest snapshot date from prediction_registry (not server UTC)
    const latestDate = await this.getLatestSnapshotDate();
    if (!latestDate) {
      return {
        signals: [],
        generatedAt: new Date().toISOString(),
        snapshotDate: '',
        symbolsAnalyzed: 0,
      };
    }

    // 2. Fetch latest predictions (all symbols, horizon=30)
    const todayRows = await this.fetchPredictions(latestDate, options.symbol);
    if (todayRows.length === 0) {
      return {
        signals: [],
        generatedAt: new Date().toISOString(),
        snapshotDate: latestDate,
        symbolsAnalyzed: 0,
      };
    }

    // 3. Get the previous snapshot date (most recent date < latestDate with data)
    const previousDate = await this.getPreviousSnapshotDate(latestDate);

    // 4. Fetch previous predictions
    const previousRows = previousDate
      ? await this.fetchPredictions(previousDate, options.symbol)
      : [];
    const prevMap = new Map<string, PredictionSnapshot>();
    for (const row of previousRows) {
      prevMap.set(row.symbol, row);
    }

    // 5. Compute diffs
    const diffs: SymbolDiff[] = [];
    for (const todayRow of todayRows) {
      const prev = prevMap.get(todayRow.symbol) ?? null;
      diffs.push(this.computeDiff(todayRow, prev));
    }

    // 6. Determine ranking changes using explicit rank maps
    this.annotateRankingChanges(diffs, todayRows, previousRows);

    // 7. Generate signals from diffs
    let signals = this.diffsToSignals(diffs, latestDate, previousDate);

    // 8. Apply filters
    if (options.severity) {
      signals = signals.filter(s => s.severity === options.severity);
    }
    if (options.limit && options.limit > 0) {
      signals = signals.slice(0, options.limit);
    }

    return {
      signals,
      generatedAt: new Date().toISOString(),
      snapshotDate: latestDate,
      symbolsAnalyzed: todayRows.length,
    };
  }

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  /**
   * TRACK-P1: Get the latest snapshot date from prediction_registry.
   * Uses MAX(prediction_date) instead of new Date().
   */
  private async getLatestSnapshotDate(): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT MAX(prediction_date) AS latest_prediction_date
         FROM prediction_registry
         WHERE prediction_horizon = 30`
      );
      if (result.rows.length > 0 && result.rows[0].latest_prediction_date) {
        const d = result.rows[0].latest_prediction_date;
        return d instanceof Date ? d.toISOString().split('T')[0] : String(d);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async fetchPredictions(date: string, symbol?: string): Promise<PredictionSnapshot[]> {
    let query = `
      SELECT symbol, prediction_date, classification, ranking_score,
             confidence_score, quality_score, growth_score, value_score,
             momentum_score, risk_score, sector_score
      FROM prediction_registry
      WHERE prediction_date = $1
        AND prediction_horizon = 30
    `;
    const params: any[] = [date];

    if (symbol) {
      query += ` AND symbol = $2`;
      params.push(symbol.toUpperCase());
    }

    // Deterministic tie-breaker: ranking_score DESC, symbol ASC
    query += ` ORDER BY ranking_score DESC, symbol ASC`;

    try {
      const result = await pool.query(query, params);
      return result.rows.map((r: any) => ({
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
      }));
    } catch (err) {
      console.error('[PredictionDiffEngine] fetchPredictions error:', err);
      return [];
    }
  }

  private async getPreviousSnapshotDate(latestDate: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT prediction_date FROM prediction_registry
         WHERE prediction_date < $1
         ORDER BY prediction_date DESC LIMIT 1`,
        [latestDate]
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
  // Diff computation
  // -----------------------------------------------------------------------

  private computeDiff(today: PredictionSnapshot, previous: PredictionSnapshot | null): SymbolDiff {
    const todayClassRank = CLASSIFICATION_RANK[today.classification] ?? 3;
    const prevClassRank = previous ? (CLASSIFICATION_RANK[previous.classification] ?? 3) : todayClassRank;

    const allFactorDeltas: FactorDelta[] = SCORE_FIELDS.map(field => {
      const curr = today[field] as number;
      const prev = previous ? (previous[field] as number) : curr;
      return {
        name: FACTOR_NAMES[field],
        previous: prev,
        current: curr,
        delta: curr - prev,
      };
    });

    return {
      symbol: today.symbol,
      today,
      previous,
      classificationDelta: todayClassRank - prevClassRank,
      classificationFrom: previous?.classification ?? null,
      classificationTo: today.classification,
      confidenceDelta: previous ? today.confidenceScore - previous.confidenceScore : 0,
      rankingScoreDelta: previous ? today.rankingScore - previous.rankingScore : 0,
      qualityDelta: previous ? today.qualityScore - previous.qualityScore : 0,
      growthDelta: previous ? today.growthScore - previous.growthScore : 0,
      valueDelta: previous ? today.valueScore - previous.valueScore : 0,
      momentumDelta: previous ? today.momentumScore - previous.momentumScore : 0,
      riskDelta: previous ? today.riskScore - previous.riskScore : 0,
      sectorDelta: previous ? today.sectorScore - previous.sectorScore : 0,
      allFactorDeltas,
      enteredTop10: false,
      leftTop10: false,
      currentRank: null,
      previousRank: null,
    };
  }

  // -----------------------------------------------------------------------
  // Ranking annotation — TRACK-P1: explicit rank maps
  // -----------------------------------------------------------------------

  private annotateRankingChanges(
    diffs: SymbolDiff[],
    todayRows: PredictionSnapshot[],
    previousRows: PredictionSnapshot[]
  ): void {
    // Sort deterministic: ranking_score DESC, symbol ASC
    const todaySorted = [...todayRows].sort(
      (a, b) => b.rankingScore - a.rankingScore || a.symbol.localeCompare(b.symbol)
    );
    const previousSorted = [...previousRows].sort(
      (a, b) => b.rankingScore - a.rankingScore || a.symbol.localeCompare(b.symbol)
    );

    // Build explicit rank maps
    const todayRankMap = new Map<string, number>();
    todaySorted.forEach((row, index) => todayRankMap.set(row.symbol, index + 1));

    const previousRankMap = new Map<string, number>();
    previousSorted.forEach((row, index) => previousRankMap.set(row.symbol, index + 1));

    // Top 10 membership using explicit sorted arrays
    const todayTop10 = new Set(todaySorted.slice(0, 10).map(r => r.symbol));
    const prevTop10 = new Set(previousSorted.slice(0, 10).map(r => r.symbol));

    for (const diff of diffs) {
      diff.currentRank = todayRankMap.get(diff.symbol) ?? null;
      diff.previousRank = previousRankMap.get(diff.symbol) ?? null;

      if (todayTop10.has(diff.symbol) && !prevTop10.has(diff.symbol)) {
        diff.enteredTop10 = true;
      }
      if (!todayTop10.has(diff.symbol) && prevTop10.has(diff.symbol)) {
        diff.leftTop10 = true;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Signal generation
  // -----------------------------------------------------------------------

  private diffsToSignals(
    diffs: SymbolDiff[],
    snapshotDate: string,
    previousDate: string | null
  ): IntelligenceSignal[] {
    const signals: IntelligenceSignal[] = [];

    for (const d of diffs) {
      if (!d.previous) continue;

      // --- Classification changes ---
      if (d.classificationDelta > 0) {
        signals.push({
          symbol: d.symbol,
          type: 'classification_upgrade',
          severity: d.classificationDelta >= 2 ? 'critical' : 'important',
          previousValue: d.classificationFrom ?? 'Unknown',
          currentValue: d.classificationTo,
          delta: `+${d.classificationDelta} tier(s)`,
          explanation: `${d.symbol} upgraded from ${d.classificationFrom} → ${d.classificationTo} (rank #${d.currentRank})`,
          snapshotDate,
        });
      } else if (d.classificationDelta < 0) {
        signals.push({
          symbol: d.symbol,
          type: 'classification_downgrade',
          severity: d.classificationDelta <= -2 ? 'critical' : 'important',
          previousValue: d.classificationFrom ?? 'Unknown',
          currentValue: d.classificationTo,
          delta: `${d.classificationDelta} tier(s)`,
          explanation: `${d.symbol} downgraded from ${d.classificationFrom} → ${d.classificationTo} (was #${d.previousRank})`,
          snapshotDate,
        });
      }

      // --- Confidence changes ---
      if (Math.abs(d.confidenceDelta) >= 8) {
        const dir = d.confidenceDelta > 0 ? 'increased' : 'decreased';
        signals.push({
          symbol: d.symbol,
          type: d.confidenceDelta > 0 ? 'confidence_increase' : 'confidence_decrease',
          severity: Math.abs(d.confidenceDelta) >= 15 ? 'critical' : 'important',
          previousValue: Math.round(d.previous!.confidenceScore),
          currentValue: Math.round(d.today.confidenceScore),
          delta: `${d.confidenceDelta > 0 ? '+' : ''}${d.confidenceDelta.toFixed(1)} pts`,
          explanation: `${d.symbol} confidence ${dir} ${Math.abs(d.confidenceDelta).toFixed(0)} points (${Math.round(d.previous!.confidenceScore)} → ${Math.round(d.today.confidenceScore)})`,
          snapshotDate,
        });
      }

      // --- Factor changes ---
      const significantFactors = d.allFactorDeltas.filter(f => Math.abs(f.delta) >= 10);
      if (significantFactors.length > 0) {
        const factorDetails = significantFactors
          .map(f => `${f.name} ${f.delta > 0 ? '+' : ''}${f.delta.toFixed(0)}`);
        const totalAbs = significantFactors.reduce((sum, f) => sum + Math.abs(f.delta), 0);

        signals.push({
          symbol: d.symbol,
          type: 'factor_change',
          severity: totalAbs >= 30 ? 'critical' : totalAbs >= 20 ? 'important' : 'monitor',
          previousValue: 'see delta',
          currentValue: 'see delta',
          delta: factorDetails.join(', '),
          explanation: `${d.symbol} factor changes: ${factorDetails.join(', ')}`,
          snapshotDate,
        });
      }

      // --- Ranking changes ---
      if (d.enteredTop10) {
        signals.push({
          symbol: d.symbol,
          type: 'ranking_change',
          severity: 'critical',
          previousValue: 'Outside Top 10',
          currentValue: `#${d.currentRank}`,
          delta: `Entered Top 10`,
          explanation: `${d.symbol} entered Top 10 rankings at position #${d.currentRank} (rank #${d.previousRank} → #${d.currentRank})`,
          snapshotDate,
        });
      }
      if (d.leftTop10) {
        signals.push({
          symbol: d.symbol,
          type: 'ranking_change',
          severity: 'important',
          previousValue: `#${d.previousRank}`,
          currentValue: 'Outside Top 10',
          delta: `Left Top 10`,
          explanation: `${d.symbol} dropped out of Top 10 rankings (was #${d.previousRank}, now #${d.currentRank})`,
          snapshotDate,
        });
      }
    }

    // Sort: critical first, then important, then monitor
    const severityRank = { critical: 0, important: 1, monitor: 2 };
    signals.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    return signals;
  }
}

export const predictionDiffEngine = new PredictionDiffEngine();
export default PredictionDiffEngine;
