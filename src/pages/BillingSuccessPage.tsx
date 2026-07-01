/**
 * BillingSuccessPage — Post-checkout success landing.
 *
 * Users land here after a successful Razorpay payment.
 * Shows confirmation and links back to the dashboard.
 */

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { colors, space, radius, layout } from "../design/tokens";

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(8);
  const subscriptionId = searchParams.get("subscription_id") ?? "—";

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <div style={{ maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: space[6], textAlign: "center" }}>
      <div className="raycast-slideUp" style={{ marginTop: space[8] }}>
        <div style={{ fontSize: 64, marginBottom: space[4] }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>
          Payment Successful!
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: 16, maxWidth: 480, margin: "0 auto 16px" }}>
          Your subscription is being activated. You'll receive a confirmation
          email shortly with your receipt.
        </p>

        <div style={{
          background: colors.fill,
          borderRadius: radius.lg,
          padding: space[4],
          maxWidth: 360,
          margin: "0 auto space[4]",
          fontSize: 13,
          color: colors.textSecondary,
        }}>
          Subscription ID: <code style={{ fontSize: 12 }}>{subscriptionId}</code>
        </div>

        <p style={{ color: colors.textTertiary, fontSize: 14, marginBottom: space[5] }}>
          Redirecting to dashboard in {countdown} seconds…
        </p>

        <Link
          to="/"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: radius.md,
            background: colors.primary,
            color: colors.onPrimary,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
