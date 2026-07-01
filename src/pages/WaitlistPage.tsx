import { useState, type FormEvent } from "react";
import { colors, typography, space, radius, components, shadows } from "../design/tokens";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) throw new Error("Failed to join waitlist");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={headingStyle}>You're on the list!</h1>
          <p style={textStyle}>
            We'll notify you at <strong>{email}</strong> when it's your turn.
            In the meantime, you can explore the app — some features are already
            available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Join the Private Beta</h1>
        <p style={textStyle}>
          StockEX India is currently in private beta. Leave your email to
          get early access and be notified when we open to more users.
        </p>
        <form onSubmit={handleSubmit} style={formStyle}>
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          {error && <p style={{ color: colors.danger, fontSize: "14px" }}>{error}</p>}
          <button type="submit" style={buttonStyle}>
            Join Waitlist
          </button>
        </form>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  paddingTop: "64px",
};

const cardStyle: React.CSSProperties = {
  maxWidth: "440px",
  width: "100%",
  padding: space[8],
  borderRadius: radius.xl,
  background: colors.card,
  boxShadow: shadows.card,
};

const headingStyle: React.CSSProperties = {
  fontSize: typography.h2.desktop.size,
  fontWeight: 700,
  lineHeight: typography.h2.desktop.line,
  marginBottom: space[4],
};

const textStyle: React.CSSProperties = {
  fontSize: typography.body.desktop.size,
  lineHeight: typography.body.desktop.line,
  color: colors.textSecondary,
  marginBottom: space[6],
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space[4],
};

const inputStyle: React.CSSProperties = {
  padding: `${space[3]} ${space[4]}`,
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  fontSize: typography.body.desktop.size,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: `${space[3]} ${space[6]}`,
  borderRadius: radius.md,
  border: "none",
  background: colors.primary,
  color: colors.onPrimary,
  fontSize: typography.body.desktop.size,
  fontWeight: 600,
  cursor: "pointer",
};
