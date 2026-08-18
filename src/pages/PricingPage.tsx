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

import { useCallback, useMemo, useState } from "react";
import { getAllPlans } from "../commercial/plans";
import type { Plan, PlanTier } from "../commercial/plans";
import { createCheckout, getUserId, redirectToCheckout } from "../commercial/checkoutClient";
import { colors, space, radius, layout } from "../design/tokens";
import { BananaBanner } from "../components/nano/BananaBanner";
import { NANOBANANA_ASSETS } from "../lib/nanoAssets";

const ANNUAL_DISCOUNT_MULTIPLIER = 10; // 2 months free on annual

function PricingCard({ plan, featured, annual, onSelect }: { plan: Plan; featured: boolean; annual: boolean; onSelect?: () => void }) {
  const monthlyPrice = plan.pricePhp;
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
        <span style={{ fontSize: 36, fontWeight: 700 }}>₱{displayPrice.toLocaleString()}</span>
        <span style={{ color: colors.textSecondary, fontSize: 14 }}>{periodLabel}</span>
      </div>
      {annual && plan.pricePhp > 0 && (
        <div style={{ fontSize: 13, color: colors.success, fontWeight: 600, marginTop: -8 }}>
          Save {savingsPercent}% (₱{Math.round(monthlyPrice * 12 - annualPrice).toLocaleString()}/yr)
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
            background: plan.pricePhp === 0 ? "transparent" : featured ? colors.primary : "transparent",
            color: plan.pricePhp === 0 ? colors.primary : featured ? colors.onPrimary : colors.primary,
            border: plan.pricePhp === 0 ? `1px solid ${colors.border}` : "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: plan.pricePhp === 0 ? "default" : "pointer",
            transition: "background 0.15s",
          }}
          onClick={plan.pricePhp === 0 ? undefined : onSelect}
        >
          {plan.pricePhp === 0 ? "Current plan" : "Upgrade"}
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const plans = useMemo(() => getAllPlans(), []);

  const handleSelectPlan = useCallback(async (plan: Plan) => {
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const result = await createCheckout(plan.id, getUserId());

      if (!result.success) {
        throw new Error(result.error ?? "Checkout failed");
      }

      if (result.checkoutUrl) {
        redirectToCheckout(result.checkoutUrl);
      }
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
      setCheckoutLoading(false);
    }
  }, []);

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
      <div style={{ marginBottom: space[4] }}>
        <BananaBanner
          src={NANOBANANA_ASSETS.pricingHero}
          minHeight={320}
          overlay={0.5}
          className="raycast-stagger-1"
        >
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#F5A97F", marginBottom: 14 }}>
              Free · Research Plus · Research Pro
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 700, margin: "0 0 10px", color: "#FFFFFF" }}>Research Plans</h1>
            <p style={{ color: "rgba(247,248,250,0.84)", fontSize: 16, lineHeight: 1.55, margin: 0 }}>
              Choose a plan that fits your research needs. All plans provide access
              to stock health scores, factor analysis, and research narratives.
            </p>
          </div>
        </BananaBanner>
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
            }}
            aria-pressed={annual}
          >
            Annual
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="raycast-stagger-3" style={{ display: "flex", gap: space[4], flexWrap: "wrap", marginBottom: space[8] }}>
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            featured={plan.tier === 'plus'}
            annual={annual}
            onSelect={() => handleSelectPlan(plan)}
          />
        ))}
      </div>

      {/* Comparison Table */}
      <div className="raycast-stagger-4" style={{ overflowX: "auto", marginBottom: space[8] }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: space[3], borderBottom: `1px solid ${colors.border}` }}>Feature</th>
              <th style={{ textAlign: "center", padding: space[3], borderBottom: `1px solid ${colors.border}` }}>Free</th>
              <th style={{ textAlign: "center", padding: space[3], borderBottom: `1px solid ${colors.border}` }}>Research Plus</th>
              <th style={{ textAlign: "center", padding: space[3], borderBottom: `1px solid ${colors.border}` }}>Research Pro</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.label}>
                <td style={{ padding: space[3], borderBottom: `1px solid ${colors.fill}`, color: colors.textSecondary }}>{row.label}</td>
                <td style={{ textAlign: "center", padding: space[3], borderBottom: `1px solid ${colors.fill}`, color: getCellColor(row.free) }}>{getCellContent(row.free)}</td>
                <td style={{ textAlign: "center", padding: space[3], borderBottom: `1px solid ${colors.fill}`, color: getCellColor(row.plus) }}>{getCellContent(row.plus)}</td>
                <td style={{ textAlign: "center", padding: space[3], borderBottom: `1px solid ${colors.fill}`, color: getCellColor(row.pro) }}>{getCellContent(row.pro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {checkoutError && (
        <div style={{
          background: colors.fill,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: space[3],
          textAlign: "center",
          color: colors.danger,
        }}>
          {checkoutError}
        </div>
      )}
    </div>
  );
}
