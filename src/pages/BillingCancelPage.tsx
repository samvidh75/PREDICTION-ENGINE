/**
 * BillingCancelPage — Post-checkout cancellation landing.
 *
 * Users land here if they cancel on the Razorpay checkout page.
 * Links back to pricing with no hard feelings.
 */

import { Link } from "react-router-dom";
import { colors, space, radius, layout } from "../design/tokens";

export default function BillingCancelPage() {
  return (
    <div style={{ maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: space[6], textAlign: "center" }}>
      <div className="raycast-slideUp" style={{ marginTop: space[8] }}>
        <div style={{ fontSize: 64, marginBottom: space[4] }}>🤷</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>
          Payment Cancelled
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: 16, maxWidth: 480, margin: "0 auto 24px" }}>
          No worries — your free plan remains active. You can come back any
          time to upgrade when you're ready.
        </p>

        <div style={{ display: "flex", gap: space[3], justifyContent: "center" }}>
          <Link
            to="/pricing"
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
            View Plans
          </Link>
          <Link
            to="/"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
