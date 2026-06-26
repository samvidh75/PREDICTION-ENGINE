import { useState, useEffect } from "react";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol?: string;
}

const FEATURES = [
  { icon: "\uD83D\uDD0D", text: "Deep analysis with strengths, weaknesses, watch-for items" },
  { icon: "\uD83D\uDCCA", text: "8 additional Pro metrics (ROIC, EV/EBITDA, D/E, MACD + more)" },
  { icon: "\uD83D\uDCC8", text: "Full financial history with YoY growth rates" },
  { icon: "\uD83D\uDCDC", text: "PDF export for every research report" },
  { icon: "\uD83D\uDD14", text: "Price alerts & score change notifications" },
  { icon: "\uD83E\uDDD0", text: "Unlimited stock comparison" },
];

export default function ProUpgradeModal({ isOpen, onClose, symbol }: ProUpgradeModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setSubmitted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setLoading(true);
    try {
      await fetch("/api/leads/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "pro-modal", symbol: symbol ?? null }),
      });
    } catch {
      // Lead capture best-effort
    }
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--sh-modal)",
          width: "100%", maxWidth: 480,
          padding: "32px 28px",
          position: "relative",
          maxHeight: "90vh", overflow: "auto",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32, borderRadius: "50%",
            border: "none", background: "var(--chip)",
            cursor: "pointer", fontSize: 16, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-500)",
          }}
        >
          {"\u2715"}
        </button>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u2709\uFE0F"}</div>
            <div style={{ fontSize: "var(--sz-xl)", fontWeight: 800, color: "var(--text-900)", marginBottom: 8 }}>
              You're on the list!
            </div>
            <p style={{ fontSize: "var(--sz-base)", color: "var(--text-500)", lineHeight: 1.6 }}>
              We'll notify you when Pro launches. Expect an exclusive launch offer.
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-900)",
              letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 8 }}>
              Unlock Pro
            </div>
            <p style={{ fontSize: "var(--sz-base)", color: "var(--text-500)", lineHeight: 1.55, marginBottom: 24 }}>
              Get deep research, 8 additional metrics, PDF exports, and more.
            </p>

            {/* Pricing */}
            <div style={{
              background: "linear-gradient(145deg, var(--brand-tint) 0%, #F5F0FF 100%)",
              border: "1px solid #C7D9F8",
              borderRadius: "var(--r-lg)",
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div>
                <div style={{ fontSize: "var(--sz-sm)", color: "var(--text-500)", fontWeight: 500 }}>
                  Early adopter pricing
                </div>
                <div style={{ fontSize: "var(--sz-2xl)", fontWeight: 800, color: "var(--text-900)",
                  letterSpacing: "-0.02em" }}>
                  {"\u20B9"}299<span style={{ fontSize: "var(--sz-base)", fontWeight: 500, color: "var(--text-500)" }}>/mo</span>
                </div>
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <span style={{
                  fontSize: "var(--sz-xs)", fontWeight: 700,
                  padding: "3px 10px", borderRadius: "var(--r-pill)",
                  background: "var(--amber-tint)", color: "var(--amber-text)",
                }}>
                  Launch offer
                </span>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ marginBottom: 24 }}>
              {FEATURES.map((feat, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  marginBottom: 10, fontSize: "var(--sz-sm)", color: "var(--text-500)",
                  lineHeight: 1.5,
                }}>
                  <span style={{ flexShrink: 0 }}>{feat.icon}</span>
                  <span>{feat.text}</span>
                </div>
              ))}
            </div>

            {/* Email input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                style={{
                  flex: 1, height: 44, padding: "0 14px",
                  fontSize: "var(--sz-base)", fontFamily: "var(--font)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  background: "var(--surface)",
                  color: "var(--text-900)",
                  outline: "none",
                }}
                onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px var(--brand-tint)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
                style={{
                  height: 44, padding: "0 22px",
                  background: loading ? "var(--text-300)" : "var(--brand)",
                  color: "var(--text-inverse)",
                  border: "none", borderRadius: "var(--r-md)",
                  fontSize: "var(--sz-sm)", fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--font)", whiteSpace: "nowrap",
                  opacity: !email.trim() ? 0.6 : 1,
                  transition: "background var(--t-instant)",
                }}
              >
                {loading ? "Sending..." : "Join waitlist \u2192"}
              </button>
            </div>
            <div style={{
              fontSize: "var(--sz-xs)", color: "var(--text-300)",
              textAlign: "center", marginTop: 16,
            }}>
              Cancel anytime \u00B7 Indian pricing \u00B7 Secure
            </div>
          </>
        )}
      </div>
    </div>
  );
}
