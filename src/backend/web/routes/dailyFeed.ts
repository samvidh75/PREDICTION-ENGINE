import type { FastifyPluginAsync } from 'fastify';
import { loadDailyFeedResponse } from '../../../services/intelligence/DailyFeedResponseService';
import { errorResponse } from '../../../shared/data/AnalyticalResponse';

/**
 * Certified Daily Feed endpoint.
 *
 * This endpoint intentionally reports prediction_registry lineage because the
 * feed is generated from prediction-registry snapshot differences.
 */
export const dailyFeedRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/intelligence/daily-feed', async (request, reply) => {
    try {
      return await loadDailyFeedResponse();
    } catch (error: any) {
      request.log.error({ error }, 'daily feed request failed');
      if (error?.code === 'ECONNREFUSED' || error?.code === '57P01' || error?.code === '08006') {
        return reply.status(503).send(errorResponse('DATABASE_UNAVAILABLE', 'The database is currently unreachable.'));
      }
      return reply.status(503).send(errorResponse('DAILY_FEED_UNAVAILABLE', 'Daily intelligence is temporarily unavailable.'));
    }
  });
};

export default dailyFeedRoutes;
