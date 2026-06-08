/**
 * TRACK-95L — Signal Validation Engine
 * 
 * Measures the predictive power of every signal type.
 * Answers: "Which alerts actually matter?"
 * 
 * Backed by prediction_registry validated outcomes.
 * No synthetic data. No estimates.
 */
import pool from '../db/index';

export interface SignalAccuracyResult {
  signalType: string;
  totalSignals: number;
  outcomesValidated: number;
  successRate: number;         // % where future return was positive
  avgFutureReturnPct: number;
  avgAlphaPct: number;
  predictivePower: 'Strong' | 'Moderate' | 'Weak' | 'Not Predictive';
  sampleSize: number;
  horizonDays: number;
}

export interface FactorChangeAccuracy {
  factor: string;
  direction: 'increase' | 'decrease';
  totalChanges: number;
  outcomesValidated: number;
  successRate: number;
  avgReturnPct: number;
  predictivePower: 'Strong' | 'Moderate' | 'Weak' | 'Not Predictive';
}

/**
 * Validate classification changes.
 * For each transition (e.g. Healthy → Excellent), checks what return followed.
 */
export async function validateClassificationChanges(): Promise<SignalAccuracyResult[]> {
  const results: SignalAccuracyResult[] = [];

  // Get pairs of consecutive predictions for same symbol, different dates
  const query = `
    WITH ranked AS (
      SELECT symbol, prediction_date, classification, future_return, alpha,
             LAG(classification) OVER (PARTITION BY symbol ORDER BY prediction_date) as prev_classification
      FROM prediction_registry
      WHERE validation_status = 'validated'
        AND future_return IS NOT NULL
        AND prediction_horizon = 30
    )
    SELECT prev_classification, classification, 
           COUNT(*) as count,
           SUM(CASE WHEN future_return > 0 THEN 1 ELSE 0 END) as wins,
           ROUND(AVG(future_return) * 100, 2) as avg_return_pct,
           ROUND(AVG(alpha) * 100, 2) as avg_alpha_pct
    FROM ranked
    WHERE prev_classification IS NOT NULL
      AND prev_classification != classification
    GROUP BY prev_classification, classification
    ORDER BY count DESC
    LIMIT 20
  `;

  try {
    const rows = (await pool.query(query)).rows;
    for (const row of rows) {
      const successRate = (Number(row.wins) / Number(row.count)) * 100;
      let predictivePower: SignalAccuracyResult['predictivePower'] = 'Not Predictive';
      if (successRate > 65) predictivePower = 'Strong';
      else if (successRate > 55) predictivePower = 'Moderate';
      else if (successRate > 50) predictivePower = 'Weak';

      results.push({
        signalType: `${row.prev_classification} → ${row.classification}`,
        totalSignals: Number(row.count),
        outcomesValidated: Number(row.count),
        successRate: Math.round(successRate * 10) / 10,
        avgFutureReturnPct: Number(row.avg_return_pct),
        avgAlphaPct: Number(row.avg_alpha_pct),
        predictivePower,
        sampleSize: Number(row.count),
        horizonDays: 30,
      });
    }
  } catch (e) {
    console.error('[SignalValidation] Classification query failed:', e);
  }

  return results.sort((a, b) => b.successRate - a.successRate);
}

/**
 * Validate confidence changes by bucket magnitude.
 * Groups confidence changes into: small (1-10pts), medium (11-20pts), large (21+pts).
 */
export async function validateConfidenceChanges(): Promise<SignalAccuracyResult[]> {
  const results: SignalAccuracyResult[] = [];

  for (const horizon of [30, 90, 365]) {
    const query = `
      WITH ranked AS (
        SELECT symbol, prediction_date, confidence_score, future_return, alpha,
               LAG(confidence_score) OVER (PARTITION BY symbol ORDER BY prediction_date) as prev_confidence
        FROM prediction_registry
        WHERE validation_status = 'validated'
          AND future_return IS NOT NULL
          AND prediction_horizon = ${horizon}
      ),
      changes AS (
        SELECT *,
               ABS(confidence_score - prev_confidence) as magnitude
        FROM ranked
        WHERE prev_confidence IS NOT NULL
          AND ABS(confidence_score - prev_confidence) >= 5
      )
      SELECT
        CASE
          WHEN magnitude BETWEEN 5 AND 10 THEN 'small (5-10pts)'
          WHEN magnitude BETWEEN 11 AND 20 THEN 'medium (11-20pts)'
          ELSE 'large (21+pts)'
        END as bucket,
        COUNT(*) as count,
        SUM(CASE WHEN future_return > 0 THEN 1 ELSE 0 END) as wins,
        ROUND(AVG(future_return) * 100, 2) as avg_return_pct,
        ROUND(AVG(alpha) * 100, 2) as avg_alpha_pct
      FROM changes
      GROUP BY bucket
      ORDER BY bucket
    `;

    try {
      const rows = (await pool.query(query)).rows;
      for (const row of rows) {
        const successRate = (Number(row.wins) / Number(row.count)) * 100;
        let predictivePower: SignalAccuracyResult['predictivePower'] = 'Not Predictive';
        if (successRate > 65) predictivePower = 'Strong';
        else if (successRate > 55) predictivePower = 'Moderate';
        else if (successRate > 50) predictivePower = 'Weak';

        results.push({
          signalType: `Confidence Δ ${row.bucket} (${horizon}d)`,
          totalSignals: Number(row.count),
          outcomesValidated: Number(row.count),
          successRate: Math.round(successRate * 10) / 10,
          avgFutureReturnPct: Number(row.avg_return_pct),
          avgAlphaPct: Number(row.avg_alpha_pct),
          predictivePower,
          sampleSize: Number(row.count),
          horizonDays: horizon,
        });
      }
    } catch (e) {
      console.error(`[SignalValidation] Confidence ${horizon}d query failed:`, e);
    }
  }

  return results.sort((a, b) => b.successRate - a.successRate);
}

