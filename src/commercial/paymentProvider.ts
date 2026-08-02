/**
 * commercial/paymentProvider — Payment provider abstraction.
 *
 * This file defines the interface; actual provider implementations
 * ship in follow-ups when payment processing is ready to launch.
 */

export type PaymentProviderType = 'razorpay' | 'stripe' | 'manual';

export interface PaymentProviderConfig {
  provider: PaymentProviderType;
  enabled: boolean;
  liveMode: boolean;
  publishableKey: string;
}

export interface CreateCheckoutRequest {
  planId: string;
  planName: string;
  amount: number;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
}

export interface BillingDetails {
  subscriptionId: string;
  planId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  nextBillingAmount: number;
}

export interface WebhookEvent {
  type: 'checkout.completed' | 'subscription.updated' | 'subscription.cancelled' | 'payment.failed' | 'unknown';
  providerSubId: string;
  raw: unknown;
}

export interface PaymentProvider {
  readonly type: PaymentProviderType;
  createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession>;
  cancelSubscription(providerSubId: string): Promise<void>;
  getBillingDetails(providerSubId: string): Promise<BillingDetails>;
  handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent>;
  getProviderConfig(): PaymentProviderConfig;
}
