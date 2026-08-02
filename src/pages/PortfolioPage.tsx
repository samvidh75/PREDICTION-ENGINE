import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Card, CardLabel } from "../ui/Card";
import { Input } from "../ui/Input";
import { StaggerContainer } from "../ui/MicroInteractions";
import { PriceFlash } from "../ui/PriceFlash";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, radius, space, animation } from "../design/tokens";
import { ResearchAiExplanationPanel } from "../components/ai-orchestrator/ResearchAiExplanationPanel";
import type { ResearchAiContext } from "../components/ai-orchestrator";
import { MetricsSkeleton, ChartSkeleton } from "../components/SkeletonLoader";
import { BarChart3, ExternalLink, Plus, TrendingUp, Trash2, PieChart, Edit3 } from "lucide-react";
import { PortfolioEngine, type UserHolding } from "../services/portfolio/PortfolioEngine";
import { PortfolioPerformanceEngine } from "../services/portfolio/PortfolioPerformanceEngine";
import { PortfolioAnalyticsEngine } from "../services/portfolio/PortfolioAnalyticsEngine";
import { formatPHP } from "../services/ui/dataFormatting";
import { formatPercent } from "../services/ui/phNumberFormat";

// ── Shared motion presets (mirrors ScannerPage/StockPage animation vocabulary) ──
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

