/**
 * commercial/RazorpayProvider — Razorpay payment provider implementation.
 *
 * Implements the PaymentProvider interface for India-optimised
 * UPI AutoPay / card / netbanking recurring subscriptions.
 *
 * Environment:
 *   RAZORPAY_KEY_ID         — Publishable API key (rzp_live_... / rzp_test_...)
 *   RAZORPAY_KEY_SECRET     — Secret key for server-side API calls
 *   RAZORPAY_WEBHOOK_SECRET — Shared secret for webhook signature verification
 */

import type {
  PaymentProvider,
  PaymentProviderConfig,
  CreateCheckoutRequest,
  CheckoutSession,
  BillingDetails,
  WebhookEvent,
} from "./paymentProvider";

interface RazorpayPlan {
  id: string;
  item: { name: string; amount: number; currency: string };
  period: string;
  interval: number;
}

interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  notes: Record<string, string>;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscription };
    payment?: { entity: { notes: Record<string, string> } };
  };
}

function getConfig(): { keyId: string; keySecret: string; webhookSecret: string } {
  return {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  };
}

export class RazorpayProvider implements PaymentProvider {
  readonly type = "razorpay" as const;

  async createCheckout(req: CreateCheckoutRequest): Promise<CheckoutSession> {
    const { keyId, keySecret } = getConfig();
    if (!keyId || !keySecret) {
      throw new Error("Razorpay not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const planResp = await fetch("https://api.razorpay.com/v1/plans", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        period: "monthly",
        interval: 1,
        item: { name: req.planName, amount: req.amount * 100, currency: "INR" },
      } satisfies Omit<RazorpayPlan, "id">),
    });

    if (!planResp.ok) {
      throw new Error(`Razorpay plan creation failed: ${planResp.status}`);
    }
    const plan = await planResp.json() as RazorpayPlan;

    const subResp = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: plan.id,
        total_count: 12,
        customer_notify: true,
        notes: { user_id: req.userId },
      }),
    });

    if (!subResp.ok) {
      throw new Error(`Razorpay subscription creation failed: ${subResp.status}`);
    }
    const sub = await subResp.json() as RazorpaySubscription;

    return {
      sessionId: sub.id,
      checkoutUrl: `https://rzp.io/i/${sub.id}`,
      provider: "razorpay",
    };
  }

  async cancelSubscription(providerSubId: string): Promise<void> {
    const { keyId, keySecret } = getConfig();
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const resp = await fetch(`https://api.razorpay.com/v1/subscriptions/${providerSubId}/cancel`, {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}` },
    });

    if (!resp.ok) {
      throw new Error(`Razorpay cancellation failed: ${resp.status}`);
    }
  }

  async getBillingDetails(providerSubId: string): Promise<BillingDetails> {
    const { keyId, keySecret } = getConfig();
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const resp = await fetch(`https://api.razorpay.com/v1/subscriptions/${providerSubId}`, {
      headers: { "Authorization": `Basic ${auth}` },
    });

    if (!resp.ok) {
      throw new Error(`Razorpay subscription fetch failed: ${resp.status}`);
    }

    const sub = await resp.json() as RazorpaySubscription;

    return {
      subscriptionId: sub.id,
      planId: sub.plan_id,
      status: mapRazorpayStatus(sub.status),
      currentPeriodStart: new Date(sub.current_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_end * 1000).toISOString(),
      nextBillingAmount: 29900,
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    const { webhookSecret } = getConfig();

    const expectedSig = await createHmac(webhookSecret, rawBody);
    if (expectedSig !== signature) {
      throw new Error("Razorpay webhook signature mismatch");
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;

    const sub = payload.payload?.subscription?.entity;
    const providerSubId = sub?.id ?? "";

    switch (payload.event) {
      case "subscription.activated":
      case "subscription.charged":
        return { type: "checkout.completed", providerSubId, raw: payload };
      case "subscription.cancelled":
      case "subscription.completed":
        return { type: "subscription.cancelled", providerSubId, raw: payload };
      case "subscription.updated":
        return { type: "subscription.updated", providerSubId, raw: payload };
      case "payment.failed":
        return { type: "payment.failed", providerSubId, raw: payload };
      default:
        return { type: "unknown", providerSubId, raw: payload };
    }
  }

  getProviderConfig(): PaymentProviderConfig {
    return {
      provider: "razorpay",
      enabled: !!process.env.RAZORPAY_KEY_ID,
      liveMode: !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_"),
      publishableKey: process.env.RAZORPAY_KEY_ID ?? "",
    };
  }
}

function mapRazorpayStatus(status: string): BillingDetails["status"] {
  switch (status) {
    case "active": return "active";
    case "created": return "active";
    case "authenticated": return "active";
    case "halted": return "past_due";
    case "cancelled": return "cancelled";
    case "completed": return "expired";
    case "expired": return "expired";
    default: return "past_due";
  }
}

async function createHmac(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const razorpayProvider = new RazorpayProvider();
