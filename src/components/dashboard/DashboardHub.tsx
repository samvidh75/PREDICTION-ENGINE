import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Sparkles, ArrowUpRight, BarChart3, GitCompare,
  Bookmark, ChevronRight, TrendingUp, TrendingDown,
  AlertTriangle, Clock, Check, Star, RefreshCw,
  Brain, LineChart, X,
} from "lucide-react";
import { productNavigate } from "../product/ProductUI";
import {
  PremiumCard, ScoreRing, FactorBar, MiniSparkline,
  ScorePill, FactorChip, CommandSearch, EmptyProductState,
  ProductPageHeader, PremiumAppShell, MobileProductNav,
} from "../../premium/PremiumComponents";
import { api } from "../../services/api/client";
import { getTrackedCompanies, removeTrackedCompany } from "../../lib/track/trackStore";
import type { TrackedCompany } from "../../lib/track/trackStore";
import { buildDashboardViewModel } from "../../lib/product/viewModels/dashboardViewModel";

const S = {
  bg: "var(--ss-bg)",
  bgSoft: "var(--ss-bg-soft)",
  surface: "var(--ss-surface)",
  surfaceWarm: "var(--ss-surface-warm)",
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
  radiusXl: "var(--ss-radius-xl)",
  shadowCard: "var(--ss-shadow-card)",
  shadowFloating: "var(--ss-shadow-floating)",
  container: "var(--ss-container)",
};

const DISCOVERY_STRATEGIES = [
  {
    id: "quality-compounders",
    title: "Quality compounders",
    description: "Companies with strong fundamentals, consistent growth, and durable competitive advantages.",
    icon: TrendingUp,
    filter: "quality",
  },
  {
    id: "undervalued-quality",
    title: "Undervalued quality",
    description: "High-quality businesses trading at attractive valuations relative to their peers.",
    icon: BarChart3,
    filter: "value",
  },
  {
    id: "improving-momentum",
    title: "Improving momentum",
    description: "Companies showing positive momentum shifts and strengthening technical trends.",
    icon: LineChart,
    filter: "momentum",
  },
  {
    id: "risk-rising",
    title: "Risk rising",
    description: "Companies where risk factors are increasing — review before committing capital.",
    icon: AlertTriangle,
    filter: "risk",
  },
];

