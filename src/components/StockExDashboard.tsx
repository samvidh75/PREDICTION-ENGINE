// src/components/StockExDashboard.tsx
// Phase 47 — Unified Premium Analytics Dashboard.
// Aggregates options chain, portfolio, and Greeks data into a single view.
// Pro-tier gated. Uses shared WorkerPool for Greeks computation.

import { useCallback, useEffect, useState } from "react";
import { colors, space, radius, typography } from "../design/tokens";
import { StockExWorkerPool } from "./edge-ai/StockExWorkerPool";

interface DashboardMetrics {
  ticker: string;
  spotPrice: number;
  pcrRatio: number;
  maxPain: number;
  oiTrend: string;
  portfolioAllocation: number;
  greeks: { delta: number; theta: number; vega: number };
}

interface StockExDashboardProps {
  userId: string;
  hasProTier: boolean;
}

export default function StockExDashboard({ userId, hasProTier }: StockExDashboardProps) {
  const [ticker, setTicker] = useState("RELIANCE");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const pullData = useCallback(async () => {
    setLoading(true);
    try {
      const optionsRes = await fetch(`/api/v1/fo/scanner/${ticker}?limit=20`);
      const optionsData = await optionsRes.json();

      const portfolioRes = await fetch(`/api/v1/portfolio/unified/${userId}`);
      const portfolioData = await portfolioRes.json();

      if (optionsData.success && optionsData.hasData) {
        const summary = optionsData.summary;
        const heaviestStrike = optionsData.heavyStrikes?.[0] || null;

        StockExWorkerPool.on("greeks_bulk_result", (response: any) => {
          const targetGreeks = response.results?.[0]?.greeks || { delta: 0, theta: 0, vega: 0 };

          setMetrics({
            ticker,
            spotPrice: heaviestStrike ? Number(heaviestStrike.strike_price) : 2450,
            pcrRatio: Number(summary.pcr_ratio),
            maxPain: Number(summary.max_pain_strike),
            oiTrend: summary.oi_trend_status || "NEUTRAL",
            portfolioAllocation: portfolioData?.totals?.totalValue
              ? parseFloat(
                  (
                    ((portfolioData.holdings || []).find((h: any) => h.symbol === ticker)
                      ?.currentValue || 0) /
                    portfolioData.totals.totalValue *
                    100
                  ).toFixed(1),
                )
              : 0,
            greeks: targetGreeks,
          });
          setLoading(false);
          StockExWorkerPool.off("greeks_bulk_result");
        });

        StockExWorkerPool.dispatch("compute_option_greeks_bulk", {
          spot: heaviestStrike ? Number(heaviestStrike.strike_price) : 2450,
          strikesData: [
            {
              strike: heaviestStrike ? Number(heaviestStrike.strike_price) : 2500,
              iv: heaviestStrike ? Number(heaviestStrike.implied_volatility) : 18.5,
              isCall: true,
            },
          ],
        });
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [ticker, userId]);

  useEffect(() => {
    if (userId) pullData();
  }, [pullData, userId]);

  if (!hasProTier) {
    return (
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.charcoal}`,
          padding: space[8],
          borderRadius: radius.lg,
          textAlign: "center",
          fontFamily: typography.fontFamily,
        }}
      >
        <span style={{ fontSize: 24 }}>🔒</span>
        <h3
          style={{
            fontSize: 13,
            fontWeight: "bold",
            color: colors.accentRed,
            margin: `${space[4]} 0 ${space[2]} 0`,
          }}
        >
          PRO QUANT RADAR INTERFACE
        </h3>
        <p style={{ fontSize: 11, color: colors.textTertiary, marginBottom: space[6] }}>
          Unlock unified multi-broker portfolio tracking, client-side Black-Scholes Greeks math, and SEBI insider disclosure scanners.
        </p>
        <button
          onClick={() => (window.location.href = "/pricing")}
          style={{
            background: colors.accentRed,
            color: colors.textPrimary,
            fontSize: 11,
            fontWeight: "bold",
            padding: `${space[3]} ${space[5]}`,
            borderRadius: radius.sm,
            border: "none",
            cursor: "pointer",
          }}
        >
          UPGRADE TO PRO
        </button>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <div style={{ textAlign: "center", fontSize: 11, fontFamily: typography.fontFamily, color: colors.textTertiary, padding: space[12] }}>
        Assembling live market intelligence layout blocks...
      </div>
    );
  }

  const trendColor = metrics.oiTrend.includes("LONG") ? colors.marketGreen : colors.danger;

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.charcoal}`,
    padding: space[4],
    borderRadius: radius.sm,
  };

  const labelStyle: React.CSSProperties = { fontSize: 9, color: colors.textTertiary, margin: 0 };
  const valueStyle: React.CSSProperties = { fontSize: 18, fontWeight: "bold", margin: `${space[2]} 0 0 0` };

  return (
    <div style={{ fontFamily: typography.fontFamily, textAlign: "left" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${colors.charcoal}`,
          paddingBottom: space[4],
          marginBottom: space[6],
        }}
      >
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 900, color: colors.textPrimary, margin: 0, letterSpacing: "0.05em" }}>
            StockEX Integrated Intelligence Matrix
          </h1>
          <p style={{ fontSize: 10, color: colors.textTertiary, margin: `${space[1]} 0 0 0` }}>
            Unified multi-asset derivatives and portfolio tracking cluster
          </p>
        </div>
        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          style={{
            background: colors.surface,
            border: `1px solid ${colors.charcoal}`,
            borderRadius: radius.sm,
            color: colors.textPrimary,
            fontSize: 11,
            fontFamily: typography.fontFamily,
            padding: `${space[2]} ${space[3]}`,
            outline: "none",
          }}
        >
          <option value="RELIANCE">RELIANCE</option>
          <option value="TCS">TCS</option>
          <option value="SBIN">SBIN</option>
          <option value="HDFCBANK">HDFCBANK</option>
          <option value="INFY">INFY</option>
        </select>
      </div>

      {/* 4-Card Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: space[4], marginBottom: space[6] }}>
        {/* Portfolio Exposure */}
        <div style={cardStyle}>
          <p style={labelStyle}>PORTFOLIO EXPOSURE WEIGHT</p>
          <p style={{ ...valueStyle, color: colors.accentRed }}>{metrics.portfolioAllocation}%</p>
          <div
            style={{
              width: "100%",
              background: colors.canvas,
              height: 4,
              borderRadius: radius.full,
              marginTop: space[2],
              overflow: "hidden",
              border: `1px solid ${colors.charcoal}`,
            }}
          >
            <div style={{ width: `${Math.min(metrics.portfolioAllocation, 100)}%`, background: colors.accentRed, height: "100%" }} />
          </div>
        </div>

        {/* PCR */}
        <div style={cardStyle}>
          <p style={labelStyle}>DERIVATIVES PUT-CALL RATIO</p>
          <p style={{ ...valueStyle, color: trendColor }}>{metrics.pcrRatio}</p>
          <p style={{ fontSize: 9, color: colors.textTertiary, margin: `${space[1]} 0 0 0` }}>
            Trend: {metrics.oiTrend.replace(/_/g, " ")}
          </p>
        </div>

        {/* Max Pain */}
        <div style={cardStyle}>
          <p style={labelStyle}>MAX PAIN LIQUIDITY FLOOR</p>
          <p style={{ ...valueStyle, color: colors.textPrimary }}>
            &#8377;{metrics.maxPain}
          </p>
          <p style={{ fontSize: 9, color: colors.textTertiary, margin: `${space[1]} 0 0 0` }}>
            Spot Parity: &#8377;{metrics.spotPrice}
          </p>
        </div>

        {/* Greeks */}
        <div style={cardStyle}>
          <p style={labelStyle}>ON-DEVICE RISK DELTA (Δ)</p>
          <p style={{ ...valueStyle, color: colors.marketGreen }}>{metrics.greeks.delta}</p>
          <p style={{ fontSize: 9, color: colors.textTertiary, margin: `${space[1]} 0 0 0` }}>
            Theta (θ) Decay: {metrics.greeks.theta}/day
          </p>
        </div>
      </div>
    </div>
  );
}
