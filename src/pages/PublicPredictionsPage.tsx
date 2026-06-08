import React, { useEffect, useState } from "react";

interface PredictionRow {
  symbol: string;
  rankingScore: number;
  classification: string;
  confidenceScore: number;
  horizon: number;
}

const MOCK_PREDICTIONS: PredictionRow[] = [
  { symbol: "RELIANCE", rankingScore: 87, classification: "Strong Buy", confidenceScore: 82, horizon: 30 },
  { symbol: "TCS", rankingScore: 78, classification: "Buy", confidenceScore: 75, horizon: 30 },
  { symbol: "INFY", rankingScore: 72, classification: "Buy", confidenceScore: 71, horizon: 30 },
  { symbol: "HDFCBANK", rankingScore: 85, classification: "Strong Buy", confidenceScore: 80, horizon: 30 },
  { symbol: "ICICIBANK", rankingScore: 80, classification: "Buy", confidenceScore: 77, horizon: 30 },
  { symbol: "BHARTIARTL", rankingScore: 74, classification: "Buy", confidenceScore: 72, horizon: 30 },
  { symbol: "LT", rankingScore: 71, classification: "Buy", confidenceScore: 69, horizon: 30 },
  { symbol: "SUNPHARMA", rankingScore: 68, classification: "Hold", confidenceScore: 65, horizon: 30 },
  { symbol: "TITAN", rankingScore: 66, classification: "Hold", confidenceScore: 62, horizon: 30 },
  { symbol: "MARUTI", rankingScore: 75, classification: "Buy", confidenceScore: 73, horizon: 30 },
];

export default function PublicPredictionsPage(): JSX.Element {
  const [predictions, setPredictions] = useState<PredictionRow[]>(MOCK_PREDICTIONS);

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
          Today's Top Predictions
        </h1>
        <p style={{ fontSize: 15, opacity: 0.7, margin: 0 }}>
          124 symbols analyzed. 372 predictions generated today at 06:00 IST.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {predictions.map((p) => (
          <div key={p.symbol} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, minWidth: 100 }}>
              {p.symbol}
            </div>
            <div style={{
              background: p.classification === "Strong Buy" ? "rgba(0,209,122,0.15)" :
                p.classification === "Buy" ? "rgba(87,185,255,0.15)" : "rgba(255,179,71,0.15)",
              color: p.classification === "Strong Buy" ? "#00D17A" :
                p.classification === "Buy" ? "#57B9FF" : "#FFB347",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {p.classification}
            </div>
            <div style={{ fontSize: 13, opacity: 0.6 }}>
              Score: {p.rankingScore}
            </div>
            <div style={{ fontSize: 13, opacity: 0.6 }}>
              Confidence: {p.confidenceScore}%
            </div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>
              {p.horizon}d horizon
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
          Sign Up to See Full Rankings →
        </a>
      </div>
    </main>
  );
}
