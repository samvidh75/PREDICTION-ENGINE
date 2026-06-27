import { AlertCircle } from "lucide-react";
import { colors } from "../design/tokens";

export function SEBIComplianceBanner() {
  return (
    <div
      style={{
        padding: "16px",
        background: "rgba(255,149,0,0.08)",
        border: `1px solid ${colors.warning}`,
        borderRadius: "10px",
        display: "flex",
        gap: "12px",
        marginBottom: "24px",
        fontSize: "13px",
        color: colors.textPrimary,
        lineHeight: "1.5",
      }}
    >
      <AlertCircle size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: "2px" }} />
      <div>
        <strong>Disclaimer:</strong> StockStory India is not SEBI-registered. This analysis is for educational purposes only, not investment advice. All ratings are algorithmic assessments based on financial metrics. Consult a licensed investment advisor before making investment decisions.
      </div>
    </div>
  );
}
