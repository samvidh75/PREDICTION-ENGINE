/**
 * TRACK-P0-MEGA — Retention API Routes (hardened)
 * Fastify plugin: Watchlists, Alerts, Digest, Sharing, Referrals, Subscriptions
 *
 * SECURITY: Private user identity comes ONLY from verified Firebase ID token
 * via requireAuthenticatedUser preHandler. No ?uid=, x-user-uid, body.uid,
 * or 'anonymous' fallback is trusted. Public routes: /api/plans, /api/share/:token.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
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
      const lists = await watchlistService.getUserWatchlists(uid);
      return reply.send(lists);
    },
  );

  app.post<{ Body: WatchlistBody }>(
    '/api/watchlists',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const { name, tickers } = request.body || {};
      if (!name) return reply.status(400).send({ error: 'name is required' });
      const wl = await watchlistService.createWatchlist(uid, name);
      if (tickers && Array.isArray(tickers)) await watchlistService.updateWatchlist(wl.id, name, tickers);
      return reply.send(await watchlistService.getWatchlistById(wl.id));
    },
  );

  app.put<{ Params: WatchlistIdParams; Body: WatchlistBody }>(
    '/api/watchlists/:id',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const { name, tickers } = request.body || {};
      if (!name) return reply.status(400).send({ error: 'name is required' });
      const result = await watchlistService.updateWatchlist(request.params.id, name, tickers || []);
      if (!result) return reply.status(404).send({ error: 'watchlist not found' });
      return reply.send(result);
    },
  );

  app.delete<{ Params: WatchlistIdParams }>(
    '/api/watchlists/:id',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      await watchlistService.deleteWatchlist(request.params.id);
      return reply.send({ success: true });
    },
  );

  app.post<{ Params: WatchlistIdParams; Body: TickerBody }>(
    '/api/watchlists/:id/tickers',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const { ticker } = request.body || {};
      if (!ticker) return reply.status(400).send({ error: 'ticker is required' });
      const result = await watchlistService.addTicker(request.params.id, ticker);
      if (!result) return reply.status(404).send({ error: 'watchlist not found' });
      return reply.send(result);
    },
  );

  app.delete<{ Params: WatchlistIdParams & { ticker: string } }>(
    '/api/watchlists/:id/tickers/:ticker',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const result = await watchlistService.removeTicker(request.params.id, request.params.ticker);
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
      const alerts = await userAlertEngine.getUserAlerts(uid);
      const unread = await userAlertEngine.getUnreadCount(uid);
      return reply.send({ alerts, unreadCount: unread });
    },
  );

  app.get(
    '/api/alerts/unread',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      return reply.send({ unreadCount: await userAlertEngine.getUnreadCount(uid) });
    },
  );

  app.post<{ Params: AlertIdParams }>(
    '/api/alerts/:alertId/read',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      await userAlertEngine.markAsRead(parseInt(request.params.alertId));
      return reply.send({ success: true });
    },
  );

  app.post(
    '/api/alerts/read-all',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      await userAlertEngine.markAllAsRead(uid);
      return reply.send({ success: true });
    },
  );

  // ── Daily Digest ────────────────────────────────────────────────

  app.get(
    '/api/digest',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const digest = await dailyDigestGenerator.generateForUser(uid);
      return reply.send(digest);
    },
  );

  // ── Sharing ─────────────────────────────────────────────────────

  app.get<{ Querystring: ShareQuery }>(
    '/api/share',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const q = request.query;
      const share = await sharingService.createShareLink(
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
  app.get<{ Params: ShareTokenParams }>(
    '/api/share/:token',
    async (request, reply: FastifyReply) => {
      const data = await sharingService.getSharedPrediction(request.params.token);
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
      return reply.send(await sharingService.generateReferralCode(uid));
    },
  );

  app.get(
    '/api/referral/stats',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      return reply.send(await sharingService.getReferralStats(uid));
    },
  );

  app.post<{ Params: ReferralCodeParams }>(
    '/api/referral/:code',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const success = await sharingService.trackReferral(request.params.code, uid);
      return reply.send({ success });
    },
  );

  // ── Subscriptions / Plans ───────────────────────────────────────

  // PUBLIC: plans
  app.get('/api/plans', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await subscriptionService.getPlans());
  });

  app.get(
    '/api/subscription',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      return reply.send(await subscriptionService.getUserSubscription(uid));
    },
  );

  app.get<{ Params: { featureKey: string } }>(
    '/api/subscription/feature/:featureKey',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const hasAccess = await subscriptionService.checkFeatureAccess(uid, request.params.featureKey);
      return reply.send({ feature: request.params.featureKey, accessible: hasAccess });
    },
  );

  app.post(
    '/api/subscription/trial',
    { preHandler: [requireAuthenticatedUser] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      await subscriptionService.assignTrial(uid);
      return reply.send(await subscriptionService.getUserSubscription(uid));
    },
  );

  app.post<{ Body: SubscribeBody }>(
    '/api/subscription/subscribe',
    { preHandler: [requireAuthenticatedUser] },
    async (request, reply: FastifyReply) => {
      const uid = request.authenticatedUser!.uid;
      const { plan_id } = request.body || {};
      if (!plan_id) return reply.status(400).send({ error: 'plan_id is required' });
      await subscriptionService.subscribe(uid, plan_id);
      return reply.send(await subscriptionService.getUserSubscription(uid));
    },
  );
}
