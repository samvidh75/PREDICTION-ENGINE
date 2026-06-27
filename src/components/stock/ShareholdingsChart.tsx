import { useState } from "react";

interface ShareholderData {
  category: string;
  percent: number;
  change: number;
}

interface ShareholdingsChartProps {
  shareholdersData: ShareholderData[];
}

const PERIODS = ["Mar26", "Dec25", "Sep25", "Jun25"];

export default function ShareholdingsChart({ shareholdersData }: ShareholdingsChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("Mar26");

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: "20px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-300)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Shareholdings
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-900)" }}>
            Ownership Structure
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              style={{
                padding: "8px 12px",
                background: p === selectedPeriod ? "var(--brand-tint)" : "transparent",
                color: p === selectedPeriod ? "var(--brand)" : "var(--text-300)",
                border: p === selectedPeriod ? "1px solid var(--brand)" : "1px solid transparent",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font)",
                transition: "all 100ms",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {shareholdersData.map(sh => (
        <div key={sh.category} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: "var(--text-700)", fontWeight: 500 }}>
              {sh.category}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: sh.change >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
              {sh.percent.toFixed(2)}% {sh.change >= 0 ? "\u2191" : "\u2193"} {Math.abs(sh.change).toFixed(2)}%
            </div>
          </div>

          <div style={{
            height: 28,
            background: "var(--chip)",
            borderRadius: 6,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${sh.percent}%`,
              background: "linear-gradient(90deg, var(--brand) 0%, #8B5CF6 100%)",
              borderRadius: 6,
              transition: "width 400ms",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
