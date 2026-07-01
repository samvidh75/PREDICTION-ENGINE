// src/components/OptionGreeksMatrix.tsx
// Phase 41 — Client-side Black-Scholes Option Greeks computed in a WebWorker.
// Displays Delta, Gamma, Theta, Vega for each strike — zero server cost.

import { useEffect, useState } from "react";
import { colors, space, radius } from "../design/tokens";
import { StockExWorkerPool } from "./edge-ai/StockExWorkerPool";

interface GreeksRecord {
  strike: number;
  isCall: boolean;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

interface OptionGreeksMatrixProps {
  ticker: string;
  spotPrice: number;
  rawStrikes: Array<{
    strike_price: number;
    option_type: string;
    implied_volatility: number;
  }>;
}

export default function OptionGreeksMatrix({
  ticker,
  spotPrice,
  rawStrikes,
}: OptionGreeksMatrixProps) {
  const [greeks, setGreeks] = useState<GreeksRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rawStrikes || rawStrikes.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const formatted = rawStrikes.map((s) => ({
      strike: Number(s.strike_price),
      iv: Number(s.implied_volatility || 15),
      isCall: s.option_type === "CE",
    }));

    StockExWorkerPool.on("greeks_bulk_result", (data: any) => {
      setGreeks(data.results);
      setLoading(false);
      StockExWorkerPool.off("greeks_bulk_result");
    });

    StockExWorkerPool.dispatch("compute_option_greeks_bulk", {
      spot: spotPrice,
      strikesData: formatted,
    });

    return () => StockExWorkerPool.off("greeks_bulk_result");
  }, [spotPrice, rawStrikes]);

  if (loading) {
    return (
      <div
        style={{
          fontSize: 11,
          fontFamily: "monospace",
          color: colors.textTertiary,
          textAlign: "center",
          padding: space[4],
        }}
      >
        Computing Option Greeks on local device...
      </div>
    );
  }

  if (greeks.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
      <div>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "#60a5fa",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Option Greeks Spectrum ({ticker})
        </h3>
        <p
          style={{
            fontSize: 9,
            color: colors.textTertiary,
            margin: `${space[1]} 0 0 0`,
          }}
        >
          Processed in local Web Worker - Zero token fees
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
        {greeks.slice(0, 4).map((item, idx) => {
          const typeColor = item.isCall ? colors.marketGreen : colors.danger;
          return (
            <div
              key={idx}
              style={{
                background: colors.surface,
                border: `1px solid ${colors.charcoal}`,
                borderRadius: radius.sm,
                padding: space[3],
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: `1px solid ${colors.charcoal}`,
                  paddingBottom: space[1],
                  marginBottom: space[2],
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: typeColor,
                  }}
                >
                  STRIKE: {item.strike} ({item.isCall ? "CE" : "PE"})
                </span>
                <span style={{ fontSize: 10, color: colors.textTertiary }}>
                  Spot: &#8377;{spotPrice}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: space[2],
                  fontSize: 10,
                  textAlign: "center",
                }}
              >
                <div>
                  <p style={{ margin: 0, color: colors.textTertiary }}>&#916; DELTA</p>
                  <p style={{ margin: `${space[1]} 0 0 0`, fontWeight: "bold", color: colors.textPrimary }}>
                    {item.greeks.delta}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: colors.textTertiary }}>&#915; GAMMA</p>
                  <p style={{ margin: `${space[1]} 0 0 0`, fontWeight: "bold", color: colors.textPrimary }}>
                    {item.greeks.gamma}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: colors.textTertiary }}>&#920; THETA</p>
                  <p style={{ margin: `${space[1]} 0 0 0`, fontWeight: "bold", color: colors.danger }}>
                    {item.greeks.theta}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, color: colors.textTertiary }}>V VEGA</p>
                  <p style={{ margin: `${space[1]} 0 0 0`, fontWeight: "bold", color: "#60a5fa" }}>
                    {item.greeks.vega}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
