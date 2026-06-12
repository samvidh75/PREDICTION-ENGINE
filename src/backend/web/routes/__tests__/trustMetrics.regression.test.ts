import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../../../../db/index', () => ({
  default: { query: queryMock },
}));

import { trustMetricsRoutes } from '../trustMetrics';

afterEach(() => {
  queryMock.mockReset();
});

describe('trust metrics regression contract', () => {
  it('returns partial lineage-backed metrics with unaudited performance values left null', async () => {
    queryMock.mockResolvedValue({ rows: [{ total_predictions: 125, as_of: '2026-06-11' }] });
    const app = Fastify({ logger: false });
    await app.register(trustMetricsRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/api/intelligence/trust-metrics' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('partial');
    expect(body.data.total_predictions).toBe(125);
    expect(body.data.alpha).toBeNull();
    expect(body.data.hit_rate).toBeNull();
    expect(body.data.sharpe_ratio).toBeNull();
    expect(body.data.calibration_score).toBeNull();
    expect(body.dataState.lineage[0]).toMatchObject({
      sourceTable: 'prediction_registry',
      sourceField: 'COUNT(*)',
      isFallback: false,
      isSynthetic: false,
    });
    await app.close();
  });

  it('returns a 503 unavailable envelope when the registry query fails', async () => {
    queryMock.mockRejectedValue(new Error('database offline'));
    const app = Fastify({ logger: false });
    await app.register(trustMetricsRoutes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/api/intelligence/trust-metrics' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'error', reason: 'TRUST_METRICS_UNAVAILABLE' });
    await app.close();
  });
});
