import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { smartScannerService } from '../../../services/SmartScannerService';
import type { ScanStrategy } from '../../../services/SmartScannerService';

const scannerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get<{ Querystring: { limit?: string } }>(
    '/api/scanner/all',
    async (request, reply) => {
      try {
        const limit = Math.min(Number(request.query.limit) || 100, 500);
        const results = await smartScannerService.scanAllStocks(limit);
        return reply.send({ results, count: results.length, type: 'all' });
      } catch (error) {
        return reply.status(500).send({
          error: 'Scan failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  fastify.get<{ Params: { sector: string }; Querystring: { limit?: string } }>(
    '/api/scanner/sector/:sector',
    async (request, reply) => {
      try {
        const limit = Math.min(Number(request.query.limit) || 50, 200);
        const results = await smartScannerService.scanSector(request.params.sector, limit);
        return reply.send({ sector: request.params.sector, results, count: results.length });
      } catch (error) {
        return reply.status(500).send({
          error: 'Sector scan failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  fastify.get<{ Querystring: { strategy?: string; limit?: string } }>(
    '/api/scanner/strategy',
    async (request, reply) => {
      try {
        const strategy = (request.query.strategy || 'all') as ScanStrategy;
        const limit = Math.min(Number(request.query.limit) || 50, 200);
        const results = await smartScannerService.scanByStrategy(strategy, limit);
        return reply.send({ strategy, results, count: results.length });
      } catch (error) {
        return reply.status(500).send({
          error: 'Strategy scan failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );
};

export default scannerRoutes;
