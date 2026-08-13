import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDown, ArrowLeft, ArrowUp, TrendingUp, ExternalLink, RefreshCw, AlertCircle,
  BarChart3, Copy, Bell, Clock, DollarSign, Volume2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { LazyBarChart, Bar, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "../components/DynamicChart";
import StockChart from "../components/StockChart";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Stat } from "../ui/Stat";
import { useResponsiveValue } from "../ui/responsive";
import { BrokerHandoffModal } from "../components/BrokerHandoffModal";
import { ChartErrorBoundary } from "../components/ChartErrorBoundary";
import { listAvailableBrokers } from "../commercial/BrokerHandoffService";
import { fallbackAnalysis, generateStockAnalysis } from "../services/llm/AIAnalysisService";
import type { AIAnalysis } from "../services/llm/AIAnalysisService";
import { colors, typography, radius, shadows } from "../design/tokens";
import { useSeo } from "../frontend/seo/useSeo";
import { buildCompanySeo } from "../frontend/seo/companySeo";
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
import { PriceSkeleton, ChartSkeleton, MetricsSkeleton } from "../components/SkeletonLoader";

// ── The Manila Desk palette ──
const TERMINAL_COLORS = {
  canvas: "#0B0B0C",
  panel: "#141414",
  accent: "#FF6B4A",
  gainGreen: "#3FB67A",
  lossRed: "#E15B4F",
  monoText: "#F3F0EA",
  secondaryText: "#A6A099",
};

// ── Motion presets (minimal) ──
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
  shareholding: Array<{ period: string; insiderPercent: number; publicPercent: number; outstandingShares: number | null }>;
  news: Array<{ headline: string; source: string; time: string; link?: string; publishedAt?: string }>;
  thesis: { thesis: string; bullCase: string; bearCase: string; whatToWatch: string; stance: "High conviction" | "Watch" | "Needs review" | "Risk rising" | "Avoid for now" };
  priceHistory: Record<string, Array<{ label?: string; price?: number; time?: string; open?: number; high?: number; low?: number; close?: number; volume?: number }>>;
  dataSources: { financials: string; shareholding: string; thesis: string; news: string };
};

const TIMEFRAMES = ["1W", "1M", "3M", "1Y", "5Y"] as const;
const FINANCIAL_METRICS = ["revenue", "profit", "ebitda"] as const;
const FINANCIAL_PERIODS = ["annual", "quarterly"] as const;
type FinancialMetric = (typeof FINANCIAL_METRICS)[number];
type FinancialPeriod = (typeof FINANCIAL_PERIODS)[number];

function getApiTimeframe(uiTimeframe: string): string {
  return uiTimeframe;
}

