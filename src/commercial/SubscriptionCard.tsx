/**
 * commercial/SubscriptionCard — Manual billing checkout card.
 *
 * Renders a premium upsell card with a button that triggers manual
 * billing instructions. The handler creates a subscription session via the
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
        plan: { pricePhp: number };
      };

      // Redirect to manual billing page
      window.location.href = session.checkoutUrl;
      onActivated?.();
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
          ₱{price} / month &middot; Cancel anytime
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
        <li>PSE insider trading alerts</li>
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
        {loading ? "Loading..." : "Unlock via Bank Transfer"}
      </button>
    </div>
  );
}
