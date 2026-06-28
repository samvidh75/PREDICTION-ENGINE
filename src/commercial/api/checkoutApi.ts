/**
 * commercial/api/checkoutApi — BFF checkout API endpoints.
 *
 * These do NOT process payments — they create sessions that redirect
 * to the payment provider's hosted checkout.
 *
 * Routes:
 *   POST /api/checkout/create — Create checkout session
 *   GET  /api/checkout/billing — Get billing details
 *   POST /api/checkout/cancel — Cancel subscription
 *   POST /api/checkout/webhook — Provider webhook receiver
 */

import type { Request, Response } from 'express';
import { getPlan } from '../plans';

// ─── POST /api/checkout/create ──────────────────────────────────────

export async function handleCreateCheckout(req: Request, res: Response): Promise<void> {
  try {
    const { planId } = req.body as { planId?: string };

    if (!planId) {
      res.status(400).json({ error: 'planId is required' });
      return;
    }

    const plan = getPlan(planId);
    if (!plan) {
      res.status(404).json({ error: `Plan "${planId}" not found` });
      return;
    }

    if (!plan.active || plan.priceInr === 0) {
      res.status(400).json({ error: 'This plan cannot be purchased' });
      return;
    }

    // 501 — Payment provider not yet wired.
    // Production: razorpayProvider.createCheckout({ planId, userId, ... })
    res.status(501).json({
      error: 'Payment provider not yet configured.',
      message: 'Checkout is coming soon. You will be redirected to Razorpay to complete payment.',
      plan: { id: plan.id, name: plan.name, priceInr: plan.priceInr },
    });
  } catch (err) {
    console.error('[checkout] create error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

// ─── GET /api/checkout/billing ─────────────────────────────────────

export async function handleGetBilling(req: Request, res: Response): Promise<void> {
  try {
    // Production: read user_subscriptions table, return BillingDetails
    res.json({ plan: 'free', status: 'active', message: 'Billing details available after subscription.' });
  } catch (err) {
    console.error('[checkout] billing error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

// ─── POST /api/checkout/cancel ────────────────────────────────────

export async function handleCancelSubscription(req: Request, res: Response): Promise<void> {
  try {
    res.json({ success: true, message: 'Subscription cancellation is not yet available.' });
  } catch (err) {
    console.error('[checkout] cancel error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

// ─── POST /api/checkout/webhook ────────────────────────────────────

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'] as string ?? '';
    // Production: validate + route to provider.handleWebhook()
    console.log('[checkout] webhook received (not yet processed)');
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[checkout] webhook error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
