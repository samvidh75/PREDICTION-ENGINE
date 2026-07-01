/**
 * commercial/paymentProvider — Payment provider abstraction.
 *
 * Lensory will integrate Razorpay (primary, India-optimised).
 * This file defines the interface; actual provider implementations
 * ship in a follow-up when payment processing is ready to launch.
 *
 * Present-tense safety:
 *   - No fake payment flows
 *   - No hardcoded test keys
 *   - No "Buy now" / CTA language
 *   - The pricing page shows plan info and a "Subscribe" button that
 *     triggers /api/checkout/create — we DO NOT collect payments inline.
 */

export type PaymentProviderType = 'razorpay' | 'stripe';

// ─── Provider Configuration ────────────────────────────────────────

export interface PaymentProviderConfig {
  provider: PaymentProviderType;
  /** Is this provider enabled for new checkouts? */
  enabled: boolean;
  /** Live mode vs. test mode */
  liveMode: boolean;
  /** Public-facing key (safe to expose to client) */
  publishableKey: string;
}

// ─── Checkout Session ──────────────────────────────────────────────

export interface CreateCheckoutRequest {
  planId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  /** Optional coupon / promo code */
  coupon?: string;
}

export interface CheckoutSession {
  sessionId: string;
  /** URL to redirect the user to (hosted checkout page) */
  checkoutUrl: string;
  provider: PaymentProviderType;
  /** 'order' for one-time payment (legacy), 'subscription' for recurring */
  mode?: 'order' | 'subscription';
}

// ─── Billing Details ───────────────────────────────────────────────

export interface BillingDetails {
  subscriptionId: string;
  planId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodStart: string;   // ISO date
  currentPeriodEnd: string;     // ISO date
  nextBillingAmount: number;    // INR
  paymentMethod?: {
    brand: string;              // e.g. "Visa", "UPI"
    last4: string;
  };
}

// ─── Provider Contract ─────────────────────────────────────────────

export interface PaymentProvider {
  type: PaymentProviderType;

  /** Create a checkout session for plan purchase */
  createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession>;

  /** Cancel a subscription */
  cancelSubscription(providerSubId: string): Promise<void>;

  /** Get billing details */
  getBillingDetails(providerSubId: string): Promise<BillingDetails>;

  /** Handle webhook event (provider-agnostic payload) */
  handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent>;
}

// ─── Webhook ───────────────────────────────────────────────────────

export interface WebhookEvent {
  type: 'checkout.completed' | 'subscription.updated' | 'subscription.cancelled' | 'payment.failed' | 'unknown';
  providerSubId: string;
  /** Provider-specific raw event */
  raw: unknown;
}
