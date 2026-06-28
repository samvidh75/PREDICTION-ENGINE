import { getBetaConfig } from "../config/beta";
import { colors, space, typography } from "../design/tokens";

/**
 * Beta badge shown in the sidebar when the app is in a pre-release mode.
 */
export default function BetaBadge() {
  const { label, showBetaBadge } = getBetaConfig();

  if (!showBetaBadge) return null;

  return (
    <span style={badgeStyle}>
      {label}
    </span>
  );
}

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "2px 8px",
  borderRadius: "4px",
  background: "#ff9500",
  color: "#fff",
  marginLeft: space[2],
  verticalAlign: "middle",
};
