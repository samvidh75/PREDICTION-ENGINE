import { useState, useEffect } from "react";
import { getConsent, setConsent } from "../lib/consent";
import { colors, typography, space, radius } from "../design/tokens";
import { Button } from "../ui/Button";

export default function PrivacyConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't made a choice
    if (getConsent() === "undecided") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div style={bannerStyle}>
      <p style={{ margin: 0, fontSize: typography.body.desktop.size, lineHeight: typography.body.desktop.line, flex: 1, color: colors.body }}>
        We use privacy-first analytics to improve the app. No personal data is collected.
        <a
          href="/privacy"
          aria-label="Learn more about our privacy policy"
          style={{ color: colors.primary, marginLeft: space[1], textDecoration: "underline" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more about our privacy policy
        </a>.
      </p>
      <div style={{ display: "flex", gap: space[2], flexShrink: 0 }}>
        <Button variant="secondary" size="sm" onClick={() => { setConsent("declined"); setVisible(false); }}>
          Decline
        </Button>
        <Button variant="primary" size="sm" onClick={() => { setConsent("accepted"); setVisible(false); }}>
          Accept
        </Button>
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
  gap: space[4],
  padding: `${space[3]} ${space[6]}`,
  background: colors.surface,
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  fontSize: typography.body.desktop.size,
  flexWrap: "wrap",
  fontFamily: typography.fontFamily,
};