function DashboardHub() {
  const [tracked, setTracked] = useState<TrackedCompany[]>(() => getTrackedCompanies());
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const viewModel = useMemo(() => {
    return buildDashboardViewModel(
      [],
      tracked.map(c => ({ symbol: c.symbol, companyName: c.companyName, score: null })),
      [],
      tracked.length > 0,
      false,
      false,
    );
  }, [tracked]);

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) productNavigate("search");
  }, []);

  const handleUntrack = useCallback((symbol: string) => {
    removeTrackedCompany(symbol);
    setTracked(getTrackedCompanies());
  }, []);

  const containerSx: React.CSSProperties = {
    background: S.bg,
    maxWidth: 1360,
    margin: "0 auto",
    padding: mobile ? "0 16px" : "0 52px",
  };

  return (
    <PremiumAppShell activePage="landing">
      <div style={containerSx}>
        <div style={{ marginBottom: 28, paddingTop: 4 }}>
          <CommandSearch
            placeholder="Search a company or ask for a stock screen..."
            onSearch={handleSearch}
          />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 36,
        }}>
          {[
            { label: "Open scanner", icon: Search, page: "scanner" },
            { label: "Compare companies", icon: GitCompare, page: "compare" },
            { label: "Review watchlist", icon: Bookmark, page: "watchlist" },
            { label: "Track a thesis", icon: Star, page: "search" },
          ].map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => productNavigate(action.page)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "14px 16px",
                  background: S.surface,
                  border: `1px solid ${S.borderSoft}`,
                  borderRadius: S.radiusMd,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: S.shadowCard,
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = S.shadowFloating; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = S.shadowCard; }}
              >
                <Icon size={18} color={S.ink} />
                <span style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>
                  {action.label}
                </span>
                <ChevronRight size={14} color={S.ink4} style={{ marginLeft: "auto" }} />
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 36 }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: S.ink,
            margin: "0 0 14px 0", letterSpacing: "-0.2px",
          }}>
            Discovery
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}>
            {DISCOVERY_STRATEGIES.map(strategy => {
              const Icon = strategy.icon;
              return (
                <PremiumCard key={strategy.id} padding="20px">
                  <div style={{ display: "flex", gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: S.radiusSm,
                      background: S.bgSoft, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon size={18} color={S.ink} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: 14, fontWeight: 700, color: S.ink,
                        margin: 0, letterSpacing: "-0.2px",
                      }}>
                        {strategy.title}
                      </h3>
                      <p style={{
                        fontSize: 12, color: S.ink3, margin: "4px 0 0 0",
                        lineHeight: 1.5,
                      }}>
                        {strategy.description}
                      </p>
                      <button
                        onClick={() => productNavigate("scanner")}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          marginTop: 12, padding: "8px 14px",
                          fontSize: 12, fontWeight: 600, color: S.ink2,
                          background: "none", border: `1px solid ${S.border}`,
                          borderRadius: S.radiusSm, cursor: "pointer",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = S.ink; e.currentTarget.style.color = S.ink; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.ink2; }}
                      >
                        Open scanner <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </div>
                </PremiumCard>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 36 }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: S.ink,
            margin: "0 0 14px 0", letterSpacing: "-0.2px",
          }}>
            Watchlist review
          </h2>
          {tracked.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "48px 24px", textAlign: "center",
              background: S.surface, borderRadius: S.radiusMd,
              border: `1px solid ${S.borderSoft}`,
              boxShadow: S.shadowCard,
            }}>
              <Bookmark size={28} color={S.ink4} />
              <h3 style={{
                fontSize: 15, fontWeight: 600, color: S.ink,
                margin: "14px 0 4px 0",
              }}>
                Track companies you are researching.
              </h3>
              <p style={{
                fontSize: 12, color: S.ink3, margin: 0, maxWidth: 320,
              }}>
                Add companies from the stock page, scanner, or search to build your research watchlist.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button
                  onClick={() => productNavigate("scanner")}
                  style={{
                    padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "white",
                    border: "none", borderRadius: S.radiusSm,
                    background: S.action, cursor: "pointer",
                  }}
                >
                  Open scanner
                </button>
                <button
                  onClick={() => productNavigate("search")}
                  style={{
                    padding: "10px 20px", fontSize: 13, fontWeight: 600, color: S.ink2,
                    border: `1px solid ${S.border}`, borderRadius: S.radiusSm,
                    background: "none", cursor: "pointer",
                  }}
                >
                  Search company
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
              gap: 8,
            }}>
              {tracked.map(company => (
                <div
                  key={company.symbol}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px",
                    background: S.surface, borderRadius: S.radiusMd,
                    border: `1px solid ${S.borderSoft}`,
                    boxShadow: S.shadowCard,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: S.radiusXs,
                      background: S.bgSoft, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: S.ink3,
                      border: `1px solid ${S.borderSoft}`, flexShrink: 0,
                    }}>
                      {company.symbol.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: S.ink, letterSpacing: "-0.2px" }}>
                        {company.symbol}
                      </div>
                      <div style={{
                        fontSize: 11, color: S.ink3,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {company.companyName || "Tracked company"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => productNavigate("stock", company.symbol)}
                      style={{
                        padding: "8px 14px", fontSize: 12, fontWeight: 600, color: S.ink2,
                        border: `1px solid ${S.border}`, borderRadius: S.radiusSm,
                        background: "none", cursor: "pointer",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = S.ink; e.currentTarget.style.color = S.ink; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.ink2; }}
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleUntrack(company.symbol)}
                      style={{
                        padding: 8, border: "none", background: "none",
                        cursor: "pointer", color: S.ink4,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = S.negative; }}
                      onMouseLeave={e => { e.currentTarget.style.color = S.ink4; }}
                      title="Remove from watchlist"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 40 }}>
          <h2 style={{
            fontSize: 15, fontWeight: 700, color: S.ink,
            margin: "0 0 14px 0", letterSpacing: "-0.2px",
          }}>
            Research signals
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
            gap: 10,
          }}>
            {[
              { title: "What changed", icon: TrendingUp, body: "No notable changes to review right now." },
              { title: "Needs review", icon: Clock, body: "All tracked theses are current." },
              { title: "Thesis improving", icon: Check, body: "No improving signals detected." },
            ].map(status => {
              const Icon = status.icon;
              return (
                <PremiumCard key={status.title} padding="20px">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: S.radiusSm,
                      background: S.bgSoft, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={16} color={S.ink3} />
                    </div>
                    <h3 style={{
                      fontSize: 14, fontWeight: 700, color: S.ink,
                      margin: 0, letterSpacing: "-0.2px",
                    }}>
                      {status.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: 12, color: S.ink3, margin: 0, lineHeight: 1.5 }}>
                    {status.body}
                  </p>
                </PremiumCard>
              );
            })}
          </div>
        </div>
      </div>
    </PremiumAppShell>
  );
}

export default DashboardHub;
