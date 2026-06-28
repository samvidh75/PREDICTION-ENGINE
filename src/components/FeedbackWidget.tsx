import { useState, type FormEvent } from "react";
import { colors, typography, space, radius } from "../design/tokens";
import type { FeedbackCategory } from "../config/feedback";

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "Bug Report" },
  { value: "feature-request", label: "Feature Request" },
  { value: "accuracy", label: "Accuracy Concern" },
  { value: "ux", label: "User Experience" },
  { value: "data-quality", label: "Data Quality" },
  { value: "other", label: "Other" },
];

interface FeedbackWidgetProps {
  onClose?: () => void;
}

export default function FeedbackWidget({ onClose }: FeedbackWidgetProps) {
  const [category, setCategory] = useState<FeedbackCategory>("other");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, body, pageUrl: window.location.href }),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      setSubmitted(true);
    } catch {
      setError("Could not submit feedback. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <h3 style={{ marginBottom: space[3] }}>Thank you!</h3>
          <p style={{ color: colors.textSecondary, marginBottom: space[4] }}>
            Your feedback helps us improve.
          </p>
          {onClose && (
            <button onClick={onClose} style={closeButtonStyle}>
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space[4] }}>
          <h3 style={{ margin: 0 }}>Send Feedback</h3>
          {onClose && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>
              ×
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
            style={selectStyle}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            required
            placeholder="Brief title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
          <textarea
            required
            rows={4}
            placeholder="Describe your feedback..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          {error && <p style={{ color: colors.danger, fontSize: "14px" }}>{error}</p>}
          <button type="submit" style={submitButtonStyle}>
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "24px",
  right: "24px",
  zIndex: 100,
};

const cardStyle: React.CSSProperties = {
  width: "360px",
  padding: space[5],
  borderRadius: radius.xl,
  background: colors.card,
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
};

const inputStyle: React.CSSProperties = {
  padding: `${space[2]} ${space[3]}`,
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  fontSize: typography.body.desktop.size,
  outline: "none",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const submitButtonStyle: React.CSSProperties = {
  padding: `${space[2]} ${space[5]}`,
  borderRadius: radius.md,
  border: "none",
  background: colors.primary,
  color: "#fff",
  fontSize: typography.body.desktop.size,
  fontWeight: 600,
  cursor: "pointer",
};

const closeButtonStyle: React.CSSProperties = {
  padding: `${space[2]} ${space[4]}`,
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  background: "transparent",
  cursor: "pointer",
};
