/**
 * TRACK-87 — Retention API Routes
 * Fastify plugin: Watchlists, Alerts, Digest, Sharing, Referrals, Subscriptions
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { watchlistService } from '../../../services/retention/WatchlistService';
import { userAlertEngine } from '../../../services/retention/UserAlertEngine';
import { dailyDigestGenerator } from '../../../services/retention/DailyDigestGenerator';
import { sharingService } from '../../../services/retention/SharingService';
import { subscriptionService } from '../../../services/retention/SubscriptionService';

interface UidParams { uid: string }
interface WatchlistBody { name?: string; tickers?: string[] }
interface WatchlistIdParams { id: string }
interface TickerBody { ticker: string }
interface AlertIdParams { alertId: string }
interface ShareQuery { symbol: string; prediction_date: string; horizon: string }
interface ShareTokenParams { token: string }
interface ReferralCodeParams { code: string }
interface SubscribeBody { plan_id: string }

export async function retentionRoutes(app: FastifyInstance): Promise<void> {
  // ── Watchlists ──────────────────────────────────────────────────
  app.get('/api/watchlists', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    const lists = await watchlistService.getUserWatchlists(uid);
    return reply.send(lists);
  });

  app.post('/api/watchlists', async (req: FastifyRequest<{ Querystring: UidParams; Body: WatchlistBody }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    const { name, tickers } = req.body || {};
    if (!name) return reply.status(400).send({ error: 'name is required' });
    const wl = await watchlistService.createWatchlist(uid, name);
    if (tickers && Array.isArray(tickers)) await watchlistService.updateWatchlist(wl.id, name, tickers);
    return reply.send(await watchlistService.getWatchlistById(wl.id));
  });

  app.put('/api/watchlists/:id', async (req: FastifyRequest<{ Params: WatchlistIdParams; Querystring: UidParams; Body: WatchlistBody }>, reply: FastifyReply) => {
    const { name, tickers } = req.body || {};
    if (!name) return reply.status(400).send({ error: 'name is required' });
    const result = await watchlistService.updateWatchlist(req.params.id, name, tickers || []);
    if (!result) return reply.status(404).send({ error: 'watchlist not found' });
    return reply.send(result);
  });

  app.delete('/api/watchlists/:id', async (req: FastifyRequest<{ Params: WatchlistIdParams }>, reply: FastifyReply) => {
    await watchlistService.deleteWatchlist(req.params.id);
    return reply.send({ success: true });
  });

  app.post('/api/watchlists/:id/tickers', async (req: FastifyRequest<{ Params: WatchlistIdParams; Body: TickerBody }>, reply: FastifyReply) => {
    const { ticker } = req.body || {};
    if (!ticker) return reply.status(400).send({ error: 'ticker is required' });
    const result = await watchlistService.addTicker(req.params.id, ticker);
    if (!result) return reply.status(404).send({ error: 'watchlist not found' });
    return reply.send(result);
  });

  app.delete('/api/watchlists/:id/tickers/:ticker', async (req: FastifyRequest<{ Params: WatchlistIdParams & { ticker: string } }>, reply: FastifyReply) => {
    const result = await watchlistService.removeTicker(req.params.id, req.params.ticker);
    if (!result) return reply.status(404).send({ error: 'watchlist not found' });
    return reply.send(result);
  });

  // ── Alerts ──────────────────────────────────────────────────────
  app.get('/api/alerts', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    const alerts = await userAlertEngine.getUserAlerts(uid);
    const unread = await userAlertEngine.getUnreadCount(uid);
    return reply.send({ alerts, unreadCount: unread });
  });

  app.get('/api/alerts/unread', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    return reply.send({ unreadCount: await userAlertEngine.getUnreadCount(uid) });
  });

  app.post('/api/alerts/:alertId/read', async (req: FastifyRequest<{ Params: AlertIdParams }>, reply: FastifyReply) => {
    await userAlertEngine.markAsRead(parseInt(req.params.alertId));
    return reply.send({ success: true });
  });

  app.post('/api/alerts/read-all', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    await userAlertEngine.markAllAsRead(uid);
    return reply.send({ success: true });
  });

  // ── Daily Digest ────────────────────────────────────────────────
  app.get('/api/digest', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    const digest = await dailyDigestGenerator.generateForUser(uid);
    return reply.send(digest);
  });

  // ── Sharing ─────────────────────────────────────────────────────
  app.get('/api/share', async (req: FastifyRequest<{ Querystring: ShareQuery }>, reply: FastifyReply) => {
    const q = req.query as any;
    const uid = q.uid || 'anonymous';
    const share = await sharingService.createShareLink(uid, q.symbol, q.prediction_date || new Date().toISOString().split('T')[0], parseInt(q.horizon || '30'));
    if (!share) return reply.status(404).send({ error: 'prediction not found' });
    return reply.send(share);
  });

  app.get('/api/share/:token', async (req: FastifyRequest<{ Params: ShareTokenParams }>, reply: FastifyReply) => {
    const data = await sharingService.getSharedPrediction(req.params.token);
    if (!data) return reply.status(404).send({ error: 'shared prediction not found' });
    return reply.send(data);
  });

  // ── Referrals ───────────────────────────────────────────────────
  app.get('/api/referral/generate', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    return reply.send(await sharingService.generateReferralCode(uid));
  });

  app.get('/api/referral/stats', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    return reply.send(await sharingService.getReferralStats(uid));
  });

  app.post('/api/referral/:code', async (req: FastifyRequest<{ Params: ReferralCodeParams; Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    const success = await sharingService.trackReferral(req.params.code, uid);
    return reply.send({ success });
  });

  // ── Subscriptions / Plans ───────────────────────────────────────
  app.get('/api/plans', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await subscriptionService.getPlans());
  });

  app.get('/api/subscription', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    return reply.send(await subscriptionService.getUserSubscription(uid));
  });

  app.get('/api/subscription/feature/:featureKey', async (req: FastifyRequest<{ Params: { featureKey: string }; Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    const hasAccess = await subscriptionService.checkFeatureAccess(uid, req.params.featureKey);
    return reply.send({ feature: req.params.featureKey, accessible: hasAccess });
  });

  app.post('/api/subscription/trial', async (req: FastifyRequest<{ Querystring: UidParams }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    await subscriptionService.assignTrial(uid);
    return reply.send(await subscriptionService.getUserSubscription(uid));
  });

  app.post('/api/subscription/subscribe', async (req: FastifyRequest<{ Querystring: UidParams; Body: SubscribeBody }>, reply: FastifyReply) => {
    const uid = (req.query as any).uid || 'anonymous';
    const { plan_id } = req.body || {};
    if (!plan_id) return reply.status(400).send({ error: 'plan_id is required' });
    await subscriptionService.subscribe(uid, plan_id);
    return reply.send(await subscriptionService.getUserSubscription(uid));
  });
}