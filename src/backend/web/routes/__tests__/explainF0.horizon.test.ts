import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../../../../db/index', () => ({
  default: { query: queryMock },
}));

import { predictionExplainF0Routes } from '../predictions/explainF0';

afterEach(() => {
  queryMock.mockReset();
});

describe('prediction explanation F0 horizon contract', () => {
  it('rejects unsupported horizons before querying the registry', async () => {
    const app = Fastify({ logger: false });
    await app.register(predictionExplainF0Routes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/api/predictions/explain/RELIANCE?horizon=14' });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'INVALID_PREDICTION_HORIZON' });
    expect(queryMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('queries and returns the selected prediction horizon', async () => {
    queryMock.mockResolvedValue({ rows: [{
      symbol: 'RELIANCE',
      prediction_date: '2026-06-11',
      ranking_score: 71,
      classification: 'Healthy',
      confidence_score: 82,
      quality_score: 75,
      growth_score: 70,
      value_score: 66,
      momentum_score: 68,
      risk_score: 30,
      sector_score: 72,
    }] });

    const app = Fastify({ logger: false });
    await app.register(predictionExplainF0Routes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/api/predictions/explain/RELIANCE?horizon=365' });
    expect(response.statusCode).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('prediction_horizon = $2'), ['RELIANCE', 365]);
    expect(response.json()).toMatchObject({
      status: 'ok',
      data: { symbol: 'RELIANCE', predictionHorizon: 365 },
    });
    await app.close();
  });
});
