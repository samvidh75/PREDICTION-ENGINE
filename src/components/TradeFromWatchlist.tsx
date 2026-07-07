import { useCallback, useEffect, useState } from "react";
import { colors, space, radius, typography } from "../design/tokens";

interface BrokerConnection {
  id: string;
  broker: string;
  label: string;
  status: string;
}

interface TradeFormState {
  side: "BUY" | "SELL";
  quantity: number;
  orderType: "MARKET" | "LIMIT";
  price: string;
}

interface TradeFromWatchlistProps {
  symbol: string;
  exchange?: string;
  currentPrice: number;
}

export function TradeFromWatchlist({ symbol, exchange = "PSE", currentPrice }: TradeFromWatchlistProps) {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [selectedConn, setSelectedConn] = useState<string>("");
  const [form, setForm] = useState<TradeFormState>({ side: "BUY", quantity: 1, orderType: "MARKET", price: "" });
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/broker/connections")
      .then((r) => r.json())
      .then((d) => {
        const active: BrokerConnection[] = (d.connections ?? []).filter((c: BrokerConnection) => c.status === "active");
        setConnections(active);
        if (active.length > 0) setSelectedConn(active[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.orderType === "MARKET") {
      setForm((f) => ({ ...f, price: "" }));
    } else {
      setForm((f) => ({ ...f, price: String(currentPrice) }));
    }
  }, [form.orderType, currentPrice]);

  const handleTrade = useCallback(async () => {
    if (!selectedConn || form.quantity <= 0) return;
    setPlacing(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/broker/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: selectedConn,
          symbol,
          exchange,
          side: form.side,
          quantity: form.quantity,
          orderType: form.orderType,
          price: form.orderType === "LIMIT" ? Number(form.price) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`Order request sent to broker: ${data.orderId ?? "pending"}`);
      } else {
        setResult(`Failed: ${data.error ?? "Unknown error"}`);
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Request failed"}`);
    }
    setPlacing(false);
  }, [selectedConn, form, symbol, exchange]);

  if (connections.length === 0) return null;

  return (
    <div
      style={{
        background: colors.canvas,
        borderRadius: radius.md,
        padding: space[3],
        border: `1px solid ${colors.hairline}`,
        fontFamily: typography.fontFamily,
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: space[2],
      }}
    >
      <span style={{ color: colors.textTertiary, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Quick Trade &mdash; {symbol}
      </span>

      <div style={{ display: "flex", gap: space[2] }}>
        <button
          onClick={() => setForm((f) => ({ ...f, side: "BUY" }))}
          style={{
            flex: 1,
            padding: space[2],
            borderRadius: radius.sm,
            border: form.side === "BUY" ? "none" : `1px solid ${colors.hairline}`,
            background: form.side === "BUY" ? colors.marketGreen : "transparent",
            color: form.side === "BUY" ? "#000000" : colors.textTertiary,
            fontFamily: typography.fontFamily,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          BUY
        </button>
        <button
          onClick={() => setForm((f) => ({ ...f, side: "SELL" }))}
          style={{
            flex: 1,
            padding: space[2],
            borderRadius: radius.sm,
            border: form.side === "SELL" ? "none" : `1px solid ${colors.hairline}`,
            background: form.side === "SELL" ? colors.marketRed : "transparent",
            color: form.side === "SELL" ? "#000000" : colors.textTertiary,
            fontFamily: typography.fontFamily,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          SELL
        </button>
      </div>

      <div style={{ display: "flex", gap: space[2], alignItems: "center" }}>
        <span style={{ color: colors.textTertiary, fontSize: 10 }}>Qty:</span>
        <input
          type="number"
          min={1}
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
          style={{
            flex: 1,
            background: colors.surface,
            border: `1px solid ${colors.hairline}`,
            borderRadius: radius.sm,
            padding: space[1],
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
            fontSize: 11,
            outline: "none",
          }}
        />
        <select
          value={form.orderType}
          onChange={(e) => setForm((f) => ({ ...f, orderType: e.target.value as "MARKET" | "LIMIT" }))}
          style={{
            background: colors.surface,
            border: `1px solid ${colors.hairline}`,
            borderRadius: radius.sm,
            padding: space[1],
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
            fontSize: 10,
            outline: "none",
          }}
        >
          <option value="MARKET">Market</option>
          <option value="LIMIT">Limit</option>
        </select>
      </div>

      {form.orderType === "LIMIT" && (
        <div style={{ display: "flex", gap: space[2], alignItems: "center" }}>
          <span style={{ color: colors.textTertiary, fontSize: 10 }}>Limit Price:</span>
          <input
            type="number"
            step={0.05}
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            style={{
              flex: 1,
              background: colors.surface,
              border: `1px solid ${colors.hairline}`,
              borderRadius: radius.sm,
              padding: space[1],
              color: colors.textPrimary,
              fontFamily: typography.fontFamily,
              fontSize: 11,
              outline: "none",
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: space[2], alignItems: "center" }}>
        <select
          value={selectedConn}
          onChange={(e) => setSelectedConn(e.target.value)}
          style={{
            flex: 1,
            background: colors.surface,
            border: `1px solid ${colors.hairline}`,
            borderRadius: radius.sm,
            padding: space[1],
            color: colors.textPrimary,
            fontFamily: typography.fontFamily,
            fontSize: 10,
            outline: "none",
          }}
        >
          {connections.map((c) => (
            <option key={c.id} value={c.id}>{c.label} ({c.broker})</option>
          ))}
        </select>
        <button
          onClick={handleTrade}
          disabled={placing || form.quantity <= 0}
          style={{
            background: colors.accentBlue,
            border: "none",
            color: "#000000",
            borderRadius: radius.sm,
            padding: `${space[1]} ${space[3]}`,
            fontFamily: typography.fontFamily,
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            opacity: placing ? 0.5 : 1,
          }}
        >
          {placing ? "..." : "Place"}
        </button>
      </div>

      {result && (
        <p style={{ fontSize: 10, color: result.startsWith("Order") ? colors.marketGreen : colors.danger, margin: 0 }}>
          {result}
        </p>
      )}
    </div>
  );
}
