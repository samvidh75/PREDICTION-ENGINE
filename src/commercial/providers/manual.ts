/**
 * commercial/providers/manual — Manual Billing Provider.
 *
 * Implements the PaymentProvider interface for manual billing.
 * Creates pending orders that can be processed offline.
 *
 * Environment variables:
 *   MANUAL_BILLING_ENABLED — Enable manual billing (default: true)
 */

import type {
  PaymentProvider,
  PaymentProviderType,
  CreateCheckoutRequest,
  CheckoutSession,
  BillingDetails,
  WebhookEvent,
} from "../paymentProvider";
import type { Plan } from "../plans";
import { getPlan } from "../plans";

// ─── Types ──────────────────────────────────────────────────

interface ManualOrderResponse {
  id: string;
  planId: string;
  status: string;
  amount: number;
  currency: string;
  created_at: number;
}

// ─── Provider Singleton ─────────────────────────────────────

let _instance: ManualBillingProvider | null = null;

// ─── Provider Class ─────────────────────────────────────────

export class ManualBillingProvider implements PaymentProvider {
  readonly type: PaymentProviderType = "manual";

  constructor() {
    // Manual billing requires no external client
  }

  // ── Public Interface ───────────────────────────────────

  async createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    const plan = getPlan(req.planId);
    if (!plan) {
      throw new Error(`Plan "${req.planId}" not found`);
    }

    const amount = plan.pricePhp;
    const orderId = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const now = Date.now();
    const order: ManualOrderResponse = {
      id: orderId,
      planId: plan.id,
      status: 'pending',
      amount,
      currency: 'PHP',
      created_at: now,
    };

    // Store pending order in memory (in production, use DB)
    const pending = (globalThis as any).__pendingManualOrders ||= new Map();
    pending.set(orderId, order);

    return {
      sessionId: orderId,
      checkoutUrl: `/billing/manual?orderId=${orderId}`,
      provider: "manual",
    };
  }

  async cancelSubscription(providerSubId: string): Promise<void> {
    const pending = (globalThis as any).__pendingManualOrders;
    if (pending && pending.has(providerSubId)) {
      const order = pending.get(providerSubId);
      order.status = 'cancelled';
    }
  }

  async getBillingDetails(providerSubId: string): Promise<BillingDetails> {
    const pending = (globalThis as any).__pendingManualOrders;
    const order = pending?.get(providerSubId);

    if (!order) {
      throw new Error(`Order ${providerSubId} not found`);
    }

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    return {
      subscriptionId: providerSubId,
      planId: order.planId,
      status: order.status === 'active' ? 'active' : 'pending',
      currentPeriodStart: new Date(order.created_at).toISOString(),
      currentPeriodEnd: new Date(order.created_at + thirtyDays).toISOString(),
      nextBillingAmount: order.amount,
    };
  }

  async handleWebhook(_rawBody: string, _signature: string): Promise<WebhookEvent> {
    // Manual billing has no webhooks — return unknown
    return { type: 'unknown', providerSubId: '', raw: {} };
  }

  getProviderConfig(): import("../paymentProvider").PaymentProviderConfig {
    return {
      provider: "manual",
      enabled: true,
      liveMode: false,
      publishableKey: "",
    };
  }
}

/**
 * Get or create the singleton ManualBillingProvider.
 */
export function getManualBillingProvider(): ManualBillingProvider {
  if (!_instance) {
    _instance = new ManualBillingProvider();
  }
  return _instance;
}

export default getManualBillingProvider;
