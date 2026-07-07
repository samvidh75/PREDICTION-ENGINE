/**
 * commercial/SubscriptionCard — Razorpay UPI AutoPay checkout card.
 *
 * Renders a premium upsell card with a button that triggers the Razorpay
 * checkout overlay. The handler creates a subscription session via the
 * backend /api/checkout/create endpoint.
 *
 * Usage:
 *   <SubscriptionCard userId={firebaseUser.uid} />
 */

import { useState, useCallback } from "react";
import { colors, space, radius } from "../design/tokens";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface SubscriptionCardProps {
  userId: string;
  planId?: string;
  price?: number;
  onActivated?: () => void;
}

export function SubscriptionCard({
  userId,
  planId = "plan_pro_299",
  price = 299,
  onActivated,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, userId }),
      });

      if (!resp.ok) {
        const data = await resp.json() as { error?: string };
        throw new Error(data.error ?? "Checkout creation failed");
      }

      const session = await resp.json() as {
        sessionId: string;
        checkoutUrl: string;
        plan: { priceInr: number };
      };

      if (typeof window.Razorpay !== "undefined") {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          subscription_id: session.sessionId,
          name: "StockEX",
          description: `Research ${planId === "plan_pro_299" ? "Pro" : "Plus"} — ₹${session.plan.priceInr}/mo`,
          image: "/logo.png",
          handler: () => {
            onActivated?.();
            window.location.reload();
          },
          prefill: { name: "", email: "", contact: "" },
          notes: { user_id: userId },
          theme: { color: "#4f46e5" },
          modal: {
            ondismiss: () => setLoading(false),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        window.location.href = session.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }, [userId, planId, onActivated]);

  if (error) {
    return (
      <div style={{
        background: colors.page,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: space[4],
        textAlign: "center" as const,
      }}>
        <p style={{ color: colors.danger, fontSize: 14, marginBottom: space[2] }}>{error}</p>
        <button
          onClick={handleCheckout}
          style={{
            background: colors.primary,
            color: colors.onPrimary,
            border: "none",
            borderRadius: radius.md,
            padding: `${space[2]} ${space[4]}`,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: colors.surface,
      border: `2px solid ${colors.accentRed}`,
      borderRadius: radius.lg,
      padding: space[6],
      display: "flex",
      flexDirection: "column",
      gap: space[4],
      maxWidth: 360,
    }}>
      <div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: colors.textPrimary,
          margin: 0,
        }}>
          {planId === "plan_pro_299" ? "Research Pro" : "Research Plus"}
        </h3>
        <p style={{
          fontSize: 12,
          color: colors.textTertiary,
          fontFamily: typography.fontFamily,
          margin: `${space[1]} 0 0 0`,
        }}>
          ₹{price} / month &middot; Cancel anytime
        </p>
      </div>

      <ul style={{
        fontSize: 13,
        color: colors.textSecondary,
        margin: 0,
        paddingLeft: space[5],
        display: "flex",
        flexDirection: "column",
        gap: space[2],
      }}>
        <li>Walk-forward backtest strategy reports</li>
        <li>Unlimited browser AI chat queries</li>
        <li>SEC insider trading alerts</li>
        <li>CSV export for all data</li>
      </ul>

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          width: "100%",
          background: loading ? colors.textTertiary : colors.accentRed,
          color: colors.textPrimary,
          border: "none",
          borderRadius: radius.md,
          padding: space[3],
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {loading ? "Opening Razorpay..." : "Unlock via UPI AutoPay"}
      </button>
    </div>
  );
}
