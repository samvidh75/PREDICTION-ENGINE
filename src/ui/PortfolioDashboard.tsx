import { colors, typography, radius } from "../design/tokens";

interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  ltp: number;
  dayChangePct: number;
  totalReturnPct: number;
  pnl: number;
  weight: number;
}

interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePct: number;
  totalReturn: number;
  totalReturnPct: number;
  invested: number;
  holdings: PortfolioHolding[];
}

export function PortfolioDashboard({ summary }: { summary: PortfolioSummary }) {
  const isPositive = summary.dayChange >= 0;

  return (
    <div style={{
      background: colors.surface,
      borderRadius: radius.xl,
      padding: "24px",
      border: `1px solid ${colors.hairline}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <div style={{ fontSize: typography.captionSm.size, color: colors.mute, textTransform: "uppercase", marginBottom: "4px" }}>
            Portfolio Value
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: colors.ink, lineHeight: 1.1 }}>
            ₱{summary.totalValue.toLocaleString("en-PH")}
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
            <span style={{ color: isPositive ? colors.marketGreen : colors.marketRed, fontSize: typography.bodyMd.size }}>
              {isPositive ? "+" : ""}{summary.dayChangePct.toFixed(2)}% today
            </span>
            <span style={{ color: colors.mute, fontSize: typography.bodyMd.size }}>
              Invested: ₱{summary.invested.toLocaleString("en-PH")}
            </span>
          </div>
        </div>
        <div style={{
          background: isPositive ? colors.marketGreenSoft : colors.marketRedSoft,
          color: isPositive ? colors.marketGreen : colors.marketRed,
          padding: "8px 16px",
          borderRadius: radius.md,
          fontWeight: 600,
          fontSize: typography.bodyMd.size,
        }}>
          {isPositive ? "+" : ""}₱{summary.dayChange.toLocaleString("en-PH")}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "24px",
        padding: "16px",
        background: colors.canvas,
        borderRadius: radius.md,
      }}>
        {[
          { label: "Total Return", value: `${summary.totalReturnPct >= 0 ? "+" : ""}${summary.totalReturnPct.toFixed(1)}%`, color: summary.totalReturnPct >= 0 ? colors.marketGreen : colors.marketRed },
          { label: "Day Change", value: `${summary.dayChangePct >= 0 ? "+" : ""}${summary.dayChangePct.toFixed(2)}%`, color: isPositive ? colors.marketGreen : colors.marketRed },
          { label: "Holdings", value: String(summary.holdings.length), color: colors.body },
          { label: "Concentration", value: summary.holdings.length > 0 ? `${Math.max(...summary.holdings.map(h => h.weight)).toFixed(1)}%` : "0%", color: colors.mute },
        ].map(stat => (
          <div key={stat.label}>
            <div style={{ fontSize: typography.captionSm.size, color: colors.mute, marginBottom: "4px" }}>{stat.label}</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ fontSize: typography.captionSm.size, color: colors.mute, textTransform: "uppercase" }}>
            {["Symbol", "Quantity", "Avg Price", "LTP", "Day Change", "Return", "P&L", "Weight"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${colors.hairline}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.holdings.map(h => {
            const holdingPositive = h.dayChangePct >= 0;
            return (
              <tr key={h.symbol} style={{ fontSize: typography.bodyMd.size, color: colors.body, borderBottom: `1px solid ${colors.hairline}` }}>
                <td style={{ padding: "12px", fontWeight: 600, color: colors.ink }}>{h.symbol}</td>
                <td style={{ padding: "12px" }}>{h.quantity}</td>
                <td style={{ padding: "12px" }}>₱{h.avgPrice.toFixed(2)}</td>
                <td style={{ padding: "12px", color: holdingPositive ? colors.marketGreen : colors.marketRed }}>₱{h.ltp.toFixed(2)}</td>
                <td style={{ padding: "12px", color: holdingPositive ? colors.marketGreen : colors.marketRed }}>
                  {holdingPositive ? "+" : ""}{h.dayChangePct.toFixed(2)}%
                </td>
                <td style={{ padding: "12px", color: h.totalReturnPct >= 0 ? colors.marketGreen : colors.marketRed }}>
                  {h.totalReturnPct >= 0 ? "+" : ""}{h.totalReturnPct.toFixed(1)}%
                </td>
                <td style={{ padding: "12px", fontWeight: 600, color: h.pnl >= 0 ? colors.marketGreen : colors.marketRed }}>
                  ₱{Math.abs(h.pnl).toLocaleString("en-PH")}
                </td>
                <td style={{ padding: "12px" }}>{h.weight.toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
