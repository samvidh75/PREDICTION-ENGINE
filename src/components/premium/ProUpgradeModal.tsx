import { useState } from "react";
import { X } from "lucide-react";

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  symbol?: string;
  source?: string; // healthometer, scanner, watchlist
}

export default function ProUpgradeModal({
  open,
  onClose,
  symbol = "TCS",
  source = "stock_page",
}: ProUpgradeModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotifyMe = async () => {
    if (!email || !email.includes("@")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/leads/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: `${source}_waitlist`,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setEmail("");
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (error) {
      // silently fail
    }
    setLoading(false);
  };

  const handleGetPro = async () => {
    // Redirect to checkout or payment page
    // For now, just close the modal
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: 999,
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1000,
          width: "90%",
          maxWidth: 520,
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.04)",
          padding: 32,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: 4,
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>✦</div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 12px",
            }}
          >
            StockStory Pro
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 380,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            The research edge every serious Indian investor needs.
          </p>
        </div>

        {!submitted ? (
          <>
            {/* Features list */}
            <div
              style={{
                background: "var(--brand-light)",
                border: "1px solid #C7D9F8",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                Everything in Free, plus:
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {[
                  {
                    title: "Deep score analysis per stock",
                    desc: "Why 72? What's dragging it down?",
                  },
                  {
                    title: "Sector-relative PE context",
                    desc: "Is TCS expensive vs IT peers?",
                  },
                  {
                    title: "Score change alerts",
                    desc: "Know when a thesis shifts",
                  },
                  {
                    title: "Unlimited scanner results",
                    desc: "50+ stocks, all presets",
                  },
                  {
                    title: "Portfolio thesis monitor",
                    desc: "Track all your theses at once",
                  },
                ].map((feature, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      marginBottom: i < 4 ? 12 : 0,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--green)",
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      ✓
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {feature.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginTop: 2,
                        }}
                      >
                        {feature.desc}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                ₹299<span style={{ fontSize: 18, fontWeight: 600 }}> / month</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 6,
                }}
              >
                or ₹2,499 / year (save 30%)
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleGetPro}
              disabled={loading}
              style={{
                width: "100%",
                height: 48,
                background: "var(--brand)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                marginBottom: 20,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Processing..." : "Get Pro — ₹299/mo"}
            </button>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "24px 0",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                or
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            {/* Waitlist */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                Join the waitlist (free — founding member pricing):
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                  }}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleNotifyMe()
                  }
                />
                <button
                  onClick={handleNotifyMe}
                  disabled={loading || !email}
                  style={{
                    padding: "12px 20px",
                    background: "var(--brand)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading || !email ? "default" : "pointer",
                    opacity: loading || !email ? 0.6 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? "..." : "Notify me"}
                </button>
              </div>
            </div>

            {/* Footer text */}
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              Secure · Cancel anytime · Indian pricing
            </div>
          </>
        ) : (
          /* Success state */
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--green)",
                margin: "0 0 8px",
              }}
            >
              You're on the list!
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              We'll notify you as soon as Pro is available.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
