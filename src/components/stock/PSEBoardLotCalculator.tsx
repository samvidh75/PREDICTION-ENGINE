import { useState } from "react";
import { Card, CardLabel } from "../../ui/Card";
import { colors, radius } from "../../design/tokens";
import { getBoardLotSize, getTickSize, calculateTransactionCosts } from "../../utils/pseBoardLot";
import { formatPHP } from "../../utils/currencyFormatter";

/**
 * PSE Board Lot Calculator — Interactive tool showing PSE board lot
 * rules, tick sizes, and estimated transaction costs for any price.
 * Follows the official PSE board lot table and fee structure.
 */
export function PSEBoardLotCalculator() {
  const [price, setPrice] = useState<number>(50);
  const [shares, setShares] = useState<number>(100);
  const [side, setSide] = useState<"buy" | "sell">("buy");

  const lotSize = getBoardLotSize(price);
  const tickSize = getTickSize(price);
  const adjustedShares = Math.floor(shares / lotSize) * lotSize;
  const costs = calculateTransactionCosts(adjustedShares, price, side);

  const handlePriceChange = (value: string) => {
    const p = parseFloat(value);
    if (!isNaN(p) && p > 0) {
      setPrice(p);
      const newLot = getBoardLotSize(p);
      setShares(Math.floor(shares / newLot) * newLot || newLot);
    }
  };

  const handleSharesChange = (value: string) => {
    const s = parseInt(value, 10);
    if (!isNaN(s) && s > 0) {
      setShares(Math.floor(s / lotSize) * lotSize || lotSize);
    }
  };

  return (
    <Card variant="elevated" style={{ padding: 20 }}>
      <CardLabel>PSE Board Lot Calculator</CardLabel>

      {/* Price input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: colors.stone, display: "block", marginBottom: 4 }}>
          Stock Price (₱)
        </label>
        <input
          type="number"
          value={price}
          onChange={(e) => handlePriceChange(e.target.value)}
          step="0.01" min="0.01"
          style={inputStyle}
        />
      </div>

      {/* Side toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              padding: "6px 16px", borderRadius: radius.full, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, textTransform: "capitalize",
              background: side === s ? (s === "buy" ? colors.marketGreen : colors.marketRed) : "transparent",
              color: side === s ? "#000" : colors.textSecondary,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Board lot info */}
      <div style={{
        padding: "10px 12px", borderRadius: radius.sm,
        background: "rgba(255,255,255,0.03)", marginBottom: 16,
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
          Board Lot: <strong style={{ color: colors.textPrimary }}>{lotSize.toLocaleString()}</strong> shares/lot
        </div>
        <div style={{ fontSize: 12, color: colors.textSecondary }}>
          Tick Size: <strong style={{ color: colors.textPrimary }}>₱{tickSize.toFixed(4)}</strong>
          <span style={{ fontSize: 10, color: colors.stone, marginLeft: 8 }}>
            (price tier: ₱{price.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Shares input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: colors.stone, display: "block", marginBottom: 4 }}>
          Shares (adjusted to {lotSize.toLocaleString()}-share lots)
        </label>
        <input
          type="number"
          value={adjustedShares}
          onChange={(e) => handleSharesChange(e.target.value)}
          step={lotSize} min={lotSize}
          style={inputStyle}
        />
      </div>

      {/* Fee breakdown */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: radius.sm, padding: "12px 14px" }}>
        <div style={{ fontSize: 11, color: colors.stone, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Fee Breakdown
        </div>
        <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
          <Row label="Gross amount" value={costs.grossAmount} />
          <Row label="Broker commission (0.25%)" value={costs.commission} muted />
          <Row label="VAT on commission (12%)" value={costs.vatOnCommission} muted />
          <Row label="PSE transaction fee" value={costs.pseFee} muted />
          <Row label="SCCP clearing fee" value={costs.sccpFee} muted />
          {side === "sell" && <Row label="Stock transaction tax (0.6%)" value={costs.stockTransactionTax} muted />}
          <div style={{ height: 1, background: colors.border, margin: "4px 0" }} />
          <Row label={side === "buy" ? "Total cost" : "Net proceeds"} value={costs.netAmount} bold />
        </div>
      </div>

      <p style={{ fontSize: 10, color: colors.stone, marginTop: 12, lineHeight: 1.5 }}>
        Board lot and tick sizes follow the official PSE table. Commission rates are estimates.
      </p>
    </Card>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: number; muted?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: muted ? colors.stone : colors.textSecondary, fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ color: muted ? colors.stone : colors.textPrimary, fontWeight: bold ? 600 : 500, fontFamily: "monospace" }}>
        {formatPHP(value)}
      </span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: 13, fontFamily: "monospace",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: radius.sm,
  background: "rgba(255,255,255,0.03)", color: "#FFF", outline: "none",
  boxSizing: "border-box",
};