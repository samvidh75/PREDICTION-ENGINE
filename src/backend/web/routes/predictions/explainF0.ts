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

function finite(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validScore(value: unknown): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}

function invalidPredictionReason(row: Record<string, unknown>): string | null {
  for (const [field] of SCORE_FIELDS) {
    if (!validScore(row[field])) return `${field} outside [0, 100]`;
  }
  if (!validScore(row.ranking_score)) return 'ranking_score outside [0, 100]';
  if (!validScore(row.confidence_score)) return 'confidence_score outside [0, 100]';
  if (Number(row.growth_score) <= -100) return 'growth_score sentinel value';
  return null;
}

function dateOnly(value: Date | string): string {
  return value instanceof Date ? value.toISOString().split('T')[0] : String(value).split('T')[0];
}

function buildExplanation(symbol: string, horizon: number, current: PredictionRow, previous: PredictionRow | null) {
  const currentScore = finite(current.ranking_score);
  const previousScore = previous ? finite(previous.ranking_score) : null;
  const contributions = previous
    ? SCORE_FIELDS.map(([field, factor]) => {
        const delta = finite(current[field]) - finite(previous[field]);
        return { factor, delta, percentContribution: 0, importanceRank: 0, direction: delta >= 0 ? 'positive' : 'negative' };
      })
    : [{ factor: 'Baseline (first prediction)', delta: 0, percentContribution: 0, importanceRank: 0, direction: 'positive' }];

  const totalAbsoluteDelta = contributions.reduce((sum, item) => sum + Math.abs(item.delta), 0);
  contributions.forEach((item, index) => {
    item.percentContribution = totalAbsoluteDelta > 0 ? Math.round((Math.abs(item.delta) / totalAbsoluteDelta) * 100) : 0;
    item.importanceRank = index + 1;
  });
  contributions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  contributions.forEach((item, index) => { item.importanceRank = index + 1; });

  const drivers = contributions.map((item) => ({
    factor: item.factor,
    previous: previous ? finite(previous[SCORE_FIELDS.find(([, label]) => label === item.factor)?.[0] ?? '']) : 0,
    current: finite(current[SCORE_FIELDS.find(([, label]) => label === item.factor)?.[0] ?? '']),
    delta: item.delta,
    percentContribution: item.percentContribution,
    importanceRank: item.importanceRank,
  }));

  const currentClassification = String(current.classification || 'Unavailable');
  const previousClassification = previous ? String(previous.classification || 'Unavailable') : null;
  const scoreDelta = previousScore === null ? null : currentScore - previousScore;
  const significantDrivers = drivers.filter((item) => Math.abs(item.delta) >= 3).slice(0, 3);
  const summary = previous
    ? `${symbol} is ${currentClassification}. Health score change: ${scoreDelta && scoreDelta > 0 ? '+' : ''}${scoreDelta ?? 0}. ${significantDrivers.length ? `Primary drivers: ${significantDrivers.map((item) => `${item.factor} ${item.delta > 0 ? '+' : ''}${item.delta}`).join(', ')}.` : 'No material factor changes.'}`
    : `${symbol} is ${currentClassification} with a health score of ${currentScore}. No prior ${horizon}-day prediction for comparison.`;

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
    positives: drivers.filter((item) => item.delta >= 3).map((item) => `${item.factor} +${item.delta}`),
    negatives: drivers.filter((item) => item.delta <= -3).map((item) => `${item.factor} ${item.delta}`),
    factorContributions: contributions,
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
      const params: unknown[] = [ticker, horizon];
      let where = 'WHERE symbol = $1 AND prediction_horizon = $2';
      if (query.today) {
        params.push(query.today);
        where += ` AND prediction_date <= $${params.length}`;
      }

      const rows = await pool.query(
        `SELECT symbol, prediction_date, ranking_score, classification,
                confidence_score, quality_score, growth_score, value_score,
                momentum_score, risk_score, sector_score
         FROM prediction_registry
         ${where}
         ORDER BY prediction_date DESC
         LIMIT 2`,
        params,
      );

      if (rows.rows.length === 0) {
        return reply.send(unavailableResponse(
          'PREDICTION_NOT_FOUND',
          `No ${horizon}-day prediction found for ${ticker}.`,
          ['prediction_registry'],
        ));
      }

      const current = rows.rows[0] as PredictionRow;
      const currentInvalidReason = invalidPredictionReason(current);
      if (currentInvalidReason) {
        return reply.send(unavailableResponse(
          'PREDICTION_INVALID',
          `The latest ${horizon}-day prediction for ${ticker} is unavailable because ${currentInvalidReason}.`,
          ['prediction_registry'],
        ));
      }

      const previousCandidate = (rows.rows[1] as PredictionRow | undefined) ?? null;
      const previousInvalidReason = previousCandidate ? invalidPredictionReason(previousCandidate) : null;
      const previous = previousInvalidReason ? null : previousCandidate;
      const predictionDate = dateOnly(current.prediction_date);
      const lineage: DataLineageEntry[] = [{
        sourceTable: 'prediction_registry',
        sourceField: 'ranking_score, classification, quality_score, growth_score, value_score, momentum_score, risk_score, sector_score',
        asOf: predictionDate,
        retrievedAt: new Date().toISOString(),
        isFallback: false,
        isSynthetic: false,
        notes: previousInvalidReason
          ? `Horizon: ${horizon} days. Previous comparison unavailable: ${previousInvalidReason}.`
          : `Horizon: ${horizon} days`,
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
