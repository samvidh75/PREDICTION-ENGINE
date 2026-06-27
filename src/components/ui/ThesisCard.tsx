import { useState } from "react";
import { Bookmark, Edit3, Check, X } from "lucide-react";

interface ThesisCardProps {
  symbol: string;
  companyName?: string;
}

export default function ThesisCard({ symbol, companyName }: ThesisCardProps) {
  const [note, setNote] = useState(() => {
    try { return localStorage.getItem(`thesis_${symbol}`) || ""; }
    catch { return ""; }
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);

  const save = () => {
    setNote(draft);
    try { localStorage.setItem(`thesis_${symbol}`, draft); } catch {/* silent */}
    setEditing(false);
  };

  const cancel = () => {
    setDraft(note);
    setEditing(false);
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Bookmark size={15} style={{ color: "var(--action)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          My Thesis
        </span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Edit3 size={12} />
            {note ? "Edit" : "Add note"}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Why are you watching ${symbol}?\n\nE.g., "Strong Q3 results, expanding margins, and positive sector tailwinds..."`}
            style={{
              width: "100%",
              minHeight: 80,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={save}
              style={{
                height: 32,
                padding: "0 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--action)",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Check size={13} /> Save
            </button>
            <button
              onClick={cancel}
              style={{
                height: 32,
                padding: "0 16px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : note ? (
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
          {note}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
          Save your research notes and investment thesis for {companyName || symbol}. Tap "Add note" to start.
        </p>
      )}
    </div>
  );
}
