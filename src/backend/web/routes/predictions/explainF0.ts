import type { FastifyPluginAsync } from 'fastify';
import pool from '../../../../db/index';
import {
  errorResponse,
  realResponse,
  unavailableResponse,
  type DataLineageEntry,
} from '../../../../shared/data/AnalyticalResponse';
import { assessPredictionSnapshotFreshness } from '../../../../shared/data/DataFreshness';

const VALID_HORIZONS = [7, 30, 90, 180, 365] as const;
const SCORE_FIELDS = [
  ['quality_score', 'Quality Score'],
  ['growth_score', 'Growth Score'],
  ['value_score', 'Value Score'],
  ['momentum_score', 'Momentum Score'],
  ['risk_score', 'Risk Score'],
  ['sector_score', 'Sector Score'],
] as const;

type PredictionRow = Record<string, unknown> & {
  symbol: string;
  prediction_date: Date | string;
  ranking_score: number | string;
  classification: string;
};

/**
 * Returns the finite numeric value, or null if the value is null/undefined/NaN.
 * Never silently invents a score when data is unavailable.
 */
function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOnly(value: Date | string): string {
  return value instanceof Date ? value.toISOString().split('T')[0] : String(value).split('T')[0];
}

function buildExplanation(
  symbol: string,
  horizon: number,
  current: PredictionRow,
  previous: PredictionRow | null,
) {
  const currentScore = finiteOrNull(current.ranking_score);
  const previousScore = previous ? finiteOrNull(previous.ranking_score) : null;

  // Build contributions — skip factor deltas when a score is unavailable
  const contributions = previous
    ? SCORE_FIELDS.map(([field, factor]) => {
        const currentVal = finiteOrNull(current[field]);
        const prevVal = finiteOrNull(previous[field]);
        const delta = currentVal !== null && prevVal !== null ? currentVal - prevVal : 0;
        return {
          factor,
          delta,
          percentContribution: 0,
          importanceRank: 0,
          direction: delta >= 0 ? 'positive' : 'negative',
          currentAvailable: currentVal !== null,
          previousAvailable: prevVal !== null,
        };
      })
    : [{
        factor: 'Baseline (first prediction)',
        delta: 0,
        percentContribution: 0,
        importanceRank: 0,
        direction: 'positive' as const,
        currentAvailable: currentScore !== null,
        previousAvailable: false,
      }];

  const totalAbsoluteDelta = contributions.reduce((sum, item) => sum + Math.abs(item.delta), 0);
  contributions.forEach((item, index) => {
    item.percentContribution = totalAbsoluteDelta > 0 ? Math.round((Math.abs(item.delta) / totalAbsoluteDelta) * 100) : 0;
    item.importanceRank = index + 1;
  });
  contributions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  contributions.forEach((item, index) => { item.importanceRank = index + 1; });

  const drivers = contributions.map((item) => {
    const field = SCORE_FIELDS.find(([, label]) => label === item.factor)?.[0] ?? '';
    return {
      factor: item.factor,
      previous: previous ? finiteOrNull(previous[field]) : null,
      current: finiteOrNull(current[field]),
      delta: item.delta,
      percentContribution: item.percentContribution,
      importanceRank: item.importanceRank,
    };
  });

  const currentClassification = String(current.classification || 'Unavailable');
  const previousClassification = previous ? String(previous.classification || 'Unavailable') : null;
  const scoreDelta = currentScore !== null && previousScore !== null ? currentScore - previousScore : null;
  const significantDrivers = drivers.filter((item) => item.current !== null && Math.abs(item.delta) >= 3).slice(0, 3);

  // Build honest summary that reflects data availability
  const scorePart = currentScore !== null
    ? `health score of ${currentScore}`
    : 'health score is unavailable (missing ranking_score)';
  const deltaPart = scoreDelta !== null
    ? `Change: ${scoreDelta > 0 ? '+' : ''}${scoreDelta}.`
    : 'No previous score for comparison.';
  const driversPart = significantDrivers.length > 0
    ? `Primary drivers: ${significantDrivers.map((item) => `${item.factor} ${(item.delta as number) > 0 ? '+' : ''}${item.delta}`).join(', ')}.`
    : 'No material factor changes with complete data.';

  const summary = previous
    ? `${symbol} is ${currentClassification}. ${scorePart}. ${deltaPart} ${driversPart}`
    : `${symbol} is ${currentClassification} with ${scorePart}. No prior ${horizon}-day prediction for comparison.`;

  return {
    symbol,
    predictionHorizon: horizon,
    classification: {
      from: previousClassification,
      to: currentClassification,
      changed: previousClassification !== null && previousClassification !== currentClassification,
    },
    healthScore: { from: previousScore, to: currentScore, delta: scoreDelta },
    summary,
    drivers,
    positives: drivers.filter((item) => item.current !== null && (item.delta as number) >= 3).map((item) => `${item.factor} +${item.delta}`),
    negatives: drivers.filter((item) => item.current !== null && (item.delta as number) <= -3).map((item) => `${item.factor} ${item.delta}`),
    factorContributions: contributions.map(({ factor, delta, percentContribution, importanceRank, direction }) => ({
      factor, delta, percentContribution, importanceRank, direction,
    })),
    historicalReliability: null,
    generatedAt: new Date().toISOString(),
  };
}

