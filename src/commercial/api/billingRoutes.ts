/**
 * commercial/api/billingRoutes — Fastify billing & checkout routes.
 *
 * Replaces the Express 501 stubs from checkoutApi.ts with live
 * Razorpay-backed handlers.
 *
 * Routes:
 *   POST /api/checkout/create            — Create Razorpay order → open modal
 *   GET  /api/checkout/billing           — Get active subscription details
 *   POST /api/checkout/cancel            — Cancel active subscription
 *   POST /api/checkout/webhook           — Razorpay webhook receiver
 *   GET  /api/checkout/subscription-status — Lightweight status check
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getRazorpayProvider } from "../providers/razorpay.js";
import { getPlan } from "../plans.js";
import { dbAdapter } from "../../db/DatabaseAdapter.js";
import { verifyFirebaseToken } from "../../config/firebaseAdmin.js";

// ─── Types ──────────────────────────────────────────────────

interface CreateCheckoutBody {
  planId: string;
}

/** Firebase auth preHandler — mirrors apiRouter.ts requireAuth */
async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      req.log.warn({ url: req.url }, "Unauthenticated — no Bearer token");
      if (process.env.NODE_ENV === "production") {
        return reply.status(401).send({ error: "Authentication required" });
      }
      (req as any).uid = null;
      return;
    }
    const token = auth.slice(7);
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      req.log.warn({ url: req.url }, "Invalid Firebase token");
      if (process.env.NODE_ENV === "production") {
        return reply.status(401).send({ error: "Authentication required" });
      }
      (req as any).uid = null;
      return;
    }
    (req as any).uid = decoded.uid;
  } catch (err) {
    req.log.warn({ url: req.url, err }, "Firebase token verification failed");
    if (process.env.NODE_ENV === "production") {
      return reply.status(401).send({ error: "Authentication required" });
    }
    (req as any).uid = null;
  }
}

// ─── Helpers ────────────────────────────────────────────────

/** Ensure request is authenticated; return uid or throw 401. */
function getUid(req: FastifyRequest): string {
  const uid = (req as any).uid;
  if (!uid) {
    throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  }
  return uid;
}

/** Build a response object matching what PricingPage expects. */
function subToResponse(row: Record<string, any>) {
  return {
    subscriptionId: String(row.id),
    planId: row.plan_id,
    tier: row.tier,
    status: row.status,
    currentPeriodStart: new Date(Number(row.current_period_start)).toISOString(),
    currentPeriodEnd: row.current_period_end
      ? new Date(Number(row.current_period_end)).toISOString()
      : null,
    amountPaid: row.amount_paid,
    currency: row.currency,
    autoRenew: Boolean(row.auto_renew),
    createdAt: row.created_at,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
  };
}

// ─── Route Registration ─────────────────────────────────────

