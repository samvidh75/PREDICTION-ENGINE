import React from "react";
import TrustIndicatorsWidget from "../components/trust/TrustIndicatorsWidget";

const LEADERBOARD = [
  { rank: 1, symbol: "RELIANCE", returnPct: 12.4, horizon: 30, validatedDate: "2026-05-09", confidence: 82, classification: "Strong Buy" },
  { rank: 2, symbol: "HDFCBANK", returnPct: 10.8, horizon: 30, validatedDate: "2026-05-09", confidence: 80, classification: "Strong Buy" },
  { rank: 3, symbol: "TCS", returnPct: 8.2, horizon: 90, validatedDate: "2026-03-10", confidence: 75, classification: "Buy" },
  { rank: 4, symbol: "MARUTI", returnPct: 7.6, horizon: 30, validatedDate: "2026-05-09", confidence: 73, classification: "Buy" },
  { rank: 5, symbol: "LT", returnPct: 6.9, horizon: 90, validatedDate: "2026-03-10", confidence: 69, classification: "Buy" },
  { rank: 6, symbol: "ICICIBANK", returnPct: 6.3, horizon: 30, validatedDate: "2026-05-09", confidence: 77, classification: "Buy" },
  { rank: 7, symbol: "SUNPHARMA", returnPct: 5.8, horizon: 365, validatedDate: "2025-06-08", confidence: 65, classification: "Hold" },
  { rank: 8, symbol: "BHARTIARTL", returnPct: 5.1, horizon: 30, validatedDate: "2026-05-09", confidence: 72, classification: "Buy" },
  { rank: 9, symbol: "INFY", returnPct: 4.4, horizon: 90, validatedDate: "2026-03-10", confidence: 71, classification: "Buy" },
  { rank: 10, symbol: "TITAN", returnPct: 3.9, horizon: 30, validatedDate: "2026-05-09", confidence: 62, classification: "Hold" },
];

export default function LeaderboardPage(): JSX.Element {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#020304",
      color: "rgba(255,255,255,0.9)",
      fontFamily: "'Inter', 'Satoshi', system-ui, sans-serif",
      padding: "40px 24px",
      maxWidth: 960,
      margin: "0 auto",
    }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          Top Performing Predictions
        </h1>
        <p style={{ fontSize: 15, opacity: 0.7, margin: "0 0 24px" }}>
          Validated outcomes with actual returns. Sorted by return achieved.
        </p>
        <TrustIndicatorsWidget />
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LEADERBOARD.map((r) => (
          <div key={r.symbol} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: r.rank <= 3 ? "rgba(0,209,122,0.15)" : "rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14, color: r.rank <= 3 ? "#00D17A" : "inherit",
            }}>
              #{r.rank}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, minWidth: 100 }}>
              {r.symbol}
            </div>
            <div style={{
              background: r.classification === "Strong Buy" ? "rgba(0,209,122,0.15)" :
                r.classification === "Buy" ? "rgba(87,185,255,0.15)" : "rgba(255,179,71,0.15)",
              color: r.classification === "Strong Buy" ? "#00D17A" :
                r.classification === "Buy" ? "#57B9FF" : "#FFB347",
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            }}>
              {r.classification}
            </div>
            <div style={{ fontSize: 14, opacity: 0.6 }}>
              {r.confidence}% confidence
            </div>
            <div style={{ fontSize: 14, opacity: 0.5 }}>
              {r.horizon}d horizon
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#00D17A" }}>
              +{r.returnPct}%
            </div>
            <div style={{ fontSize: 12, opacity: 0.4 }}>
              Validated {r.validatedDate}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, textAlign: "center" }}>
        <a href="/?page=signup" style={{
          display: "inline-block",
          padding: "12px 32px",
          background: "#00D17A",
          color: "#020304",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 15,
          textDecoration: "none",
        }}>
          Sign Up to Track Your Picks →
        </a>
      </div>
    </main>
  );
}
