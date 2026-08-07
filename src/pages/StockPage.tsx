import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Building2, TrendingUp, ChevronDown, ChevronUp, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { LazyBarChart, Bar, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "../components/DynamicChart";
import StockChart from "../components/StockChart";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardLabel } from "../ui/Card";
import { Stat } from "../ui/Stat";
import { useResponsiveValue } from "../ui/responsive";
import { PriceFlash } from "../ui/PriceFlash";
import { BrokerHandoffModal } from "../components/BrokerHandoffModal";
import { ThesisHistory } from "../components/ThesisHistory";
import { ChartErrorBoundary } from "../components/ChartErrorBoundary";
import { listAvailableBrokers } from "../commercial/BrokerHandoffService";
import { fallbackAnalysis, generateStockAnalysis } from "../services/llm/AIAnalysisService";
import type { AIAnalysis } from "../services/llm/AIAnalysisService";
import { colors, typography, radius, shadows } from "../design/tokens";
import { InteractiveButton, MetricCard } from "../ui/MicroInteractions";
import { useSeo } from "../frontend/seo/useSeo";
import { buildCompanySeo } from "../frontend/seo/companySeo";
import { NativeAd } from "../components/NativeAd";
import { OrderSimulator } from "../components/OrderSimulator";
import { FiftyTwoWeekRange } from "../components/FiftyTwoWeekRange";
import { getBoardLotSize, getTickSize } from "../utils/pseBoardLot";
import { formatNumber } from "../services/ui/dataFormatting";
import { toResearchAiContext } from "../components/ai-orchestrator/researchAiContext";
import {
  enrichResearchContextWithEvents,
  buildNewsEventPack,
} from "../components/ai-orchestrator/eventEvidenceAiContext";
import { buildEvidenceRetrievalAggregate } from "../systems/market-brain/evidenceRetrievalOrchestrator";
import { compressEventEvidencePack } from "../systems/market-brain/eventEvidencePack";
import type { EvidenceRetrievalAggregate } from "../research/contracts/evidenceRetrievalContracts";
import { EvidenceSummaryPanel } from "../ui/EvidenceSummaryPanel";
import { PriceSkeleton, ChartSkeleton, MetricsSkeleton, NewsSkeleton } from "../components/SkeletonLoader";

// ── Shared motion presets (mirrors ScannerPage's animation vocabulary) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

type StockResearchDetail = {
  symbol: string;
  companyName: string;
  exchange: "PSE" | "PSE";
  sector: string;
  industry: string;
  price: { current: number; changeAbs: number; changePercent: number; marketCap: number | null };
  fundamentals: {
    pe: number | null; industryPe: number | null; pb: number | null; dividendYield: number | null;
    eps: number | null; high52w?: number | null; low52w?: number | null;
    netMargin?: number | null; operatingMargin?: number | null; snapshotDate?: string | null;
  };
  roe: number | null; debtToEquity: number | null; revenueGrowth: number | null; profitGrowth: number | null;
  rsi: number | null;
  scores: { quality: number | null; valuation: number | null; growth: number | null; momentum: number | null; risk: number | null; health: number | null; riskAdjusted: number | null };
  confidenceMeter: number;
  timeline: Array<{ day: string; health: number }>;
  whatChanged: string[];
  sectorRelative: Array<{ label: string; company: string; sectorMedian: string }>;
  sectorComparison: Array<{ company: string; value: string; percentile: number; metric: string }>;
  description: string;
  companyProfile: { founded: string; ceo: string; hq: string; employees: string; website: string; isin: string; businessSegments: string[] };
  financials: {
    annual: { revenue: Array<{ period: string; value: number }>; profit: Array<{ period: string; value: number }>; ebitda: Array<{ period: string; value: number }> };
    quarterly: { revenue: Array<{ period: string; value: number }>; profit: Array<{ period: string; value: number }>; ebitda: Array<{ period: string; value: number }> };
  };
  /** Real when available — see PSEEdgeScraper.ts's ParsedOwnership. A PSE
   * Public Ownership Report only reports insider (directors/officers/
   * substantial shareholders, summed) vs public %, not a foreign/domestic
   * institutional split — that FII/DII breakdown was a leftover from an
   * India-market version of this codebase and isn't a real PSE disclosure
   * category, so it's gone rather than kept fabricated. */
  shareholding: Array<{ period: string; insiderPercent: number; publicPercent: number; outstandingShares: number | null }>;
  news: Array<{ headline: string; source: string; time: string; link?: string; publishedAt?: string }>;
  thesis: { thesis: string; bullCase: string; bearCase: string; whatToWatch: string; stance: "High conviction" | "Watch" | "Needs review" | "Risk rising" | "Avoid for now" };
  priceHistory: Record<string, Array<{ label?: string; price?: number; time?: string; open?: number; high?: number; low?: number; close?: number; volume?: number }>>;
  /** Whether financials/shareholding/thesis came from a real verified
   * source or an estimate — see apiRouter.ts's dataSources comment.
   * 'synthetic' means the figures are modeled from market cap and sector
   * medians, not real reported financials. */
  dataSources: { financials: string; shareholding: string; thesis: string; news: string };
};

const TIMEFRAMES = ["1W", "1M", "3M", "1Y", "5Y"] as const;
const FINANCIAL_METRICS = ["revenue", "profit", "ebitda"] as const;
const FINANCIAL_PERIODS = ["annual", "quarterly"] as const;
type FinancialMetric = (typeof FINANCIAL_METRICS)[number];
type FinancialPeriod = (typeof FINANCIAL_PERIODS)[number];

// API returns priceHistory with the same timeframe keys
function getApiTimeframe(uiTimeframe: string): string {
  return uiTimeframe; // API keys match UI keys exactly ('1W', '1M', '3M', '1Y', '5Y')
}

// Transform price history data to OHLC format for StockChart
function transformToOHLC(priceData: any[]): any[] {
  if (!priceData || !Array.isArray(priceData)) return [];

  return priceData.map((item, index) => {
    // Handle different date formats
    let timeValue = item.time || item.date || item.label;

    // Convert to YYYY-MM-DD format
    if (typeof timeValue === 'string' && timeValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Already in YYYY-MM-DD format
      // No change needed
    } else if (typeof timeValue === 'string' && timeValue.match(/^\d{2}-\d{2}$/)) {
      // Format like "07-07" (MM-DD) - construct full date for current year
      const today = new Date();
      const [month, day] = timeValue.split('-');
      const year = today.getFullYear();
      timeValue = `${year}-${month}-${day}`;
    } else if (typeof timeValue === 'number') {
      // Unix timestamp - convert to YYYY-MM-DD
      const date = new Date(timeValue * 1000);
      timeValue = date.toISOString().split('T')[0];
    } else if (!timeValue) {
      // No time value - generate one based on index (counting backward from today)
      const date = new Date();
      date.setDate(date.getDate() - (priceData.length - 1 - index));
      timeValue = date.toISOString().split('T')[0];
    } else {
      // Fallback - try to parse as date
      try {
        const date = new Date(timeValue);
        if (!isNaN(date.getTime())) {
          timeValue = date.toISOString().split('T')[0];
        }
      } catch (e) {
        // If all else fails, generate a date
        const date = new Date();
        date.setDate(date.getDate() - (priceData.length - 1 - index));
        timeValue = date.toISOString().split('T')[0];
      }
    }

    return {
      time: timeValue,
      open: item.open ?? item.price ?? 0,
      high: item.high ?? item.price ?? 0,
      low: item.low ?? item.price ?? 0,
      close: item.close ?? item.price ?? 0,
      volume: item.volume ?? 0
    };
  }).sort((a, b) => {
    // Sort by time in ascending order (required by Lightweight Charts)
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });
}

function formatNewsTime(value?: string): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  const minutesAgo = Math.round((Date.now() - timestamp) / 60000);
  if (minutesAgo < 60) return `${Math.max(minutesAgo, 1)}m ago`;
  if (minutesAgo < 1440) return `${Math.round(minutesAgo / 60)}h ago`;
  return `${Math.round(minutesAgo / 1440)}d ago`;
}

