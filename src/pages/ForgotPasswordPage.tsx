import { useState, useEffect } from "react";
import { authService } from "../services/auth/authService";

type Stage = "email" | "sent" | "error";

export default function ForgotPasswordPage() {
  useEffect(() => {
    document.title = "Reset Password — StockStory India";
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", "Reset your StockStory India account password.");
  }, []);

  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.sendPasswordReset(email);
      setStage("sent");
    } catch (err: any) {
      setError(err?.message || err?.code || "Something went wrong. Try again.");
      setStage("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--page)", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 400,
        background: "var(--surface)", borderRadius: "var(--r-xl)",
        border: "1px solid var(--border)", padding: 40,
        boxShadow: "var(--sh-float)",
      }}>
        <a
          href="/login"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "var(--sz-sm)", color: "var(--text-300)",
            textDecoration: "none", marginBottom: 24,
          }}
        >
          &larr; Back to sign in
        </a>

        {stage === "sent" ? (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "var(--green-tint)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 24, marginBottom: 16, color: "var(--green)",
            }}>
              &#9993;
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-900)", margin: "0 0 8px" }}>
              Check your email
            </h1>
            <p style={{ fontSize: "var(--sz-sm)", color: "var(--text-400)", lineHeight: 1.6, margin: "0 0 24px" }}>
              We sent a password reset link to <strong style={{ color: "var(--text-900)" }}>{email}</strong>.
              Click the link in the email to reset your password.
            </p>
            <button
              onClick={() => { setStage("email"); setEmail(""); }}
              style={{
                width: "100%", padding: "12px 20px", fontSize: "var(--sz-sm)", fontWeight: 600,
                background: "var(--text-900)", color: "var(--text-inverse)",
                border: "none", borderRadius: "var(--r-lg)", cursor: "pointer",
              }}
            >
              Resend reset link
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-900)", margin: "0 0 4px" }}>
              Reset your password
            </h1>
            <p style={{ fontSize: "var(--sz-sm)", color: "var(--text-400)", margin: "0 0 24px", lineHeight: 1.5 }}>
              Enter the email address linked to your account and we'll send you a password reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", fontSize: "var(--sz-xs)", fontWeight: 600, color: "var(--text-500)", marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                style={{
                  width: "100%", padding: "12px 14px",
                  fontSize: "var(--sz-sm)", fontFamily: "var(--font)",
                  border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
                  borderRadius: "var(--r-lg)", outline: "none",
                  background: "var(--page)", color: "var(--text-900)",
                  boxSizing: "border-box", marginBottom: error ? 8 : 20,
                  transition: "border-color var(--t-instant)",
                }}
              />

              {error && (
                <div style={{
                  fontSize: "var(--sz-xs)", color: "var(--red)",
                  display: "flex", alignItems: "center", gap: 6,
                  marginBottom: 16,
                }}>
                  <span>&#9888;</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: "100%", padding: "12px 20px",
                  fontSize: "var(--sz-sm)", fontWeight: 600,
                  background: loading || !email ? "var(--text-200)" : "var(--text-900)",
                  color: loading || !email ? "var(--text-400)" : "var(--text-inverse)",
                  border: "none", borderRadius: "var(--r-lg)", cursor: loading || !email ? "default" : "pointer",
                  transition: "all var(--t-instant)",
                }}
              >
                {loading ? "Sending\u2026" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