export const predictionExplainF0Routes: FastifyPluginAsync = async (app) => {
  app.get('/api/predictions/explain/:symbol', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const query = request.query as { horizon?: string; today?: string; previous?: string };
    const ticker = symbol.toUpperCase().trim();
    const horizon = query.horizon ? Number.parseInt(query.horizon, 10) : 30;

    if (!ticker) return reply.status(400).send({ code: 'INVALID_SYMBOL', message: 'Symbol parameter is required.' });
    if (!VALID_HORIZONS.includes(horizon as (typeof VALID_HORIZONS)[number])) {
      return reply.status(400).send({
        code: 'INVALID_PREDICTION_HORIZON',
        message: `Horizon ${query.horizon} is not valid. Allowed: ${VALID_HORIZONS.join(', ')}`,
      });
    }

    try {
      // When `previous` is specified, restrict the date range so the older
      // prediction is no older than `previous`.  The query returns up to 2
      // rows — current (closest <= today) and previous (next oldest).
      const rows = await pool.query(
        `SELECT symbol, prediction_date, ranking_score, classification,
                confidence_score, quality_score, growth_score, value_score,
                momentum_score, risk_score, sector_score
         FROM prediction_registry
         WHERE symbol = $1 AND prediction_horizon = $2
           AND ($3::date IS NULL OR prediction_date <= $3::date)
           AND ($4::date IS NULL OR prediction_date >= $4::date)
         ORDER BY prediction_date DESC
         LIMIT 2`,
        [ticker, horizon, query.today ?? null, query.previous ?? null],
      );

      if (rows.rows.length === 0) {
        return reply.send(unavailableResponse(
          'PREDICTION_NOT_FOUND',
          `No ${horizon}-day prediction found for ${ticker}.`,
          ['prediction_registry'],
        ));
      }

      const current = rows.rows[0] as PredictionRow;
      const previous = (rows.rows[1] as PredictionRow | undefined) ?? null;
      const predictionDate = dateOnly(current.prediction_date);
      const lineage: DataLineageEntry[] = [{
        sourceTable: 'prediction_registry',
        sourceField: 'ranking_score, classification, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score',
        asOf: predictionDate,
        retrievedAt: new Date().toISOString(),
        isFallback: false,
        isSynthetic: false,
        notes: `Horizon: ${horizon} days`,
      }];
      const freshness = assessPredictionSnapshotFreshness(predictionDate);
      return reply.send(realResponse(buildExplanation(ticker, horizon, current, previous), freshness, predictionDate, 100, lineage, 'VALIDATION_LIMITED'));
    } catch (error: any) {
      app.log.error({ err: error }, 'prediction explanation query failed');
      return reply.status(503).send(errorResponse('BACKEND_UNAVAILABLE', `Failed to generate prediction explanation for ${ticker}.`));
    }
  });
};

export default predictionExplainF0Routes;
