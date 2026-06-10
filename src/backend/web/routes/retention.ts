/**
 * TRACK-P0-MEGA — Retention API Routes (hardened)
 * Fastify plugin: Watchlists, Alerts, Digest, Sharing, Referrals, Subscriptions
 *
 * SECURITY: Private user identity comes ONLY from verified Firebase ID token
 * via requireAuthenticatedUser preHandler. No ?uid=, x-user-uid, body.uid,
 * or 'anonymous' fallback is trusted. Public routes: /api/plans, /api/share/:token.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuthenticatedUser } from '../../../backend/auth/requireAuthenticatedUser';
import { watchlistService } from '../../../services/retention/WatchlistService';
import { userAlertEngine } from '../../../services/retention/UserAlertEngine';
import { dailyDigestGenerator } from '../../../services/retention/DailyDigestGenerator';
import { sharingService } from '../../../services/retention/SharingService';
import { subscriptionService } from '../../../services/retention/SubscriptionService';

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

  app.get(
    '/api/watchlists',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const lists = watchlistService.getUserWatchlists(uid);
      return reply.send(lists);
    },
  );

  app.post(
    '/api/watchlists',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Body: WatchlistBody }>, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const { name, tickers } = request.body || {};
      if (!name) return reply.status(400).send({ error: 'name is required' });
      const wl = watchlistService.createWatchlist(uid, name);
      if (tickers && Array.isArray(tickers)) watchlistService.updateWatchlist(wl.id, name, tickers);
      return reply.send(watchlistService.getWatchlistById(wl.id));
    },
  );

  app.put(
    '/api/watchlists/:id',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Params: WatchlistIdParams; Body: WatchlistBody }>, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const { name, tickers } = request.body || {};
      if (!name) return reply.status(400).send({ error: 'name is required' });
      const result = watchlistService.updateWatchlist(request.params.id, name, tickers || []);
      if (!result) return reply.status(404).send({ error: 'watchlist not found' });
      return reply.send(result);
    },
  );

  app.delete(
    '/api/watchlists/:id',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Params: WatchlistIdParams }>, reply: FastifyReply) => {
      watchlistService.deleteWatchlist(request.params.id);
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/watchlists/:id/tickers',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Params: WatchlistIdParams; Body: TickerBody }>, reply: FastifyReply) => {
      const { ticker } = request.body || {};
      if (!ticker) return reply.status(400).send({ error: 'ticker is required' });
      const result = watchlistService.addTicker(request.params.id, ticker);
      if (!result) return reply.status(404).send({ error: 'watchlist not found' });
      return reply.send(result);
    },
  );

  app.delete(
    '/api/watchlists/:id/tickers/:ticker',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Params: WatchlistIdParams & { ticker: string } }>, reply: FastifyReply) => {
      const result = watchlistService.removeTicker(request.params.id, request.params.ticker);
      if (!result) return reply.status(404).send({ error: 'watchlist not found' });
      return reply.send(result);
    },
  );

  // ── Alerts ──────────────────────────────────────────────────────

  app.get(
    '/api/alerts',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const alerts = userAlertEngine.getUserAlerts(uid);
      const unread = userAlertEngine.getUnreadCount(uid);
      return reply.send({ alerts, unreadCount: unread });
    },
  );

  app.get(
    '/api/alerts/unread',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      return reply.send({ unreadCount: userAlertEngine.getUnreadCount(uid) });
    },
  );

  app.post(
    '/api/alerts/:alertId/read',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Params: AlertIdParams }>, reply: FastifyReply) => {
      userAlertEngine.markAsRead(parseInt(request.params.alertId));
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/alerts/read-all',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      userAlertEngine.markAllAsRead(uid);
      return reply.send({ success: true });
    },
  );

  // ── Daily Digest ────────────────────────────────────────────────

  app.get(
    '/api/digest',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const digest = dailyDigestGenerator.generateForUser(uid);
      return reply.send(digest);
    },
  );

  // ── Sharing ─────────────────────────────────────────────────────

  app.get(
    '/api/share',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Querystring: ShareQuery }>, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const q = request.query as any;
      const share = sharingService.createShareLink(
        uid,
        q.symbol,
        q.prediction_date || new Date().toISOString().split('T')[0],
        parseInt(q.horizon || '30'),
      );
      if (!share) return reply.status(404).send({ error: 'prediction not found' });
      return reply.send(share);
    },
  );

  // PUBLIC: shared prediction token
  app.get(
    '/api/share/:token',
    async (request: FastifyRequest<{ Params: ShareTokenParams }>, reply: FastifyReply) => {
      const data = sharingService.getSharedPrediction(request.params.token);
      if (!data) return reply.status(404).send({ error: 'shared prediction not found' });
      return reply.send(data);
    },
  );

  // ── Referrals ───────────────────────────────────────────────────

  app.get(
    '/api/referral/generate',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      return reply.send(sharingService.generateReferralCode(uid));
    },
  );

  app.get(
    '/api/referral/stats',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      return reply.send(sharingService.getReferralStats(uid));
    },
  );

  app.post(
    '/api/referral/:code',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Params: ReferralCodeParams }>, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const success = sharingService.trackReferral(request.params.code, uid);
      return reply.send({ success });
    },
  );

  // ── Subscriptions / Plans ───────────────────────────────────────

  // PUBLIC: plans
  app.get('/api/plans', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(subscriptionService.getPlans());
  });

  app.get(
    '/api/subscription',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      return reply.send(subscriptionService.getUserSubscription(uid));
    },
  );

  app.get(
    '/api/subscription/feature/:featureKey',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Params: { featureKey: string } }>, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const hasAccess = subscriptionService.checkFeatureAccess(uid, request.params.featureKey);
      return reply.send({ feature: request.params.featureKey, accessible: hasAccess });
    },
  );

  app.post(
    '/api/subscription/trial',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      subscriptionService.assignTrial(uid);
      return reply.send(subscriptionService.getUserSubscription(uid));
    },
  );

  app.post(
    '/api/subscription/subscribe',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest<{ Body: SubscribeBody }>, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const { plan_id } = request.body || {};
      if (!plan_id) return reply.status(400).send({ error: 'plan_id is required' });
      subscriptionService.subscribe(uid, plan_id);
      return reply.send(subscriptionService.getUserSubscription(uid));
    },
  );
}