function transformToOHLC(priceData: any[]): any[] {
  if (!priceData || !Array.isArray(priceData)) return [];

  return priceData.map((item, index) => {
    let timeValue = item.time || item.date || item.label;

    if (typeof timeValue === 'string' && timeValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Already in YYYY-MM-DD format
    } else if (typeof timeValue === 'string' && timeValue.match(/^\d{2}-\d{2}$/)) {
      const today = new Date();
      const [month, day] = timeValue.split('-');
      const year = today.getFullYear();
      timeValue = `${year}-${month}-${day}`;
    } else if (typeof timeValue === 'number') {
      const date = new Date(timeValue * 1000);
      timeValue = date.toISOString().split('T')[0];
    } else if (!timeValue) {
      const date = new Date();
      date.setDate(date.getDate() - (priceData.length - 1 - index));
      timeValue = date.toISOString().split('T')[0];
    } else {
      try {
        const date = new Date(timeValue);
        if (!isNaN(date.getTime())) {
          timeValue = date.toISOString().split('T')[0];
        }
      } catch (e) {
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
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });
}

function formatNewsTime(value?: string): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  const minutesAgo = Math.round((Date.now() - timestamp) / 60000);
  if (minutesAgo < 60) return `${Math.max(minutesAgo, 1)}m`;
  if (minutesAgo < 1440) return `${Math.round(minutesAgo / 60)}h`;
  return `${Math.round(minutesAgo / 1440)}d`;
}

function formatDecimal(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

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

function normalizeStockData(raw: Record<string, any>): StockResearchDetail {
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

// ── HERO SECTION: Numbers First ──
function HeroSection({ stock }: { stock: StockResearchDetail }) {
  const isUp = stock.price.changeAbs >= 0;
  const priceColor = isUp ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed;

  return (
    <div style={{
      padding: "12px 16px",
      background: TERMINAL_COLORS.canvas,
      borderBottom: `1px solid rgba(255,255,255,0.05)`,
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
    }}>
      {/* Symbol & Company Name */}
      <div style={{ display: "flex", gap: "8px", alignItems: "baseline", marginBottom: "8px" }}>
        <span style={{
          fontSize: "18px",
          fontWeight: 700,
          color: TERMINAL_COLORS.monoText,
          letterSpacing: "-0.01em",
        }}>
          {stock.symbol}
        </span>
        <span style={{
          fontSize: "12px",
          color: TERMINAL_COLORS.secondaryText,
          fontWeight: 500,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {stock.companyName}
        </span>
      </div>

      {/* Price & Change */}
      <div style={{ display: "grid", gap: "4px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
          <span style={{
            fontSize: "42px",
            fontWeight: 700,
            color: TERMINAL_COLORS.monoText,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}>
            ₱{formatNumber(stock.price.current)}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: priceColor,
              fontSize: "13px",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}>
              {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              {isUp ? "+" : ""}{formatDecimal(stock.price.changeAbs, 2)}
              <span style={{ fontSize: "12px" }}>({isUp ? "+" : ""}{formatDecimal(stock.price.changePercent, 2)}%)</span>
            </div>
          </div>
        </div>
        {stock.price.marketCap != null && (
          <div style={{
            color: TERMINAL_COLORS.secondaryText,
            fontSize: "11px",
            fontWeight: 400,
            fontVariantNumeric: "tabular-nums",
          }}>
            Market Cap: ₱{formatNumber(Math.round(stock.price.marketCap / 1_000_000))}M
          </div>
        )}
      </div>
    </div>
  );
}

// ── FUNDAMENTALS GRID: P/E | P/B | ROE | D/E ──
function FundamentalsGrid({ stock }: { stock: StockResearchDetail }) {
  const fundamentals = stock.fundamentals ?? {};
  const items = [
    { label: "P/E", value: formatDecimal(fundamentals.pe, 1), sublabel: "Price/Earnings" },
    { label: "P/B", value: formatDecimal(fundamentals.pb, 1), sublabel: "Price/Book" },
    { label: "ROE", value: stock.roe != null ? `${formatDecimal(stock.roe, 1)}%` : "—", sublabel: "Return on Equity" },
    { label: "D/E", value: formatDecimal(stock.debtToEquity, 2), sublabel: "Debt/Equity" },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "12px",
      padding: "12px",
      background: TERMINAL_COLORS.panel,
      border: `1px solid rgba(255,255,255,0.05)`,
      borderRadius: "0",
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
    }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: "grid", gap: "3px" }}>
          <div style={{
            color: TERMINAL_COLORS.secondaryText,
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {item.label}
          </div>
          <div style={{
            color: TERMINAL_COLORS.monoText,
            fontSize: "16px",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.2,
          }}>
            {item.value}
          </div>
          <div style={{
            color: TERMINAL_COLORS.secondaryText,
            fontSize: "8px",
            fontWeight: 400,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            {item.sublabel}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── METRICS/SCORES TABLE ──
function MetricsTable({ stock }: { stock: StockResearchDetail }) {
  const fundamentals = stock.fundamentals ?? {};

  const rows = [
    { label: "Market Cap", value: stock.price.marketCap != null ? `₱${formatNumber(Math.round(stock.price.marketCap / 1_000_000))}M` : "—" },
    { label: "EPS (TTM)", value: fundamentals.eps != null ? `₱${formatDecimal(fundamentals.eps, 2)}` : "—" },
    { label: "Dividend Yield", value: fundamentals.dividendYield != null ? `${formatDecimal(fundamentals.dividendYield, 2)}%` : "—" },
    { label: "Net Margin", value: fundamentals.netMargin != null ? `${formatDecimal(fundamentals.netMargin, 1)}%` : "—" },
    { label: "52W High", value: fundamentals.high52w != null ? `₱${formatNumber(fundamentals.high52w)}` : "—" },
    { label: "52W Low", value: fundamentals.low52w != null ? `₱${formatNumber(fundamentals.low52w)}` : "—" },
  ];

  return (
    <table style={{
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "11px",
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
    }}>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} style={{
            borderBottom: idx < rows.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
            height: "28px",
          }}>
            <td style={{
              padding: "6px 8px",
              color: TERMINAL_COLORS.secondaryText,
              textAlign: "left",
              fontWeight: 500,
              fontSize: "10px",
            }}>
              {row.label}
            </td>
            <td style={{
              padding: "6px 8px",
              color: TERMINAL_COLORS.monoText,
              textAlign: "right",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              fontSize: "11px",
            }}>
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── SCORES TABLE (Quality, Valuation, Growth, etc.) ──
function ScoresTable({ stock }: { stock: StockResearchDetail }) {
  const scores = stock.scores ?? {};
  const scoreItems = [
    { label: "Quality", value: scores.quality },
    { label: "Valuation", value: scores.valuation },
    { label: "Growth", value: scores.growth },
    { label: "Momentum", value: scores.momentum },
    { label: "Risk", value: scores.risk },
  ];

  const getScoreColor = (value: number | null) => {
    if (value == null) return TERMINAL_COLORS.secondaryText;
    if (value >= 70) return TERMINAL_COLORS.gainGreen;
    if (value >= 50) return TERMINAL_COLORS.accent;
    return TERMINAL_COLORS.lossRed;
  };

  return (
    <table style={{
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "11px",
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
    }}>
      <tbody>
        {scoreItems.map((item, idx) => (
          <tr key={idx} style={{
            borderBottom: idx < scoreItems.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
            height: "28px",
          }}>
            <td style={{
              padding: "6px 8px",
              color: TERMINAL_COLORS.secondaryText,
              textAlign: "left",
              fontWeight: 500,
              fontSize: "10px",
            }}>
              {item.label}
            </td>
            <td style={{
              padding: "6px 8px",
              color: getScoreColor(item.value),
              textAlign: "right",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              fontSize: "11px",
            }}>
              {item.value != null ? `${item.value}/100` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StockSkeleton() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ display: "grid", gap: "12px", maxWidth: 1200, margin: "0 auto", padding: "12px" }}
    >
      <motion.div variants={fadeUp} transition={pageTransition}>
        <PriceSkeleton />
      </motion.div>
      <motion.div variants={fadeUp} transition={pageTransition}>
        <ChartSkeleton height={280} />
      </motion.div>
      <motion.div variants={fadeUp} transition={pageTransition}>
        <MetricsSkeleton />
      </motion.div>
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
        maxWidth: 480,
        margin: "60px auto",
        padding: "16px",
        textAlign: "center",
        border: `1px solid rgba(255,255,255,0.05)`,
        borderRadius: "0",
        background: TERMINAL_COLORS.panel,
        display: "grid",
        gap: "8px",
        justifyItems: "center",
      }}
    >
      <div style={{
        width: "40px",
        height: "40px",
        borderRadius: "0",
        background: `rgba(239,68,68,0.15)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <AlertCircle size={20} color={TERMINAL_COLORS.lossRed} />
      </div>
      <div style={{ color: TERMINAL_COLORS.monoText, fontSize: "13px", fontWeight: 600 }}>
        Failed to load {symbol}
      </div>
      <p style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "11px", lineHeight: "1.5", margin: 0 }}>
        Data feed unavailable. Please try again.
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRetry}
          style={{
            marginTop: "6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            borderRadius: "0",
            border: `1px solid rgba(255,255,255,0.1)`,
            background: TERMINAL_COLORS.accent,
            color: "white",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            height: "32px",
          }}
        >
          <RefreshCw size={12} /> Retry
        </motion.button>
      )}
    </motion.div>
  );
}

function StockView({ stock, financialChartData, shareholding, shareholdingSeries, period: initialPeriod }: {
  stock: StockResearchDetail;
  financialChartData: { period: string; value: number }[];
  shareholding?: { period: string; insiderPercent: number; publicPercent: number; outstandingShares: number | null };
  shareholdingSeries: { period: string; insiderPercent: number; publicPercent: number; outstandingShares: number | null }[];
  period: string;
}) {
  const navigate = useNavigate();
  const [ai, setAi] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1Y");
  const [financialMetric, setFinancialMetric] = useState<FinancialMetric>("revenue");
  const [financialPeriod, setFinancialPeriod] = useState<FinancialPeriod>("annual");
  const [isBrokerOpen, setIsBrokerOpen] = useState(false);
  const [period, setPeriod] = useState(initialPeriod);

  const availableBrokers = listAvailableBrokers();
  const selectedBroker = availableBrokers[0]?.name ?? null;
  const isUp = (stock?.price?.changeAbs ?? 0) >= 0;
  const priceColor = isUp ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed;
  const shareholdingSeriesArr = Array.isArray(shareholdingSeries) ? shareholdingSeries : [];
  const effectiveShareholding = shareholding ?? shareholdingSeriesArr.find((item) => item.period === period) ?? shareholdingSeriesArr[0];
  const selectedFinancialSeries = stock.financials?.[financialPeriod]?.[financialMetric] ?? [];
  const effectiveChartData = (financialChartData?.length ?? 0) > 0 ? financialChartData : (selectedFinancialSeries ?? []).map((item: any) => ({ period: item?.period || "N/A", value: Math.round(item?.value || 0) }));
  const newsItems = (stock.news ?? []).slice(0, 5);
  const disclaimer = "StockEx research is for informational purposes only and is not investment advice.";
  const fundamentals = stock.fundamentals ?? {};
  const financialsReal = stock.dataSources.financials === "real" || stock.dataSources.financials === "pseApi";
  const companyProfile = stock.companyProfile ?? {
    founded: "—",
    ceo: "—",
    hq: "—",
    employees: "—",
    website: "—",
    isin: "—",
    businessSegments: [],
  };

  // AI analysis
  useEffect(() => {
    let cancelled = false;
    const scores = {
      quality: stock.scores.quality ?? 50,
      valuation: stock.scores.valuation ?? 50,
      growth: stock.scores.growth ?? 50,
      risk: stock.scores.risk ?? 50,
      technical: stock.scores.momentum ?? 50,
    };
    setAiLoading(true);
    generateStockAnalysis(stock.symbol, stock.companyName, stock.price.current, scores, stock.thesis?.thesis)
      .then((result) => { if (!cancelled) { setAi(result); setAiLoading(false); } })
      .catch((err) => {
        if (!cancelled) {
          console.error('AI analysis error:', err);
          setAi(fallbackAnalysis(scores));
          setAiLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [stock.symbol]);

  const boardLotSize = getBoardLotSize(stock.price.current);
  const newsEventPack = buildNewsEventPack(stock.symbol, stock.news);

  const [retrievalContext, setRetrievalContext] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await buildEvidenceRetrievalAggregate(stock.symbol, { symbol: stock.symbol, maxPerSource: 8, lookbackDays: 90 });
        if (!cancelled) {
          setRetrievalContext(compressEventEvidencePack(result.pack));
        }
      } catch { /* graceful degradation */ }
    })();
    return () => { cancelled = true; };
  }, [stock.symbol]);

  return (
    <div style={{
      display: "grid",
      gap: "12px",
      background: TERMINAL_COLORS.canvas,
      color: TERMINAL_COLORS.monoText,
      minHeight: "100vh",
    }}>
      {/* ── HERO SECTION ── */}
      <HeroSection stock={stock} />

      {/* ── MAIN CONTENT ── */}
      <div style={{ display: "grid", gap: "12px", padding: "0 12px 36px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>

        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            border: `1px solid rgba(255,255,255,0.1)`,
            background: "transparent",
            padding: "4px 10px",
            borderRadius: "0",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            color: TERMINAL_COLORS.secondaryText,
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 500,
            width: "fit-content",
            height: "28px",
          }}
        >
          <ArrowLeft size={12} /> Back
        </motion.button>

        {/* ── PRICE CHART SECTION ── */}
        <div style={{
          border: `1px solid rgba(255,255,255,0.05)`,
          borderRadius: "0",
          padding: "8px",
          background: TERMINAL_COLORS.panel,
        }}>
          <div style={{
            display: "flex",
            gap: "6px",
            marginBottom: "8px",
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: "11px",
          }}>
            {TIMEFRAMES.map((value) => (
              <button
                key={value}
                onClick={() => setTimeframe(value)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "0",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 600,
                  background: value === timeframe ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                  color: value === timeframe ? "white" : TERMINAL_COLORS.secondaryText,
                  height: "28px",
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <ChartErrorBoundary>
            <div style={{
              width: "100%",
              height: "280px",
              backgroundColor: TERMINAL_COLORS.canvas,
              borderRadius: "0",
              border: `1px solid rgba(255,255,255,0.05)`,
              overflow: "hidden",
            }}>
              <StockChart
                symbol={stock.symbol}
                ohlcData={transformToOHLC(stock.priceHistory?.[getApiTimeframe(timeframe)] ?? [])}
                timeframe={timeframe as any}
                showIndicators={true}
                height={260}
              />
            </div>
          </ChartErrorBoundary>
        </div>

        {/* ── FUNDAMENTALS GRID ── */}
        <FundamentalsGrid stock={stock} />

        {/* ── THREE-COLUMN LAYOUT: Metrics | Scores | Company Profile ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {/* Extended Metrics */}
          <div style={{
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: "0",
            padding: "8px",
            background: TERMINAL_COLORS.panel,
          }}>
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
              marginBottom: "8px",
            }}>
              Metrics
            </div>
            <MetricsTable stock={stock} />
          </div>

          {/* Scores */}
          <div style={{
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: "0",
            padding: "8px",
            background: TERMINAL_COLORS.panel,
          }}>
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
              marginBottom: "8px",
            }}>
              Scores
            </div>
            <ScoresTable stock={stock} />
          </div>

          {/* Company Profile */}
          <div style={{
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: "0",
            padding: "8px",
            background: TERMINAL_COLORS.panel,
          }}>
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
              marginBottom: "8px",
            }}>
              About
            </div>
            <p style={{
              color: TERMINAL_COLORS.monoText,
              fontSize: "10px",
              fontWeight: 400,
              lineHeight: "1.4",
              margin: "0 0 8px 0",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}>
              {stock.description}
            </p>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "10px",
              fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
            }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.secondaryText, fontSize: "9px" }}>Founded</td>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.monoText, fontWeight: 500, fontSize: "10px", textAlign: "right" }}>{companyProfile.founded}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.secondaryText, fontSize: "9px" }}>CEO</td>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.monoText, fontWeight: 500, fontSize: "10px", textAlign: "right" }}>{companyProfile.ceo}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.secondaryText, fontSize: "9px" }}>HQ</td>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.monoText, fontWeight: 500, fontSize: "10px", textAlign: "right" }}>{companyProfile.hq}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.secondaryText, fontSize: "9px" }}>Sector</td>
                  <td style={{ padding: "4px 0", color: TERMINAL_COLORS.monoText, fontWeight: 500, fontSize: "10px", textAlign: "right" }}>{stock.sector}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FINANCIALS CHART ── */}
        <div style={{
          border: `1px solid rgba(255,255,255,0.05)`,
          borderRadius: "0",
          padding: "8px",
          background: TERMINAL_COLORS.panel,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "8px",
            alignItems: "center",
          }}>
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
            }}>
              Financials
            </div>
            <span style={{
              fontSize: "9px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "0",
              background: financialsReal ? "rgba(16,185,129,0.15)" : "rgba(245,152,45,0.15)",
              color: financialsReal ? TERMINAL_COLORS.gainGreen : "#F59728",
              border: `1px solid ${financialsReal ? "rgba(16,185,129,0.3)" : "rgba(245,152,45,0.3)"}`,
            }}>
              {financialsReal ? "Verified" : "Estimated"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
            {["revenue" as const, "profit" as const].map((metric) => (
              <button
                key={metric}
                onClick={() => setFinancialMetric(metric)}
                style={{
                  padding: "2px 8px",
                  borderRadius: "0",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 600,
                  background: financialMetric === metric ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                  color: financialMetric === metric ? "white" : TERMINAL_COLORS.secondaryText,
                  height: "24px",
                  textTransform: "capitalize",
                }}
              >
                {metric}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              {["annual" as const, "quarterly" as const].map((p) => (
                <button
                  key={p}
                  onClick={() => setFinancialPeriod(p)}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "0",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "10px",
                    fontWeight: 600,
                    background: financialPeriod === p ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                    color: financialPeriod === p ? "white" : TERMINAL_COLORS.secondaryText,
                    height: "24px",
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ChartErrorBoundary>
            <div style={{
              width: "100%",
              height: "200px",
              backgroundColor: TERMINAL_COLORS.canvas,
              borderRadius: "0",
              border: `1px solid rgba(255,255,255,0.05)`,
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <LazyBarChart data={effectiveChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: TERMINAL_COLORS.secondaryText }} />
                  <YAxis tick={{ fontSize: 10, fill: TERMINAL_COLORS.secondaryText }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: TERMINAL_COLORS.panel,
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: "0",
                      color: TERMINAL_COLORS.monoText,
                      fontSize: "10px",
                    }}
                    labelStyle={{ color: TERMINAL_COLORS.monoText }}
                    formatter={(value: any) => `₱${value.toLocaleString()}M`}
                  />
                  <Bar dataKey="value" fill={TERMINAL_COLORS.accent} isAnimationActive={false} />
                </LazyBarChart>
              </ResponsiveContainer>
            </div>
          </ChartErrorBoundary>
        </div>

        {/* ── NEWS & EVENTS ── */}
        {newsItems.length > 0 && (
          <div style={{
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: "0",
            padding: "8px",
            background: TERMINAL_COLORS.panel,
          }}>
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
              marginBottom: "8px",
            }}>
              News & Events
            </div>
            <div style={{
              display: "grid",
              gap: "6px",
              fontSize: "10px",
              fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
            }}>
              {newsItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link || "#"}
                  target={item.link ? "_blank" : undefined}
                  rel={item.link ? "noopener noreferrer" : undefined}
                  style={{
                    display: "flex",
                    gap: "8px",
                    paddingBottom: "6px",
                    borderBottom: idx < newsItems.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                    textDecoration: "none",
                    color: TERMINAL_COLORS.monoText,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{
                    color: TERMINAL_COLORS.accent,
                    minWidth: "40px",
                    fontWeight: 600,
                    fontSize: "10px",
                  }}>
                    {formatNewsTime(item.publishedAt) || item.time}
                  </span>
                  <span style={{ color: TERMINAL_COLORS.monoText, flex: 1, fontSize: "10px" }}>
                    {item.headline}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── INVESTMENT THESIS ── */}
        <div style={{
          border: `1px solid rgba(255,255,255,0.05)`,
          borderRadius: "0",
          padding: "8px",
          background: TERMINAL_COLORS.panel,
        }}>
          <div style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: TERMINAL_COLORS.secondaryText,
            marginBottom: "8px",
          }}>
            Investment Thesis
          </div>
          <div style={{
            display: "grid",
            gap: "8px",
            fontSize: "10px",
            lineHeight: "1.5",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "2px", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Stance</div>
              <div style={{ color: stock.thesis.stance === "High conviction" ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed, fontWeight: 600, fontSize: "11px" }}>
                {stock.thesis.stance}
              </div>
            </div>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "2px", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Thesis</div>
              <div style={{ color: TERMINAL_COLORS.monoText, fontSize: "10px" }}>{stock.thesis.thesis}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "2px", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Bull Case</div>
                <div style={{ color: TERMINAL_COLORS.monoText, fontSize: "10px" }}>{stock.thesis.bullCase}</div>
              </div>
              <div>
                <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "2px", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Bear Case</div>
                <div style={{ color: TERMINAL_COLORS.monoText, fontSize: "10px" }}>{stock.thesis.bearCase}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DISCLAIMER ── */}
        <p style={{
          color: TERMINAL_COLORS.secondaryText,
          fontSize: "9px",
          textAlign: "center",
          margin: "8px 0",
          lineHeight: "1.4",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {disclaimer}
        </p>

        {/* ── TRADE BUTTON ── */}
        {selectedBroker && (
          <motion.button
            onClick={() => setIsBrokerOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: "8px 16px",
              borderRadius: "0",
              border: "none",
              background: TERMINAL_COLORS.accent,
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              alignSelf: "center",
              height: "36px",
            }}
          >
            <TrendingUp size={14} /> Trade via {selectedBroker}
          </motion.button>
        )}
      </div>

      {/* ── BROKER HANDOFF MODAL ── */}
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
    </div>
  );
}

// ── EXPORT ──
export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const seoMeta = useMemo(() => symbol ? buildCompanySeo(symbol, undefined, undefined) : null, [symbol]);
  useSeo(seoMeta);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [symbol]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["stock", symbol],
    queryFn: async () => {
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
