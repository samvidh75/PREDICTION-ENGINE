import { useState, useEffect } from "react";
import { hasConsented, setConsent } from "../lib/consent";

export default function PrivacyConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't made a choice
    if (hasConsented() === "undecided") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div style={bannerStyle}>
      <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", flex: 1 }}>
        We use privacy-first analytics to improve the app. No personal data is collected.
        <a
          href="/privacy"
          style={{ color: "inherit", marginLeft: "4px" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more
        </a>.
      </p>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button onClick={() => { setConsent("declined"); setVisible(false); }} style={secondaryBtnStyle}>
          Decline
        </button>
        <button onClick={() => { setConsent("accepted"); setVisible(false); }} style={primaryBtnStyle}>
          Accept
        </button>
      </div>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "0",
  left: "0",
  right: "0",
  zIndex: 999,
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "12px 24px",
  background: "#1c1c1e",
  color: "#f5f5f7",
  fontSize: "14px",
  flexWrap: "wrap",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#007aff",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "13px",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "transparent",
  color: "#f5f5f7",
  cursor: "pointer",
  fontSize: "13px",
};
