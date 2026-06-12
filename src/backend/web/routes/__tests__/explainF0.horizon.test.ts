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

  it('queries and returns the selected prediction horizon with 4 params', async () => {
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
    // Expect 4 params now: [symbol, horizon, today, previous]
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('prediction_horizon = $2'),
      ['RELIANCE', 365, null, null],
    );
    expect(response.json()).toMatchObject({
      status: 'ok',
      data: { symbol: 'RELIANCE', predictionHorizon: 365 },
    });
    await app.close();
  });

  it('uses previous param to constrain the SQL date range', async () => {
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

    await app.inject({
      method: 'GET',
      url: '/api/predictions/explain/RELIANCE?horizon=90&today=2026-06-11&previous=2026-05-01',
    });
    // $3 = today, $4 = previous — both should flow to DB
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('$4::date IS NULL OR prediction_date >= $4::date'),
      ['RELIANCE', 90, '2026-06-11', '2026-05-01'],
    );
    await app.close();
  });

  it('never converts null scores to 0 — preserves null in response', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{
      symbol: 'TEST',
      prediction_date: '2026-06-11',
      ranking_score: null,
      classification: 'Healthy',
      confidence_score: 82,
      quality_score: null,
      growth_score: null,
      value_score: null,
      momentum_score: null,
      risk_score: null,
      sector_score: null,
    }] });

    const app = Fastify({ logger: false });
    await app.register(predictionExplainF0Routes);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/api/predictions/explain/TEST?horizon=30' });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    // healthScore.to should be null, not 0
    expect(body.data.healthScore.to).toBeNull();
    expect(body.data.healthScore.delta).toBeNull();

    // drivers should have all-null current values
    for (const driver of body.data.drivers) {
      expect(driver.current).toBeNull();
    }

    // summary should reflect unavailable data honestly
    expect(body.data.summary).toContain('health score is unavailable');
    await app.close();
  });
});

describe('prediction explanation F0 with partial data (single row)', () => {
  it('handles no previous row gracefully — only one row returned', async () => {
    queryMock.mockResolvedValue({ rows: [{
      symbol: 'TEST',
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

    const response = await app.inject({ method: 'GET', url: '/api/predictions/explain/TEST?horizon=30' });
    expect(response.statusCode).toBe(200);
    const body = response.json();

    // No previous = healthScore.from is null, delta is null
    expect(body.data.healthScore.from).toBeNull();
    expect(body.data.healthScore.to).toBe(71);
    expect(body.data.healthScore.delta).toBeNull();
    expect(body.data.classification.from).toBeNull();
    expect(body.data.summary).toContain('No prior 30-day prediction for comparison');
    await app.close();
  });
});
