/**
 * commercial/api/checkoutRoutes — Fastify plugin for billing & subscription routes.
 *
 * Routes:
 *   POST /api/checkout/create   — Create Razorpay checkout session
 *   GET  /api/checkout/billing   — Get current user billing details
 *   POST /api/checkout/cancel    — Cancel active subscription
 *   POST /api/checkout/webhook   — Razorpay webhook receiver
 *   GET  /api/checkout/verify/:userId — Check premium access (for gating)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getPlan } from "../plans";
import { RazorpayProvider } from "../RazorpayProvider";

interface CreateCheckoutBody {
  planId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface CancelBody {
  subscriptionId: string;
}

const provider = new RazorpayProvider();

export async function registerCheckoutRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /api/checkout/create ──────────────────────────────────
  fastify.post("/api/checkout/create", async (req: FastifyRequest<{ Body: CreateCheckoutBody }>, reply: FastifyReply) => {
    const { planId, userId, successUrl, cancelUrl } = req.body;

    if (!planId || !userId) {
      return reply.status(400).send({ error: "planId and userId are required" });
    }

    const plan = getPlan(planId);
    if (!plan) {
      return reply.status(404).send({ error: `Plan "${planId}" not found` });
    }

    if (!plan.active || plan.priceInr === 0) {
      return reply.status(400).send({ error: "This plan cannot be purchased" });
    }

    try {
      const session = await provider.createCheckout({
        planId,
        userId,
        successUrl: successUrl ?? `${req.headers.origin}/billing/success`,
        cancelUrl: cancelUrl ?? `${req.headers.origin}/pricing`,
      });

      return reply.send({
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        provider: session.provider,
        plan: { id: plan.id, name: plan.name, priceInr: plan.priceInr },
      });
    } catch (err) {
      req.log.error({ err }, "Checkout creation failed");
      return reply.status(502).send({ error: "Payment provider unreachable" });
    }
  });

  // ── GET /api/checkout/billing ──────────────────────────────────
  fastify.get("/api/checkout/billing", async (req: FastifyRequest<{ Querystring: { subscriptionId?: string } }>, reply: FastifyReply) => {
    const { subscriptionId } = req.query;

    if (!subscriptionId) {
      return reply.send({ plan: "free", status: "active", message: "No active subscription" });
    }

    try {
      const details = await provider.getBillingDetails(subscriptionId);
      return reply.send(details);
    } catch (err) {
      req.log.error({ err }, "Billing fetch failed");
      return reply.status(502).send({ error: "Failed to fetch billing details" });
    }
  });

  // ── POST /api/checkout/cancel ──────────────────────────────────
  fastify.post("/api/checkout/cancel", async (req: FastifyRequest<{ Body: CancelBody }>, reply: FastifyReply) => {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return reply.status(400).send({ error: "subscriptionId is required" });
    }

    try {
      await provider.cancelSubscription(subscriptionId);
      return reply.send({ success: true, message: "Subscription cancelled" });
    } catch (err) {
      req.log.error({ err }, "Cancellation failed");
      return reply.status(502).send({ error: "Failed to cancel subscription" });
    }
  });

  // ── POST /api/checkout/webhook ─────────────────────────────────
  fastify.post("/api/checkout/webhook", async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      return reply.status(400).send({ error: "Missing x-razorpay-signature header" });
    }

    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    try {
      const event = await provider.handleWebhook(rawBody, signature);
      req.log.info({ event: event.type, subId: event.providerSubId }, "Webhook received");

      if (event.type === "checkout.completed") {
        const payload = event.raw as { payload: { subscription: { entity: { notes: Record<string, string> } } } };
        const userId = payload.payload?.subscription?.entity?.notes?.user_id;
        if (userId) {
          req.log.info({ userId }, "Subscription activated");
        }
      }

      return reply.send({ received: true, event: event.type });
    } catch (err) {
      req.log.error({ err }, "Webhook verification failed");
      return reply.status(400).send({ error: "Webhook verification failed" });
    }
  });

  // ── GET /api/checkout/verify/:userId ───────────────────────────
  fastify.get("/api/checkout/verify/:userId", async (req: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = req.params;

    // Check local DB for active subscription
    const { dbAdapter } = await import("../../db/DatabaseAdapter");
    const result = await dbAdapter.query(
      "SELECT status, plan_id, expires_at FROM user_subscriptions WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()",
      [userId],
    );

    if (!result.rows.length) {
      return reply.send({ hasPremiumAccess: false, tier: "free" });
    }

    const sub = result.rows[0] as { status: string; plan_id: string; expires_at: string };
    return reply.send({
      hasPremiumAccess: true,
      tier: sub.plan_id === "plan_pro_299" ? "pro" : "plus",
      expiresAt: sub.expires_at,
    });
  });
}
