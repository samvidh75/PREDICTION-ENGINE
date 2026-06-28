/**
 * PricingPage — Compliance-safe plan comparison.
 *
 * No "Buy now", "Subscribe", "Start free trial" or other CTAs that
 * imply a functioning payment system.
 *
 * Language: "Research", "Analysis", "Unlock", "Compare plans",
 *           "Coming soon", "Get early access"
 * Forbidden: "Buy", "Purchase", "Subscribe", "Start trial",
 *            "Guaranteed returns", "Strong buy"
 */

import { useMemo } from "react";
import { getAllPlans } from "../commercial/plans";
import type { Plan } from "../commercial/plans";
import { colors, space, radius, layout } from "../design/tokens";

function PricingCard({ plan, featured }: { plan: Plan; featured: boolean }) {
  return (
    <div
      style={{
        background: featured ? colors.card : colors.page,
        border: featured ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: space[6],
        display: "flex",
        flexDirection: "column",
        gap: space[3],
        position: "relative",
        minWidth: 260,
        flex: 1,
      }}
    >
      {featured && (
        <span
          style={{
            position: "absolute",
            top: -12,
            right: space[3],
            background: colors.primary,
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: radius.full,
          }}
        >
          Most popular
        </span>
      )}
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{plan.name}</h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 36, fontWeight: 700 }}>₹{plan.priceInr}</span>
        <span style={{ color: colors.textSecondary, fontSize: 14 }}>/mo</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: space[2] }}>
        {plan.highlights.map((h) => (
          <li key={h} style={{ fontSize: 14, color: colors.textSecondary, paddingLeft: 20, position: "relative" as const }}>
            <span style={{ position: "absolute", left: 0 }}>✓</span>
            {h}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: "auto", paddingTop: space[4] }}>
        <div
          style={{
            display: "inline-block",
            padding: "10px 24px",
            borderRadius: radius.md,
            background: plan.priceInr === 0 ? "transparent" : colors.primary,
            color: plan.priceInr === 0 ? colors.primary : "#fff",
            border: plan.priceInr === 0 ? `1px solid ${colors.primary}` : "none",
            fontSize: 15,
            fontWeight: 600,
            cursor: "default",
            width: "100%",
            textAlign: "center",
          }}
        >
          {plan.priceInr === 0 ? "Current plan" : "Coming soon"}
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const plans = useMemo(() => getAllPlans(), []);

  return (
    <div style={{ maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: space[6] }}>
      <div style={{ textAlign: "center", marginBottom: space[6] }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>Research Plans</h1>
        <p style={{ color: colors.textSecondary, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
          Choose a plan that fits your research needs. All plans provide access 
          to stock health scores, factor analysis, and research narratives.
        </p>
      </div>
      <div style={{ display: "flex", gap: space[5], justifyContent: "center", flexWrap: "wrap" }}>
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} featured={plan.tier === "plus"} />
        ))}
      </div>
      <div style={{ marginTop: space[6], padding: space[5], background: colors.fill, borderRadius: radius.lg, fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
        <strong>Compliance Notice:</strong> StockStory India is not SEBI-registered. 
        All plans provide research analysis tools only — no investment advice, 
        no buy/sell recommendations, no portfolio management. Past performance 
        does not guarantee future results. Subscription will be processed via 
        Razorpay (coming soon).
      </div>
    </div>
  );
}
