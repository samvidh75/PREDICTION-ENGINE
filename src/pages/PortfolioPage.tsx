import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Card, CardLabel } from "../ui/Card";
import { Input } from "../ui/Input";
import { StaggerContainer } from "../ui/MicroInteractions";
import { PriceFlash } from "../ui/PriceFlash";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, radius, space, animation } from "../design/tokens";
import { ResearchAiExplanationPanel } from "../components/ai-orchestrator/ResearchAiExplanationPanel";
import type { ResearchAiContext } from "../components/ai-orchestrator";
import { MetricsSkeleton, ChartSkeleton } from "../components/SkeletonLoader";
import { BarChart3, ExternalLink, Plus, TrendingUp, Trash2, PieChart, Edit3, MoreVertical, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PortfolioEngine, type UserHolding } from "../services/portfolio/PortfolioEngine";
import { PortfolioPerformanceEngine } from "../services/portfolio/PortfolioPerformanceEngine";
import { PortfolioAnalyticsEngine } from "../services/portfolio/PortfolioAnalyticsEngine";
import { formatPHP } from "../services/ui/dataFormatting";
import { formatPercent } from "../services/ui/phNumberFormat";

// ── Shared motion presets (mirrors ScannerPage/StockPage animation vocabulary) ──
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

// ── Type Definitions ────────────────────────────────────────────────────────
interface HoldingWithMetrics extends UserHolding {
  currentPrice?: number;
  totalValue?: number;
  unrealizedPnL?: number;
  unrealizedPnLPct?: number;
  dayChange?: number;
}

interface ActivityRecord {
  id: string;
  time: string;
  symbol: string;
  action: "BUY" | "SELL" | "ADD" | "DIVIDEND";
  quantity: number;
  price: number;
  total: number;
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const isMobile = useResponsiveValue(true, false);

  // ── State: Holdings & Prices
  const [holdings, setHoldings] = useState<UserHolding[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // ── State: Form & UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"holdings" | "analytics">("holdings");
  const [sortBy, setSortBy] = useState<"value" | "pnl" | "gainpct" | "change">("value");
  const [currentPage, setCurrentPage] = useState(1);
  const activityPerPage = 10;

  // ── State: Form Fields
  const [formSymbol, setFormSymbol] = useState("");
  const [formShares, setFormShares] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formSector, setFormSector] = useState("");
  const [formBuyDate, setFormBuyDate] = useState("");
  const [formError, setFormError] = useState("");

  // ── Helper: Fetch quote with timeout
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

  // ── Helper: Compute holdings with metrics
  const computeHoldingsMetrics = useCallback((h: UserHolding[], prices: Record<string, number>): HoldingWithMetrics[] => {
    return h.map((holding) => {
      const currentPrice = prices[holding.symbol] ?? 0;
      const totalValue = currentPrice * holding.shares;
      const totalCost = holding.avgBuyPrice * holding.shares;
      const unrealizedPnL = totalValue - totalCost;
      const unrealizedPnLPct = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;
      return {
        ...holding,
        currentPrice,
        totalValue,
        unrealizedPnL,
        unrealizedPnLPct,
        dayChange: 0, // Placeholder - would come from market data
      };
    });
  }, []);

