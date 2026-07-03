import promClient from 'prom-client';
import type { FastifyInstance } from 'fastify';

const apiRequests = new promClient.Counter({
  name: 'stockstory_api_requests_total',
  help: 'Total API requests',
  labelNames: ['endpoint', 'method', 'status'] as const,
});

const engineCalculations = new promClient.Counter({
  name: 'stockstory_engine_calculations_total',
  help: 'Total engine score calculations',
  labelNames: ['engine', 'status'] as const,
});

const websocketConnections = new promClient.Gauge({
  name: 'stockstory_active_websockets',
  help: 'Number of active WebSocket connections',
});

const apiLatency = new promClient.Histogram({
  name: 'stockstory_api_latency_ms',
  help: 'API request latency in milliseconds',
  labelNames: ['endpoint'] as const,
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

const engineLatency = new promClient.Histogram({
  name: 'stockstory_engine_latency_ms',
  help: 'Engine calculation latency',
  labelNames: ['engine'] as const,
  buckets: [10, 50, 100, 200, 500, 1000],
});

export async function registerMetrics(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    (request as any).startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const latency = Date.now() - ((request as any).startTime || Date.now());
    const url = request.url.split('?')[0];
    apiLatency.labels(url).observe(latency);
    apiRequests.labels(url, request.method, String(reply.statusCode)).inc();
  });

  app.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', promClient.register.contentType);
    return promClient.register.metrics();
  });
}

export const metrics = {
  apiRequests,
  engineCalculations,
  websocketConnections,
  apiLatency,
  engineLatency,
};
