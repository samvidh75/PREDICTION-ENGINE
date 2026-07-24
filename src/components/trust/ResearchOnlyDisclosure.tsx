import { colors } from "../../design/tokens";

export function ResearchOnlyDisclosure() {
  return (
    <div style={{
      padding: "12px 16px",
      marginBottom: "32px",
      background: colors.fill,
      borderRadius: "8px",
      border: `1px solid ${colors.border}`,
      fontSize: "14px",
      color: colors.textSecondary,
      lineHeight: 1.7,
    }}>
      <strong style={{ color: colors.textPrimary }}>StockEX is a structured research analysis platform.</strong>
      <br />
      We provide scorecards, theses, risk assessments, scenario analysis, and peer comparisons for PSX equities.
      All outputs are for research — not investment advice. We do not make buy/sell/hold recommendations or set target prices.
    </div>
  );
}