  // ── Helper: Sort holdings by selected criteria
  const sortHoldings = useCallback((h: HoldingWithMetrics[], criterion: string): HoldingWithMetrics[] => {
    const sorted = [...h];
    switch (criterion) {
      case "value":
        return sorted.sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0));
      case "pnl":
        return sorted.sort((a, b) => (b.unrealizedPnL ?? 0) - (a.unrealizedPnL ?? 0));
      case "gainpct":
        return sorted.sort((a, b) => (b.unrealizedPnLPct ?? 0) - (a.unrealizedPnLPct ?? 0));
      case "change":
        return sorted.sort((a, b) => (b.dayChange ?? 0) - (a.dayChange ?? 0));
      default:
        return sorted;
    }
  }, []);

  // ── Helper: Generate mock activity feed (in production: from transaction log)
  const generateActivityFeed = useCallback((): ActivityRecord[] => {
    return holdings.map((h, idx) => ({
      id: `${h.symbol}-${idx}`,
      time: new Date(Date.now() - Math.random() * 86400000).toISOString().split("T")[1].substring(0, 5),
      symbol: h.symbol,
      action: idx % 3 === 0 ? "ADD" : "BUY",
      quantity: Math.floor(h.shares / 2),
      price: h.avgBuyPrice,
      total: (Math.floor(h.shares / 2) * h.avgBuyPrice),
    }));
  }, [holdings]);

  // ── Load holdings and fetch current prices
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
            // Price remains unavailable
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

  // ── Handler: Add new holding
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

  // ── Loading State
  if (loading) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        style={{ display: "grid", gap: 12 }}
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

  // ── Empty State
  if (holdings.length === 0 && !showAddForm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <BarChart3 size={24} color={colors.accentBlue} />
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Portfolio</h1>
        </div>
        <Card variant="elevated" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ marginBottom: 20 }}>
            <TrendingUp size={48} color={colors.body} style={{ opacity: 0.3 }} />
          </div>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, color: colors.ink, margin: "0 0 12px 0" }}>
            No portfolio companies are being tracked yet.
          </h2>
          <p style={{ color: colors.body, fontSize: typography.body.desktop.size, margin: "0 0 24px 0", maxWidth: 480, lineHeight: 1.6 }}>
            Add companies to start tracking thesis, allocation context, and performance.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Button variant="primary" size="sm" onClick={() => { setShowAddForm(true); }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={16} /> Add Holding
                </span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Button variant="secondary" size="sm" onClick={() => navigate("/watchlist")}>
                Browse Watchlist
              </Button>
            </motion.div>
          </div>
          <p style={{ color: colors.body, fontSize: "12px", margin: "32px 0 0 0", fontStyle: "italic", opacity: 0.6 }}>
            Research context only — not a broker account.
          </p>
        </Card>
      </motion.div>
    );
  }

  // ── Derived State
  const perf = PortfolioPerformanceEngine.evaluatePerformance(holdings, currentPrices);
  const sectorWeights = PortfolioAnalyticsEngine.calculateWeights(holdings, currentPrices);
  const holdingsWithMetrics = computeHoldingsMetrics(holdings, currentPrices);
  const sortedHoldings = sortHoldings(holdingsWithMetrics, sortBy);
  const activity = generateActivityFeed();
  const paginatedActivity = activity.slice((currentPage - 1) * activityPerPage, currentPage * activityPerPage);
  const totalActivityPages = Math.ceil(activity.length / activityPerPage);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. HEADER + QUICK ACTIONS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <StaggerContainer>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <BarChart3 size={22} color={colors.accentBlue} />
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                Portfolio
              </h1>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: "13px", margin: 0 }}>
              {holdings.length} holding{holdings.length !== 1 ? "s" : ""} · {formatPHP(perf.currentValue)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Button variant="primary" size="sm" onClick={() => { setShowAddForm(!showAddForm); setEditSymbol(null); setFormError(""); }}>
                <Plus size={14} /> {showAddForm ? "Cancel" : "Add"}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
              <Button variant="secondary" size="sm" onClick={() => navigate("/watchlist")}>
                <ExternalLink size={14} />
              </Button>
            </motion.div>
          </div>
        </div>
      </StaggerContainer>

      {/* Add / Edit Form */}
      {showAddForm && (
        <StaggerContainer>
          <Card variant="elevated" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 120px", minWidth: 100 }}>
                <CardLabel>Symbol</CardLabel>
                <Input
                  placeholder="BDO"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <CardLabel>Qty</CardLabel>
                <Input type="number" min="0" step="1" placeholder="100"
                  value={formShares} onChange={(e) => setFormShares(e.target.value)} />
              </div>
              <div style={{ flex: "0 1 120px" }}>
                <CardLabel>Avg Cost (₱)</CardLabel>
                <Input type="number" min="0" step="0.01" placeholder="2500"
                  value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
              </div>
              <div style={{ flex: "1 1 120px", minWidth: 100 }}>
                <CardLabel>Sector</CardLabel>
                <Input placeholder="Financials"
                  value={formSector} onChange={(e) => setFormSector(e.target.value)} />
              </div>
              <div style={{ flex: "0 1 140px" }}>
                <CardLabel>Date</CardLabel>
                <Input type="date" value={formBuyDate} onChange={(e) => setFormBuyDate(e.target.value)} />
              </div>
              <Button variant="primary" size="sm" onClick={editSymbol ? handleSaveEdit : handleAddHolding}>
                {editSymbol ? "Save" : "Add"}
              </Button>
            </div>
            {formError && (
              <p style={{ color: colors.marketRed, fontSize: "12px", margin: "8px 0 0 0" }}>
                {formError}
              </p>
            )}
          </Card>
        </StaggerContainer>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. PORTFOLIO SUMMARY CARD (60px height) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <StaggerContainer>
        <Card variant="elevated" style={{
          padding: 12,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap: 12,
          height: "auto",
          minHeight: "60px",
          alignItems: "center",
        }}>
          {/* Total Portfolio Value */}
          <div style={{ borderRight: isMobile ? "none" : `1px solid ${colors.hairline}`, paddingRight: isMobile ? 0 : 12 }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>
              Total Value
            </div>
            <PriceFlash value={perf.currentValue}>
              <div style={{
                fontSize: "18px",
                fontWeight: 700,
                color: colors.textPrimary,
                fontFamily: `"IBM Plex Mono", monospace`,
              }}>
                {formatPHP(perf.currentValue, true)}
              </div>
            </PriceFlash>
          </div>

          {/* Today's P&L */}
          <div style={{ borderRight: isMobile ? "none" : `1px solid ${colors.hairline}`, paddingRight: isMobile ? 0 : 12 }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>
              Today's P&L
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: `"IBM Plex Mono", monospace`, color: colors.textPrimary }}>
              <span style={{ color: colors.textSecondary }}>—</span>
            </div>
          </div>

          {/* Month's P&L */}
          <div style={{ borderRight: isMobile ? "none" : `1px solid ${colors.hairline}`, paddingRight: isMobile ? 0 : 12 }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>
              Month's P&L
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: `"IBM Plex Mono", monospace`, color: colors.textPrimary }}>
              <span style={{ color: colors.textSecondary }}>—</span>
            </div>
          </div>

          {/* YTD P&L */}
          <div style={{ borderRight: isMobile ? "none" : `1px solid ${colors.hairline}`, paddingRight: isMobile ? 0 : 12 }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>
              YTD P&L
            </div>
            <PriceFlash value={perf.totalGainAmount}>
              <div style={{
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: `"IBM Plex Mono", monospace`,
                color: perf.totalGainAmount >= 0 ? colors.marketGreen : colors.marketRed,
              }}>
                {perf.totalGainAmount >= 0 ? "+" : ""}{formatPHP(perf.totalGainAmount, true)} ({formatPercent(perf.totalGainPct)})
              </div>
            </PriceFlash>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {}}
              style={{
                padding: "8px 12px",
                fontSize: "11px",
                fontWeight: 500,
                color: colors.primary,
                background: "transparent",
                border: `1px solid ${colors.primary}`,
                borderRadius: "4px",
                cursor: "pointer",
                transition: `all ${animation.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary;
                e.currentTarget.style.color = colors.onPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = colors.primary;
              }}
            >
              Add Funds
            </motion.button>
          </div>
        </Card>
      </StaggerContainer>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. MAIN SECTION: Holdings Table + Asset Allocation Sidebar */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 280px", gap: 12, marginTop: 4 }}>
        {/* Holdings Table */}
        <StaggerContainer>
          <Card variant="elevated" style={{ padding: 0, overflow: "hidden" }}>
            {/* Table Header with Sort Controls */}
            <div style={{ padding: "12px 12px", borderBottom: `1px solid ${colors.hairline}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textSecondary }}>Holdings</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {["value", "pnl", "gainpct", "change"].map((criterion) => (
                    <button
                      key={criterion}
                      onClick={() => setSortBy(criterion as any)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: 500,
                        color: sortBy === criterion ? colors.primary : colors.textSecondary,
                        background: sortBy === criterion ? colors.surfaceElevated : "transparent",
                        border: `1px solid ${sortBy === criterion ? colors.primary : colors.hairline}`,
                        borderRadius: "3px",
                        cursor: "pointer",
                        transition: `all ${animation.fast}`,
                      }}
                    >
                      {criterion === "value" && "Value"}
                      {criterion === "pnl" && "P&L $"}
                      {criterion === "gainpct" && "Gain %"}
                      {criterion === "change" && "1D %"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.hairline}` }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Symbol</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Name</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Qty</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Avg Cost</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Price</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Value</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>P&L</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>%</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Act</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "24px 12px", textAlign: "center", color: colors.textSecondary, fontSize: "13px" }}>
                        No holdings. Add your first position above.
                      </td>
                    </tr>
                  ) : (
                    sortedHoldings.map((h, i) => {
                      const totalCost = h.avgBuyPrice * h.shares;
                      return (
                        <motion.tr
                          key={h.symbol}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          style={{
                            borderBottom: `1px solid ${colors.hairline}`,
                            transition: `background-color ${animation.fast}`,
                            cursor: "pointer",
                            height: "36px",
                          }}
                          onClick={() => navigate(`/stock/${h.symbol}`)}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceElevated}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ fontWeight: 700, color: colors.textPrimary, fontSize: "13px", fontFamily: `"IBM Plex Mono", monospace` }}>
                              {h.symbol}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", color: colors.textSecondary, fontSize: "12px" }}>
                            {h.sector}
                          </td>
                          <td style={{ padding: "8px 12px", color: colors.textPrimary, fontSize: "12px", textAlign: "right", fontFamily: `"IBM Plex Mono", monospace` }}>
                            {h.shares.toLocaleString()}
                          </td>
                          <td style={{ padding: "8px 12px", color: colors.textPrimary, fontSize: "12px", textAlign: "right", fontFamily: `"IBM Plex Mono", monospace` }}>
                            {formatPHP(h.avgBuyPrice)}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <PriceFlash value={h.currentPrice ?? 0}>
                              <span style={{ color: colors.textPrimary, fontSize: "12px", fontWeight: 500, fontFamily: `"IBM Plex Mono", monospace` }}>
                                {h.currentPrice ? formatPHP(h.currentPrice) : "—"}
                              </span>
                            </PriceFlash>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <PriceFlash value={h.totalValue ?? 0}>
                              <span style={{ color: colors.textPrimary, fontSize: "12px", fontWeight: 500, fontFamily: `"IBM Plex Mono", monospace` }}>
                                {formatPHP(h.totalValue ?? 0)}
                              </span>
                            </PriceFlash>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <PriceFlash value={h.unrealizedPnL ?? 0}>
                              <span style={{
                                color: (h.unrealizedPnL ?? 0) >= 0 ? colors.marketGreen : colors.marketRed,
                                fontSize: "12px",
                                fontWeight: 600,
                                fontFamily: `"IBM Plex Mono", monospace`,
                              }}>
                                {(h.unrealizedPnL ?? 0) >= 0 ? "+" : ""}{formatPHP(h.unrealizedPnL ?? 0)}
                              </span>
                            </PriceFlash>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <span style={{
                              color: (h.unrealizedPnLPct ?? 0) >= 0 ? colors.marketGreen : colors.marketRed,
                              fontSize: "12px",
                              fontWeight: 600,
                              fontFamily: `"IBM Plex Mono", monospace`,
                            }}>
                              {(h.unrealizedPnLPct ?? 0) >= 0 ? "+" : ""}{(h.unrealizedPnLPct ?? 0).toFixed(2)}%
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); handleUpdate(h.symbol); }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: colors.textSecondary,
                                  cursor: "pointer",
                                  padding: "2px",
                                  transition: `color ${animation.fast}`,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = colors.textPrimary}
                                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                              >
                                <Edit3 size={12} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); handleRemove(h.symbol); }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: colors.textSecondary,
                                  cursor: "pointer",
                                  padding: "2px",
                                  transition: `color ${animation.fast}`,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = colors.marketRed}
                                onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                              >
                                <Trash2 size={12} />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </StaggerContainer>

        {/* Asset Allocation Sidebar (Sticky) */}
        <StaggerContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Sector Allocation */}
            <Card variant="elevated" style={{ padding: 12 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Sectors
              </div>
              {sectorWeights.length === 0 ? (
                <p style={{ color: colors.textSecondary, fontSize: "11px", margin: 0 }}>—</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sectorWeights.slice(0, 5).map((sw, idx) => (
                    <div key={sw.sector}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ color: colors.textSecondary, fontSize: "11px", fontWeight: 500, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {sw.sector}
                        </span>
                        <span style={{ color: colors.textPrimary, fontSize: "11px", fontWeight: 700, fontFamily: `"IBM Plex Mono", monospace` }}>
                          {sw.weightPct}%
                        </span>
                      </div>
                      <div style={{
                        height: "4px",
                        borderRadius: "2px",
                        background: colors.hairline,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${sw.weightPct}%`,
                          height: "100%",
                          background: idx === 0 ? colors.primary : idx === 1 ? colors.accentBlue : idx === 2 ? colors.accentYellow : idx === 3 ? colors.accentGreen : colors.marketRed,
                          transition: `width ${animation.slow}`,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Diversification Score */}
            <Card variant="elevated" style={{ padding: 12 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Diversification
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 0",
              }}>
                <div style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: holdings.length >= 5 ? colors.marketGreen : holdings.length >= 3 ? colors.accentYellow : colors.marketRed,
                  fontFamily: `"IBM Plex Mono", monospace`,
                }}>
                  {holdings.length}
                </div>
                <div style={{
                  fontSize: "11px",
                  color: colors.textSecondary,
                  textAlign: "center",
                }}>
                  {holdings.length >= 5 ? "Well Diversified" : holdings.length >= 3 ? "Moderate" : "Low"}
                </div>
              </div>
            </Card>
          </div>
        </StaggerContainer>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. TABS: Holdings / Analytics */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <StaggerContainer>
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 4, borderBottom: `1px solid ${colors.hairline}`, paddingBottom: 8 }}>
          {["holdings", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 600,
                color: activeTab === tab ? colors.primary : colors.textSecondary,
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab ? `2px solid ${colors.primary}` : "none",
                cursor: "pointer",
                transition: `all ${animation.fast}`,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              {tab === "holdings" && "Activity"}
              {tab === "analytics" && "Analytics"}
            </button>
          ))}
        </div>
      </StaggerContainer>

      {/* Activity Feed Tab */}
      {activeTab === "holdings" && (
        <StaggerContainer>
          <Card variant="elevated" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.hairline}` }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Time</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Symbol</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Action</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Qty</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Price</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontSize: "11px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedActivity.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: colors.textSecondary, fontSize: "12px" }}>
                        No activity yet
                      </td>
                    </tr>
                  ) : (
                    paginatedActivity.map((act, i) => (
                      <tr key={act.id} style={{
                        borderBottom: `1px solid ${colors.hairline}`,
                        transition: `background-color ${animation.fast}`,
                        height: "36px",
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceElevated}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{ padding: "8px 12px", color: colors.textSecondary, fontSize: "12px", fontFamily: `"IBM Plex Mono", monospace` }}>
                          {act.time}
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: colors.textPrimary, fontSize: "12px", fontFamily: `"IBM Plex Mono", monospace` }}>
                          {act.symbol}
                        </td>
                        <td style={{ padding: "8px 12px", color: colors.textSecondary, fontSize: "12px" }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            background: act.action === "BUY" ? colors.marketGreenSoft : colors.accentRedSoft,
                            color: act.action === "BUY" ? colors.marketGreen : colors.accentRed,
                            fontSize: "10px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}>
                            {act.action}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: colors.textPrimary, fontSize: "12px", fontFamily: `"IBM Plex Mono", monospace` }}>
                          {act.quantity.toLocaleString()}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: colors.textPrimary, fontSize: "12px", fontFamily: `"IBM Plex Mono", monospace` }}>
                          {formatPHP(act.price)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: colors.textPrimary, fontSize: "12px", fontFamily: `"IBM Plex Mono", monospace`, fontWeight: 600 }}>
                          {formatPHP(act.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalActivityPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "12px", borderTop: `1px solid ${colors.hairline}` }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 10px",
                    fontSize: "11px",
                    color: currentPage === 1 ? colors.textSecondary : colors.primary,
                    background: "transparent",
                    border: `1px solid ${colors.hairline}`,
                    borderRadius: "3px",
                    cursor: currentPage === 1 ? "default" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1,
                  }}
                >
                  Prev
                </button>
                <span style={{ fontSize: "11px", color: colors.textSecondary }}>
                  {currentPage} / {totalActivityPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalActivityPages, currentPage + 1))}
                  disabled={currentPage === totalActivityPages}
                  style={{
                    padding: "6px 10px",
                    fontSize: "11px",
                    color: currentPage === totalActivityPages ? colors.textSecondary : colors.primary,
                    background: "transparent",
                    border: `1px solid ${colors.hairline}`,
                    borderRadius: "3px",
                    cursor: currentPage === totalActivityPages ? "default" : "pointer",
                    opacity: currentPage === totalActivityPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </Card>
        </StaggerContainer>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <StaggerContainer>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 12 }}>
            {/* Performance vs PSEi */}
            <Card variant="elevated" style={{ padding: 12 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Performance
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", justifyContent: "center", minHeight: "120px" }}>
                <div style={{ fontSize: "24px", fontWeight: 700, color: perf.totalGainPct >= 0 ? colors.marketGreen : colors.marketRed, fontFamily: `"IBM Plex Mono", monospace` }}>
                  {perf.totalGainPct >= 0 ? "+" : ""}{perf.totalGainPct.toFixed(2)}%
                </div>
                <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                  YTD Return
                </div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: 8 }}>
                  vs PSEi: <span style={{ color: colors.textPrimary, fontWeight: 600 }}>—</span>
                </div>
              </div>
            </Card>

            {/* Win Rate */}
            <Card variant="elevated" style={{ padding: 12 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Win Rate
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", justifyContent: "center", minHeight: "120px" }}>
                <div style={{ fontSize: "24px", fontWeight: 700, color: colors.primary, fontFamily: `"IBM Plex Mono", monospace` }}>
                  {holdings.filter(h => (currentPrices[h.symbol] ?? 0) > h.avgBuyPrice).length}/{holdings.length}
                </div>
                <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                  Gainers
                </div>
                <div style={{ fontSize: "11px", color: colors.textSecondary, marginTop: 8 }}>
                  {holdings.length > 0 ? `${(holdings.filter(h => (currentPrices[h.symbol] ?? 0) > h.avgBuyPrice).length / holdings.length * 100).toFixed(0)}%` : "—"}
                </div>
              </div>
            </Card>

            {/* Largest Gains */}
            <Card variant="elevated" style={{ padding: 12 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Largest Gains
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sortedHoldings
                  .sort((a, b) => (b.unrealizedPnLPct ?? 0) - (a.unrealizedPnLPct ?? 0))
                  .slice(0, 3)
                  .map((h) => (
                    <div key={h.symbol} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: `1px solid ${colors.hairline}` }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary, fontFamily: `"IBM Plex Mono", monospace` }}>
                        {h.symbol}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: colors.marketGreen, fontFamily: `"IBM Plex Mono", monospace` }}>
                        +{(h.unrealizedPnLPct ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Largest Losses */}
            <Card variant="elevated" style={{ padding: 12 }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Largest Losses
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sortedHoldings
                  .sort((a, b) => (a.unrealizedPnLPct ?? 0) - (b.unrealizedPnLPct ?? 0))
                  .slice(0, 3)
                  .map((h) => (
                    <div key={h.symbol} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: `1px solid ${colors.hairline}` }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary, fontFamily: `"IBM Plex Mono", monospace` }}>
                        {h.symbol}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: colors.marketRed, fontFamily: `"IBM Plex Mono", monospace` }}>
                        {(h.unrealizedPnLPct ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </StaggerContainer>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. AI PORTFOLIO EXPLANATION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {portfolioContext && (
        <StaggerContainer>
          <div style={{ marginTop: 8 }}>
            <ResearchAiExplanationPanel context={portfolioContext} />
          </div>
        </StaggerContainer>
      )}
    </motion.div>
  );
}
