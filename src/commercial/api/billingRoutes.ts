/**
 * commercial/api/billingRoutes — Fastify billing & checkout routes.
 *
 * Replaces the Express 501 stubs from checkoutApi.ts with live
 * manual-billing-backed handlers.
 *
 * Routes:
 *   POST /api/checkout/create            — Create manual order → redirect
 *   GET  /api/checkout/billing           — Get current subscription details
 *   POST /api/checkout/cancel            — Cancel active subscription
 *   POST /api/checkout/webhook           — Manual billing webhook receiver
 *   GET  /api/checkout/subscription-status — Lightweight status check
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getManualBillingProvider } from "../providers/manual.js";
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
  };
}

// ─── Route Registration ─────────────────────────────────────

export default async function registerBillingRoutes(server: FastifyInstance) {

  // ── POST /api/checkout/create ──────────────────────────────
  // Creates a manual billing order reference.
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

        if (!plan.active || plan.pricePhp === 0) {
          return reply.status(400).send({ error: "This plan cannot be purchased" });
        }

        const provider = getManualBillingProvider();

        const session = await provider.createCheckout({
          planId,
          userId: uid,
          successUrl: "",
          cancelUrl: "",
        });

        const periodStart = Date.now();
        const periodEnd = periodStart + 30 * 24 * 60 * 60 * 1000;

        await dbAdapter.query(
          `INSERT INTO user_subscriptions
           (user_id, plan_id, tier, status, current_period_start, current_period_end, amount_paid, currency, auto_renew, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, datetime('now'))
           ON CONFLICT (user_id) DO UPDATE SET
           plan_id = $2, tier = $3, status = $4,
           current_period_start = $5, current_period_end = $6,
           amount_paid = $7, currency = $8, auto_renew = $9,
           updated_at = datetime('now')`,
          [
            uid,
            plan.id,
            plan.tier,
            'pending',
            periodStart,
            periodEnd,
            plan.pricePhp * 100, // store in centavos
            'PHP',
            true,
          ]
        );

        return reply.status(200).send({
          sessionId: session.sessionId,
          checkoutUrl: session.checkoutUrl,
          provider: session.provider,
          plan: { id: plan.id, name: plan.name, pricePhp: plan.pricePhp },
        });
      } catch (err: any) {
        req.log.error({ err }, "Checkout creation failed");
        return reply.status(502).send({ error: "Payment provider unreachable" });
      }
    }
  );

  // ── GET /api/checkout/billing ──────────────────────────────────
  server.get(
    "/api/checkout/billing",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = getUid(req);
        const result = await dbAdapter.query(
          `SELECT * FROM user_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [uid]
        );

        if (result.rowCount === 0) {
          return reply.status(200).send({ plan: "free", status: "active", message: "No active subscription" });
        }

        return reply.status(200).send(subToResponse(result.rows[0]));
      } catch (err: any) {
        req.log.error({ err }, "Billing fetch failed");
        return reply.status(500).send({ error: "Internal error" });
      }
    }
  );

  // ── POST /api/checkout/cancel ─────────────────────────────────
  server.post(
    "/api/checkout/cancel",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = getUid(req);
        const result = await dbAdapter.query(
          `SELECT id FROM user_subscriptions WHERE user_id = $1`,
          [uid]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: "No subscription found" });
        }

        await dbAdapter.query(
          `UPDATE user_subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE user_id = $1`,
          [uid]
        );

        return reply.send({ success: true, message: "Subscription cancelled" });
      } catch (err: any) {
        req.log.error({ err }, "Cancellation failed");
        return reply.status(500).send({ error: "Internal error" });
      }
    }
  );

  // ── POST /api/checkout/webhook ─────────────────────────────────
  server.post("/api/checkout/webhook", async (req: FastifyRequest, reply: FastifyReply) => {
    // Manual billing has no webhooks — return received
    return reply.status(200).send({ received: true });
  });

  // ── GET /api/checkout/subscription-status ──────────────────
  server.get(
    "/api/checkout/subscription-status",
    { preHandler: [requireAuth] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const uid = getUid(req);

        const result = await dbAdapter.query(
          `SELECT id, plan_id, tier, status, current_period_start, current_period_end,
                  amount_paid, currency, auto_renew, created_at
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
