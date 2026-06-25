import { useState } from "react";

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  symbol?: string;
  source?: string;
}

const FEATURES = [
  { title: "Deep score analysis", desc: "Understand what drives each stock's health score — factor by factor" },
  { title: "Sector-relative context", desc: "See PE, growth, and margins in context of industry peers" },
  { title: "Score change alerts", desc: "Get notified when a stock's thesis shifts" },
  { title: "Unlimited scanner results", desc: "Browse all 500+ stocks across every preset filter" },
  { title: "Portfolio thesis monitor", desc: "Track all your investments and research in one place" },
  { title: "Fair value estimates", desc: "DCF-based intrinsic value ranges for informed decisions" },
];

export default function ProUpgradeModal({ open, onClose, symbol, source = "stock_page" }: ProUpgradeModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleNotify = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      await fetch("/api/leads/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: `${source}_waitlist` }),
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {}
    setLoading(false);
  };

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(15, 23, 42, 0.5)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", zIndex: 1000,
          width: "90%", maxWidth: 440,
          background: "var(--surface)",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border)",
          boxShadow: "var(--sh-float)",
          padding: 32, fontFamily: "var(--font)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "var(--page)", border: "none",
            borderRadius: "50%", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16, color: "var(--text-300)",
            fontFamily: "var(--font)",
          }}
          aria-label="Close"
        >
          &times;
        </button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "var(--r-lg)",
            background: "var(--text-900)", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            marginBottom: 16, fontSize: 20, fontWeight: 800,
            color: "var(--text-inverse)",
          }}>
            S
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-900)", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
            {submitted ? "You're on the list" : "Upgrade to Pro"}
          </h2>
          <p style={{ fontSize: "var(--sz-sm)", color: "var(--text-500)", margin: 0, lineHeight: 1.6 }}>
            {submitted
              ? "We'll email you as soon as Pro is ready."
              : "The research edge every serious Indian investor needs."}
          </p>
        </div>

        {submitted ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => { setSubmitted(false); setEmail(""); }}
              style={{
                padding: "10px 24px", fontSize: "var(--sz-sm)", fontWeight: 600,
                background: "var(--text-900)", color: "var(--text-inverse)",
                border: "none", borderRadius: "var(--r-lg)", cursor: "pointer",
              }}
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>&#10003;</span>
                  <div>
                    <div style={{ fontSize: "var(--sz-sm)", fontWeight: 600, color: "var(--text-900)" }}>{f.title}</div>
                    <div style={{ fontSize: "var(--sz-xs)", color: "var(--text-500)", marginTop: 1 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--text-900)", letterSpacing: "-0.02em" }}>
                &#x20B9;299<span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-500)" }}> / month</span>
              </div>
              <div style={{ fontSize: "var(--sz-xs)", color: "var(--text-500)", marginTop: 4 }}>
                &#x20B9;2,499 / year (save 30%)
              </div>
            </div>

            <button
              onClick={() => onClose()}
              style={{
                width: "100%", height: 44,
                background: "var(--brand)", color: "var(--text-inverse)",
                border: "none", borderRadius: "var(--r-md)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font)", marginBottom: 16,
              }}
            >
              Get Pro &#x2014; &#x20B9;299/mo
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: "var(--sz-xs)", color: "var(--text-300)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <div>
              <div style={{ fontSize: "var(--sz-xs)", color: "var(--text-500)", textAlign: "center", marginBottom: 8 }}>
                Join the waitlist for founding member pricing
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email" placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNotify()}
                  style={{
                    flex: 1, height: 44, padding: "0 14px",
                    border: "1px solid var(--border)", borderRadius: "var(--r-md)",
                    fontSize: 15, fontFamily: "var(--font)",
                    outline: "none", background: "var(--surface)", color: "var(--text-900)",
                  }}
                />
                <button
                  onClick={handleNotify}
                  disabled={loading || !email.includes("@")}
                  style={{
                    height: 44, padding: "0 20px",
                    background: loading || !email.includes("@") ? "var(--text-300)" : "var(--text-900)",
                    color: "var(--text-inverse)",
                    border: "none", borderRadius: "var(--r-md)",
                    fontSize: 14, fontWeight: 600,
                    cursor: loading || !email.includes("@") ? "default" : "pointer",
                    fontFamily: "var(--font)", opacity: loading || !email.includes("@") ? 0.5 : 1,
                  }}
                >
                  {loading ? "Sending\u2026" : "Notify me"}
                </button>
              </div>
            </div>

            <div style={{ fontSize: "var(--sz-xs)", color: "var(--text-300)", textAlign: "center", marginTop: 16 }}>
              Secure &middot; Cancel anytime &middot; Indian pricing
            </div>
          </>
        )}
      </div>
    </>
  );
}
