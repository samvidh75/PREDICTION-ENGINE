import Fastify from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerUnifiedAlertsRoutes } from './unifiedAlertsRoutes';

describe('registerUnifiedAlertsRoutes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    await registerUnifiedAlertsRoutes(app);
  });

  it('creates and lists rules', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/alerts/create',
      payload: {
        symbol: 'INFY',
        ruleType: 'price_move',
        threshold: 5,
      },
    });

    expect(createRes.statusCode).toBe(200);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/alerts/rules?symbol=INFY',
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().rules).toHaveLength(1);
  });

  it('evaluates alerts for a supplied event payload', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/alerts/create',
      payload: {
        symbol: 'RELIANCE',
        ruleType: 'score_change',
        threshold: 8,
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/alerts/evaluate',
      payload: {
        symbol: 'RELIANCE',
        previousThesisStatus: 'Track',
        currentThesisStatus: 'Review',
        previousRiskLevel: 'Low',
        currentRiskLevel: 'Medium',
        scoreChange: 12,
        priceChangePercent: 3,
        peerBecameMoreAttractive: false,
        hasResultEvent: false,
        confidenceState: 'CONFIDENCE_RISING',
        marketStateLabel: 'Broadening leadership',
        narrativeKey: 77,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.result.matchedRules).toHaveLength(1);
    expect(body.result.generatedAlerts.some((alert: { type: string }) => alert.type === 'watchlist_review')).toBe(true);
  });
});
