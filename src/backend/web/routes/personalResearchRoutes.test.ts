import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerPersonalResearchRoutes } from './personalResearchRoutes';

const noopPreHandler = async () => {};

function deps() {
  const profile = {
    uid: null,
    displayName: null,
    experienceLevel: 'beginner' as const,
    timeHorizon: 'long_term' as const,
    sectorPreferences: [],
    maxRiskLevel: 'Medium' as const,
    researchTopics: [],
    onboardingComplete: false,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  let alerts: any[] = [];
  const presets: any[] = [];
  return {
    requireAuth: noopPreHandler,
    rateLimitFor: () => noopPreHandler,
    getProfile: () => profile,
    saveProfile: () => {},
    getAlerts: () => alerts,
    getAlertsBySymbol: (symbol: string) => alerts.filter((a) => a.symbol === symbol),
    ingestAlerts: (incoming: any[]) => { alerts = incoming; return alerts; },
    acknowledgeAlert: () => {},
    removeAlert: () => {},
    generateDigest: () => ({ date: '2026-01-01' }),
    generateWeeklyReview: () => ({ week: '2026-W01' }),
    getPresets: () => presets,
    savePreset: (name: string, description: string, filters: Record<string, unknown>) => {
      const preset = { id: 'p1', name, description, filters, createdAt: new Date().toISOString() };
      presets.push(preset);
      return preset;
    },
    updatePreset: () => null,
    deletePreset: () => false,
    getThesisHistory: () => [],
    captureThesisSnapshot: () => {},
    recordAction: (action: string) => ({ action }),
    getRecentActions: () => [],
    getResearchSuggestions: () => [],
    getLatestThesisMap: () => new Map(),
    buildWatchlistIntelligence: async (tickers: string[]) => ({ items: tickers.map((symbol) => ({ symbol })), alerts: [] }),
    getNotificationSnapshot: () => ({ unread: 0 }),
    acknowledgeAll: () => {},
  };
}

describe('registerPersonalResearchRoutes', () => {
  it('returns research profile', async () => {
    const app = Fastify();
    await registerPersonalResearchRoutes(app, deps());
    const res = await app.inject({ method: 'GET', url: '/api/research-profile' });
    expect(res.statusCode).toBe(200);
  });

  it('stores alerts', async () => {
    const app = Fastify();
    await registerPersonalResearchRoutes(app, deps());
    const res = await app.inject({
      method: 'POST',
      url: '/api/alerts',
      payload: { alerts: [{ id: '1', symbol: 'INFY', type: 'event', title: 'x', body: 'y', timestamp: '', acknowledged: false }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().stored).toBe(1);
  });

  it('returns watchlist intelligence', async () => {
    const app = Fastify();
    await registerPersonalResearchRoutes(app, deps());
    const res = await app.inject({ method: 'GET', url: '/api/watchlist-intelligence?tickers=INFY,TCS' });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(2);
  });
});
