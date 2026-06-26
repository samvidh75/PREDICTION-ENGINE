import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { marketConfigService } from '../../../services/MarketConfigService';
import { MarketCloseSnapshotJob } from '../../../jobs/MarketCloseSnapshotJob';

const marketHoursRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/api/market/status', async (_request, reply) => {
    try {
      const status = await marketConfigService.getMarketStatus();
      const source = await marketConfigService.getDataSource();
      const message = await marketConfigService.getDataFreshnessMessage();
      return reply.send({ ...status, source, message });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get market status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/api/market/snapshot-info', async (_request, reply) => {
    try {
      const info = await MarketCloseSnapshotJob.getLatestSnapshotInfo();
      return reply.send(info);
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get snapshot info',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.post('/api/market/snapshot-trigger', async (_request, reply) => {
    try {
      const result = await MarketCloseSnapshotJob.execute();
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({
        error: 'Snapshot job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

export default marketHoursRoutes;
