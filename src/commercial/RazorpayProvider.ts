/**
 * commercial/RazorpayProvider — Manual billing provider implementation.
 *
 * Replaces the former Razorpay integration with a manual billing
 * stub that can be upgraded to Stripe later.
 *
 * Environment:
 *   MANUAL_BILLING_ENABLED — Set to 'true' to enable manual billing
 */

import type {
  PaymentProvider,
  PaymentProviderConfig,
  CreateCheckoutRequest,
  CheckoutSession,
  BillingDetails,
  WebhookEvent,
} from "./paymentProvider";

function getConfig(): { enabled: boolean } {
  return {
    enabled: process.env.MANUAL_BILLING_ENABLED === 'true',
  };
}

export class RazorpayProvider implements PaymentProvider {
  readonly type = "manual" as const;

  async createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    const { enabled } = getConfig();
    if (!enabled) {
      throw new Error("Manual billing not configured: set MANUAL_BILLING_ENABLED=true");
    }

    const plan = req.planName;
    const amount = req.amount;
    const orderId = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return {
      sessionId: orderId,
      checkoutUrl: `/billing/manual?orderId=${orderId}&plan=${encodeURIComponent(plan)}&amount=${amount}`,
      provider: "manual",
    };
  }

  async cancelSubscription(_providerSubId: string): Promise<void> {
    // No-op for manual billing
  }

  async getBillingDetails(_providerSubId: string): Promise<BillingDetails> {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return {
      subscriptionId: _providerSubId,
      planId: 'plan_free',
      status: 'active',
      currentPeriodStart: new Date(now).toISOString(),
      currentPeriodEnd: new Date(now + thirtyDays).toISOString(),
      nextBillingAmount: 0,
    };
  }

  async handleWebhook(_rawBody: string, _signature: string): Promise<WebhookEvent> {
    return { type: 'unknown', providerSubId: '', raw: {} };
  }

  getProviderConfig(): PaymentProviderConfig {
    return {
      provider: "manual",
      enabled: getConfig().enabled,
      liveMode: false,
      publishableKey: "",
    };
  }
}

export const razorpayProvider = new RazorpayProvider();
