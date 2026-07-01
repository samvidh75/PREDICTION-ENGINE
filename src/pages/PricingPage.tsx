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

import { useMemo, useState } from "react";
import { getAllPlans } from "../commercial/plans";
import type { Plan, PlanTier } from "../commercial/plans";
import { colors, space, radius, layout } from "../design/tokens";

const ANNUAL_DISCOUNT_MULTIPLIER = 10; // 2 months free on annual

function PricingCard({ plan, featured, annual, onSelect }: { plan: Plan; featured: boolean; annual: boolean; onSelect?: () => void }) {
  const monthlyPrice = plan.priceInr;
  const annualPrice = Math.round(monthlyPrice * ANNUAL_DISCOUNT_MULTIPLIER);
  const displayPrice = annual ? annualPrice : monthlyPrice;
  const periodLabel = annual ? "/yr" : "/mo";
  const savingsPercent = annual ? Math.round((1 - ANNUAL_DISCOUNT_MULTIPLIER / 12) * 100) : 0;
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
            color: colors.onPrimary,
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
        <span style={{ fontSize: 36, fontWeight: 700 }}>₹{displayPrice.toLocaleString()}</span>
        <span style={{ color: colors.textSecondary, fontSize: 14 }}>{periodLabel}</span>
      </div>
      {annual && plan.priceInr > 0 && (
        <div style={{ fontSize: 13, color: colors.success, fontWeight: 600, marginTop: -8 }}>
          Save {savingsPercent}% (₹{Math.round(monthlyPrice * 12 - annualPrice).toLocaleString()}/yr)
        </div>
      )}
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
            background: plan.priceInr === 0 ? "transparent" : featured ? colors.primary : "transparent",
            color: plan.priceInr === 0 ? colors.primary : featured ? colors.onPrimary : colors.textPrimary,
            border: plan.priceInr === 0 ? `1px solid ${colors.primary}` : featured ? "none" : `1px solid ${colors.border}`,
            fontSize: 15,
            fontWeight: 600,
            cursor: plan.priceInr > 0 ? "pointer" : "default",
            width: "100%",
            textAlign: "center",
            transition: "all 0.2s ease",
          }}
          onClick={onSelect}
        >
          {plan.priceInr === 0 ? "Current plan" : featured ? "Get early access" : "Coming soon"}
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const plans = useMemo(() => getAllPlans(), []);
  const [annual, setAnnual] = useState(false);
  const [activeTier, setActiveTier] = useState<PlanTier | null>(null);

  // Feature comparison rows
  const comparisonRows = [
    { label: "Stock health scores", free: true, plus: true, pro: true },
    { label: "Factor breakdown", free: true, plus: true, pro: true },
    { label: "Narrative analysis", free: true, plus: true, pro: true },
    { label: "Basic search", free: true, plus: true, pro: true },
    { label: "Watchlists", free: "1 (20 stocks)", plus: "Unlimited", pro: "Unlimited" },
    { label: "Price alerts", free: false, plus: "50 alerts", pro: "Unlimited" },
    { label: "Daily digest email", free: false, plus: true, pro: true },
    { label: "Prediction accuracy", free: false, plus: true, pro: true },
    { label: "Expected returns", free: false, plus: false, pro: true },
    { label: "Peer comparison", free: false, plus: false, pro: true },
    { label: "CSV export", free: false, plus: false, pro: true },
    { label: "Portfolio tracking", free: false, plus: false, pro: true },
    { label: "Advanced search", free: false, plus: false, pro: true },
    { label: "Search history", free: "90 days", plus: "1 year", pro: "3 years" },
    { label: "Ad-free", free: false, plus: false, pro: true },
    { label: "Advanced data access", free: false, plus: false, pro: true },
    { label: "Priority support", free: false, plus: false, pro: true },
  ];

  const getCellContent = (value: boolean | string) => {
    if (value === true) return "✓";
    if (value === false) return "—";
    return value;
  };

  const getCellColor = (value: boolean | string) => {
    if (value === true) return colors.success;
    if (value === false) return colors.textTertiary;
    return colors.textSecondary;
  };

  return (
    <div className="raycast-slideUp" style={{ maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: space[6] }}>
      <div className="raycast-stagger-1" style={{ textAlign: "center", marginBottom: space[4] }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>Research Plans</h1>
        <p style={{ color: colors.textSecondary, fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
          Choose a plan that fits your research needs. All plans provide access 
          to stock health scores, factor analysis, and research narratives.
        </p>
      </div>

      {/* Annual/Monthly Toggle */}
      <div className="raycast-stagger-2" style={{ animationDelay: "0.1s", display: "flex", justifyContent: "center", marginBottom: space[6] }}>
        <div style={{
          display: "inline-flex",
          background: colors.fill,
          borderRadius: radius.full,
          padding: 4,
          gap: 2,
        }}>
          <button
            onClick={() => setAnnual(false)}
            style={{
              padding: "8px 20px",
              borderRadius: radius.full,
              border: "none",
              background: annual ? "transparent" : colors.card,
              color: annual ? colors.textSecondary : colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            aria-pressed={!annual}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            style={{
              padding: "8px 20px",
              borderRadius: radius.full,
              border: "none",
              background: annual ? colors.card : "transparent",
              color: annual ? colors.textPrimary : colors.textSecondary,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            aria-pressed={annual}
          >
            Annual
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              background: colors.success,
              color: "#000",
              padding: "2px 8px",
              borderRadius: radius.full,
            }}>
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="raycast-stagger-3" style={{ animationDelay: "0.2s", display: "flex", gap: space[5], justifyContent: "center", flexWrap: "wrap" }}>
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            featured={plan.tier === "plus"}
            annual={annual}
            onSelect={plan.priceInr > 0 ? () => setActiveTier(plan.tier) : undefined}
          />
        ))}
      </div>

      {/* Early Access Modal */}
      {activeTier && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setActiveTier(null)}>
          <div style={{
            background: colors.card,
            padding: space[6],
            borderRadius: radius.lg,
            maxWidth: 420,
            width: "90%",
            textAlign: "center",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: space[3] }}>🚀</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
              {activeTier === "plus" ? "Research Plus" : "Research Pro"} — Early Access
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: 14, marginBottom: space[4] }}>
              We're launching paid plans soon! Enter your email to get notified
              when subscriptions open and receive an <strong>early-bird discount</strong>.
            </p>
            <div style={{ display: "flex", gap: space[2], flexDirection: "column" }}>
              <input
                placeholder="you@email.com"
                style={{
                  padding: "10px 16px",
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.page,
                  color: colors.textPrimary,
                  fontSize: 14,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button style={{
                padding: "10px 24px",
                borderRadius: radius.md,
                background: colors.primary,
                color: colors.onPrimary,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}>
                Notify me
              </button>
            </div>
            <button
              onClick={() => setActiveTier(null)}
              style={{
                marginTop: space[3],
                background: "none",
                border: "none",
                color: colors.textSecondary,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Feature Comparison Table */}
      <div style={{ marginTop: space[8] }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: space[4] }}>
          Feature Comparison
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: colors.textSecondary }}>
                  Feature
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>
                  Free
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center", color: colors.primary }}>
                  Research Plus
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>
                  Research Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.label}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    background: i % 2 === 0 ? "transparent" : colors.fill,
                  }}
                >
                  <td style={{ padding: "10px 16px", color: colors.textPrimary }}>
                    {row.label}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "center", color: getCellColor(row.free) }}>
                    {getCellContent(row.free)}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "center", color: getCellColor(row.plus) }}>
                    {getCellContent(row.plus)}
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "center", color: getCellColor(row.pro) }}>
                    {getCellContent(row.pro)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
