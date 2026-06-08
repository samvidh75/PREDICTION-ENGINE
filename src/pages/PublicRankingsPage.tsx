import React from "react";

const RANKINGS = [
  { rank: 1, symbol: "RELIANCE", score: 87, change: "+2", sector: "Energy" },
  { rank: 2, symbol: "HDFCBANK", score: 85, change: "+1", sector: "Financial" },
  { rank: 3, symbol: "ICICIBANK", score: 80, change: "+3", sector: "Financial" },
  { rank: 4, symbol: "TCS", score: 78, change: "0", sector: "Technology" },
  { rank: 5, symbol: "MARUTI", score: 75, change: "-1", sector: "Auto" },
  { rank: 6, symbol: "BHARTIARTL", score: 74, change: "+4", sector: "Telecom" },
  { rank: 7, symbol: "INFY", score: 72, change: "-2", sector: "Technology" },
  { rank: 8, symbol: "LT", score: 71, change: "+1", sector: "Infrastructure" },
  { rank: 9, symbol: "SUNPHARMA", score: 68, change: "0", sector: "Pharma" },
  { rank: 10, symbol: "TITAN", score: 66, change: "-1", sector: "Consumer" },
];

export default function PublicRankingsPage(): JSX.Element {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#020304",
      color: "rgba(255,255,255,0.9)",
      fontFamily: "'Inter', 'Satoshi', system-ui, sans-serif",
      padding: "40px 24px",
      maxWidth: 900,
      margin: "0 auto",
    }}>
      <header style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          Stock Rankings
        </h1>
        <p style={{ fontSize: 15, opacity: 0.7, margin: 0 }}>
          Sorted by StockStory Engine composite score. Updated daily at 06:00 IST.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RANKINGS.map((r) => (
          <div key={r.symbol} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14,
            }}>
              #{r.rank}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, minWidth: 110 }}>
              {r.symbol}
            </div>
            <div style={{ fontSize: 13, opacity: 0.5, minWidth: 90 }}>
              {r.sector}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#00D17A" }}>
              {r.score}
            </div>
            <div style={{
              fontSize: 13,
              color: r.change.startsWith("+") ? "#00D17A" : r.change.startsWith("-") ? "#FF5B6E" : "#fff",
              opacity: 0.7,
            }}>
              {r.change.startsWith("+") ? "↑" : r.change.startsWith("-") ? "↓" : "→"} {r.change}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, textAlign: "center" }}>
        <a
          href="/?page=signup"
          style={{
            display: "inline-block",
            padding: "12px 32px",
            background: "#00D17A",
            color: "#020304",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Create Account to Compare & Track →
        </a>
      </div>
    </main>
  );
}
