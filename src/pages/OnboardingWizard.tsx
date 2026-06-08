/**
 * TRACK-90 Phase 1 — Guided Onboarding Wizard
 * 4-step sequence: investing style → sectors → watchlist stock → alerts
 * Stores completion status in localStorage.
 */
import React, { useState } from "react";

type Step = "style" | "sectors" | "watchlist" | "alerts" | "done";

interface OnboardingState {
  style: string;
  sectors: string[];
  watchlistSymbols: string[];
  alertsEnabled: boolean;
}

const STYLES = [
  { id: "conservative", label: "Conservative", icon: "🛡️", desc: "Steady growth, lower risk" },
  { id: "balanced", label: "Balanced", icon: "⚖️", desc: "Mix of growth and safety" },
  { id: "aggressive", label: "Aggressive", icon: "🚀", desc: "High growth potential" },
];

const SECTORS = [
  "Banking", "IT", "Pharma", "FMCG", "Auto", "Energy", "Infrastructure", "Telecom", "Consumer",
];

const POPULAR_STOCKS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "BHARTIARTL", "LT", "SUNPHARMA", "TITAN", "MARUTI",
];

export default function OnboardingWizard({ onComplete }: { onComplete?: () => void }): JSX.Element {
  const [step, setStep] = useState<Step>("style");
  const [state, setState] = useState<OnboardingState>({
    style: "",
    sectors: [],
    watchlistSymbols: [],
    alertsEnabled: false,
  });

  const complete = () => {
    const final = { ...state, completedAt: new Date().toISOString() };
    localStorage.setItem("ss_onboarding", JSON.stringify(final));
    setStep("done");
    onComplete?.();
  };

  const renderStyleStep = () => (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        What's your investing style?
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => { setState({ ...state, style: s.id }); setStep("sectors"); }}
            style={{
              background: state.style === s.id ? "rgba(0,209,122,0.12)" : "rgba(255,255,255,0.03)",
              border: state.style === s.id ? "1px solid #00D17A" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "16px 20px", textAlign: "left",
              color: "#fff", cursor: "pointer", fontSize: 15,
            }}
          >
            <div>{s.icon} <strong>{s.label}</strong></div>
            <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>{s.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderSectorsStep = () => (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Select favourite sectors
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SECTORS.map((s) => {
          const active = state.sectors.includes(s);
          return (
            <button
              key={s}
              onClick={() => {
                const next = active
                  ? state.sectors.filter((x) => x !== s)
                  : [...state.sectors, s];
                setState({ ...state, sectors: next });
              }}
              style={{
                background: active ? "rgba(0,209,122,0.12)" : "rgba(255,255,255,0.03)",
                border: active ? "1px solid #00D17A" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, padding: "8px 18px", color: "#fff", cursor: "pointer", fontSize: 13,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setStep("watchlist")}
        style={{
          marginTop: 20, padding: "10px 28px",
          background: "#00D17A", color: "#000", border: "none",
          borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}
      >
        Continue →
      </button>
    </div>
  );

  const renderWatchlistStep = () => (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Add your first stock
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {POPULAR_STOCKS.map((s) => {
          const active = state.watchlistSymbols.includes(s);
          return (
            <button
              key={s}
              onClick={() => {
                const next = active
                  ? state.watchlistSymbols.filter((x) => x !== s)
                  : [...state.watchlistSymbols, s];
                setState({ ...state, watchlistSymbols: next });
              }}
              style={{
                background: active ? "rgba(0,209,122,0.12)" : "rgba(255,255,255,0.03)",
                border: active ? "1px solid #00D17A" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "10px 16px", color: "#fff", cursor: "pointer", fontSize: 14,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setStep("alerts")}
        style={{
          marginTop: 20, padding: "10px 28px",
          background: state.watchlistSymbols.length > 0 ? "#00D17A" : "rgba(255,255,255,0.1)",
          color: state.watchlistSymbols.length > 0 ? "#000" : "rgba(255,255,255,0.3)",
          border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}
        disabled={state.watchlistSymbols.length === 0}
      >
        Continue →
      </button>
    </div>
  );

  const renderAlertsStep = () => (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Enable alerts?
      </h2>
      <p style={{ fontSize: 14, opacity: 0.6 }}>
        Get notified when predictions change for your watchlist stocks.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={() => { setState({ ...state, alertsEnabled: true }); complete(); }}
          style={{
            padding: "12px 28px", background: "#00D17A", color: "#000",
            border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          Yes, enable alerts
        </button>
        <button
          onClick={complete}
          style={{
            padding: "12px 28px", background: "rgba(255,255,255,0.05)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 14, cursor: "pointer",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );

  if (step === "done") {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ fontSize: 22, marginTop: 12 }}>You're all set!</h2>
        <p style={{ opacity: 0.6, fontSize: 14 }}>Head to Dashboard to see your first predictions.</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 560, margin: "0 auto",
      padding: "32px 20px",
      color: "rgba(255,255,255,0.9)",
      fontFamily: "'Inter', 'Satoshi', system-ui, sans-serif",
    }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {(["style", "sectors", "watchlist", "alerts"] as Step[]).map((s) => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: step === s || (["style","sectors","watchlist","alerts"].indexOf(step) > ["style","sectors","watchlist","alerts"].indexOf(s))
              ? "#00D17A" : "rgba(255,255,255,0.1)",
          }} />
        ))}
      </div>

      {step === "style" && renderStyleStep()}
      {step === "sectors" && renderSectorsStep()}
      {step === "watchlist" && renderWatchlistStep()}
      {step === "alerts" && renderAlertsStep()}
    </div>
  );
}
