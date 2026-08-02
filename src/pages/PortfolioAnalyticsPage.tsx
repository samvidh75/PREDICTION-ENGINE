import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Trash2, PieChart } from "lucide-react";
import { Card, CardLabel } from "../ui/Card";
import { colors, typography } from "../design/tokens";
import { xirrCalculator } from "../services/portfolio/XIRRCalculator";
import { PortfolioEngine, type UserHolding } from "../services/portfolio/PortfolioEngine";
import { MetricsSkeleton } from "../components/SkeletonLoader";

// ── Shared motion presets (mirrors ScannerPage/StockPage animation vocabulary) ──
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

interface PricedHolding extends UserHolding {
  currentPrice: number | null;
}

function formatCurrency(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

async function fetchQuotePrice(symbol: string, timeoutMs = 1800): Promise<number | null> {
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(`/api/market-data/quote/${encodeURIComponent(symbol)}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`quote_http_${response.status}`);
        const quote = await response.json();
        if (!quote || typeof quote.price !== "number" || !Number.isFinite(quote.price)) {
          throw new Error("quote_invalid");
        }
        return quote.price as number;
      })(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("quote_timeout")), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}

export default function PortfolioAnalyticsPage() {
  const [holdings, setHoldings] = useState<UserHolding[]>(() => PortfolioEngine.getHoldings());
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  const loadHoldings = useCallback(() => {
    setHoldings(PortfolioEngine.getHoldings());
  }, []);

  useEffect(() => {
    window.addEventListener("portfoliochange", loadHoldings);
    return () => window.removeEventListener("portfoliochange", loadHoldings);
  }, [loadHoldings]);

  useEffect(() => {
    let cancelled = false;
    if (holdings.length === 0) {
      setPrices({});
      return;
    }
    setLoadingPrices(true);
    Promise.all(holdings.map(async (h) => [h.symbol, await fetchQuotePrice(h.symbol)] as const)).then((results) => {
      if (cancelled) return;
      setPrices(Object.fromEntries(results));
      setLoadingPrices(false);
    });
    return () => { cancelled = true; };
  }, [holdings]);

  const pricedHoldings: PricedHolding[] = useMemo(
    () => holdings.map((h) => ({ ...h, currentPrice: prices[h.symbol] ?? null })),
    [holdings, prices]
  );

  const holdingsWithBuyDate = useMemo(
    () => pricedHoldings.filter((h): h is PricedHolding & { buyDate: string; currentPrice: number } =>
      Boolean(h.buyDate) && h.currentPrice !== null
    ),
    [pricedHoldings]
  );

  const xirrResult = useMemo(() => {
    if (holdingsWithBuyDate.length === 0) return null;
    return xirrCalculator.portfolioFromHoldings(
      holdingsWithBuyDate.map((h) => ({
        symbol: h.symbol,
        quantity: h.shares,
        buyDate: h.buyDate,
        buyPrice: h.avgBuyPrice,
        currentPrice: h.currentPrice,
      }))
    );
  }, [holdingsWithBuyDate]);

  const pricedCount = pricedHoldings.filter((h) => h.currentPrice !== null).length;
  const totalValue = pricedHoldings.reduce((s, h) => s + h.shares * (h.currentPrice ?? h.avgBuyPrice), 0);
  const totalCost = pricedHoldings.reduce((s, h) => s + h.shares * h.avgBuyPrice, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const missingBuyDateCount = pricedHoldings.length - holdingsWithBuyDate.length;

  const handleDelete = (symbol: string) => {
    PortfolioEngine.removeHolding(symbol);
    loadHoldings();
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 24 }}
    >
      <motion.section variants={fadeUp} transition={pageTransition} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 600, color: colors.textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <PieChart size={24} color={colors.primary} /> Portfolio Analytics
          </h1>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: "4px 0 0" }}>
            {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
            {loadingPrices ? " · loading current prices…" : pricedCount < holdings.length ? ` · ${pricedCount}/${holdings.length} priced` : ""}
          </p>
        </div>
      </motion.section>

      {holdings.length === 0 && (
        <motion.div variants={fadeUp} transition={pageTransition}>
          <Card>
            <div style={{ textAlign: "center", padding: "48px 0", color: colors.textSecondary }}>
              <PieChart size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No holdings yet</p>
              <p style={{ fontSize: 12, margin: "8px 0 0", color: colors.textTertiary }}>
                Add holdings on the Portfolio page to see analytics here.
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {holdings.length > 0 && loadingPrices && Object.keys(prices).length === 0 && (
        <motion.div variants={fadeUp} transition={pageTransition}>
          <MetricsSkeleton />
        </motion.div>
      )}

      {holdings.length > 0 && (
        <motion.div variants={fadeUp} transition={pageTransition} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Total Invested</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>{formatCurrency(totalCost)}</span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Current Value</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.textPrimary }}>{formatCurrency(totalValue)}</span>
          </Card>
          <Card style={{ padding: "14px 16px", borderLeft: `3px solid ${totalPnl >= 0 ? colors.marketGreen : colors.marketRed}` }}>
            <CardLabel>P&L</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: totalPnl >= 0 ? colors.marketGreen : colors.marketRed }}>
              {formatCurrency(totalPnl)}
            </span>
          </Card>
          <Card style={{ padding: "14px 16px" }}>
            <CardLabel>Return</CardLabel>
            <span style={{ fontSize: 18, fontWeight: 700, color: totalPnlPct >= 0 ? colors.marketGreen : colors.marketRed }}>
              {formatPct(totalPnlPct)}
            </span>
          </Card>
        </motion.div>
      )}

      {xirrResult ? (
        <motion.div variants={fadeUp} transition={pageTransition} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          <Card style={{ padding: "14px 16px", borderLeft: `3px solid ${xirrResult.xirr >= 0 ? colors.marketGreen : colors.marketRed}` }}>
            <CardLabel>XIRR</CardLabel>
            <span style={{ fontSize: 22, fontWeight: 700, color: xirrResult.xirr >= 0 ? colors.marketGreen : colors.marketRed }}>
              {formatPct(xirrResult.xirr)}
            </span>
            {!xirrResult.converged && <span style={{ fontSize: 10, color: colors.warning, marginLeft: 4 }}>(approx)</span>}
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
        </motion.div>
      ) : holdings.length > 0 && (
        <motion.div variants={fadeUp} transition={pageTransition}>
          <Card>
            <div style={{ padding: "16px 0", textAlign: "center", color: colors.textSecondary }}>
              <p style={{ fontSize: 13, margin: 0 }}>
                Add a buy date to your holdings on the Portfolio page to see money-weighted return (XIRR).
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {missingBuyDateCount > 0 && holdings.length > 0 && (
        <p style={{ fontSize: 11, color: colors.textTertiary, margin: 0 }}>
          {missingBuyDateCount} of {holdings.length} holding{missingBuyDateCount !== 1 ? "s" : ""} excluded from XIRR — missing buy date or current price.
        </p>
      )}

      {holdings.length > 0 && (
        <motion.div variants={fadeUp} transition={pageTransition}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {["Symbol", "Shares", "Buy Date", "Avg Buy Price", "Current Price", "Invested", "Value", "P&L", "Return", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "right", color: colors.textTertiary, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                      {h === "Symbol" || h === "Buy Date" ? <span style={{ textAlign: "left", display: "block" }}>{h}</span> : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricedHoldings.map((h, i) => {
                  const invested = h.shares * h.avgBuyPrice;
                  const value = h.currentPrice !== null ? h.shares * h.currentPrice : null;
                  const pnl = value !== null ? value - invested : null;
                  const returnPct = pnl !== null && invested > 0 ? (pnl / invested) * 100 : null;
                  return (
                    <tr key={h.symbol} style={{
                      borderBottom: i < pricedHoldings.length - 1 ? `1px solid ${colors.hairline}` : "none",
                      transition: "background 0.15s ease",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.fill}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: colors.textPrimary }}>{h.symbol}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: colors.textSecondary }}>{h.shares}</td>
                      <td style={{ padding: "12px 14px", textAlign: "left", color: colors.textSecondary }}>{h.buyDate ?? "—"}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(h.avgBuyPrice)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                        {h.currentPrice !== null ? formatCurrency(h.currentPrice) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: colors.textSecondary, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(invested)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: colors.textPrimary, fontVariantNumeric: "tabular-nums" }}>
                        {value !== null ? formatCurrency(value) : "—"}
                      </td>
                      <td style={{
                        padding: "12px 14px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                        color: pnl === null ? colors.textTertiary : pnl >= 0 ? colors.marketGreen : colors.marketRed,
                      }}>
                        {pnl !== null ? `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}` : "—"}
                      </td>
                      <td style={{
                        padding: "12px 14px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums",
                        color: returnPct === null ? colors.textTertiary : returnPct >= 0 ? colors.marketGreen : colors.marketRed,
                      }}>
                        {returnPct !== null ? formatPct(returnPct) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(h.symbol)}
                          style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: colors.stone }}
                          onMouseEnter={(e) => e.currentTarget.style.color = colors.danger}
                          onMouseLeave={(e) => e.currentTarget.style.color = colors.stone}
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </motion.div>
      )}

      {xirrResult && (
        <motion.div variants={fadeUp} transition={pageTransition}>
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
                XIRR accounts for irregular cash flows (different buy dates), computed only from holdings with a recorded buy date and a current price.
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
