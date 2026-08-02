/**
 * commercial/UpgradePrompt — Shown when a user tries to access a gated feature.
 *
 * Uses compliance-safe language: "Upgrade to unlock", not "Buy".
 */

import type { FeatureKey, PlanTier } from "./plans";
import { colors, space, radius } from "../design/tokens";

interface UpgradePromptProps {
  feature: FeatureKey;
  requiredTier?: PlanTier;
  /** Custom message override */
  message?: string;
}

const featureLabels: Record<string, string> = {
  peer_comparison: "Peer comparison",
  csv_export: "CSV export",
  expected_returns: "Expected returns",
  portfolio_tracking: "Portfolio tracking",
  unlimited_watchlists: "Unlimited watchlists",
  advanced_search: "Advanced search",
  watchlist_alerts: "Watchlist alerts",
  daily_digest_email: "Daily digest email",
  prediction_accuracy_history: "Prediction accuracy history",
  api_access: "Advanced data access",
  priority_support: "Priority support",
};

export function UpgradePrompt({ feature, requiredTier, message }: UpgradePromptProps) {
  const label = featureLabels[feature] ?? feature.replace(/_/g, " ");
  const tierLabel = requiredTier === "pro" ? "Research Pro" : "Research Plus";
  const defaultMessage = `"${label}" is available on ${tierLabel} and above.`;

  return (
    <div
      style={{
        padding: space[4],
        background: colors.fill,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
      }}
    >
      <p style={{ margin: 0 }}>{message ?? defaultMessage}</p>
      <a
        href="/pricing"
        style={{
          display: "inline-block",
          marginTop: space[2],
          color: colors.primary,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Compare plans →
      </a>
    </div>
  );
}
