import { useState } from "react";
import { Card, CardLabel } from "../ui/Card";
import { colors, radius } from "../design/tokens";
import { getBoardLotSize, calculateTransactionCosts } from "../utils/pseBoardLot";

/**
 * Research-only order-cost simulator — shows PSE board lot rules and an
 * estimated fee breakdown (PSE fee, SCCP fee, stock transaction tax, and a
 * typical broker commission) for a hypothetical order. This does not place
 * trades; it's for sizing/cost-awareness while researching a name.
 */
export function OrderSimulator({ symbol, price }: { symbol: string; price: number }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [lots, setLots] = useState(1);

  const lotSize = getBoardLotSize(price);
  const shares = lots * lotSize;
  const costs = calculateTransactionCosts(shares, price, side);

  return (
    <Card variant="elevated" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <CardLabel>Order Cost Estimate</CardLabel>
        <div style={{ display: "flex", gap: 4 }}>
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                padding: "6px 14px", borderRadius: radius.full, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                background: side === s ? (s === "buy" ? colors.success : colors.danger) : "transparent",
                color: side === s ? colors.onPrimary ?? "#000" : colors.textSecondary,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: colors.textSecondary }}>
          Board lot for {symbol}: <strong style={{ color: colors.textPrimary }}>{lotSize.toLocaleString()}</strong> shares
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <button
            aria-label="Fewer lots"
            onClick={() => setLots((n) => Math.max(1, n - 1))}
            style={{ width: 28, height: 28, borderRadius: radius.md, border: `1px solid ${colors.border}`, background: "transparent", color: colors.textPrimary, cursor: "pointer" }}
          >
            −
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, minWidth: 90, textAlign: "center" }}>
            {lots} lot{lots !== 1 ? "s" : ""} · {shares.toLocaleString()} sh
          </span>
          <button
            aria-label="More lots"
            onClick={() => setLots((n) => n + 1)}
            style={{ width: 28, height: 28, borderRadius: radius.md, border: `1px solid ${colors.border}`, background: "transparent", color: colors.textPrimary, cursor: "pointer" }}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
        <Row label="Gross amount" value={costs.grossAmount} />
        <Row label="Broker commission (est., 0.25%)" value={costs.commission} muted />
        <Row label="VAT on commission (12%)" value={costs.vatOnCommission} muted />
        <Row label="PSE transaction fee" value={costs.pseFee} muted />
        <Row label="SCCP fee" value={costs.sccpFee} muted />
        {side === "sell" && <Row label="Stock transaction tax (0.6%)" value={costs.stockTransactionTax} muted />}
        <div style={{ height: 1, background: colors.border, margin: "4px 0" }} />
        <Row label={side === "buy" ? "Total cost" : "Net proceeds"} value={costs.netAmount} bold />
      </div>

      <p style={{ fontSize: 11, color: colors.textSecondary, marginTop: 14, lineHeight: 1.5 }}>
        Estimate only — actual broker commission and minimums vary by broker. Board lot and fee
        rates follow the PSE's published tables and may change; not a trade execution.
      </p>
    </Card>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: number; muted?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: muted ? colors.textSecondary : colors.textPrimary, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ color: muted ? colors.textSecondary : colors.textPrimary, fontWeight: bold ? 700 : 500, fontFamily: "monospace" }}>
        ₱{value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
