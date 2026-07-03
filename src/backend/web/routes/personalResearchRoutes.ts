import type { FastifyInstance } from 'fastify';
import type { UserResearchProfile, AlertChangeView, SavedScannerPreset } from '../../../research/contracts/productContracts.js';

type PreHandler = (req: any, reply: any) => Promise<unknown> | unknown;

export interface PersonalResearchRouteDeps {
  requireAuth: PreHandler;
  rateLimitFor: (metric: string) => PreHandler;
  getProfile: () => UserResearchProfile;
  saveProfile: (profile: UserResearchProfile) => void;
  getAlerts: () => AlertChangeView[];
  getAlertsBySymbol: (symbol: string) => AlertChangeView[];
  ingestAlerts: (alerts: AlertChangeView[]) => AlertChangeView[];
  acknowledgeAlert: (id: string) => void;
  removeAlert: (id: string) => void;
  generateDigest: () => unknown;
  generateWeeklyReview: () => unknown;
  getPresets: () => SavedScannerPreset[];
  savePreset: (name: string, description: string, filters: Record<string, unknown>) => SavedScannerPreset;
  updatePreset: (id: string, updates: Partial<SavedScannerPreset>) => SavedScannerPreset | null;
  deletePreset: (id: string) => boolean;
  getThesisHistory: (symbol: string) => unknown[];
  captureThesisSnapshot: (thesis: any) => void;
  recordAction: (action: string, symbol: string | null, metadata: unknown) => unknown;
  getRecentActions: (limit: number) => unknown[];
  getResearchSuggestions: (watchlistTickers: string[], statusMap: Map<string, string>) => unknown[];
  getLatestThesisMap: () => Map<string, any>;
  buildWatchlistIntelligence: (tickers: string[], previousThesis: Map<string, any>, options: { changesOnly: boolean }) => Promise<any>;
  getNotificationSnapshot: () => unknown;
  acknowledgeAll: () => void;
}

export async function registerPersonalResearchRoutes(server: FastifyInstance, deps: PersonalResearchRouteDeps) {
  const authLimit = { preHandler: [deps.requireAuth, deps.rateLimitFor('api_calls_per_hour')] };

  server.get('/api/research-profile', async () => deps.getProfile());

  server.put('/api/research-profile', authLimit, async (req, reply) => {
    try {
      const body = req.body as Partial<UserResearchProfile>;
      if (!body) return reply.status(400).send({ error: 'profile data required' });
      const existing = deps.getProfile();
      const updated: UserResearchProfile = { ...existing, ...body, updatedAt: new Date().toISOString() };
      deps.saveProfile(updated);
      return deps.getProfile();
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.get('/api/alerts', async (req) => {
    const { symbol, limit } = (req.query as any) ?? {};
    let alerts = symbol ? deps.getAlertsBySymbol(String(symbol)) : deps.getAlerts();
    if (limit) alerts = alerts.slice(0, Number(limit));
    return { alerts, count: alerts.length };
  });

  server.post('/api/alerts', authLimit, async (req, reply) => {
    try {
      const body = req.body as { alerts: AlertChangeView[] };
      if (!body?.alerts?.length) return reply.status(400).send({ error: 'alerts array required' });
      const stored = deps.ingestAlerts(body.alerts);
      return { stored: stored.length, total: stored.length };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.put('/api/alerts/:id', authLimit, async (req, reply) => {
    const { id } = req.params as any;
    const { acknowledged, action } = req.body as any;
    if (action === 'remove') {
      deps.removeAlert(id);
      return { id, removed: true };
    }
    if (acknowledged !== undefined) {
      deps.acknowledgeAlert(id);
      return { id, acknowledged: true };
    }
    return reply.status(400).send({ error: 'acknowledged or action required' });
  });

  server.get('/api/digest', async () => deps.generateDigest());
  server.get('/api/digest/weekly', async () => deps.generateWeeklyReview());

  server.get('/api/scanner-presets', async () => ({ presets: deps.getPresets() }));

  server.post('/api/scanner-presets', authLimit, async (req, reply) => {
    try {
      const { name, description, filters } = req.body as any;
      if (!name || !filters) return reply.status(400).send({ error: 'name and filters required' });
      return deps.savePreset(name, description ?? '', filters);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.put('/api/scanner-presets/:id', authLimit, async (req, reply) => {
    const { id } = req.params as any;
    const updates = req.body as Partial<SavedScannerPreset>;
    const result = deps.updatePreset(id, updates);
    if (!result) return reply.status(404).send({ error: 'preset not found' });
    return result;
  });

  server.delete('/api/scanner-presets/:id', authLimit, async (req, reply) => {
    const { id } = req.params as any;
    const deleted = deps.deletePreset(id);
    if (!deleted) return reply.status(404).send({ error: 'preset not found' });
    return { id, deleted: true };
  });

  server.get('/api/thesis-history/:symbol', async (req) => {
    const { symbol } = req.params as any;
    const normalized = String(symbol).toUpperCase();
    return { symbol: normalized, snapshots: deps.getThesisHistory(normalized) };
  });

  server.post('/api/thesis-history', authLimit, async (req, reply) => {
    try {
      const { thesis } = req.body as any;
      if (!thesis?.symbol) return reply.status(400).send({ error: 'thesis with symbol required' });
      deps.captureThesisSnapshot(thesis);
      return { symbol: thesis.symbol, captured: true };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.post('/api/actions', authLimit, async (req, reply) => {
    try {
      const { action, symbol, metadata } = req.body as any;
      if (!action) return reply.status(400).send({ error: 'action type required' });
      return deps.recordAction(action, symbol ?? null, metadata);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.get('/api/actions/recent', async (req) => {
    const { limit } = (req.query as any) ?? {};
    return { actions: deps.getRecentActions(limit ? Number(limit) : 20) };
  });

  server.get('/api/research-suggestions', async (req) => {
    const { tickers } = (req.query as any) ?? {};
    const watchlistTickers: string[] = tickers
      ? String(tickers).split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
      : [];
    const thesisMap = deps.getLatestThesisMap();
    const statusMap = new Map<string, string>();
    for (const [symbol, thesis] of thesisMap) {
      statusMap.set(symbol, thesis.currentStatus);
    }
    return { suggestions: deps.getResearchSuggestions(watchlistTickers, statusMap) };
  });

  server.get('/api/watchlist-intelligence', async (req, reply) => {
    try {
      const { tickers, changesOnly } = (req.query as any) ?? {};
      const tickerList: string[] = tickers
        ? String(tickers).split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
        : [];
      if (!tickerList.length) return reply.status(400).send({ error: 'tickers required (comma-separated)' });

      const previousThesis = deps.getLatestThesisMap();
      const intelligence = await deps.buildWatchlistIntelligence(
        tickerList,
        previousThesis,
        { changesOnly: changesOnly === 'true' || changesOnly === '1' },
      );

      for (const item of intelligence.items) deps.captureThesisSnapshot(item);
      if (intelligence.alerts.length > 0) deps.ingestAlerts(intelligence.alerts);
      return intelligence;
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
    }
  });

  server.get('/api/notification-snapshot', async () => deps.getNotificationSnapshot());
  server.post('/api/notifications/acknowledge-all', async () => {
    deps.acknowledgeAll();
    return { acknowledged: true };
  });
}
