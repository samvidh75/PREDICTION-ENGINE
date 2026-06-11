import type { FastifyPluginAsync } from 'fastify';
import pool from '../../../db/index';
import {
  partialResponse,
  realResponse,
  errorResponse,
  type DataLineageEntry,
} from '../../../shared/data/AnalyticalResponse';

interface TrustMetricsData {
  alpha: number | null;
  hit_rate: number | null;
  sharpe_ratio: number | null;
  calibration_score: number | null;
  total_predictions: number | null;
  total_outcomes: number | null;
}

/**
 * Public trust metrics route.
 *
 * Finance-product rule: never invent performance values. Until an audited
 * outcomes table is wired, performance metrics remain null and the envelope is
 * partial. Prediction counts are calculated from the canonical registry.
 */
export const trustMetricsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/intelligence/trust-metrics', async (_request, reply) => {
    try {
      const registry = await pool.query(
        `SELECT COUNT(*)::int AS total_predictions, MAX(prediction_date) AS as_of
         FROM prediction_registry`,
      );

      const row = registry.rows[0] as { total_predictions?: number | string; as_of?: Date | string | null } | undefined;
      const totalPredictions = row?.total_predictions == null ? null : Number(row.total_predictions);
      const asOf = row?.as_of instanceof Date
        ? row.as_of.toISOString().split('T')[0]
        : row?.as_of
          ? String(row.as_of).split('T')[0]
          : null;

      const data: TrustMetricsData = {
        alpha: null,
        hit_rate: null,
        sharpe_ratio: null,
        calibration_score: null,
        total_predictions: Number.isFinite(totalPredictions) ? totalPredictions : null,
        total_outcomes: null,
      };

      const lineage: DataLineageEntry[] = [
        {
          sourceTable: 'prediction_registry',
          sourceField: 'COUNT(*)',
          asOf,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: 'Total predictions calculated from canonical prediction registry.',
        },
      ];

      const missingInputs = [
        'audited_outcomes.alpha',
        'audited_outcomes.hit_rate',
        'audited_outcomes.sharpe_ratio',
        'audited_outcomes.calibration_score',
        'audited_outcomes.total_outcomes',
      ];

      if (data.total_predictions === null) {
        missingInputs.push('prediction_registry.total_predictions');
      }

      if (missingInputs.length > 0) {
        return reply.send(partialResponse(
          'TRUST_METRICS_PARTIAL',
          'Only registry-backed trust metrics are available. Audited outcome metrics are not connected yet.',
          data,
          missingInputs,
          data.total_predictions === null ? 0 : 17,
          lineage,
          asOf,
        ));
      }

      return reply.send(realResponse(data, 'recent', asOf, 100, lineage, 'OK'));
    } catch (error: any) {
      app.log.error({ err: error }, 'trust metrics query failed');
      return reply.status(503).send(errorResponse(
        'TRUST_METRICS_UNAVAILABLE',
        'Trust metrics are temporarily unavailable.',
      ));
    }
  });
};

export default trustMetricsRoutes;
