import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDown, ArrowLeft, ArrowUp, TrendingUp, ChevronDown, ChevronUp,
  ExternalLink, RefreshCw, AlertCircle, Activity, BarChart3, LineChart as LineChartIcon,
  Copy, Download, Share2, Bell, Eye, Clock, DollarSign, Volume2, PieChart
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { LazyBarChart, Bar, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "../components/DynamicChart";
import StockChart from "../components/StockChart";
import { Badge } from "../ui/Badge";
import { MarketStatusBadge } from "../components/MarketStatusBadge";
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

// ── Professional Trading Terminal Palette ──
const TERMINAL_COLORS = {
  canvas: "#0F1419",
  panel: "#151B27",
  accent: "#0891B2",
  gainGreen: "#10B981",
  lossRed: "#EF4444",
  monoText: "#E8EAED",
  secondaryText: "#9CA3AF",
};

// ── Shared motion presets ──
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

// ── Trading Terminal Header ──
function TerminalHeader({ symbol, price, changeAbs, changePercent, companyName }: {
  symbol: string; price: number; changeAbs: number; changePercent: number; companyName: string;
}) {
  const isUp = changeAbs >= 0;
  const priceColor = isUp ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed;

  return (
    <div style={{
      display: "grid",
      gap: "12px",
      padding: "16px",
      borderBottom: `1px solid rgba(255,255,255,0.05)`,
      background: TERMINAL_COLORS.canvas,
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontSize: "24px", fontWeight: 700, color: TERMINAL_COLORS.monoText, letterSpacing: "-0.01em" }}>
            {symbol}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: TERMINAL_COLORS.secondaryText }}>
            {companyName}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontSize: "28px", fontWeight: 700, color: TERMINAL_COLORS.monoText, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            ₱{formatNumber(price)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: priceColor, fontSize: "13px", fontWeight: 600 }}>
            {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            {isUp ? "+" : ""}{formatDecimal(changeAbs, 2)}
          </div>
          <div style={{ color: priceColor, fontSize: "12px", fontWeight: 500 }}>
            ({isUp ? "+" : ""}{formatDecimal(changePercent, 2)}%)
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compact Metrics Table ──
function MetricsTable({ stock }: { stock: StockResearchDetail }) {
  const fundamentals = stock.fundamentals ?? {};

  const rows = [
    { label: "Market Cap", value: stock.price.marketCap != null ? `₱${formatNumber(Math.round(stock.price.marketCap / 1_000_000))}M` : "—", align: "right" as const },
    { label: "PE (TTM)", value: formatDecimal(fundamentals.pe, 1), align: "right" as const },
    { label: "PB Ratio", value: formatDecimal(fundamentals.pb, 1), align: "right" as const },
    { label: "Dividend Yield", value: fundamentals.dividendYield != null ? `${formatDecimal(fundamentals.dividendYield, 2)}%` : "—", align: "right" as const },
    { label: "ROE", value: stock.roe != null ? `${formatDecimal(stock.roe, 1)}%` : "—", align: "right" as const },
    { label: "EPS (TTM)", value: fundamentals.eps != null ? `₱${formatDecimal(fundamentals.eps, 1)}` : "—", align: "right" as const },
    { label: "Net Margin", value: fundamentals.netMargin != null ? `${formatDecimal(fundamentals.netMargin, 1)}%` : "—", align: "right" as const },
    { label: "Debt/Equity", value: formatDecimal(stock.debtToEquity, 2), align: "right" as const },
    { label: "52W High", value: fundamentals.high52w != null ? `₱${formatNumber(fundamentals.high52w)}` : "—", align: "right" as const },
    { label: "52W Low", value: fundamentals.low52w != null ? `₱${formatNumber(fundamentals.low52w)}` : "—", align: "right" as const },
  ];

  return (
    <div style={{
      borderCollapse: "collapse",
      width: "100%",
      fontSize: "12px",
      fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} style={{
              borderBottom: idx < rows.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
              height: "32px",
            }}>
              <td style={{
                padding: "8px 12px 8px 0",
                color: TERMINAL_COLORS.secondaryText,
                textAlign: "left",
                fontWeight: 500,
              }}>
                {row.label}
              </td>
              <td style={{
                padding: "8px 0 8px 12px",
                color: TERMINAL_COLORS.monoText,
                textAlign: row.align,
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
              }}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Score Indicator (Compact Ring) ──
function ScoreRing({ label, value }: { label: string; value: number }) {
  const r = 32;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const ringColor = value >= 75 ? TERMINAL_COLORS.gainGreen : value >= 50 ? "#F59728" : TERMINAL_COLORS.lossRed;

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: "8px" }}>
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle cx={40} cy={40} r={r} fill="none" stroke={ringColor} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
        <text x="40" y="45" textAnchor="middle" fontSize="20" fontWeight="600" fill={TERMINAL_COLORS.monoText}>
          {Math.round(value)}
        </text>
      </svg>
      <span style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "11px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

function StockSkeleton() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      style={{ display: "grid", gap: "16px", maxWidth: 1400, margin: "0 auto", padding: "16px" }}
    >
      <motion.div variants={fadeUp} transition={pageTransition}>
        <PriceSkeleton />
      </motion.div>
      <motion.div variants={fadeUp} transition={pageTransition}>
        <ChartSkeleton height={300} />
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
        margin: "80px auto",
        padding: "24px",
        textAlign: "center",
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: "6px",
        background: TERMINAL_COLORS.panel,
        display: "grid",
        gap: "12px",
        justifyItems: "center",
      }}
    >
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: `rgba(239,68,68,0.15)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <AlertCircle size={22} color="#EF4444" />
      </div>
      <div style={{ color: TERMINAL_COLORS.monoText, fontSize: "15px", fontWeight: 600 }}>
        Failed to load {symbol}
      </div>
      <p style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "12px", lineHeight: "1.5", margin: 0 }}>
        Data feed unavailable. Please try again.
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRetry}
          style={{
            marginTop: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "4px",
            border: `1px solid rgba(255,255,255,0.1)`,
            background: TERMINAL_COLORS.accent,
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} /> Retry
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
  const heroRef = useRef<HTMLDivElement>(null);
  const [ai, setAi] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1Y");
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [showFinancialTable, setShowFinancialTable] = useState(false);
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
  const newsItems = (stock.news ?? []).slice(0, 7);
  const disclaimer = "StockEx research is for informational purposes only and is not investment advice.";
  const fundamentals = stock.fundamentals ?? {};
  const financialsReal = stock.dataSources.financials === "real" || stock.dataSources.financials === "pseApi";
  const shareholdingReal = stock.dataSources.shareholding === "real" || stock.dataSources.shareholding === "pseApi";
  const newsReal = stock.dataSources.news === "real";
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
    setAiError(null);
    generateStockAnalysis(stock.symbol, stock.companyName, stock.price.current, scores, stock.thesis?.thesis)
      .then((result) => { if (!cancelled) { setAi(result); setAiError(null); setAiLoading(false); } })
      .catch((err) => {
        if (!cancelled) {
          console.error('AI analysis error:', err);
          setAi(fallbackAnalysis(scores));
          setAiError('AI analysis unavailable');
          setAiLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [stock.symbol]);

  const boardLotSize = getBoardLotSize(stock.price.current);
  const boardTickSize = getTickSize(stock.price.current);
  const newsEventPack = buildNewsEventPack(stock.symbol, stock.news);
  const researchContext = toResearchAiContext({
    symbol: stock.symbol,
    companyName: stock.companyName,
    headline: stock.thesis.thesis,
    thesis: [stock.thesis.bullCase],
    risksToReview: [stock.thesis.bearCase],
    whatToWatch: [stock.thesis.whatToWatch],
    methodNote: "Summary based on the signals shown on this page.",
  }, "stock");

  const enrichedResearchContext = researchContext
    ? (enrichResearchContextWithEvents(researchContext, newsEventPack) ?? researchContext)
    : null;

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

  const finalResearchContext: typeof enrichedResearchContext = enrichedResearchContext && retrievalContext
    ? { ...enrichedResearchContext, extraContext: [enrichedResearchContext.extraContext, retrievalContext].filter(Boolean).join('\n') }
    : enrichedResearchContext;

  return (
    <div style={{
      display: "grid",
      gap: "16px",
      background: TERMINAL_COLORS.canvas,
      color: TERMINAL_COLORS.monoText,
      minHeight: "100vh",
    }}>
      {/* ── Terminal Header ── */}
      <TerminalHeader
        symbol={stock.symbol}
        price={stock.price.current}
        changeAbs={stock.price.changeAbs}
        changePercent={stock.price.changePercent}
        companyName={stock.companyName}
      />

      {/* ── Main Content ── */}
      <div style={{ display: "grid", gap: "16px", padding: "0 16px 48px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* ── Back Button ── */}
        <motion.button
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            border: `1px solid rgba(255,255,255,0.1)`,
            background: "transparent",
            padding: "6px 12px",
            borderRadius: "4px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: TERMINAL_COLORS.secondaryText,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
            width: "fit-content",
          }}
        >
          <ArrowLeft size={14} /> Back
        </motion.button>

        {/* ── Price Chart Section ── */}
        <div style={{
          border: `1px solid rgba(255,255,255,0.05)`,
          borderRadius: "6px",
          padding: "12px",
          background: TERMINAL_COLORS.panel,
        }}>
          <div style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: "12px",
          }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {TIMEFRAMES.map((value) => (
                <button
                  key={value}
                  onClick={() => setTimeframe(value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: value === timeframe ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                    color: value === timeframe ? "white" : TERMINAL_COLORS.secondaryText,
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <ChartErrorBoundary>
            <div style={{
              width: "100%",
              height: "300px",
              backgroundColor: TERMINAL_COLORS.canvas,
              borderRadius: "4px",
              border: `1px solid rgba(255,255,255,0.05)`,
              overflow: "hidden",
            }}>
              <StockChart
                symbol={stock.symbol}
                ohlcData={transformToOHLC(stock.priceHistory?.[getApiTimeframe(timeframe)] ?? [])}
                timeframe={timeframe as any}
                showIndicators={true}
                height={280}
              />
            </div>
          </ChartErrorBoundary>
        </div>

        {/* ── Two-Column Dashboard ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* ── Metrics Table ── */}
          <div style={{
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: "6px",
            padding: "12px",
            background: TERMINAL_COLORS.panel,
          }}>
            <div style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
              marginBottom: "12px",
            }}>
              Fundamentals
            </div>
            <MetricsTable stock={stock} />
          </div>

          {/* ── Score Indicators ── */}
          <div style={{
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: "6px",
            padding: "12px",
            background: TERMINAL_COLORS.panel,
            display: "flex",
            gap: "16px",
            justifyContent: "space-around",
            alignItems: "center",
          }}>
            <ScoreRing label="Health" value={stock.scores.health ?? 0} />
            <ScoreRing label="Momentum" value={stock.scores.momentum ?? 0} />
            <ScoreRing label="Risk Adj" value={stock.scores.riskAdjusted ?? stock.scores.health ?? 0} />
          </div>
        </div>

        {/* ── Company Profile ── */}
        <div style={{
          border: `1px solid rgba(255,255,255,0.05)`,
          borderRadius: "6px",
          padding: "12px",
          background: TERMINAL_COLORS.panel,
        }}>
          <div style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: TERMINAL_COLORS.secondaryText,
            marginBottom: "12px",
          }}>
            About {stock.companyName}
          </div>
          <p style={{
            color: TERMINAL_COLORS.monoText,
            fontSize: "13px",
            fontWeight: 400,
            lineHeight: "1.6",
            margin: "0 0 12px 0",
          }}>
            {stock.description}
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            fontSize: "11px",
            fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
          }}>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>Founded</div>
              <div style={{ color: TERMINAL_COLORS.monoText, fontWeight: 500 }}>{companyProfile.founded}</div>
            </div>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>CEO</div>
              <div style={{ color: TERMINAL_COLORS.monoText, fontWeight: 500 }}>{companyProfile.ceo}</div>
            </div>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>HQ</div>
              <div style={{ color: TERMINAL_COLORS.monoText, fontWeight: 500 }}>{companyProfile.hq}</div>
            </div>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>Sector</div>
              <div style={{ color: TERMINAL_COLORS.monoText, fontWeight: 500 }}>{stock.sector}</div>
            </div>
          </div>
        </div>

        {/* ── Financials ── */}
        <div style={{
          border: `1px solid rgba(255,255,255,0.05)`,
          borderRadius: "6px",
          padding: "12px",
          background: TERMINAL_COLORS.panel,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}>
            <div style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
            }}>
              Financials
            </div>
            <span style={{
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "3px",
              background: financialsReal ? "rgba(16,185,129,0.2)" : "rgba(245,152,45,0.2)",
              color: financialsReal ? TERMINAL_COLORS.gainGreen : "#F59728",
            }}>
              {financialsReal ? "Verified" : "Estimated"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => setFinancialMetric("revenue")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                background: financialMetric === "revenue" ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                color: financialMetric === "revenue" ? "white" : TERMINAL_COLORS.secondaryText,
              }}
            >
              Revenue
            </button>
            <button
              onClick={() => setFinancialMetric("profit")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                background: financialMetric === "profit" ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                color: financialMetric === "profit" ? "white" : TERMINAL_COLORS.secondaryText,
              }}
            >
              Profit
            </button>
            <button
              onClick={() => setFinancialPeriod("annual")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                background: financialPeriod === "annual" ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                color: financialPeriod === "annual" ? "white" : TERMINAL_COLORS.secondaryText,
              }}
            >
              Annual
            </button>
            <button
              onClick={() => setFinancialPeriod("quarterly")}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 600,
                background: financialPeriod === "quarterly" ? TERMINAL_COLORS.accent : "rgba(255,255,255,0.05)",
                color: financialPeriod === "quarterly" ? "white" : TERMINAL_COLORS.secondaryText,
              }}
            >
              Quarterly
            </button>
          </div>
          <ChartErrorBoundary>
            <div style={{
              width: "100%",
              height: "250px",
              backgroundColor: TERMINAL_COLORS.canvas,
              borderRadius: "4px",
              border: `1px solid rgba(255,255,255,0.05)`,
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <LazyBarChart data={effectiveChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: TERMINAL_COLORS.secondaryText }} />
                  <YAxis tick={{ fontSize: 11, fill: TERMINAL_COLORS.secondaryText }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: TERMINAL_COLORS.panel,
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: "4px",
                      color: TERMINAL_COLORS.monoText,
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

        {/* ── News Feed (Minimal Table) ── */}
        {newsItems.length > 0 && (
          <div style={{
            border: `1px solid rgba(255,255,255,0.05)`,
            borderRadius: "6px",
            padding: "12px",
            background: TERMINAL_COLORS.panel,
          }}>
            <div style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: TERMINAL_COLORS.secondaryText,
              marginBottom: "12px",
            }}>
              Latest News
            </div>
            <div style={{
              display: "grid",
              gap: "8px",
              fontSize: "11px",
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
                    paddingBottom: "8px",
                    borderBottom: idx < newsItems.length - 1 ? `1px solid rgba(255,255,255,0.05)` : "none",
                    textDecoration: "none",
                    color: TERMINAL_COLORS.monoText,
                  }}
                >
                  <span style={{ color: TERMINAL_COLORS.accent, minWidth: "50px" }}>
                    {formatNewsTime(item.publishedAt) || item.time}
                  </span>
                  <span style={{ color: TERMINAL_COLORS.monoText, flex: 1 }}>
                    {item.headline}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Investment Thesis ── */}
        <div style={{
          border: `1px solid rgba(255,255,255,0.05)`,
          borderRadius: "6px",
          padding: "12px",
          background: TERMINAL_COLORS.panel,
        }}>
          <div style={{
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: TERMINAL_COLORS.secondaryText,
            marginBottom: "12px",
          }}>
            Investment Thesis
          </div>
          <div style={{ display: "grid", gap: "12px", fontSize: "12px", lineHeight: "1.5" }}>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px", fontWeight: 600 }}>Stance</div>
              <div style={{ color: stock.thesis.stance === "High conviction" ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed }}>
                {stock.thesis.stance}
              </div>
            </div>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px", fontWeight: 600 }}>Thesis</div>
              <div style={{ color: TERMINAL_COLORS.monoText }}>{stock.thesis.thesis}</div>
            </div>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px", fontWeight: 600 }}>Bull Case</div>
              <div style={{ color: TERMINAL_COLORS.monoText }}>{stock.thesis.bullCase}</div>
            </div>
            <div>
              <div style={{ color: TERMINAL_COLORS.secondaryText, marginBottom: "4px", fontWeight: 600 }}>Bear Case</div>
              <div style={{ color: TERMINAL_COLORS.monoText }}>{stock.thesis.bearCase}</div>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <p style={{
          color: TERMINAL_COLORS.secondaryText,
          fontSize: "10px",
          textAlign: "center",
          margin: "16px 0",
          lineHeight: "1.5",
        }}>
          {disclaimer}
        </p>

        {/* ── Trade Button ── */}
        {selectedBroker && (
          <motion.button
            onClick={() => setIsBrokerOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: "12px 24px",
              borderRadius: "4px",
              border: "none",
              background: TERMINAL_COLORS.accent,
              color: "white",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              alignSelf: "center",
            }}
          >
            <TrendingUp size={16} /> Trade via {selectedBroker}
          </motion.button>
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
    </div>
  );
}

// ── Export ──
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