export default async function registerBillingRoutes(server: FastifyInstance) {

  // ── POST /api/checkout/create ──────────────────────────────
  // Creates a Razorpay order. Frontend uses the returned order_id
  // to open the Razorpay checkout modal.
  server.post<{ Body: CreateCheckoutBody }>(
    "/api/checkout/create",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest<{ Body: CreateCheckoutBody }>, reply: FastifyReply) => {
      try {
        const uid = getUid(req);
        const { planId } = req.body;

        if (!planId) {
          return reply.status(400).send({ error: "planId is required" });
        }

        const plan = getPlan(planId);
        if (!plan) {
          return reply.status(404).send({ error: `Plan "${planId}" not found` });
        }

        if (!plan.active || plan.priceInr === 0) {
          return reply.status(400).send({ error: "This plan cannot be purchased" });
        }

        const provider = getRazorpayProvider();
        const session = await provider.createCheckout({
          planId,
          userId: uid,
          successUrl: "",
          cancelUrl: "",
        });

        // Store a pending subscription row to link future webhook
        const periodStart = Date.now();
        const periodEnd = periodStart + 30 * 24 * 60 * 60 * 1000; // 30 days

        await dbAdapter.query(
          `INSERT INTO user_subscriptions
           (user_id, plan_id, tier, status, razorpay_order_id, current_period_start, current_period_end, amount_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT(user_id, status) WHERE status IN ('active', 'trial')
           DO UPDATE SET plan_id = EXCLUDED.plan_id, tier = EXCLUDED.tier,
                         razorpay_order_id = EXCLUDED.razorpay_order_id,
                         amount_paid = EXCLUDED.amount_paid,
                         current_period_start = EXCLUDED.current_period_start,
                         current_period_end = EXCLUDED.current_period_end`,
          [uid, planId, plan.tier, "active", session.sessionId, periodStart, periodEnd, plan.priceInr * 100]
        );

        return reply.status(200).send({
          sessionId: session.sessionId,
          provider: "razorpay",
          key: process.env.VITE_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "",
          amount: plan.priceInr * 100,
          currency: "INR",
          name: "Equity Lens",
          description: plan.name,
          plan: { id: plan.id, name: plan.name, tier: plan.tier, priceInr: plan.priceInr },
        });
      } catch (err: any) {
        req.log.error({ err }, "create checkout error");
        return reply.status(err.statusCode ?? 500).send({
          error: err.statusCode && err.statusCode < 500 ? err.message : "Internal error",
        });
      }
    }
  );

  // ── GET /api/checkout/billing ──────────────────────────────
  server.get(
    "/api/checkout/billing",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = getUid(req);

        const result = await dbAdapter.query(
          `SELECT * FROM user_subscriptions
           WHERE user_id = $1 AND status IN ('active', 'trial', 'past_due')
           ORDER BY created_at DESC
           LIMIT 1`,
          [uid]
        );

        if (result.rowCount === 0) {
          return reply.status(200).send({
            plan: "free",
            status: "active",
            subscription: null,
            message: "No active subscription. On free tier.",
          });
        }

        const row = result.rows[0];
        return reply.status(200).send(subToResponse(row));
      } catch (err: any) {
        req.log.error({ err }, "billing details error");
        return reply.status(500).send({ error: "Internal error" });
      }
    }
  );

  // ── POST /api/checkout/cancel ──────────────────────────────
  server.post(
    "/api/checkout/cancel",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = getUid(req);

        const result = await dbAdapter.query(
          `SELECT * FROM user_subscriptions
           WHERE user_id = $1 AND status IN ('active', 'trial')
           ORDER BY created_at DESC LIMIT 1`,
          [uid]
        );

        if (result.rowCount === 0) {
          return reply.status(404).send({ error: "No active subscription found" });
        }

        const sub = result.rows[0];
        const provider = getRazorpayProvider();

        // Cancel via Razorpay if there's a provider subscription ID
        if (sub.provider_sub_id || sub.razorpay_subscription_id) {
          await provider.cancelSubscription(sub.provider_sub_id ?? sub.razorpay_subscription_id);
        }

        // Update local DB
        await dbAdapter.query(
          `UPDATE user_subscriptions SET status = 'cancelled', updated_at = datetime('now')
           WHERE id = $1`,
          [sub.id]
        );

        return reply.status(200).send({
          success: true,
          message: "Subscription cancelled. Access continues until end of billing period.",
        });
      } catch (err: any) {
        req.log.error({ err }, "cancel subscription error");
        return reply.status(500).send({ error: "Internal error" });
      }
    }
  );

  // ── POST /api/checkout/webhook ─────────────────────────────
  // Razorpay sends payment events here. Raw body is required for
  // HMAC SHA256 signature verification.
  server.post(
    "/api/checkout/webhook",
    async (req: FastifyRequest, reply: FastifyReply) => {
      // Get raw body — stored by the content-type parser in startServer.ts
      const rawBody = (req as any).__rawBody ?? JSON.stringify(req.body);
      const signature = (req.headers["x-razorpay-signature"] as string) ?? "";

      if (!signature) {
        req.log.warn("Webhook received without x-razorpay-signature header");
        return reply.status(400).send({ error: "Missing signature" });
      }

      try {
        const provider = getRazorpayProvider();
        const event = await provider.handleWebhook(rawBody, signature);

        req.log.info({ eventType: event.type, providerSubId: event.providerSubId },
          "Webhook verified");

        // Route webhook event to DB updates
        if (event.type === "checkout.completed") {
          const payment = (event.raw as any)?.payload?.payment?.entity;
          if (payment?.notes?.userId) {
            await dbAdapter.query(
              `UPDATE user_subscriptions
               SET status = 'active',
                   razorpay_payment_id = $1,
                   razorpay_order_id = $2,
                   updated_at = datetime('now')
               WHERE user_id = $3 AND status = 'active'
               ORDER BY created_at DESC LIMIT 1`,
              [payment.id, payment.order_id, payment.notes.userId]
            );

            // Record transaction
            await dbAdapter.query(
              `INSERT INTO billing_transactions
               (user_id, event_type, razorpay_event_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status, provider_data)
               VALUES ($1, 'payment.captured', $2, $3, $4, $5, $6, 'captured', $7)`,
              [
                payment.notes.userId,
                (event.raw as any)?.payload?.payment?.entity?.id ?? "",
                payment.order_id,
                payment.id,
                payment.amount,
                payment.currency ?? "INR",
                JSON.stringify(event.raw),
              ]
            );
          }
        } else if (event.type === "payment.failed") {
          // Update subscription status to past_due
          const payment = (event.raw as any)?.payload?.payment?.entity;
          if (payment?.notes?.userId) {
            await dbAdapter.query(
              `UPDATE user_subscriptions SET status = 'past_due', updated_at = datetime('now')
               WHERE user_id = $1 AND status = 'active'`,
              [payment.notes.userId]
            );

            await dbAdapter.query(
              `INSERT INTO billing_transactions
               (user_id, event_type, razorpay_event_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status, provider_data)
               VALUES ($1, 'payment.failed', $2, $3, $4, $5, $6, 'failed', $7)`,
              [
                payment.notes.userId,
                (event.raw as any)?.payload?.payment?.entity?.id ?? "",
                payment.order_id,
                payment.id,
                payment.amount,
                payment.currency ?? "INR",
                JSON.stringify(event.raw),
              ]
            );
          }
        } else if (event.type === "subscription.cancelled") {
          const sub = (event.raw as any)?.payload?.subscription?.entity;
          if (sub?.notes?.userId) {
            await dbAdapter.query(
              `UPDATE user_subscriptions SET status = 'cancelled', updated_at = datetime('now')
               WHERE user_id = $1 AND status IN ('active', 'trial')`,
              [sub.notes.userId]
            );
          }
        }

        return reply.status(200).send({ received: true });
      } catch (err: any) {
        req.log.error({ err }, "Webhook verification failed");
        return reply.status(401).send({ error: "Invalid webhook signature" });
      }
    }
  );

  // ── GET /api/checkout/subscription-status ──────────────────
  // Lightweight endpoint for useEntitlements Store.load().
  server.get(
    "/api/checkout/subscription-status",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = getUid(req);

        const result = await dbAdapter.query(
          `SELECT id, plan_id, tier, status, current_period_start, current_period_end,
                  amount_paid, currency, auto_renew, created_at,
                  razorpay_order_id, razorpay_payment_id
           FROM user_subscriptions
           WHERE user_id = $1 AND status IN ('active', 'trial', 'past_due')
           ORDER BY created_at DESC LIMIT 1`,
          [uid]
        );

        if (result.rowCount === 0) {
          return reply.status(200).send({
            tier: "free",
            status: "active",
            subscription: null,
          });
        }

        const row = result.rows[0];
        return reply.status(200).send(subToResponse(row));
      } catch (err: any) {
        req.log.error({ err }, "subscription status error");
        return reply.status(500).send({ error: "Internal error" });
      }
    }
  );
}
