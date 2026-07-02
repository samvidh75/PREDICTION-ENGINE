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
import { requireAuth, getUid } from "../../services/auth/authMiddleware.js";

// ─── Types ──────────────────────────────────────────────────

interface CreateCheckoutBody {
  planId: string;
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
    razorpaySubscriptionId: row.razorpay_subscription_id,
  };
}

// ─── Route Registration ─────────────────────────────────────

export default async function registerBillingRoutes(server: FastifyInstance) {

  // ── POST /api/checkout/create ──────────────────────────────
  // Creates a Razorpay subscription with automated plan management.
  // The provider auto-creates the plan on Razorpay (no dashboard needed).
  // The user is redirected to the Razorpay hosted checkout page (short_url)
  // to complete the E-mandate via UPI / card / netbanking.
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

        // Subscription-based checkout (Phase 16+)
        // Auto-creates the Razorpay plan on first use, then creates a
        // subscription with a 12-cycle E-mandate.
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
           (user_id, plan_id, tier, status, razorpay_subscription_id, current_period_start, current_period_end, amount_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT(user_id, status) WHERE status IN ('active', 'trial')
           DO UPDATE SET plan_id = EXCLUDED.plan_id, tier = EXCLUDED.tier,
                         razorpay_subscription_id = EXCLUDED.razorpay_subscription_id,
                         amount_paid = EXCLUDED.amount_paid,
                         current_period_start = EXCLUDED.current_period_start,
                         current_period_end = EXCLUDED.current_period_end`,
          [uid, planId, plan.tier, "active", session.sessionId, periodStart, periodEnd, plan.priceInr * 100]
        );

        // Return data the frontend needs:
        //   - checkoutUrl (short_url) for hosted Razorpay checkout page
        //   - sessionId (subscription ID) for modal-based checkout
        //   - key + amount for client-side RazorpayCheckout.open()
        return reply.status(200).send({
          sessionId: session.sessionId,
          checkoutUrl: session.checkoutUrl,
          mode: session.mode ?? "subscription",
          provider: "razorpay",
          key: process.env.VITE_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? "",
          amount: plan.priceInr * 100,
          currency: "INR",
          name: "StockEX",
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
        const rawPayload = event.raw as any;

        if (event.type === "checkout.completed") {
          const payment = rawPayload?.payload?.payment?.entity;
          if (payment) {
            // Determine the user associated with this payment
            const userId =
              payment.notes?.userId ??
              rawPayload?.payload?.subscription?.entity?.notes?.userId;

            // If payment includes a subscription_id, look up the subscription
            const subId = payment.subscription_id;

            if (userId) {
              // Update the subscription row (match by subscription_id or user)
              if (subId) {
                await dbAdapter.query(
                  `UPDATE user_subscriptions
                   SET status = 'active',
                       razorpay_payment_id = $1,
                       razorpay_order_id = $2,
                       updated_at = datetime('now')
                   WHERE razorpay_subscription_id = $3`,
                  [payment.id, payment.order_id, subId]
                );
              } else {
                await dbAdapter.query(
                  `UPDATE user_subscriptions
                   SET status = 'active',
                       razorpay_payment_id = $1,
                       razorpay_order_id = $2,
                       updated_at = datetime('now')
                   WHERE user_id = $3 AND status IN ('active', 'trial')
                   ORDER BY created_at DESC LIMIT 1`,
                  [payment.id, payment.order_id, userId]
                );
              }

              // Record transaction
              const eventId = payment.id ?? "";
              await dbAdapter.query(
                `INSERT INTO billing_transactions
                 (user_id, event_type, razorpay_event_id, razorpay_order_id,
                  razorpay_payment_id, amount, currency, status, provider_data)
                 VALUES ($1, 'payment.captured', $2, $3, $4, $5, $6, 'captured', $7)`,
                [
                  userId,
                  eventId,
                  payment.order_id ?? "",
                  payment.id ?? "",
                  payment.amount ?? 0,
                  payment.currency ?? "INR",
                  JSON.stringify(event.raw),
                ]
              );
            }
          }
        } else if (event.type === "payment.failed") {
          const payment = rawPayload?.payload?.payment?.entity;
          const userId =
            payment?.notes?.userId ??
            rawPayload?.payload?.subscription?.entity?.notes?.userId;
          if (userId) {
            await dbAdapter.query(
              `UPDATE user_subscriptions SET status = 'past_due', updated_at = datetime('now')
               WHERE user_id = $1 AND status IN ('active', 'trial')`,
              [userId]
            );

            const eventId = payment?.id ?? "";
            await dbAdapter.query(
              `INSERT INTO billing_transactions
               (user_id, event_type, razorpay_event_id, razorpay_order_id,
                razorpay_payment_id, amount, currency, status, provider_data)
               VALUES ($1, 'payment.failed', $2, $3, $4, $5, $6, 'failed', $7)`,
              [
                userId,
                eventId,
                payment?.order_id ?? "",
                payment?.id ?? "",
                payment?.amount ?? 0,
                payment?.currency ?? "INR",
                JSON.stringify(event.raw),
              ]
            );
          }
        } else if (event.type === "subscription.cancelled") {
          const sub = rawPayload?.payload?.subscription?.entity;
          if (sub?.id) {
            await dbAdapter.query(
              `UPDATE user_subscriptions SET status = 'cancelled', updated_at = datetime('now')
               WHERE razorpay_subscription_id = $1 AND status IN ('active', 'trial')`,
              [sub.id]
            );
          }
          // Fallback: try notes.userId
          if (sub?.notes?.userId) {
            await dbAdapter.query(
              `UPDATE user_subscriptions SET status = 'cancelled', updated_at = datetime('now')
               WHERE user_id = $1 AND status IN ('active', 'trial')`,
              [sub.notes.userId]
            );
          }
        } else if (event.type === "subscription.updated") {
          // Handles subscription.activated, subscription.charged
          // for recurring billing events
          const sub = rawPayload?.payload?.subscription?.entity;
          if (sub?.id) {
            const newStatus = sub.status === "active" ? "active"
              : sub.status === "cancelled" ? "cancelled"
              : sub.status === "past_due" ? "past_due"
              : undefined;
            if (newStatus) {
              await dbAdapter.query(
                `UPDATE user_subscriptions
                 SET status = $1, current_period_start = $2, current_period_end = $3,
                     updated_at = datetime('now')
                 WHERE razorpay_subscription_id = $4`,
                [
                  newStatus,
                  sub.current_start ? sub.current_start * 1000 : Date.now(),
                  sub.current_end ? sub.current_end * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000,
                  sub.id,
                ]
              );
            }

            // If subscription.charged, record the recurring payment
            if (sub.status === "active" && rawPayload.event === "subscription.charged") {
              const payment = rawPayload?.payload?.payment?.entity;
              await dbAdapter.query(
                `INSERT INTO billing_transactions
                 (user_id, event_type, razorpay_event_id, razorpay_order_id,
                  razorpay_payment_id, amount, currency, status, provider_data)
                 VALUES ($1, 'subscription.charged', $2, $3, $4, $5, $6, 'captured', $7)`,
                [
                  sub.notes?.userId ?? "",
                  payment?.id ?? "",
                  payment?.order_id ?? "",
                  payment?.id ?? "",
                  payment?.amount ?? 0,
                  payment?.currency ?? "INR",
                  JSON.stringify(event.raw),
                ]
              );
            }
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