/**
 * Validate factor change predictive power.
 * For each factor, determines whether increases or decreases predict better outcomes.
 */
export async function validateFactorChanges(): Promise<FactorChangeAccuracy[]> {
  const factors = [
    'quality_score', 'growth_score', 'value_score',
    'momentum_score', 'risk_score', 'sector_score',
  ];
  const factorNames: Record<string, string> = {
    quality_score: 'Quality', growth_score: 'Growth', value_score: 'Value',
    momentum_score: 'Momentum', risk_score: 'Risk', sector_score: 'Sector',
  };

  const results: FactorChangeAccuracy[] = [];

  for (const factor of factors) {
    for (const direction of ['increase', 'decrease'] as const) {
      const comparison = direction === 'increase' ? '>' : '<';
      const query = `
        WITH ranked AS (
          SELECT symbol, prediction_date, ${factor}, future_return, alpha,
                 LAG(${factor}) OVER (PARTITION BY symbol ORDER BY prediction_date) as prev_${factor}
          FROM prediction_registry
          WHERE validation_status = 'validated'
            AND future_return IS NOT NULL
            AND prediction_horizon = 30
        )
        SELECT
          COUNT(*) as count,
          SUM(CASE WHEN future_return > 0 THEN 1 ELSE 0 END) as wins,
          ROUND(AVG(future_return) * 100, 2) as avg_return_pct
        FROM ranked
        WHERE prev_${factor} IS NOT NULL
          AND ${factor} ${comparison} prev_${factor}
          AND ABS(${factor} - prev_${factor}) >= 5
      `;

      try {
        const rows = (await pool.query(query)).rows;
        const row = rows[0];
        if (row && Number(row.count) > 10) {
          const successRate = (Number(row.wins) / Number(row.count)) * 100;
          let predictivePower: FactorChangeAccuracy['predictivePower'] = 'Not Predictive';
          if (successRate > 65) predictivePower = 'Strong';
          else if (successRate > 55) predictivePower = 'Moderate';
          else if (successRate > 50) predictivePower = 'Weak';

          results.push({
            factor: factorNames[factor],
            direction,
            totalChanges: Number(row.count),
            outcomesValidated: Number(row.count),
            successRate: Math.round(successRate * 10) / 10,
            avgReturnPct: Number(row.avg_return_pct),
            predictivePower,
          });
        }
      } catch (e) {
        // Skip failed queries
      }
    }
  }

  return results.sort((a, b) => b.successRate - a.successRate);
}

/**
 * Importance ranker: weight = (successRate - 50) × sqrt(sampleSize).
 * Higher = more reliable predictive signal.
 */
export function rankSignalImportance(results: SignalAccuracyResult[]): SignalAccuracyResult[] {
  return [...results].sort((a, b) => {
    const scoreA = (a.successRate - 50) * Math.sqrt(a.sampleSize);
    const scoreB = (b.successRate - 50) * Math.sqrt(b.sampleSize);
    return scoreB - scoreA;
  });
}

/**
 * Get top N most important signals for dashboard prioritisation.
 */
export async function getTopSignals(limit = 5): Promise<SignalAccuracyResult[]> {
  const [classification, confidence] = await Promise.all([
    validateClassificationChanges(),
    validateConfidenceChanges(),
  ]);

  const all = [...classification, ...confidence];
  return rankSignalImportance(all).slice(0, limit);
}

export const signalValidator = {
  validateClassificationChanges,
  validateConfidenceChanges,
  validateFactorChanges,
  rankSignalImportance,
  getTopSignals,
};

export default signalValidator;