function formatDecimal(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

// ── Sticky Header (48px, shows on scroll past hero) ─────────────
function StickyHeader({ symbol, price, changeAbs, changePercent, trendColor }: {
  symbol: string; price: number; changeAbs: number; changePercent: number; trendColor: string;
}) {
  const isUp = changeAbs >= 0;
  return (
    <div className="stock-sticky-header" style={{
      position: "fixed", top: 0, left: 0, right: 0, height: "48px",
      background: colors.backdropGlassmorphic, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderBottom: `1px solid ${colors.hairlineSoft}`, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", opacity: 0, pointerEvents: "none",
      transition: "opacity 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ color: colors.textPrimary, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>
          {symbol}
        </span>
        <PriceFlash value={price}>
        <span style={{ color: colors.textPrimary, fontSize: "16px", fontWeight: 600 }}>
            ₱{formatNumber(price)}
          </span>
        </PriceFlash>
        <span style={{ color: trendColor, fontSize: "13px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {isUp ? "+" : ""}{formatDecimal(changeAbs, 2)} ({formatDecimal(changePercent, 2)}%)
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: colors.textTertiary, fontSize: "12px" }}>
        <span>⌘</span><span>K</span>
        <span style={{ marginLeft: "4px", color: colors.textSecondary }}>Commands</span>
      </div>
    </div>
  );
}

// ── Hero Section (centred, massive price) ────────────────────────
function HeroSection({ stock, isUp, trendColor }: { stock: StockResearchDetail; isUp: boolean; trendColor: string }) {
  const convictionLabel = stock.confidenceMeter >= 80 ? "Very Healthy" : stock.confidenceMeter >= 65 ? "Healthy" : stock.confidenceMeter >= 50 ? "Watch" : stock.confidenceMeter >= 35 ? "Needs Review" : "Risk Rising";
  const convictionColor = stock.confidenceMeter >= 65 ? colors.success : stock.confidenceMeter >= 50 ? colors.warning : stock.confidenceMeter >= 35 ? colors.marketOrange : colors.danger;
  const boardLotSize = getBoardLotSize(stock.price.current);
  const boardTickSize = getTickSize(stock.price.current);
  return (
    <section className="stock-hero raycast-slideUp" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0 40px", textAlign: "center", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <Badge value={60} label={stock.exchange} />
        <span style={{ color: colors.textSecondary, fontSize: "14px", fontWeight: 500 }}>{stock.companyName}</span>
      </div>
      <div style={{ fontSize: useResponsiveValue("40px", "64px"), fontWeight: 700, color: colors.textPrimary, lineHeight: "1.1", letterSpacing: "-0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <PriceFlash value={stock.price.current}>₱{formatNumber(stock.price.current)}</PriceFlash>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ color: trendColor, fontSize: "18px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {isUp ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
          {isUp ? "+" : ""}{formatDecimal(stock.price.changeAbs, 2)} ({formatDecimal(stock.price.changePercent, 2)}%)
        </div>
        <div className="raycast-badgePulse" style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px",
          borderRadius: radius.full, border: `1px solid ${convictionColor}40`,
          background: `${convictionColor}14`, fontSize: "13px", fontWeight: 600,
          color: convictionColor,
        }}>
          <span>{convictionLabel}</span>
        </div>
      </div>
      <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "10px" }}>
        Market Cap: {stock.price.marketCap != null ? `₱${formatNumber(Math.round(stock.price.marketCap / 1_000_000))}M` : "—"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px",
          borderRadius: radius.full, border: `1px solid ${colors.hairlineSoft}`,
          background: colors.surface, fontSize: "12px", fontWeight: 600, color: colors.textSecondary,
        }}>
          PSE Board Lot: {boardLotSize.toLocaleString()} shares
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px",
          borderRadius: radius.full, border: `1px solid ${colors.hairlineSoft}`,
          background: colors.surface, fontSize: "12px", fontWeight: 600, color: colors.textSecondary,
        }}>
          Tick: ₱{boardTickSize}
        </span>
      </div>
      <FiftyTwoWeekRange oneYearSeries={stock.priceHistory?.["1Y"] ?? []} currentPrice={stock.price.current} />
    </section>
  );
}// ── Healthometer (120px ring, color-coded, driver expansion) ─────
function Healthometer({ score, confidence, stance, timeline, factorScores }: {
  score: number; confidence: number; stance: string; timeline: Array<{ day: string; health: number }>;
  factorScores: { quality: number; valuation: number; growth: number; momentum: number; risk: number };
}) {
  const [expanded, setExpanded] = useState(false);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const ringColor = score >= 75 ? colors.success : score >= 50 ? colors.warning : colors.danger;

  // One-shot sweep-in on first mount only. After that, render the live score
  // directly — this stays correct even if `score` updates rapidly from a
  // polling/live-price source, unlike a naive "animate from previous prop"
  // approach that can get stuck mid-tween if the value changes faster than
  // the animation completes.
  const [displayScore, setDisplayScore] = useState(0);
  const hasSweptRef = useRef(false);
  useEffect(() => {
    if (hasSweptRef.current) { setDisplayScore(Math.round(score)); return; }
    hasSweptRef.current = true;
    const target = Math.round(score);
    const totalFrames = 45;
    let frame = 0;
    let raf: number;
    const tick = () => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(target * easeOut));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  const previousScore = timeline[timeline.length - 2]?.health ?? score;
  const trend = score > previousScore ? "improving" : score < previousScore ? "declining" : "stable";
  const trendLabel = trend === "improving" ? "IMPROVING" : trend === "declining" ? "DECLINING" : "STABLE";
  const trendColor = trend === "improving" ? colors.success : trend === "declining" ? colors.danger : colors.textSecondary;

  const drivers = [
    { label: "Quality", value: factorScores.quality ?? 0, max: 100 },
    { label: "Valuation", value: factorScores.valuation ?? 0, max: 100 },
    { label: "Growth", value: factorScores.growth ?? 0, max: 100 },
    { label: "Momentum", value: factorScores.momentum ?? 0, max: 100 },
    { label: "Risk Mgmt", value: factorScores.risk ?? 0, max: 100 },
  ];

  return (
    <Card className="stock-healthometer-card">
      <CardLabel>Healthometer Score</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div style={{ position: "relative", width: "132px", height: "132px" }}>
          <svg width="132" height="132" viewBox="0 0 132 132" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="healthometer-arc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={ringColor} stopOpacity="0.55" />
                <stop offset="100%" stopColor={ringColor} stopOpacity="1" />
              </linearGradient>
              <filter id="healthometer-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Tick marks at 0/25/50/75/100 — Apple-Watch-activity-ring language */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const angle = (tick / 100) * 360;
              const rad = (angle * Math.PI) / 180;
              const x1 = 66 + 60 * Math.cos(rad);
              const y1 = 66 + 60 * Math.sin(rad);
              const x2 = 66 + 54 * Math.cos(rad);
              const y2 = 66 + 54 * Math.sin(rad);
              return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.hairlineStrong} strokeWidth="1.5" />;
            })}
            <circle cx="66" cy="66" r="54" fill="none" stroke={colors.border} strokeWidth="8" />
            <circle cx="66" cy="66" r="54" fill="none" stroke="url(#healthometer-arc-gradient)" strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              filter="url(#healthometer-glow)"
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          </svg>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "34px", fontWeight: 700, color: colors.textPrimary, lineHeight: "1", fontFeatureSettings: typography.fontFeature }}>
              {displayScore}
            </span>
            <span style={{ fontSize: "11px", color: colors.textSecondary, marginTop: "2px" }}>/100</span>
          </div>
        </div>
        <div className="raycast-badgePulse" style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px",
          borderRadius: radius.full, border: `1px solid ${trendColor}30`, background: `${trendColor}12`,
          fontSize: "11px", fontWeight: 600, color: trendColor, letterSpacing: "0.04em",
        }}>
          <span>{trend === "improving" ? "▲" : trend === "declining" ? "▼" : "●"}</span>
          <span>{trendLabel}</span>
          <span style={{ color: colors.textTertiary, fontWeight: 400 }}>
            Was {previousScore} → {Math.round(score)} {trend === "improving" ? "↗" : trend === "declining" ? "↘" : "→"}
          </span>
        </div>
        <div className="stock-confidence-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: "12px", color: colors.textSecondary }}>Stance:</span>
          <span style={{
            fontSize: "12px", fontWeight: 600,
            color: stance === "High conviction" ? colors.success : stance === "Risk rising" ? colors.danger : colors.warning,
          }}>
            {stance}
          </span>
          <span style={{ fontSize: "12px", color: colors.textSecondary }}>· Confidence: {confidence}%</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            border: "none", background: "transparent", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: "4px",
            color: colors.textSecondary, fontSize: "12px", padding: 0,
          }}
        >
          {expanded ? "Hide" : "Show"} score drivers
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="stock-drivers" style={{ marginTop: "20px", display: "grid", gap: "10px" }}>
          {drivers.map((driver) => (
            <div key={driver.label} className="raycast-slideUp" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ width: "80px", fontSize: "12px", fontWeight: 500, color: colors.textSecondary }}>{driver.label}</span>
              <div style={{ flex: 1, height: "6px", background: colors.border, borderRadius: radius.full, overflow: "hidden" }}>
                <div style={{ width: `${driver.value}%`, height: "100%", background: ringColor, borderRadius: radius.full,
                  transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              </div>
              <span style={{ width: "36px", fontSize: "11px", fontWeight: 500, color: colors.textPrimary, textAlign: "right" }}>{driver.value}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}// ── Ring (smaller, for score overview) ───────────────────────────
function Ring({ label, value, size = 80 }: { label: string; value: number; size?: number }) {
  const r = size * 0.4;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const ringColor = value >= 75 ? colors.success : value >= 50 ? colors.warning : colors.danger;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: "8px" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={size * 0.2} fontWeight="600" fill={colors.textPrimary}>
          {Math.round(value)}
        </text>
      </svg>
      <span style={{ color: colors.textSecondary, fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function StockSkeleton() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ display: "grid", gap: "24px", maxWidth: 1200, margin: "0 auto" }}
    >
      <motion.div variants={fadeUp} transition={pageTransition}>
        <PriceSkeleton />
      </motion.div>
      <motion.div variants={fadeUp} transition={pageTransition}>
        <ChartSkeleton height={420} />
      </motion.div>
      <div className="stock-analytical-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "20px" }}>
        <motion.div variants={fadeUp} transition={pageTransition}>
          <MetricsSkeleton />
        </motion.div>
        <motion.div variants={fadeUp} transition={pageTransition}>
          <NewsSkeleton />
        </motion.div>
      </div>
    </motion.div>
  );
}

function StockError({ symbol, onRetry }: { symbol: string; onRetry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
      style={{
        maxWidth: 480, margin: "80px auto", padding: "32px", textAlign: "center",
        border: `1px solid ${colors.border}`, borderRadius: radius.lg, background: colors.card,
        display: "grid", gap: "12px", justifyItems: "center",
      }}
    >
      <div style={{
        width: "44px", height: "44px", borderRadius: radius.full, background: `${colors.warning}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AlertCircle size={22} color={colors.warning} />
      </div>
      <div style={{ color: colors.textPrimary, fontSize: "15px", fontWeight: 600 }}>
        We couldn't load research for {symbol}
      </div>
      <p style={{ color: colors.textSecondary, fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
        The live PSE data feed may be briefly unavailable. This isn't a sign of missing data — just try again in a moment.
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRetry}
          style={{
            marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "8px 16px", borderRadius: radius.full, border: `1px solid ${colors.border}`,
            background: colors.fill, color: colors.textPrimary, fontSize: "13px", fontWeight: 500, cursor: "pointer",
          }}
        >
          <RefreshCw size={14} /> Try again
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * The API returns a single flat daily series (`priceChart`), not pre-bucketed
 * per timeframe. Slice it into the {1W, 1M, 3M, 1Y, 5Y} shape the chart expects,
 * newest-last (the series already comes in ascending date order).
 */
function buildPriceHistoryFromFlatSeries(
  flatSeries: Array<{ date?: string; time?: string; close?: number; price?: number; volume?: number }>
): Record<string, Array<{ time?: string; close?: number; volume?: number }>> {
  if (!Array.isArray(flatSeries) || flatSeries.length === 0) return {};
  const TRADING_DAYS = { "1W": 5, "1M": 21, "3M": 63, "1Y": 252, "5Y": Infinity };
  const bucketed: Record<string, Array<{ time?: string; close?: number; volume?: number }>> = {};
  for (const [key, days] of Object.entries(TRADING_DAYS)) {
    const slice = Number.isFinite(days) ? flatSeries.slice(-days) : flatSeries;
    bucketed[key] = slice.map((point) => ({
      time: point.time ?? point.date,
      close: point.close ?? point.price,
      volume: point.volume,
    }));
  }
  return bucketed;
}

/** Normalize both API and local fallback data to StockPage's StockResearchDetail shape */
function normalizeStockData(raw: Record<string, any>): StockResearchDetail {
  // Map price field if it's flat vs nested
  const priceData = raw.price
    ? typeof raw.price === 'object' ? raw.price : { current: raw.price, changeAbs: 0, changePercent: 0, marketCap: raw.marketCap ?? null }
    : { current: 0, changeAbs: 0, changePercent: 0, marketCap: raw.marketCap ?? null };

  return {
    symbol: raw.symbol ?? "",
    companyName: raw.companyName ?? raw.name ?? "",
    exchange: raw.exchange ?? "PSE",
    sector: raw.sector ?? "",
    industry: raw.industry ?? "",
    price: {
      current: priceData.current ?? raw.price ?? 0,
      changeAbs: priceData.changeAbs ?? raw.change ?? 0,
      changePercent: priceData.changePercent ?? raw.changePercent ?? 0,
      marketCap: priceData.marketCap ?? raw.marketCap ?? null,
    },
    fundamentals: {
      pe: raw.fundamentals?.pe ?? raw.pe ?? null,
      industryPe: raw.fundamentals?.industryPe ?? raw.industryPe ?? null,
      pb: raw.fundamentals?.pb ?? raw.pb ?? null,
      dividendYield: raw.fundamentals?.dividendYield ?? raw.dividendYield ?? null,
      eps: raw.fundamentals?.eps ?? raw.eps ?? null,
      high52w: raw.fundamentals?.high52w ?? raw.high52w ?? null,
      low52w: raw.fundamentals?.low52w ?? raw.low52w ?? null,
      netMargin: raw.fundamentals?.netMargin ?? raw.net_margin ?? null,
      operatingMargin: raw.fundamentals?.operatingMargin ?? raw.operating_margin ?? null,
      snapshotDate: raw.fundamentals?.snapshotDate ?? raw.snapshot_date ?? null,
    },
    roe: raw.fundamentals?.roe ?? raw.roe ?? null,
    debtToEquity: raw.fundamentals?.debtToEquity ?? raw.debtToEquity ?? null,
    revenueGrowth: raw.fundamentals?.revenueGrowth ?? raw.revenueGrowth ?? null,
    profitGrowth: raw.fundamentals?.profitGrowth ?? raw.profitGrowth ?? null,
    rsi: raw.rsi ?? null,
    scores: raw.scores ?? { quality: null, valuation: null, growth: null, momentum: null, risk: null, health: null, riskAdjusted: null },
    confidenceMeter: raw.confidenceMeter ?? 0,
    timeline: raw.timeline ?? [],
    whatChanged: raw.whatChanged ?? [],
    sectorRelative: raw.sectorRelative ?? [],
    sectorComparison: raw.sectorComparison ?? (raw.sectorRelative ?? []).map((item: any) => ({
      company: item.company,
      value: item.sectorMedian ?? item.value ?? "",
      percentile: parseInt(item.sectorMedian ?? item.value) || 0,
      metric: item.label ?? item.metric ?? "",
    })),
    description: raw.description ?? "",
    companyProfile: raw.companyProfile ?? {
      founded: raw.founded ?? "",
      ceo: raw.ceo ?? "",
      hq: raw.hq ?? "",
      employees: raw.employees ?? "",
      website: raw.website ?? "",
      isin: raw.isin ?? "",
      businessSegments: raw.businessSegments ?? [],
    },
    financials: raw.financials ?? { annual: { revenue: [], profit: [], ebitda: [] }, quarterly: { revenue: [], profit: [], ebitda: [] } },
    shareholding: raw.shareholding ?? [],
    news: raw.news ?? [],
    thesis: raw.thesis ?? { thesis: "", bullCase: "", bearCase: "", whatToWatch: "", stance: "Watch" },
    priceHistory: raw.priceHistory ?? buildPriceHistoryFromFlatSeries(raw.priceChart ?? []),
    dataSources: raw.dataSources ?? { financials: "synthetic", shareholding: "synthetic", thesis: "synthetic", news: "unavailable" },
  };
}

function StockView({ stock, financialChartData, shareholding, shareholdingSeries, period: initialPeriod }: {
  stock: StockResearchDetail;
  financialChartData: { period: string; value: number }[];
  shareholding?: { period: string; insiderPercent: number; publicPercent: number; outstandingShares: number | null };
  shareholdingSeries: { period: string; insiderPercent: number; publicPercent: number; outstandingShares: number | null }[];
  period: string;
}) {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [ai, setAi] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1Y");
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [techIndicator, setTechIndicator] = useState<"none" | "sma" | "rsi" | "macd">("none");
  const [newsFilter, setNewsFilter] = useState<"all" | "positive" | "negative">("all");
  const [showFinancialTable, setShowFinancialTable] = useState(false);
  const [financialMetric, setFinancialMetric] = useState<FinancialMetric>("revenue");
  const [financialPeriod, setFinancialPeriod] = useState<FinancialPeriod>("annual");
  const [isBrokerOpen, setIsBrokerOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const [gpuDelta, setGpuDelta] = useState<{ delta: number; signal: string } | null>(null);

  const [period, setPeriod] = useState(initialPeriod);
  const availableBrokers = listAvailableBrokers();
  const selectedBroker = availableBrokers[0]?.name ?? null;
  const sectionGap = useResponsiveValue("48px", "80px");
  const isUp = (stock?.price?.changeAbs ?? 0) >= 0;
  const trendColor = isUp ? colors.success : colors.danger;
  const shareholdingSeriesArr = Array.isArray(shareholdingSeries) ? shareholdingSeries : [];
  const effectiveShareholding = shareholding ?? shareholdingSeriesArr.find((item) => item.period === period) ?? shareholdingSeriesArr[0];
  const selectedFinancialSeries = stock.financials?.[financialPeriod]?.[financialMetric] ?? [];
  const effectiveChartData = (financialChartData?.length ?? 0) > 0 ? financialChartData : (selectedFinancialSeries ?? []).map((item: any) => ({ period: item?.period || "N/A", value: Math.round(item?.value || 0) }));
  const newsItems = (stock.news ?? []).slice(0, 7);
  const filteredNews = newsFilter === "all" ? newsItems : (newsItems ?? []).filter((n: any) => n?.sentiment === newsFilter);
  const disclaimer = "StockEx research is for informational purposes only and is not investment advice.";
  const fundamentals = stock.fundamentals ?? {};
  // Data-quality flags driving the Verified/Estimated badges (Task 3).
  const financialsReal = stock.dataSources.financials === "real" || stock.dataSources.financials === "pseApi";
  const financialsRealQuarterCount = stock.financials?.quarterly?.revenue?.length ?? 0;
  const shareholdingReal = stock.dataSources.shareholding === "real" || stock.dataSources.shareholding === "pseApi";
  const newsReal = stock.dataSources.news === "real";
  const newsFromDisclosures = stock.dataSources.news === "disclosures";
  const companyProfile = stock.companyProfile ?? {
    founded: "—",
    ceo: "—",
    hq: "—",
    employees: "—",
    website: "—",
    isin: "—",
    businessSegments: [],
  };
  const sectorRelativeItems = stock.sectorRelative ?? [];

  // Sector relative lookup for metric subtitles
  const sectorRelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of sectorRelativeItems) {
      map[item.label.toLowerCase()] = item.sectorMedian;
    }
    return map;
  }, [sectorRelativeItems]);

  // AI analysis
  useEffect(() => {
    let cancelled = false;
    const scores = {
      quality: stock.scores.quality ?? 50, valuation: stock.scores.valuation ?? 50,
      growth: stock.scores.growth ?? 50, risk: stock.scores.risk ?? 50, technical: stock.scores.momentum ?? 50,
    };
    setAiLoading(true);
    setAiError(null);
    generateStockAnalysis(stock.symbol, stock.companyName, stock.price.current, scores, stock.thesis?.thesis)
      .then((result) => { if (!cancelled) { setAi(result); setAiError(null); setAiLoading(false); } })
      .catch((err) => {
        if (!cancelled) {
          console.error('AI analysis error:', err);
          setAi(fallbackAnalysis(scores));
          setAiError('AI analysis unavailable - showing fallback analysis');
          setAiLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [stock.symbol]);

  // GPU order-flow delta from WebWorker via shared pool (Phase 43)
  useEffect(() => {
    const symbol = stock.symbol;
    if (!symbol) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/v1/fo/scanner/${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (cancelled || !data.success || !data.heavyStrikes) return;

        const callVols = data.heavyStrikes
          .filter((s: any) => s.option_type === "CE")
          .map((s: any) => Number(s.open_interest));
        const putVols = data.heavyStrikes
          .filter((s: any) => s.option_type === "PE")
          .map((s: any) => Number(s.open_interest));

        // GPU order flow disabled (synthetic data)
      } catch {
        // Graceful degradation
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stock.symbol]);

  // Sticky header scroll direction observer
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDirection = currentScrollY > lastScrollY ? "down" : "up";
      lastScrollY = currentScrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setStickyVisible(currentScrollY > 300 && scrollDirection === "up");
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // Native ads
  const nativeAdSlots = [
    { type: "ad" as const, id: "ad1", data: { icon: "P", title: "Track your portfolio like a pro", subtitle: "Get timely alerts and expert analysis", cta: "Try StockEX Pro" } },
    { type: "ad" as const, id: "ad2", data: { icon: "S", title: "Smart stock screening", subtitle: "Find the next multi-bagger before the crowd", cta: "Start free trial" } },
  ];
  const newsFeedWithAds = (filteredNews ?? []).reduce<Array<{ type: "news" | "ad"; id: string; data: any }>>((acc, item, idx) => {
    if (item) {
      acc.push({ type: "news", id: `n-${idx}`, data: item });
      if (idx === 2) acc.push(nativeAdSlots[0]);
      if (idx === 6) acc.push(nativeAdSlots[1]);
    }
    return acc;
  }, []);

  const factorBadges = [
    { label: "Quality", value: stock.scores.quality ?? 0 },
    { label: "Valuation", value: stock.scores.valuation ?? 0 },
    { label: "Growth", value: stock.scores.growth ?? 0 },
    { label: "Momentum", value: stock.scores.momentum ?? 0 },
    { label: "Risk", value: stock.scores.risk ?? 0 },
  ];
  const researchContext = toResearchAiContext({
    symbol: stock.symbol,
    companyName: stock.companyName,
    headline: stock.thesis.thesis,
    thesis: [stock.thesis.bullCase],
    risksToReview: [stock.thesis.bearCase],
    whatToWatch: [stock.thesis.whatToWatch],
    methodNote: "Summary based on the signals shown on this page.",
  }, "stock");

  // Enrich both contexts with real news event evidence for LLM grounding
  const newsEventPack = buildNewsEventPack(stock.symbol, stock.news);
  const enrichedResearchContext = researchContext
    ? (enrichResearchContextWithEvents(researchContext, newsEventPack) ?? researchContext)
    : null;

  // Async enrich with full evidence retrieval (filings, corp actions, alerts, results)
  const [retrievalContext, setRetrievalContext] = useState<string | null>(null);
  const [evidenceAggregate, setEvidenceAggregate] = useState<EvidenceRetrievalAggregate | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await buildEvidenceRetrievalAggregate(stock.symbol, { symbol: stock.symbol, maxPerSource: 8, lookbackDays: 90 });
        if (!cancelled) {
          setEvidenceAggregate(result.aggregate);
          setRetrievalContext(compressEventEvidencePack(result.pack));
        }
      } catch { /* graceful degradation */ }
    })();
    return () => { cancelled = true; };
  }, [stock.symbol]);

  // Append full retrieval context when available
  const finalResearchContext: typeof enrichedResearchContext = enrichedResearchContext && retrievalContext
    ? { ...enrichedResearchContext, extraContext: [enrichedResearchContext.extraContext, retrievalContext].filter(Boolean).join('\n') }
    : enrichedResearchContext;
  return (
    <div className="stock-page" style={{ display: "grid", gap: sectionGap }}>

      {/* ── Sticky Header ── */}
      <StickyHeader symbol={stock.symbol} price={stock.price.current} changeAbs={stock.price.changeAbs}
        changePercent={stock.price.changePercent} trendColor={trendColor} />
      <style>{`
        .stock-sticky-header { transition: opacity 0.25s ease, transform 0.25s ease; opacity: ${stickyVisible ? "1" : "0"} !important; pointer-events: ${stickyVisible ? "auto" : "none"}; transform: translateY(${stickyVisible ? "0" : "-8px"}); }
        /* Intentionally empty — live indicator removed per trust cleanup */
      `}</style>

      {/* ── Hero Section ── */}
      <div ref={heroRef}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.955 }}
            transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              border: `1px solid ${colors.glassBorder}`,
              background: colors.glassBg,
              backdropFilter: colors.glassBlur,
              WebkitBackdropFilter: colors.glassBlur,
              boxShadow: `inset 0 1px 0 ${colors.glassBorderTop}`,
              padding: "6px 12px",
              borderRadius: radius.full,
              display: "inline-flex", alignItems: "center",
              gap: "6px", color: colors.textSecondary, cursor: "pointer", fontSize: "13px", fontWeight: 500,
              transition: "background 180ms ease, border-color 180ms ease, color 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.glassBorderTop;
              e.currentTarget.style.background = colors.glassBgStrong;
              e.currentTarget.style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.glassBorder;
              e.currentTarget.style.background = colors.glassBg;
              e.currentTarget.style.color = colors.textSecondary;
            }}
          >
            <ArrowLeft size={15} /><span>Back</span>
          </motion.button>
        </div>
        <HeroSection stock={stock} isUp={isUp} trendColor={trendColor} />
        {gpuDelta && (
          <div style={{
            marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "6px 14px", borderRadius: "8px", background: colors.fill,
            border: `1px solid ${colors.border}`, fontSize: "11px",
          }}>
            <span style={{ color: colors.textTertiary }}>GPU Delta:</span>
            <strong style={{
              color: gpuDelta.signal.includes("BULLISH") ? colors.success
                : gpuDelta.signal.includes("BEARISH") ? colors.danger
                : colors.textSecondary,
            }}>
              {gpuDelta.signal.replace(/_/g, " ")}
            </strong>
            <span style={{ color: colors.textTertiary }}>({gpuDelta.delta.toLocaleString("en-PH")})</span>
          </div>
        )}
      </div>

      {/* ── Price Chart ── */}
      <Card className="stock-chart-card raycast-slideUp" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        <div className="stock-chart-toolbar" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "4px", background: colors.fill, borderRadius: radius.full, padding: "2px" }}>
            <motion.button
              aria-label="Show line chart"
              onClick={() => setChartType("line")}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              style={{ padding: "6px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: chartType === "line" ? colors.primary : "transparent", color: chartType === "line" ? colors.onPrimary : colors.textSecondary }}>
              Line
            </motion.button>
            <motion.button
              aria-label="Show candlestick chart"
              onClick={() => setChartType("candle")}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              style={{ padding: "6px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: chartType === "candle" ? colors.primary : "transparent", color: chartType === "candle" ? colors.onPrimary : colors.textSecondary }}>
              Candle
            </motion.button>
          </div>
          <div style={{ display: "flex", gap: "4px", width: "100%" }}>
            {TIMEFRAMES.map((value) => (
              <Button key={value} variant={value === timeframe ? "primary" : "tertiary"} onClick={() => setTimeframe(value)}>{value}</Button>
            ))}
          </div>
        </div>
        <ChartErrorBoundary>
          <div style={{ width: "100%", height: "500px", backgroundColor: colors.card, borderRadius: "8px", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
            <StockChart
              symbol={stock.symbol}
              ohlcData={transformToOHLC(stock.priceHistory?.[getApiTimeframe(timeframe)] ?? [])}
              timeframe={timeframe as any}
              showIndicators={true}
              height={480}
            />
          </div>
        </ChartErrorBoundary>
      </Card>      {/* ── Analytical Dashboard Grid ── */}
      <div className="stock-analytical-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "20px", alignItems: "start" }}>
      {/* ── Healthometer + Score Overview ── */}
      <section className="stock-score-grid raycast-slideUp" style={{ animationDelay: "0.1s", animationFillMode: "both", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        <Healthometer
          score={stock.scores.health ?? 0}
          confidence={stock.confidenceMeter}
          stance={stock.thesis.stance}
          timeline={stock.timeline}
          factorScores={{
            quality: stock.scores.quality ?? 0,
            valuation: stock.scores.valuation ?? 0,
            growth: stock.scores.growth ?? 0,
            momentum: stock.scores.momentum ?? 0,
            risk: stock.scores.risk ?? 0,
          }}
        />
        <Card className="stock-panel-card">
          <CardLabel>Factor breakdown</CardLabel>
          <div style={{ display: "flex", justifyContent: "space-around", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
            <Ring label="Health" value={stock.scores.health ?? 0} />
            <Ring label="Risk Adj" value={stock.scores.riskAdjusted ?? stock.scores.health ?? 0} />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {factorBadges.map((factor) => (
              <Badge key={factor.label} value={factor.value} label={factor.label} />
            ))}
          </div>
        </Card>
      </section>

      {/* ── Evidence Summary Panel ── */}
      {evidenceAggregate && evidenceAggregate.totalItems > 0 ? (
        <section className="raycast-slideUp" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <EvidenceSummaryPanel aggregate={evidenceAggregate} title="Deterministic Evidence" />
        </section>
      ) : null}

      {/* ── Key Metrics Grid — grouped by theme instead of one flat wall of numbers ── */}
      <Card className="stock-metrics-card raycast-slideUp" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        <CardLabel>Key metrics</CardLabel>
        <p style={{ color: colors.textSecondary, fontSize: "11.5px", margin: "2px 0 12px 0", lineHeight: 1.5 }}>
          {fundamentals.netMargin != null || stock.roe != null || fundamentals.eps != null
            ? "EPS, ROE, margins, growth and debt/equity are real figures from the latest PSE Edge disclosure."
            : stock.dataSources.financials === "pseApi"
            ? "All figures on this card and in the Financials chart are real reported PSE Edge filing data."
            : stock.dataSources.financials === "partial-real"
            ? "EPS, ROE, and Debt/Equity are from a real PSE Edge filing. Everything else on this card (PE, PB, dividend yield, growth rates) is still a sector-based estimate."
            : "No verified free source for this company's real fundamentals is wired in yet — values shown are sector-based estimates."}
          {fundamentals.snapshotDate ? (
            <span style={{ opacity: 0.7 }}> Last filed {fundamentals.snapshotDate}.</span>
          ) : null}
        </p>

        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.textSecondary, marginTop: "4px", marginBottom: "10px" }}>
          Size &amp; valuation
        </div>
        <div className="stock-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <MetricCard label="Market Cap" value={stock.price.marketCap != null ? `₱${formatNumber(Math.round(stock.price.marketCap / 1_000_000))}M` : "—"} />
          <MetricCard label="PE (TTM)" value={formatDecimal(fundamentals.pe, 1)}
            trend={fundamentals.pe != null && fundamentals.pe < 20 ? "up" : fundamentals.pe != null && fundamentals.pe > 30 ? "down" : "neutral"}
            subtitle={fundamentals.industryPe != null ? `Sector: ${formatDecimal(fundamentals.industryPe, 1)}` : sectorRelMap["pe"] ? `Sector: ${sectorRelMap["pe"]}` : undefined} />
          <MetricCard label="PB Ratio" value={formatDecimal(fundamentals.pb, 1)}
            trend={fundamentals.pb != null && fundamentals.pb < 3 ? "up" : fundamentals.pb != null && fundamentals.pb > 5 ? "down" : "neutral"} />
          <MetricCard label="Dividend Yield" value={fundamentals.dividendYield != null ? `${formatDecimal(fundamentals.dividendYield, 2)}%` : "—"}
            trend={fundamentals.dividendYield != null && fundamentals.dividendYield > 1 ? "up" : "neutral"} />
        </div>

        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.textSecondary, marginBottom: "10px" }}>
          Profitability &amp; growth
        </div>
        <div className="stock-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <MetricCard label="ROE" value={stock.roe != null ? `${formatDecimal(stock.roe, 1)}%` : "—"}
            trend={stock.roe != null && stock.roe > 15 ? "up" : stock.roe != null ? "down" : "neutral"}
            subtitle={sectorRelMap["roe"] ? `Sector: ${sectorRelMap["roe"]}` : undefined} />
          <MetricCard label="Revenue Growth" value={stock.revenueGrowth != null ? `${formatDecimal(stock.revenueGrowth, 1)}%` : "—"}
            trend={stock.revenueGrowth != null && stock.revenueGrowth > 10 ? "up" : stock.revenueGrowth != null ? "down" : "neutral"}
            subtitle={sectorRelMap["revenue growth"] ? `Sector: ${sectorRelMap["revenue growth"]}` : undefined} />
          <MetricCard label="Profit Growth" value={stock.profitGrowth != null ? `${formatDecimal(stock.profitGrowth, 1)}%` : "—"}
            trend={stock.profitGrowth != null && stock.profitGrowth > 10 ? "up" : stock.profitGrowth != null ? "down" : "neutral"} />
          <MetricCard label="Net Margin" value={fundamentals.netMargin != null ? `${formatDecimal(fundamentals.netMargin, 1)}%` : "—"}
            trend={fundamentals.netMargin != null && fundamentals.netMargin > 15 ? "up" : fundamentals.netMargin != null && fundamentals.netMargin < 0 ? "down" : "neutral"} />
          <MetricCard label="Operating Margin" value={fundamentals.operatingMargin != null ? `${formatDecimal(fundamentals.operatingMargin, 1)}%` : "—"}
            trend={fundamentals.operatingMargin != null && fundamentals.operatingMargin > 15 ? "up" : fundamentals.operatingMargin != null ? "down" : "neutral"} />
          <MetricCard label="EPS (TTM)" value={fundamentals.eps != null ? `₱${formatDecimal(fundamentals.eps, 1)}` : "—"} />
        </div>

        <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.textSecondary, marginBottom: "10px" }}>
          Risk &amp; price range
        </div>
        <div className="stock-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <MetricCard label="Debt/Equity" value={formatDecimal(stock.debtToEquity, 2)}
            trend={stock.debtToEquity != null && stock.debtToEquity < 0.5 ? "up" : stock.debtToEquity != null && stock.debtToEquity > 1 ? "down" : "neutral"} />
          <MetricCard label="RSI (14)" value={stock.rsi != null ? String(stock.rsi) : "—"}
            trend={stock.rsi != null && stock.rsi >= 30 && stock.rsi <= 70 ? "neutral" : "down"} />
          <MetricCard label="52W High" value={fundamentals.high52w != null ? `₱${formatNumber(fundamentals.high52w)}` : "—"} />
          <MetricCard label="52W Low" value={fundamentals.low52w != null ? `₱${formatNumber(fundamentals.low52w)}` : "—"} />
        </div>
      </Card>      {/* ── Company Identity ── */}
      <Card className="stock-company-card raycast-slideUp" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
        <CardLabel>About {stock.companyName}</CardLabel>
        <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, fontWeight: 400, lineHeight: "1.6", marginBottom: "20px" }}>
          {stock.description}
        </p>
        <div className="stock-about-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <Stat label="Founded" value={companyProfile.founded} />
          <Stat label="CEO" value={companyProfile.ceo} />
          <Stat label="HQ" value={companyProfile.hq} />
          <Stat label="Employees" value={companyProfile.employees} />
          <Stat label="Exchange" value={stock.exchange} />
          <Stat label="Sector" value={stock.sector} />
          <Stat label="Industry" value={stock.industry} />
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "13px", flexWrap: "wrap" }}>
          <a href="#" style={{ color: colors.primary, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            Annual Report <ExternalLink size={12} />
          </a>
          <a href="#" style={{ color: colors.primary, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            Investor Relations <ExternalLink size={12} />
          </a>
          <a href="#" style={{ color: colors.primary, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            Press Releases <ExternalLink size={12} />
          </a>
        </div>
        <div className="stock-chip-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
          {(companyProfile?.businessSegments ?? []).map((segment: string) => (
            <Badge key={segment} value={60} label={segment} />
          ))}
        </div>
      </Card>

      {/* ── Financials ── */}
      <Card className="stock-financials-card raycast-slideUp" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Financials</CardLabel>
          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap",
            background: financialsReal ? "rgba(16,185,129,0.15)" : "rgba(245,152,45,0.15)",
            color: financialsReal ? "#10b981" : "#f59728",
            border: `1px solid ${financialsReal ? "rgba(16,185,129,0.4)" : "rgba(245,152,45,0.4)"}` }}>
            {financialsReal ? `Verified — ${financialsRealQuarterCount} real PSE Edge quarters` : "Estimated"}
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <Button variant={financialMetric === "revenue" ? "primary" : "secondary"} onClick={() => setFinancialMetric("revenue")}>Revenue</Button>
            <Button variant={financialMetric === "profit" ? "primary" : "secondary"} onClick={() => setFinancialMetric("profit")}>Profit</Button>
            {/* Internal key stays "ebitda" to match the data shape, but this
                is real Operating Income, not EBITDA — PSE filings don't
                report a labeled "EBITDA" line (see apiRouter.ts's toSeries
                comment). Labeled honestly here. */}
            <Button variant={financialMetric === "ebitda" ? "primary" : "secondary"} onClick={() => setFinancialMetric("ebitda")}>Operating Income</Button>
            <Button variant={financialPeriod === "annual" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("annual")}>Annual</Button>
            <Button variant={financialPeriod === "quarterly" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("quarterly")}>Quarterly</Button>
            <motion.button
              aria-label={`Switch to ${showFinancialTable ? "chart" : "table"} view for financials`}
              onClick={() => setShowFinancialTable(!showFinancialTable)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              style={{ padding: "6px 12px", borderRadius: radius.md, border: `1px solid ${colors.border}`, cursor: "pointer", fontSize: "12px", background: showFinancialTable ? colors.primary : "transparent", color: showFinancialTable ? colors.onPrimary : colors.textSecondary }}>
              {showFinancialTable ? "Chart" : "Table"}
            </motion.button>
          </div>
        </div>
        <ChartErrorBoundary>
          <div style={{ width: "100%", height: "300px", backgroundColor: colors.card, borderRadius: "8px", border: `1px solid ${colors.border}` }}>
            <ResponsiveContainer width="100%" height="100%">
              <LazyBarChart data={effectiveChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: colors.textSecondary }} />
                <YAxis tick={{ fontSize: 12, fill: colors.textSecondary }} />
                <Tooltip
                  contentStyle={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: "6px" }}
                  labelStyle={{ color: colors.textPrimary }}
                  formatter={(value: any) => `₱${value.toLocaleString()}M`}
                />
                <Bar dataKey="value" fill={colors.primary} isAnimationActive={false} />
              </LazyBarChart>
            </ResponsiveContainer>
          </div>
        </ChartErrorBoundary>
        <p style={{ color: colors.textSecondary, fontSize: "12px", marginTop: "12px" }}>All values in ₱M</p>
        {stock.dataSources.financials !== "real" && stock.dataSources.financials !== "pseApi" && (
          <p style={{ color: colors.textSecondary, fontSize: "11.5px", marginTop: "6px", lineHeight: 1.5 }}>
            Estimated from market cap and sector medians — not real reported financials. No verified free
            source for PSE revenue/profit/operating income is wired in yet.
          </p>
        )}
      </Card>

      {/* PSE's own Public Ownership Report (POR-1) only reports two real
          numbers: insider % (directors, officers, substantial shareholders,
          summed) and public %. There is no real foreign/domestic
          institutional split to show — that FII/DII breakdown was a
          leftover from an India-market version of this codebase. */}
      {effectiveShareholding && (
      <Card className="stock-shareholdings-card raycast-slideUp" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Shareholdings</CardLabel>
          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px",
            background: shareholdingReal ? "rgba(16,185,129,0.15)" : "rgba(245,152,45,0.15)",
            color: shareholdingReal ? "#10b981" : "#f59728",
            border: `1px solid ${shareholdingReal ? "rgba(16,185,129,0.4)" : "rgba(245,152,45,0.4)"}` }}>
            {shareholdingReal ? "Verified" : "Estimated"}
          </span>
          <span style={{ fontSize: "12px", color: colors.textSecondary }}>
            {effectiveShareholding.period ? `As of ${effectiveShareholding.period}` : null}
          </span>
        </div>
        <div style={{ display: "grid", gap: "16px" }}>
          {[
            { label: "Insiders (Directors, Officers, Substantial Shareholders)", value: effectiveShareholding?.insiderPercent ?? 0 },
            { label: "Public Float", value: effectiveShareholding?.publicPercent ?? 0 },
          ].map((item) => (
            <div key={item.label} style={{ display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ fontSize: "13px", color: colors.textPrimary }}>{item.label}</span>
                <span style={{ fontSize: "13px", color: colors.textPrimary }}>{formatDecimal(item.value, 2)}%</span>
              </div>
              <div style={{ height: "8px", background: colors.border, borderRadius: radius.lg, overflow: "hidden" }}>
                <div style={{ width: `${item.value}%`, height: "100%", background: colors.primary, borderRadius: radius.lg }} />
              </div>
            </div>
          ))}
        </div>
        {effectiveShareholding.outstandingShares != null && (
          <p style={{ color: colors.textSecondary, fontSize: "11.5px", marginTop: "14px" }}>
            {formatNumber(effectiveShareholding.outstandingShares)} common shares outstanding.
          </p>
        )}
        {stock.dataSources.shareholding !== "real" && stock.dataSources.shareholding !== "pseApi" && (
          <p style={{ color: colors.textSecondary, fontSize: "11.5px", marginTop: "6px", lineHeight: 1.5 }}>
            No real Public Ownership Report is available for this symbol yet.
          </p>
        )}
      </Card>
      )}

      <OrderSimulator symbol={stock.symbol} price={stock.price.current} />

      {/* ── News Feed with Native Ads ── */}
      <Card className="stock-news-card raycast-slideUp" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>
            {stock.dataSources.news === "disclosures" ? "Company Disclosures" : "Latest news"}
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", marginLeft: "8px",
              background: (newsReal || newsFromDisclosures) ? "rgba(16,185,129,0.15)" : "rgba(245,152,45,0.15)",
              color: (newsReal || newsFromDisclosures) ? "#10b981" : "#f59728",
              border: `1px solid ${(newsReal || newsFromDisclosures) ? "rgba(16,185,129,0.4)" : "rgba(245,152,45,0.4)"}` }}>
              {(newsReal || newsFromDisclosures) ? (newsReal ? "Verified" : "PSE filings") : "Estimated"}
            </span>
          </CardLabel>
          <div className="stock-news-filters" style={{ display: "flex", gap: "4px", padding: "2px", background: colors.fill, borderRadius: radius.full }}>
            {(["all", "positive", "negative"] as const).map((f) => (
              <motion.button
                key={f}
                aria-label={`Filter news by ${f}`}
                onClick={() => setNewsFilter(f)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                style={{ padding: "4px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: newsFilter === f ? colors.primary : "transparent", color: newsFilter === f ? colors.onPrimary : colors.textSecondary, textTransform: "capitalize" }}>
                {f === "all" ? "All" : f === "positive" ? "Positive" : "Negative"}
              </motion.button>
            ))}
          </div>
        </div>
        <div className="stock-news-list" style={{ display: "grid", gap: "12px" }}>
          {stock.news && stock.news.length === 0 && (
            <div style={{ padding: "28px 16px", textAlign: "center", color: colors.textSecondary, fontSize: "13px" }}>
              {stock.dataSources.news === "unavailable"
                ? "No recent news or PSE Edge disclosures are available to show for this symbol yet."
                : "No recent news available for this symbol."}
            </div>
          )}
          {newsFeedWithAds.map((entry, entryIdx) => {
            if (entry.type === "ad") {
              return (
                <div key={entry.id} className="stock-native-ad raycast-slideUp" style={{
                  animationDelay: `${0.05 * entryIdx}s`, animationFillMode: "both",
                  display: "flex", gap: "12px", alignItems: "center",
                  border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: "14px 16px",
                  background: colors.card, cursor: "pointer",
                  transition: "border-color 0.15s ease",
                }}>
                  <span style={{
                    width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
                    background: colors.hairlineSoft,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: "15px", fontWeight: 700, color: colors.primary,
                    letterSpacing: "0",
                  }}>{entry.data.icon}</span>
                  <div style={{ display: "grid", gap: "3px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em" }}>SPONSORED</span>
                    </div>
                    <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: "14px" }}>{entry.data.title}</div>
                    <div style={{ color: colors.textSecondary, fontSize: "12px" }}>{entry.data.subtitle}</div>
                  </div>
                  <span style={{ color: colors.primary, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {entry.data.cta} <ArrowRight size={14} />
                  </span>
                </div>
              );
            }
            const item = entry.data;
            const secondary = formatNewsTime(item.publishedAt) || item.time;
            return (
              <a
                className={`stock-news-item raycast-slideUp`}
                key={entry.id}
                href={item.link || "#"}
                target={item.link ? "_blank" : undefined}
                rel={item.link ? "noopener noreferrer" : undefined}
                style={{
                  animationDelay: `${0.05 * entryIdx}s`, animationFillMode: "both",
                  display: "flex", gap: "12px", alignItems: "flex-start", textDecoration: "none",
                  border: `1px solid transparent`, borderRadius: radius.lg, padding: "12px",
                  color: "inherit", transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
              >
                <Building2 color={colors.primary} size={18} style={{ marginTop: "2px", flexShrink: 0 }} />
                <div style={{ display: "grid", gap: "4px" }}>
                  <div style={{ color: colors.textPrimary, fontSize: "14px", lineHeight: "1.5" }}>{item.headline}</div>
                  <div style={{ color: colors.textSecondary, fontSize: "12px" }}>{`${item.source}${secondary ? ` · ${secondary}` : ""}`}</div>
                </div>
              </a>
            );
          })}
        </div>
      </Card>

      {/* ── Research Thesis ── */}
      <Card className="raycast-slideUp" style={{ animationDelay: "0.35s", animationFillMode: "both" }}>
        <CardLabel>Investment Thesis</CardLabel>
        <div style={{ display: "grid", gap: "16px" }}>
          <Badge value={stock.scores.health ?? 0} label={stock.thesis.stance} />
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6", fontStyle: "italic" }}>{stock.thesis.thesis}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ padding: "12px", backgroundColor: `${colors.success}15`, borderRadius: "6px", borderLeft: `3px solid ${colors.success}` }}>
              <div style={{ color: colors.success, fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" }}>✓ Strengths</div>
              <p style={{ color: colors.textPrimary, fontSize: "14px", lineHeight: "1.5" }}>{stock.thesis.bullCase}</p>
            </div>
            <div style={{ padding: "12px", backgroundColor: `${colors.danger}15`, borderRadius: "6px", borderLeft: `3px solid ${colors.danger}` }}>
               <div style={{ color: colors.danger, fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" }}>Risks</div>
              <p style={{ color: colors.textPrimary, fontSize: "14px", lineHeight: "1.5" }}>{stock.thesis.bearCase}</p>
            </div>
          </div>

          <div style={{ padding: "12px", backgroundColor: `${colors.warning}15`, borderRadius: "6px", borderLeft: `3px solid ${colors.warning}` }}>
            <div style={{ color: colors.warning, fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" }}>Watch</div>
            <p style={{ color: colors.textPrimary, fontSize: "14px", lineHeight: "1.5" }}>{stock.thesis.whatToWatch}</p>
          </div>
        </div>
        {stock.dataSources.thesis !== "real" && stock.dataSources.thesis !== "pseApi" && (
          <p style={{ color: colors.textTertiary, fontSize: "11px", marginTop: "6px", lineHeight: 1.5 }}>
            {stock.dataSources.thesis === "unavailable"
              ? "A detailed research thesis isn't available yet for this symbol — the section above reflects that limitation and is not a grounded analysis."
              : "The thesis above is a general template based on the limited metrics shown, not a grounded per-stock analysis."}
          </p>
        )}
      </Card>

      {/* ── Thesis History ── */}
      <ThesisHistory symbol={stock.symbol} />

      {/* ── AI Analysis ── */}
      {aiLoading && (
        <Card className="stock-panel-card raycast-slideUp">
          <CardLabel>Research Analysis</CardLabel>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 0" }}>
            <div className="raycast-spinner" style={{ width: "16px", height: "16px", border: `2px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%" }} />
            <span style={{ color: colors.textSecondary, fontSize: "14px" }}>Generating analysis…</span>
          </div>
        </Card>
      )}
      {aiError && (
        <Card className="stock-panel-card raycast-slideUp" style={{ borderLeft: `3px solid ${colors.warning}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span style={{ color: colors.warning, fontSize: "18px", marginTop: "2px", fontWeight: 700 }}>!</span>
            <div style={{ display: "grid", gap: "4px", flex: 1 }}>
              <div style={{ color: colors.warning, fontSize: "13px", fontWeight: "600" }}>Analysis Error</div>
              <div style={{ color: colors.textSecondary, fontSize: "13px" }}>{aiError}</div>
            </div>
          </div>
        </Card>
      )}
      {ai && !aiLoading && (
        <Card className="stock-ai-card raycast-slideUp">
          <CardLabel>Research Analysis</CardLabel>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: ai.state === "High Conviction" ? colors.success : ai.state === "Risk Rising" ? colors.danger : colors.warning,
                boxShadow: `0 0 6px ${ai.state === "High Conviction" ? colors.success : ai.state === "Risk Rising" ? colors.danger : colors.warning}`,
              }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>{ai.state}</span>
              <span style={{ fontSize: "12px", color: colors.textSecondary, marginLeft: "8px" }}>Confidence: {ai.confidence}%</span>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{ai.thesis}</p>
            <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}><strong>Bull case:</strong> {ai.bullCase}</p>
            <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}><strong>Bear case:</strong> {ai.bearCase}</p>
            <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}><strong>What to watch:</strong> {ai.whatToWatch}</p>
          </div>
        </Card>
      )}

      {/* Removed: "What changed", Sector Relative View, Analyst Section, Options Flow, Insider Activity, Similar Stocks (all synthetic) */}

      </div>{/* ── end analytical-dashboard-grid ── */}

      {/* ── Native Ad (Position 7) ── */}
      <NativeAd position={7} />

      {/* ── Disclaimer ── */}
      <p style={{
        color: colors.textTertiary, fontSize: "11px", textAlign: "center", padding: "0 16px", lineHeight: "1.6",
      }}>
        {disclaimer}
      </p>

      {/* ── Fixed Action Buttons (Raycast White Pill Footer) ── */}
      <div className="stock-fixed-footer" style={{
        position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: "8px", padding: "8px 16px",
        borderRadius: radius.full, background: colors.backdropFooter,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${colors.border}`,
        boxShadow: shadows.card,
        zIndex: 50,
        transition: "opacity 0.25s ease",
        opacity: showFooter ? 1 : 0,
        pointerEvents: showFooter ? "auto" : "none",
      }}>
        {selectedBroker && (
          <InteractiveButton onClick={() => setIsBrokerOpen(true)} variant="primary" style={{ minWidth: "150px", justifyContent: "center" }}>
            <TrendingUp size={15} /> Trade via {selectedBroker}
          </InteractiveButton>
        )}
      </div>

      {/* ── Broker Handoff Modal ── */}
      {isBrokerOpen && availableBrokers[0] && (
        <BrokerHandoffModal
          broker={availableBrokers[0]}
          stockSymbol={stock.symbol}
          direction="long"
          rationale={ai?.bullCase ?? "Based on current signals"}
          confidence={stock.scores.quality ?? 70}
          onClose={() => setIsBrokerOpen(false)}
        />
      )}

      {/* ── Keyboard Hint ── */}
      <p style={{ textAlign: "center", color: colors.textTertiary, fontSize: "12px", padding: "16px 0 100px", opacity: 0.7 }}>
        Navigate · <kbd className="raycast-hint">r</kbd> Refresh · <kbd className="raycast-hint">⌘K</kbd> Commands
      </p>
    </div>
  );
}

// ── Export ──
export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const seoMeta = useMemo(() => symbol ? buildCompanySeo(symbol, undefined, undefined) : null, [symbol]);
  useSeo(seoMeta);

  useEffect(() => {
    // Instant scroll to top - no animation
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [symbol]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["stock", symbol],
    queryFn: async () => {
      // No local/fabricated fallback here on purpose: this used to fall back
      // to a hash-seeded synthetic-fundamentals generator (src/lib/stockResearch.ts)
      // on any failure, which also carried corrupted names left over from an
      // earlier India/Pakistan-market purge (e.g. "Bank of the PSE Islands"
      // for BPI). An honest error state is correct; invented financials are not.
      const res = await fetch(`/api/stock/${symbol}`);
      if (!res.ok) throw new Error(`Failed to load stock data (HTTP ${res.status})`);

      const raw = await res.json();
      const normalized = normalizeStockData(raw);
      return {
        stock: normalized,
        financialChartData: (normalized.financials?.annual?.revenue ?? []).map((item: { period: string; value: number }) => ({
          period: item.period,
          value: Math.round(item.value),
        })),
        shareholding: normalized.shareholding?.[0],
        shareholdingSeries: normalized.shareholding ?? [],
        period: normalized.shareholding?.[0]?.period ?? "Latest",
      };
    },
    enabled: !!symbol,
    staleTime: 30_000,
  });

  // Note: the app already wraps every route in a page-level AnimatePresence
  // (see src/app/PublicLayout.tsx), so this component intentionally does NOT
  // nest another AnimatePresence around its loading/error/loaded states —
  // nesting mode="wait" AnimatePresences here left content stuck at opacity 0
  // during verification. Plain mount-in motion.divs (no exit choreography)
  // animate correctly inside the outer route transition instead.
  if (isLoading) {
    return <StockSkeleton />;
  }
  if (error || !data) {
    return <StockError symbol={symbol ?? "unknown"} onRetry={() => refetch()} />;
  }
  return (
    <motion.div
      key={symbol}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      <StockView
        stock={data.stock}
        financialChartData={data.financialChartData ?? []}
        shareholding={data.shareholding}
        shareholdingSeries={data.shareholdingSeries ?? []}
        period={data.period ?? "Sep 2025"}
      />
    </motion.div>
  );
}