export default function PortfolioPage() {
  const navigate = useNavigate();
  const isMobile = useResponsiveValue(true, false);

  const [holdings, setHoldings] = useState<UserHolding[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);

  // Add-holding form state
  const [formSymbol, setFormSymbol] = useState("");
  const [formShares, setFormShares] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formSector, setFormSector] = useState("");
  const [formBuyDate, setFormBuyDate] = useState("");
  const [formError, setFormError] = useState("");

  const getQuoteWithTimeout = useCallback(async (symbol: string, timeoutMs = 1800) => {
    return await Promise.race([
      (async () => {
        const response = await fetch(`/api/market-data/quote/${encodeURIComponent(symbol)}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`quote_http_${response.status}`);
        }
        const quote = await response.json();
        if (!quote || typeof quote.price !== "number" || !Number.isFinite(quote.price)) {
          throw new Error("quote_invalid");
        }
        return quote as { price: number };
      })(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("quote_timeout")), timeoutMs);
      }),
    ]);
  }, []);

  const loadHoldings = useCallback(async () => {
    setLoading(true);
    const h = PortfolioEngine.getHoldings();
    setHoldings(h);
    setLoading(false);

    if (h.length > 0) {
      const prices: Record<string, number> = {};
      await Promise.allSettled(
        h.map(async (holding) => {
          try {
            const quote = await getQuoteWithTimeout(holding.symbol);
            prices[holding.symbol] = quote.price;
          } catch {
            // price remains unavailable
          }
        })
      );
      setCurrentPrices((prev) => ({ ...prev, ...prices }));
    }
  }, [getQuoteWithTimeout]);

  useEffect(() => {
    loadHoldings();
    const handler = () => loadHoldings();
    window.addEventListener("portfoliochange", handler);
    return () => window.removeEventListener("portfoliochange", handler);
  }, [loadHoldings]);

  const perf = PortfolioPerformanceEngine.evaluatePerformance(holdings, currentPrices);
  const sectorWeights = PortfolioAnalyticsEngine.calculateWeights(holdings, currentPrices);

  const handleAddHolding = () => {
    setFormError("");
    const symbol = formSymbol.trim().toUpperCase();
    const shares = parseFloat(formShares);
    const price = parseFloat(formPrice);
    if (!symbol) { setFormError("Enter a symbol"); return; }
    if (!shares || shares <= 0) { setFormError("Enter valid shares"); return; }
    if (!price || price <= 0) { setFormError("Enter valid buy price"); return; }

    const success = PortfolioEngine.addHolding({
      symbol,
      shares,
      avgBuyPrice: price,
      sector: formSector.trim() || "Sector unavailable",
      ...(formBuyDate ? { buyDate: formBuyDate } : {}),
    });

    if (!success) { setFormError("Failed to add holding"); return; }

    setFormSymbol(""); setFormShares(""); setFormPrice(""); setFormSector(""); setFormBuyDate("");
    setShowAddForm(false);
    loadHoldings();
  };

  const handleUpdate = (symbol: string) => {
    const h = holdings.find((x) => x.symbol === symbol);
    if (!h) return;
    setEditSymbol(symbol);
    setFormSymbol(symbol);
    setFormShares(String(h.shares));
    setFormPrice(String(h.avgBuyPrice));
    setFormSector(h.sector === "Sector unavailable" ? "" : h.sector);
    setFormBuyDate(h.buyDate ?? "");
    setShowAddForm(true);
  };

  const handleSaveEdit = () => {
    const shares = parseFloat(formShares);
    const price = parseFloat(formPrice);
    if (!shares || shares <= 0 || !price || price <= 0) {
      setFormError("Enter valid shares and price");
      return;
    }
    PortfolioEngine.updateHolding(formSymbol, shares, price);
    setEditSymbol(null);
    setShowAddForm(false);
    setFormSymbol(""); setFormShares(""); setFormPrice(""); setFormSector("");
    loadHoldings();
  };

  const handleRemove = (symbol: string) => {
    PortfolioEngine.removeHolding(symbol);
    loadHoldings();
  };

  // Build AI context from portfolio data for ResearchAiExplanationPanel
  const portfolioContext = useMemo((): ResearchAiContext | null => {
    if (!holdings.length) return null;
    const totalValue = perf.currentValue;
    const totalCost = perf.totalCost;
    const topHolding = holdings.reduce((best, h) => {
      const price = currentPrices[h.symbol] ?? 0;
      const val = price * h.shares;
      return val > (currentPrices[best.symbol] ?? 0) * best.shares ? h : best;
    }, holdings[0]);

    return {
      surface: "portfolio",
      headline: `${holdings.length} holding${holdings.length !== 1 ? "s" : ""} · ${formatPHP(totalCost)} cost · ${formatPHP(totalValue)} current`,
      narrative: [
        `${holdings.length} holding${holdings.length !== 1 ? "s" : ""} across ${sectorWeights.length} sector${sectorWeights.length !== 1 ? "s" : ""}.`,
        `Top holding: ${topHolding.symbol} (${topHolding.shares} shares @ ${formatPHP(topHolding.avgBuyPrice)}).`,
        `Portfolio P&L: ${formatPHP(perf.totalGainAmount)} (${formatPercent(perf.totalGainPct)}). Best performer: ${perf.bestPerformerSymbol}.`,
      ],
      comparisonContext: holdings.slice(0, 10).map((h) => {
        const price = currentPrices[h.symbol];
        const gain = price ? formatPercent((price - h.avgBuyPrice) / h.avgBuyPrice * 100) : "—";
        return `${h.symbol} (${h.sector}): ${h.shares} shares, avg ${formatPHP(h.avgBuyPrice)}, current ${price ? formatPHP(price) : "—"}, P&L ${gain}`;
      }),
      whatToWatch: [
        `${perf.bestPerformerSymbol} is your best performer — monitor for trend continuation.`,
        ...(sectorWeights.length > 1 ? [`Largest sector: ${sectorWeights[0].sector} at ${sectorWeights[0].weightPct}% — check concentration risk.`] : []),
      ],
    };
  }, [holdings, currentPrices, perf, sectorWeights]);

  if (loading) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        style={{ maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, display: "grid", gap: 16 }}
      >
        <motion.div variants={fadeUp} transition={pageTransition}>
          <MetricsSkeleton />
        </motion.div>
        <motion.div variants={fadeUp} transition={pageTransition}>
          <ChartSkeleton height={220} />
        </motion.div>
      </motion.div>
    );
  }

  if (holdings.length === 0 && !showAddForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        style={{ maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: isMobile ? layout.pagePaddingMobile : layout.pagePaddingDesktop }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <BarChart3 size={24} color={colors.primary} />
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, color: colors.ink, margin: 0 }}>Portfolio</h1>
        </div>
        <Card variant="elevated" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ marginBottom: 20 }}>
            <TrendingUp size={48} color={colors.body} style={{ opacity: 0.3 }} />
          </div>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, color: colors.ink, margin: "0 0 12px 0" }}>
            No portfolio companies are being tracked yet.
          </h2>
          <p style={{ color: colors.body, fontSize: typography.body.desktop.size, margin: "0 0 24px 0", maxWidth: 480, lineHeight: 1.6 }}>
            Add companies to start tracking thesis and allocation context.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Button variant="primary" size="sm" onClick={() => { setShowAddForm(true); }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={16} /> Add Holding Manually
                </span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Button variant="secondary" size="sm" onClick={() => navigate("/watchlist")}>
                Go to Watchlist
              </Button>
            </motion.div>
          </div>
          <p style={{ color: colors.body, fontSize: "12px", margin: "32px 0 0 0", fontStyle: "italic", opacity: 0.6 }}>
            Not a broker account. Portfolio research context only.
          </p>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
      style={{ maxWidth: layout.contentMaxWidth, margin: "0 auto", padding: isMobile ? layout.pagePaddingMobile : layout.pagePaddingDesktop }}>
      {/* Header */}
      <StaggerContainer>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: space[8], flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <BarChart3 size={24} color={colors.primary} />
              <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, color: colors.ink, margin: 0 }}>
                Portfolio
              </h1>
            </div>
            <p style={{ color: colors.body, fontSize: typography.body.desktop.size, margin: 0 }}>
              {holdings.length > 0
                ? `${holdings.length} holding${holdings.length !== 1 ? "s" : ""} tracked`
                : "Track thesis, allocation context, and portfolio research."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Button variant="primary" size="sm" onClick={() => { setShowAddForm(!showAddForm); setEditSymbol(null); setFormError(""); }}>
                <Plus size={16} /> {showAddForm ? "Cancel" : "Add Holding"}
              </Button>
            </motion.div>
          </div>
        </div>
      </StaggerContainer>

      {/* Add / Edit Form */}
      {showAddForm && (
        <StaggerContainer>
          <Card variant="elevated" style={{ marginBottom: space[6], padding: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 140px", minWidth: 120 }}>
                <CardLabel>Symbol</CardLabel>
                <Input
                  placeholder="e.g. BDO"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <CardLabel>Shares</CardLabel>
                <Input type="number" min="0" step="1" placeholder="10"
                  value={formShares} onChange={(e) => setFormShares(e.target.value)} />
              </div>
              <div style={{ flex: "0 1 120px" }}>
                <CardLabel>Avg Buy Price (₱)</CardLabel>
                <Input type="number" min="0" step="0.01" placeholder="2500.00"
                  value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
              </div>
              <div style={{ flex: "1 1 130px", minWidth: 100 }}>
                <CardLabel>Sector (optional)</CardLabel>
                <Input placeholder="e.g. Energy"
                  value={formSector} onChange={(e) => setFormSector(e.target.value)} />
              </div>
              <div style={{ flex: "0 1 150px" }}>
                <CardLabel>Buy date (optional)</CardLabel>
                <Input type="date"
                  value={formBuyDate} onChange={(e) => setFormBuyDate(e.target.value)} />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={editSymbol ? handleSaveEdit : handleAddHolding}
              >
                {editSymbol ? "Save Changes" : "Add"}
              </Button>
            </div>
            {formError && (
              <p style={{ color: colors.marketRed, fontSize: typography.captionSm.size, margin: "8px 0 0 0" }}>
                {formError}
              </p>
            )}
          </Card>
        </StaggerContainer>
      )}

      {holdings.length === 0 ? (
        /* Empty State */
        <StaggerContainer staggerMs={80}>
          <Card variant="elevated" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ marginBottom: 20 }}>
              <TrendingUp size={48} color={colors.body} style={{ opacity: 0.3 }} />
            </div>
            <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, color: colors.ink, margin: "0 0 12px 0" }}>
              No portfolio companies are being tracked yet.
            </h2>
            <p style={{ color: colors.body, fontSize: typography.body.desktop.size, margin: "0 0 24px 0", maxWidth: 480, lineHeight: 1.6 }}>
              Add companies to start tracking thesis and allocation context.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Button variant="primary" size="sm" onClick={() => { setShowAddForm(true); }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={16} /> Add Holding Manually
                </span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/watchlist")}>
                Go to Watchlist
              </Button>
            </div>
            <p style={{ color: colors.body, fontSize: "12px", margin: "32px 0 0 0", fontStyle: "italic", opacity: 0.6 }}>
              Portfolio research context only.
            </p>
          </Card>
        </StaggerContainer>
      ) : (
        <>
          {/* Summary Metrics */}
          <StaggerContainer staggerMs={60}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
              gap: 12,
              marginBottom: space[6],
            }}>
              <Card variant="elevated" style={{ padding: "16px" }}>
                <CardLabel>Total Cost</CardLabel>
                <span style={{ fontSize: typography.headingSm.size, fontWeight: 600, color: colors.ink }}>
                  {formatPHP(perf.totalCost)}
                </span>
              </Card>
              <Card variant="elevated" style={{ padding: "16px" }}>
                <CardLabel>Current Value</CardLabel>
                <PriceFlash value={perf.currentValue}>
                  <span style={{ fontSize: typography.headingSm.size, fontWeight: 600, color: colors.ink }}>
                    {formatPHP(perf.currentValue)}
                  </span>
                </PriceFlash>
              </Card>
              <Card variant="elevated" style={{ padding: "16px" }}>
                <CardLabel>P&L</CardLabel>
                <PriceFlash value={perf.totalGainAmount}>
                  <span style={{
                    fontSize: typography.headingSm.size,
                    fontWeight: 600,
                    color: perf.totalGainAmount >= 0 ? colors.marketGreen : colors.marketRed,
                  }}>
                    {formatPHP(perf.totalGainAmount)}
                    <span style={{ marginLeft: 6, fontSize: typography.captionMd.size }}>
                      ({formatPercent(perf.totalGainPct)})
                    </span>
                  </span>
                </PriceFlash>
              </Card>
              <Card variant="elevated" style={{ padding: "16px" }}>
                <CardLabel>Best Performer</CardLabel>
                <span style={{
                  fontSize: typography.headingSm.size,
                  fontWeight: 600,
                  color: perf.bestPerformerSymbol !== "None" ? colors.marketGreen : colors.mute,
                }}>
                  {perf.bestPerformerSymbol}
                </span>
              </Card>
            </div>
          </StaggerContainer>

          {/* Holdings Table + Sector Allocation */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.8fr 1fr", gap: space[6], marginBottom: space[6] }}>
            {/* Holdings Table */}
            <StaggerContainer>
              <Card variant="elevated" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.hairline}` }}>
                        {["Symbol", "Shares", "Avg Buy", "Price", "P&L", "Sector", ""].map((h) => (
                          <th key={h} style={{
                            textAlign: "left",
                            padding: "12px 16px",
                            fontSize: typography.captionSm.size,
                            fontWeight: 500,
                            color: colors.mute,
                            letterSpacing: "0.4px",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h, i) => {
                        const price = currentPrices[h.symbol];
                        const gain = price ? (price - h.avgBuyPrice) / h.avgBuyPrice * 100 : null;
                        return (
                          <tr key={h.symbol} style={{
                            borderBottom: i < holdings.length - 1 ? `1px solid ${colors.hairline}` : "none",
                            transition: `background-color ${animation.fast}`,
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceElevated}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{ fontWeight: 600, color: colors.ink, fontSize: typography.bodySm.size }}>
                                {h.symbol}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px", color: colors.body, fontSize: typography.bodySm.size }}>
                              {h.shares}
                            </td>
                            <td style={{ padding: "12px 16px", color: colors.body, fontSize: typography.bodySm.size }}>
                              {formatPHP(h.avgBuyPrice)}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <PriceFlash value={price ?? 0}>
                                <span style={{
                                  color: price ? colors.ink : colors.mute,
                                  fontSize: typography.bodySm.size,
                                  fontWeight: 500,
                                }}>
                                  {price ? formatPHP(price) : "—"}
                                </span>
                              </PriceFlash>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              {gain !== null ? (
                                <PriceFlash value={gain}>
                                  <span style={{
                                    color: gain >= 0 ? colors.marketGreen : colors.marketRed,
                                    fontSize: typography.bodySm.size,
                                    fontWeight: 600,
                                  }}>
                                    {formatPercent(gain)}
                                  </span>
                                </PriceFlash>
                              ) : (
                                <span style={{ color: colors.mute, fontSize: typography.bodySm.size }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: "12px 16px", color: colors.body, fontSize: typography.bodySm.size }}>
                              {h.sector}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                                <motion.button
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  title="Edit"
                                  onClick={() => handleUpdate(h.symbol)}
                                  style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    color: colors.mute, padding: 4,
                                    transition: `color ${animation.fast}`,
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = colors.ink}
                                  onMouseLeave={(e) => e.currentTarget.style.color = colors.mute}
                                >
                                  <Edit3 size={14} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  title="Remove"
                                  onClick={() => handleRemove(h.symbol)}
                                  style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    color: colors.mute, padding: 4,
                                    transition: `color ${animation.fast}`,
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = colors.marketRed}
                                  onMouseLeave={(e) => e.currentTarget.style.color = colors.mute}
                                >
                                  <Trash2 size={14} />
                                </motion.button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </StaggerContainer>

            {/* Sector Allocation */}
            <StaggerContainer>
              <Card variant="elevated" style={{ padding: "16px" }}>
                <CardLabel><PieChart size={12} style={{ marginRight: 4, verticalAlign: "middle" }} /> Sector Allocation</CardLabel>
                {sectorWeights.length === 0 ? (
                  <p style={{ color: colors.mute, fontSize: typography.captionMd.size, margin: "16px 0 0 0" }}>
                    No sector data available.
                  </p>
                ) : (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {sectorWeights.map((sw, idx) => (
                      <div key={sw.sector}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: colors.body, fontSize: typography.captionMd.size, fontWeight: 500 }}>
                            {sw.sector}
                          </span>
                          <span style={{ color: colors.ink, fontSize: typography.captionMd.size, fontWeight: 600 }}>
                            {sw.weightPct}%
                          </span>
                        </div>
                        <div style={{
                          height: 6,
                          borderRadius: radius.full,
                          background: colors.hairline,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${sw.weightPct}%`,
                            height: "100%",
                            borderRadius: radius.full,
                            background: idx === 0 ? colors.primary : idx === 1 ? colors.accentBlue : idx === 2 ? colors.accentYellow : colors.mute,
                            transition: `width ${animation.slow}`,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </StaggerContainer>
          </div>

          {/* Bottom Actions */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Button variant="secondary" size="sm" onClick={() => navigate("/compare")}>
                <ExternalLink size={14} /> Compare with benchmarks
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { PortfolioEngine.clearHoldings(); loadHoldings(); }}>
                <Trash2 size={14} /> Clear All
              </Button>
            </div>
          )}

          {/* AI Portfolio Explanation */}
          {portfolioContext && (
            <div style={{ marginTop: space[6] }}>
              <ResearchAiExplanationPanel context={portfolioContext} />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
