/**
 * commercial/providers/razorpay — Razorpay Payment Provider.
 *
 * Implements the PaymentProvider interface for Razorpay.
 * Handles subscription-based checkout with automated plan management.
 * Instead of manual Razorpay dashboard plan creation, plans are
 * auto-created on first use and cached in memory.
 *
 * Environment variables:
 *   RAZORPAY_KEY_ID        — Live/test publishable key
 *   RAZORPAY_KEY_SECRET    — Live/test secret key
 *   RAZORPAY_WEBHOOK_SECRET — Secret for webhook signature verification
 */

import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
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

interface RazorpayPlanResponse {
  id: string;
  item: { name: string; amount: number; currency: string };
  period: string;
  interval: number;
  status: string;
}

interface RazorpaySubscriptionResponse {
  id: string;
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  total_count: number;
  paid_count: number;
  short_url: string;
  notes: Record<string, string>;
  created_at: number;
}

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
        subscription_id?: string;
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
        total_count?: number;
        paid_count?: number;
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

  /** In-memory plan cache: maps our planId → Razorpay plan ID */
  private static _planCache = new Map<string, { id: string }>();

  constructor() {
    // Lazy-init: client created on first use
  }

  // ── Public Interface ────────────────────────────────────────

  /**
   * Create a checkout session for a subscription plan.
   *
   * This is the primary checkout path for Phase 16+. It:
   *   1. Looks up our plan definition
   *   2. Finds-or-creates the corresponding Razorpay plan
   *   3. Creates a subscription linked to the plan
   *   4. Returns the subscription ID + hosted checkout URL
   */
  async createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    const plan = getPlan(req.planId);
    if (!plan) throw new Error(`Plan "${req.planId}" not found`);
    if (plan.pricePkr === 0) throw new Error("Cannot create checkout for free plan");

    const client = getRazorpayClient();

    // Step 1: Find or auto-create the Razorpay plan
    const razorpayPlan = await this.findOrCreatePlan(plan);

    // Step 2: Create a subscription (E-mandate via UPI / card)
    // total_count = 12 covers a 12-month cycle with monthly billing
    const subscription = await client.subscriptions.create({
      plan_id: razorpayPlan.id,
      total_count: 12,
      quantity: 1,
      customer_notify: true,
      notes: {
        userId: req.userId,
        planId: req.planId,
        planName: plan.name,
        tier: plan.tier,
      },
    } as any) as unknown as RazorpaySubscriptionResponse;

    return {
      sessionId: subscription.id,
      checkoutUrl: subscription.short_url ?? "",
      provider: "razorpay",
      mode: "subscription",
    };
  }

  /**
   * Legacy one-time order creation (kept for backward compatibility).
   * Phase 16+ uses subscription-based checkout via createCheckout().
   */
  async createOrder(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    const plan = getPlan(req.planId);
    if (!plan) throw new Error(`Plan "${req.planId}" not found`);
    if (plan.pricePkr === 0) throw new Error("Cannot create order for free plan");

    const client = getRazorpayClient();
    const amountInPaise = plan.pricePkr * 100;
    const receipt = `eq_${req.userId.slice(0, 12)}_${Date.now()}`;

    const order = await client.orders.create({
      amount: amountInPaise,
      currency: "PKR",
      receipt,
      notes: {
        userId: req.userId,
        planId: req.planId,
        planName: plan.name,
      },
    }) as unknown as RazorpayOrderResponse;

    return {
      sessionId: order.id,
      checkoutUrl: "",
      provider: "razorpay",
      mode: "order",
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
  async getBillingDetails(_providerSubId: string): Promise<BillingDetails> {
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

    this.verifySignature(rawBody, signature, webhookSecret);

    const payload: RazorpayWebhookPayload = JSON.parse(rawBody);
    const eventType = this.mapEventType(payload.event);
    const providerSubId =
      payload.payload?.subscription?.entity?.id ??
      payload.payload?.payment?.entity?.subscription_id ??
      payload.payload?.payment?.entity?.order_id ??
      "";

    return { type: eventType, providerSubId, raw: payload };
  }

  // ── Automated Plan Management ───────────────────────────────

  /**
   * Find a cached Razorpay plan for our planId, or create one on
   * Razorpay and cache it.  This eliminates manual dashboard plan
   * creation whenever pricing is adjusted.
   */
  async findOrCreatePlan(plan: Plan): Promise<{ id: string }> {
    // Check in-memory cache first
    const cached = RazorpayPaymentProvider._planCache.get(plan.id);
    if (cached) return cached;

    const client = getRazorpayClient();

    const amountInPaise = plan.pricePkr * 100;

    const razorpayPlan = await client.plans.create({
      period: "monthly" as const,
      interval: 1,
      item: {
        name: `StockEX - ${plan.name}`,
        amount: amountInPaise,
        currency: "PKR",
        description: `${plan.name} — ${plan.highlights.slice(0, 2).join(", ")}`,
      },
      notes: {
        planId: plan.id,
        tier: plan.tier,
      },
    } as any) as unknown as RazorpayPlanResponse;

    // Cache the result
    RazorpayPaymentProvider._planCache.set(plan.id, { id: razorpayPlan.id });
    return { id: razorpayPlan.id };
  }

  // ── Signature Verification ────────────────────────────────

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

  // ── Event Mapping ──────────────────────────────────────────

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
