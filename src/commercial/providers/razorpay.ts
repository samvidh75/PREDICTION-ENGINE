/**
 * commercial/providers/razorpay — Razorpay Payment Provider.
 *
 * Implements the PaymentProvider interface for Razorpay.
 * Handles order creation, subscription management, and webhook verification.
 *
 * Environment variables:
 *   RAZORPAY_KEY_ID       — Live/test publishable key
 *   RAZORPAY_KEY_SECRET   — Live/test secret key
 *   RAZORPAY_WEBHOOK_SECRET — Secret for webhook signature verification
 */

import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, PaymentProviderType, CreateCheckoutRequest, CheckoutSession, BillingDetails, WebhookEvent } from "../paymentProvider";
import { getPlan } from "../plans";

// ─── Types ──────────────────────────────────────────────────

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        notes?: Record<string, string>;
      };
    };
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start: number;
        current_end: number;
        notes?: Record<string, string>;
      };
    };
  };
  created_at: number;
}

// ─── Provider Singleton ─────────────────────────────────────

let _instance: RazorpayPaymentProvider | null = null;
let _razorpayClient: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (!_razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    _razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpayClient;
}

// ─── Provider Class ─────────────────────────────────────────

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly type: PaymentProviderType = "razorpay";

  constructor() {
    // Lazy-init: client created on first use
  }

  /**
   * Create a checkout session (Razorpay order).
   * Returns order details that the frontend uses to open the checkout modal.
   */
  async createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    const plan = getPlan(req.planId);
    if (!plan) throw new Error(`Plan "${req.planId}" not found`);
    if (plan.priceInr === 0) throw new Error("Cannot create checkout for free plan");

    const client = getRazorpayClient();
    const amountInPaise = plan.priceInr * 100; // Razorpay uses smallest currency unit
    const receipt = `eq_${req.userId.slice(0, 12)}_${Date.now()}`;

    const order = await client.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: req.userId,
        planId: req.planId,
        planName: plan.name,
      },
    }) as unknown as RazorpayOrderResponse;

    return {
      sessionId: order.id,
      checkoutUrl: "", // Razorpay uses modal-based checkout, not redirect
      provider: "razorpay",
    };
  }

  /**
   * Cancel a subscription via Razorpay API.
   */
  async cancelSubscription(providerSubId: string): Promise<void> {
    const client = getRazorpayClient();
    await client.subscriptions.cancel(providerSubId);
  }

  /**
   * Get billing details from local DB (not from Razorpay API directly).
   */
  async getBillingDetails(providerSubId: string): Promise<BillingDetails> {
    // This reads from the DB; the actual queries are in the route handler.
    throw new Error("Use billing route handler to query DB");
  }

  /**
   * Verify and handle a Razorpay webhook event.
   * Uses HMAC SHA256 signature verification.
   */
  async handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET must be set");
    }

    // Verify HMAC SHA256 signature
    this.verifySignature(rawBody, signature, webhookSecret);

    // Parse the verified payload
    const payload: RazorpayWebhookPayload = JSON.parse(rawBody);
    const eventType = this.mapEventType(payload.event);
    const providerSubId = payload.payload?.payment?.entity?.order_id
      ?? payload.payload?.subscription?.entity?.id
      ?? "";

    return {
      type: eventType,
      providerSubId,
      raw: payload,
    };
  }

  /**
   * Verify HMAC SHA256 signature using timing-safe comparison.
   * Throws on mismatch.
   */
  verifySignature(rawBody: string, signature: string, secret: string): void {
    const expectedSig = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSig.length !== signature.length) {
      throw new Error("Webhook signature length mismatch");
    }

    const expectedBuf = Buffer.from(expectedSig, "utf-8");
    const receivedBuf = Buffer.from(signature, "utf-8");

    if (!timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new Error("Invalid webhook signature");
    }
  }

  /**
   * Map Razorpay event names to our internal event types.
   */
  private mapEventType(
    razorpayEvent: string
  ): "checkout.completed" | "subscription.updated" | "subscription.cancelled" | "payment.failed" | "unknown" {
    switch (razorpayEvent) {
      case "payment.captured":
        return "checkout.completed";
      case "payment.failed":
        return "payment.failed";
      case "subscription.cancelled":
        return "subscription.cancelled";
      case "subscription.updated":
      case "subscription.activated":
      case "subscription.charged":
        return "subscription.updated";
      default:
        return "unknown";
    }
  }
}

/**
 * Get or create the singleton RazorpayPaymentProvider.
 */
export function getRazorpayProvider(): RazorpayPaymentProvider {
  if (!_instance) {
    _instance = new RazorpayPaymentProvider();
  }
  return _instance;
}

export default getRazorpayProvider;
