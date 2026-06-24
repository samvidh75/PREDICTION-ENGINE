import React, { useState, useEffect, useCallback } from "react";
import {
  Bell, Search, ArrowUpRight, TrendingUp, TrendingDown,
  AlertTriangle, RefreshCw, Clock, Check, ChevronRight,
  Sparkles, Brain, Eye, BarChart3, GitCompare, Bookmark,
} from "lucide-react";
import {
  PremiumAppShell, PremiumCard, ScoreRing, ScorePill,
  FactorChip, MiniSparkline, EmptyProductState,
  ProductPageHeader, InvestmentReviewSheet,
  BrokerHandoffSheet, MobileProductNav,
} from "../premium/PremiumComponents";
import { productNavigate } from "../components/product/ProductUI";
import { getTrackedCompanies } from "../lib/track/trackStore";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";

const S = {
  bg: "var(--ss-bg)",
  bgSoft: "var(--ss-bg-soft)",
  surface: "var(--ss-surface)",
  ink: "var(--ss-ink)",
  ink2: "var(--ss-ink-2)",
  ink3: "var(--ss-ink-3)",
  ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)",
  borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)",
  positiveSoft: "var(--ss-positive-soft)",
  negative: "var(--ss-negative)",
  negativeSoft: "var(--ss-negative-soft)",
  caution: "var(--ss-caution)",
  cautionSoft: "var(--ss-caution-soft)",
  action: "var(--ss-action)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
  radiusLg: "var(--ss-radius-lg)",
  shadowCard: "var(--ss-shadow-card)",
  shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", fontSize: 12, fontWeight: 600,
  border: `1px solid ${S.border}`, borderRadius: S.radiusXs,
  background: "none", cursor: "pointer", color: S.ink2,
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "white",
  border: "none", borderRadius: S.radiusXs,
  background: S.action, cursor: "pointer",
};

const alertCategories = [
  {
    id: "thesis",
    icon: Brain,
    label: "Thesis changed",
    description: "Notifications when a tracked company's research score shifts significantly.",
  },
  {
    id: "score",
    icon: BarChart3,
    label: "Score changed",
    description: "Score movements that may affect your thesis.",
  },
  {
    id: "risk",
    icon: AlertTriangle,
    label: "Risk changed",
    description: "Risk factor changes that warrant a review.",
  },
  {
    id: "valuation",
    icon: TrendingUp,
    label: "Valuation changed",
    description: "Valuation context shifts.",
  },
  {
    id: "price",
    icon: TrendingDown,
    label: "Price moved",
    description: "Significant price movements in tracked companies.",
  },
  {
    id: "events",
    icon: Clock,
    label: "Result / news event",
    description: "Earnings and company announcements.",
  },
];

export default function AlertsPage() {
  const [tracked, setTracked] = useState(() => getTrackedCompanies());

  const refresh = useCallback(() => setTracked(getTrackedCompanies()), []);

  useEffect(() => {
    window.addEventListener("trackchange", refresh);
    const handler = (e: StorageEvent) => {
      if (e.key === "ss_tracked_companies") refresh();
    };
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("trackchange", refresh);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  return (
    <PremiumAppShell activePage="alerts">
      <ProductPageHeader
        title="Alerts"
        description="Review important changes in companies you track."
      />

      {tracked.length === 0 ? (
        <>
          <EmptyProductState
            icon={<Bell size={24} color={S.ink4} />}
            title="Track a company to review important changes."
            body="StockStory will surface thesis, risk, and valuation changes for companies you follow when this view is ready."
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
            <button onClick={() => productNavigate("scanner")} style={primaryBtn}>
              Open scanner
            </button>
            <button onClick={() => productNavigate("search")} style={secondaryBtn}>
              Search company
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 13, fontWeight: 700, color: S.ink,
                margin: "0 0 4px 0",
              }}
            >
              Your tracked companies
            </h2>
            <p style={{ fontSize: 12, color: S.ink3, margin: 0, lineHeight: 1.5 }}>
              Check each company's stock page to review score changes, risks, and updates.
            </p>
          </div>

          <PremiumCard padding="8px 16px">
            {tracked.map((t, i) => (
              <div
                key={t.symbol}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0",
                  borderTop: i === 0 ? "none" : `1px solid ${S.borderSoft}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 14, fontWeight: 700, color: S.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {t.symbol}
                    </span>
                    <span
                      style={{
                        fontSize: 12, color: S.ink3,
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.companyName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => productNavigate("stock", t.symbol)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "6px 12px", fontSize: 11, fontWeight: 600,
                    border: `1px solid ${S.borderSoft}`, borderRadius: S.radiusXs,
                    background: S.surface, cursor: "pointer", color: S.ink2,
                    flexShrink: 0,
                  }}
                >
                  Review <ArrowUpRight size={12} />
                </button>
              </div>
            ))}
          </PremiumCard>

          <div
            style={{
              display: "flex", flexWrap: "wrap", gap: 12,
              marginTop: 8, justifyContent: "center",
            }}
          >
            <button onClick={() => productNavigate("scanner")} style={secondaryBtn}>
              <Search size={13} /> Browse companies
            </button>
            <button onClick={() => productNavigate("watchlist")} style={secondaryBtn}>
              <Bookmark size={13} /> Full watchlist
            </button>
          </div>

          <div style={{ margin: "36px 0 20px" }}>
            <h2
              style={{
                fontSize: 13, fontWeight: 700, color: S.ink,
                margin: "0 0 4px 0",
              }}
            >
              Alert categories
            </h2>
            <p style={{ fontSize: 12, color: S.ink3, margin: "0 0 16px 0" }}>
              When alerting is ready, these are the types of changes you will be notified about.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alertCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px",
                      background: S.surface, borderRadius: S.radiusMd,
                      border: `1px solid ${S.borderSoft}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 32, height: 32, borderRadius: S.radiusXs,
                        background: S.bgSoft, color: S.ink3, flexShrink: 0,
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.ink, marginBottom: 2 }}>
                        {cat.label}
                      </div>
                      <p style={{ fontSize: 11, color: S.ink3, margin: 0, lineHeight: 1.5 }}>
                        {cat.description}
                      </p>
                    </div>
                    <button
                      onClick={() => productNavigate("watchlist")}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "6px 10px", fontSize: 11, fontWeight: 600,
                        border: "none", borderRadius: S.radiusXs,
                        background: S.bgSoft, cursor: "pointer", color: S.action,
                        flexShrink: 0, whiteSpace: "nowrap",
                      }}
                    >
                      View tracked <ChevronRight size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <MobileProductNav activePage="alerts" />
      <SebiDisclaimer />
    </PremiumAppShell>
  );
}
