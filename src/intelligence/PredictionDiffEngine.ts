/**
 * TRACK-95O — Prediction Diff Engine
 * 
 * Compares prediction_registry snapshots (today vs previous) for every symbol.
 * Computes classification, confidence, health, quality, growth, momentum,
 * risk, and valuation deltas.
 * 
 * No synthetic data. No inferred events. Only real snapshot-to-snapshot changes.
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
  classificationDelta: number;       // rank-order delta (Exceptional=5, Critical=0)
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
  // Validation data appended by SignalValidationEngine hook
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
   * Generate all signals by diffing today's prediction_registry rows
   * against the most recent previous snapshot for each symbol.
   */
  async generateSignals(
    options: { limit?: number; symbol?: string; severity?: string } = {}
  ): Promise<PredictionDiffResult> {
    const today = await this.getLatestSnapshotDate(options.symbol);
    if (!today) {
      return {
        signals: [],
        generatedAt: new Date().toISOString(),
        snapshotDate: "",
        symbolsAnalyzed: 0,
      };
    }

    // 1. Fetch today's predictions (all symbols, horizon=30)
    const todayRows = await this.fetchPredictions(today, options.symbol);
    if (todayRows.length === 0) {
      return {
        signals: [],
        generatedAt: new Date().toISOString(),
        snapshotDate: today,
        symbolsAnalyzed: 0,
      };
    }

    // 2. Get the previous snapshot date (most recent date < today with data)
    const previousDate = await this.getPreviousSnapshotDate(today);

    // 3. Fetch previous predictions
    const previousRows = previousDate
      ? await this.fetchPredictions(previousDate, options.symbol)
      : [];
    const prevMap = new Map<string, PredictionSnapshot>();
    for (const row of previousRows) {
      prevMap.set(row.symbol, row);
    }

    // 4. Compute diffs
    const diffs: SymbolDiff[] = [];
    for (const todayRow of todayRows) {
      const prev = prevMap.get(todayRow.symbol) ?? null;
      diffs.push(this.computeDiff(todayRow, prev));
    }

    // 5. Determine ranking changes (top-10 enter/leave)
    this.annotateRankingChanges(diffs, todayRows, previousRows);

    // 6. Generate signals from diffs
    let signals = this.diffsToSignals(diffs, today, previousDate);

    // 7. Apply filters
    if (options.severity) {
      signals = signals.filter(s => s.severity === options.severity);
    }
    if (options.limit && options.limit > 0) {
      signals = signals.slice(0, options.limit);
    }

    return {
      signals,
      generatedAt: new Date().toISOString(),
      snapshotDate: today,
      symbolsAnalyzed: todayRows.length,
    };
  }

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

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

    query += ` ORDER BY ranking_score DESC`;

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

  private async getLatestSnapshotDate(symbol?: string): Promise<string | null> {
    let query = `SELECT prediction_date FROM prediction_registry WHERE prediction_horizon = 30`;
    const params: any[] = [];
    if (symbol) {
      query += ` AND symbol = $1`;
      params.push(symbol.toUpperCase());
    }
    query += ` ORDER BY prediction_date DESC LIMIT 1`;
    try {
      const result = await pool.query(query, params);
      const d = result.rows[0]?.prediction_date;
      if (!d) return null;
      return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
    } catch {
      return null;
    }
  }

  private async getPreviousSnapshotDate(today: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT prediction_date FROM prediction_registry
         WHERE prediction_date < $1
         ORDER BY prediction_date DESC LIMIT 1`,
        [today]
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
  // Ranking annotation
  // -----------------------------------------------------------------------

  private annotateRankingChanges(
    diffs: SymbolDiff[],
    todayRows: PredictionSnapshot[],
    previousRows: PredictionSnapshot[]
  ): void {
    // Today's top 10 by ranking_score
    const todayTop10 = new Set(
      [...todayRows]
        .sort((a, b) => b.rankingScore - a.rankingScore)
        .slice(0, 10)
        .map(r => r.symbol)
    );

    // Previous top 10
    const prevTop10 = new Set(
      [...previousRows]
        .sort((a, b) => b.rankingScore - a.rankingScore)
        .slice(0, 10)
        .map(r => r.symbol)
    );

    for (const diff of diffs) {
      if (todayTop10.has(diff.symbol) && !prevTop10.has(diff.symbol)) {
        diff.enteredTop10 = true;
        diff.currentRank = [...todayTop10].indexOf(diff.symbol) + 1;
      }
      if (!todayTop10.has(diff.symbol) && prevTop10.has(diff.symbol)) {
        diff.leftTop10 = true;
        diff.previousRank = [...prevTop10].indexOf(diff.symbol) + 1;
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
      if (!d.previous) continue; // No previous data = no signal possible

      // --- Classification changes ---
      if (d.classificationDelta > 0) {
        signals.push({
          symbol: d.symbol,
          type: 'classification_upgrade',
          severity: d.classificationDelta >= 2 ? 'critical' : 'important',
          previousValue: d.classificationFrom ?? 'Unknown',
          currentValue: d.classificationTo,
          delta: `+${d.classificationDelta} tier(s)`,
          explanation: `${d.symbol} upgraded from ${d.classificationFrom} → ${d.classificationTo}`,
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
          explanation: `${d.symbol} downgraded from ${d.classificationFrom} → ${d.classificationTo}`,
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

      // --- Factor changes (significant ones: |delta| >= 10) ---
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
          explanation: `${d.symbol} entered Top 10 rankings at position #${d.currentRank}`,
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
          explanation: `${d.symbol} dropped out of Top 10 rankings (was #${d.previousRank})`,
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
