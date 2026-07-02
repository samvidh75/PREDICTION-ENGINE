// src/components/OptionsChainScanner.tsx
// Phase 34 — F&O Options Chain scanner widget for the StockPage.
// Displays PCR, Max Pain, OI trend, and highest OI strike walls.
// Gated behind Pro-tier feature checks.

import { useEffect, useState } from "react";
import { colors, space, radius, typography } from "../design/tokens";
import { useEntitlements } from "../commercial/useEntitlements";
import { FeatureGate } from "../commercial/FeatureGate";
import OptionGreeksMatrix from "./OptionGreeksMatrix";

interface OptionsData {
  hasData: boolean;
  summary: {
    pcr_ratio: number;
    max_pain_strike: number;
    oi_trend_status: string;
  };
  heavyStrikes: Array<{
    strike_price: number;
    option_type: string;
    open_interest: number;
    change_in_oi: number;
    implied_volatility: number;
  }>;
}

interface OptionsChainScannerProps {
  ticker: string;
}

export default function OptionsChainScanner({ ticker }: OptionsChainScannerProps) {
  const [data, setData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/fo/scanner/${encodeURIComponent(ticker)}`)
      .then((res) => res.json())
      .then((payload: { success: boolean; hasData?: boolean } & Partial<OptionsData>) => {
        if (!cancelled) {
          if (payload.success && payload.hasData) {
            setData(payload as OptionsData);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load F&O data");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [ticker]);

  const cardStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.charcoal}`,
    borderRadius: radius.lg,
    padding: space[5],
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
  };

  if (loading) {
    return (
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: colors.textTertiary, margin: 0 }}>
          Evaluating F&O Open Interest metrics...
        </p>
      </div>
    );
  }

  if (error || !data || !data.hasData) {
    return (
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: colors.textTertiary, margin: 0 }}>
          {error || "No active derivative contracts tracked for this symbol."}
        </p>
      </div>
    );
  }

  const trendColor = data.summary.oi_trend_status.includes("LONG")
    ? colors.marketGreen
    : colors.danger;

  return (
    <FeatureGate feature="api_access">
      <div style={cardStyle}>
        {/* Header */}
        <div
          style={{
            marginBottom: space[4],
            borderBottom: `1px solid ${colors.charcoal}`,
            paddingBottom: space[3],
          }}
        >
          <h3
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: colors.accentRed,
              textTransform: "uppercase",
              margin: 0,
              letterSpacing: "0.04em",
            }}
          >
            F&O Derivatives Liquidity Matrix
          </h3>
          <p style={{ fontSize: 9, color: colors.textTertiary, margin: `${space[1]} 0 0 0` }}>
            Put-Call concentration maps - Zero Data Costs
          </p>
        </div>

        {/* PCR / Max Pain / OI Momentum */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: space[3],
            marginBottom: space[5],
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: colors.canvas,
              padding: space[3],
              borderRadius: radius.sm,
              border: `1px solid ${colors.charcoal}`,
            }}
          >
            <p style={{ fontSize: 8, color: colors.textTertiary, margin: 0 }}>
              PUT-CALL RATIO
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: "bold",
                margin: `${space[1]} 0 0 0`,
                color: trendColor,
              }}
            >
              {data.summary.pcr_ratio}
            </p>
          </div>
          <div
            style={{
              background: colors.canvas,
              padding: space[3],
              borderRadius: radius.sm,
              border: `1px solid ${colors.charcoal}`,
            }}
          >
            <p style={{ fontSize: 8, color: colors.textTertiary, margin: 0 }}>
              MAX PAIN STRIKE
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: "bold",
                margin: `${space[1]} 0 0 0`,
                color: colors.textPrimary,
              }}
            >
              &#8377;{data.summary.max_pain_strike}
            </p>
          </div>
          <div
            style={{
              background: colors.canvas,
              padding: space[3],
              borderRadius: radius.sm,
              border: `1px solid ${colors.charcoal}`,
            }}
          >
            <p style={{ fontSize: 8, color: colors.textTertiary, margin: 0 }}>
              OI MOMENTUM
            </p>
            <p
              style={{
                fontSize: 10,
                fontWeight: "bold",
                margin: `${space[2]} 0 0 0`,
                color: trendColor,
              }}
            >
              {data.summary.oi_trend_status.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {/* Highest OI Strikes */}
        <div>
          <p
            style={{
              fontSize: 9,
              color: colors.textTertiary,
              fontWeight: "bold",
              marginBottom: space[3],
            }}
          >
            HEAVIEST OPEN INTEREST WALLS:
          </p>
          {data.heavyStrikes.map((strike, idx) => {
            const isCall = strike.option_type === "CE";
            return (
              <div
                key={idx}
                style={{
                  background: colors.canvas,
                  padding: `${space[2]} ${space[3]}`,
                  borderRadius: radius.sm,
                  border: `1px solid ${colors.charcoal}`,
                  marginBottom: space[2],
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      color: isCall ? colors.danger : colors.marketGreen,
                    }}
                  >
                    {strike.strike_price} {strike.option_type}
                  </span>
                  <p
                    style={{
                      fontSize: 8,
                      color: colors.textTertiary,
                      margin: `${space[1]} 0 0 0`,
                    }}
                  >
                    Chg in OI: {strike.change_in_oi.toLocaleString("en-IN")}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: colors.textSecondary,
                  }}
                >
                  OI: {strike.open_interest.toLocaleString("en-IN")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Option Greeks (Phase 41) */}
        <div style={{ marginTop: space[5], paddingTop: space[4], borderTop: `1px solid ${colors.charcoal}` }}>
          <OptionGreeksMatrix
            ticker={ticker}
            spotPrice={data.summary.max_pain_strike || 0}
            rawStrikes={data.heavyStrikes}
          />
        </div>
      </div>
    </FeatureGate>
  );
}
