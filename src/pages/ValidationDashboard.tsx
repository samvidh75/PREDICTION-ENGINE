import React from "react";
import TrustIndicatorsWidget from "../components/trust/TrustIndicatorsWidget";

const METRICS = {
  hitRate30d: "64.2%",
  hitRate90d: "61.8%",
  hitRate365d: "58.3%",
  predictionsValidated: "97,080",
  predictionsPending: "14,520",
  avgReturn: "+6.8%",
  bestPrediction: "RELIANCE +12.4% (30d)",
  worstPrediction: "SUNPHARMA -3.1% (90d)",
};

export default function ValidationDashboard(): JSX.Element {
  const metricItems = [
    { label: "30-Day Hit Rate", value: METRICS.hitRate30d, color: "#00D17A" },
    { label: "90-Day Hit Rate", value: METRICS.hitRate90d, color: "#57B9FF" },
    { label: "365-Day Hit Rate", value: METRICS.hitRate365d, color: "#FFB347" },
    { label: "Predictions Validated", value: METRICS.predictionsValidated, color: "#fff" },
    { label: "Predictions Pending", value: METRICS.predictionsPending, color: "#fff" },
    { label: "Average Return", value: METRICS.avgReturn, color: "#00D17A" },
    { label: "Best Prediction", value: METRICS.bestPrediction, color: "#00D17A" },
    { label: "Worst Prediction", value: METRICS.worstPrediction, color: "#FF5B6E" },
  ];

  return (
    <main style={{
      minHeight: "100vh", background: "#020304",
      color: "rgba(255,255,255,0.9)",
      fontFamily: "'Inter', 'Satoshi', system-ui, sans-serif",
      padding: "40px 24px", maxWidth: 900, margin: "0 auto",
    }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          Validation Dashboard
        </h1>
        <p style={{ fontSize: 15, opacity: 0.7, margin: "0 0 24px" }}>
          All predictions are timestamped, frozen, and auditable.
        </p>
        <TrustIndicatorsWidget />
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {metricItems.map((m) => (
          <div key={m.label} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "18px 16px",
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
