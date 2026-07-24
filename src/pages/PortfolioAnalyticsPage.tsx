import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, BarChart3, PieChart, DollarSign, Calendar, Percent, Sigma, AlertTriangle } from "lucide-react";
import { Card, CardLabel } from "../ui/Card";
import { Button } from "../ui/Button";
import { colors, typography, radius } from "../design/tokens";
import { xirrCalculator } from "../services/portfolio/XIRRCalculator";

interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  buyDate: string;
  buyPrice: number;
  currentPrice: number;
}

function formatCurrency(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

export default function PortfolioAnalyticsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([
    { id: "1", symbol: "RELIANCE", quantity: 10, buyDate: "2024-03-15", buyPrice: 2450, currentPrice: 2980 },
    { id: "2", symbol: "TCS", quantity: 5, buyDate: "2024-06-01", buyPrice: 3850, currentPrice: 4120 },
    { id: "3", symbol: "HDFCBANK", quantity: 15, buyDate: "2024-09-10", buyPrice: 1620, currentPrice: 1780 },
    { id: "4", symbol: "INFY", quantity: 20, buyDate: "2025-01-05", buyPrice: 1480, currentPrice: 1650 },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formSymbol, setFormSymbol] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formBuyDate, setFormBuyDate] = useState("");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
  const [formError, setFormError] = useState("");

  const xirrResult = useMemo(() => {
    if (holdings.length === 0) return null;
    return xirrCalculator.portfolioFromHoldings(
      holdings.map((h) => ({
        symbol: h.symbol,
        quantity: h.quantity,
        buyDate: h.buyDate,
        buyPrice: h.buyPrice,
        currentPrice: h.currentPrice,
      }))
    );
  }, [holdings]);

  const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.buyPrice, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const handleAdd = () => {
    setFormError("");
    const symbol = formSymbol.trim().toUpperCase();
    const qty = parseInt(formQty);
    const buyPrice = parseFloat(formBuyPrice);
    const currentPrice = parseFloat(formCurrentPrice);
    if (!symbol) { setFormError("Enter a symbol"); return; }
    if (!qty || qty <= 0) { setFormError("Enter valid quantity"); return; }
    if (!buyPrice || buyPrice <= 0) { setFormError("Enter valid buy price"); return; }
    if (!currentPrice || currentPrice <= 0) { setFormError("Enter valid current price"); return; }
    if (!formBuyDate) { setFormError("Enter buy date"); return; }

    setHoldings((prev) => [
      ...prev,
      { id: `h_${Date.now()}`, symbol, quantity: qty, buyDate: formBuyDate, buyPrice, currentPrice },
    ]);
    setFormSymbol(""); setFormQty(""); setFormBuyDate(""); setFormBuyPrice(""); setFormCurrentPrice("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  };

  const handleUpdatePrice = (id: string, price: string) => {
    const num = parseFloat(price);
    if (!isNaN(num) && num > 0) {
      setHoldings((prev) => prev.map((h) => h.id === id ? { ...h, currentPrice: num } : h));
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <PieChart size={24} color={colors.primary} /> Portfolio Analytics
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: "4px 0 0" }}>
            {holdings.length} holding{holdings.length !== 1 ? "s" : ""} · XIRR powered
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setFormError(""); }}>
          <Plus size={14} /> {showForm ? "Cancel" : "Add Holding"}
        </Button>
      </section>

      {showForm && (
        <Card>
          <div style={{ display: "grid", gap: 14 }}>
            <CardLabel>Add Holding</CardLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 110px", minWidth: 90 }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Symbol</span>
                <input value={formSymbol} onChange={(e) => setFormSymbol(e.target.value.toUpperCase())} placeholder="RELIANCE"
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "0 1 80px" }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Qty</span>
                <input type="number" min="1" value={formQty} onChange={(e) => setFormQty(e.target.value)} placeholder="10"
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "0 1 130px" }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Buy Date</span>
                <input type="date" value={formBuyDate} onChange={(e) => setFormBuyDate(e.target.value)}
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Buy Price</span>
                <input type="number" step="0.01" value={formBuyPrice} onChange={(e) => setFormBuyPrice(e.target.value)} placeholder="2500"
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <span style={{ fontSize: 11, color: colors.textTertiary, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current Price</span>
                <input type="number" step="0.01" value={formCurrentPrice} onChange={(e) => setFormCurrentPrice(e.target.value)} placeholder="3000"
                  style={{ height: 36, width: "100%", borderRadius: radius.md, border: `1px solid ${colors.border}`, padding: "0 12px", fontSize: 13, color: colors.textPrimary, background: colors.surface, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleAdd}><Plus size={14} /> Add</Button>
            </div>
            {formError && <p style={{ fontSize: 12, color: colors.danger, margin: 0 }}>{formError}</p>}
          </div>
        </Card>
      )}

      {holdings.length === 0 && !showForm && (
        <Card>
          <div style={{ textAlign: "center", padding: "48px 0", color: colors.textSecondary }}>
            <PieChart size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No holdings added yet</p>
            <p style={{ fontSize: 12, margin: "8px 0 0", color: colors.textTertiary }}>Add holdings to calculate XIRR and portfolio analytics</p>
          </div>
        </Card>
      )}

      {xirrResult && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          <Card style={{ padding: "14px 16px", borderLeft: `3px solid ${xirrResult.xirr >= 0 ? colors.marketGreen : colors.marketRed}` }}>
            <CardLabel>XIRR</CardLabel>
            <span style={{ fontSize: 22, fontWeight: 700, color: xirrResult.xirr >= 0 ? colors.marketGreen : colors.marketRed }}>
              {formatPct(xirrResult.xirr)}
            </span>
            {!xirrResult.converged && <span style={{ fontSize: 10, color: colors.warning, marginLeft: 4 }}>(approx)</span>}
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Total Invested</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>{formatCurrency(xirrResult.totalInvested)}</span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Current Value</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>{formatCurrency(xirrResult.currentValue)}</span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>P&L</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: xirrResult.absoluteReturn >= 0 ? colors.marketGreen : colors.marketRed }}>
              {formatCurrency(xirrResult.absoluteReturn)}
            </span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>CAGR</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: xirrResult.cagr >= 0 ? colors.marketGreen : colors.marketRed }}>
              {formatPct(xirrResult.cagr)}
            </span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Hold Period</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>{xirrResult.yearsHeld.toFixed(1)} yrs</span>
          </Card>
        </div>
      )}

      {holdings.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {["Symbol", "Qty", "Buy Date", "Buy Price", "Current Price", "Invested", "Value", "P&L", "Return", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "right", color: colors.textTertiary, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                      {h === "Symbol" || h === "Buy Date" ? <span style={{ textAlign: "left", display: "block" }}>{h}</span> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => {
                  const invested = h.quantity * h.buyPrice;
                  const value = h.quantity * h.currentPrice;
                  const pnl = value - invested;
                  const returnPct = invested > 0 ? (pnl / invested) * 100 : 0;
                  return (
                    <tr key={h.id} style={{
                      borderBottom: i < holdings.length - 1 ? `1px solid ${colors.hairline}` : "none",
                      transition: "background 0.15s ease",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.fill}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: colors.textPrimary }}>{h.symbol}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: colors.textSecondary }}>{h.quantity}</td>
                      <td style={{ padding: "12px 14px", textAlign: "left", color: colors.textSecondary }}>{h.buyDate}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(h.buyPrice)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <input
                          type="number" step="0.01"
                          value={h.currentPrice}
                          onChange={(e) => handleUpdatePrice(h.id, e.target.value)}
                          style={{
                            width: 90, textAlign: "right", border: "none", background: "transparent",
                            fontSize: 13, fontWeight: 600, color: colors.textPrimary,
                            outline: "none", fontVariantNumeric: "tabular-nums",
                          }}
                        />
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: colors.textSecondary, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(invested)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(value)}</td>
                      <td style={{
                        padding: "12px 14px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                        color: pnl >= 0 ? colors.marketGreen : colors.marketRed,
                      }}>
                        {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                      </td>
                      <td style={{
                        padding: "12px 14px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                        color: returnPct >= 0 ? colors.marketGreen : colors.marketRed,
                      }}>
                        {formatPct(returnPct)}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button onClick={() => handleDelete(h.id)}
                          style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: colors.stone }}
                          onMouseEnter={(e) => e.currentTarget.style.color = colors.danger}
                          onMouseLeave={(e) => e.currentTarget.style.color = colors.stone}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {xirrResult && (
        <Card>
          <div style={{ display: "grid", gap: 8 }}>
            <CardLabel>XIRR Details</CardLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: colors.textSecondary }}>
              <span>Absolute Return: <strong style={{ color: xirrResult.absoluteReturn >= 0 ? colors.marketGreen : colors.marketRed }}>{formatPct(xirrResult.absoluteReturnPercent)}</strong></span>
              <span>Years Held: <strong style={{ color: colors.textPrimary }}>{xirrResult.yearsHeld.toFixed(1)}</strong></span>
              <span>Newton-Raphson Iterations: <strong style={{ color: colors.textPrimary }}>{xirrResult.iterations}</strong></span>
              <span>Converged: <strong style={{ color: xirrResult.converged ? colors.marketGreen : colors.warning }}>{xirrResult.converged ? "Yes" : "No"}</strong></span>
            </div>
            <p style={{ fontSize: 11, color: colors.textTertiary, margin: "4px 0 0" }}>
              XIRR accounts for irregular cash flows (different buy dates). Update current prices in the table above to recalculate.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
