import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowDown, ArrowLeft, ArrowUp, RefreshCw, AlertCircle,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { LazyBarChart, Bar, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "../components/DynamicChart";
import StockChart from "../components/StockChart";
import { BrokerHandoffModal } from "../components/BrokerHandoffModal";
import { ChartErrorBoundary } from "../components/ChartErrorBoundary";
import { RSIGauge } from "../components/animations/TechnicalIndicatorCanvas";
import { listAvailableBrokers } from "../commercial/BrokerHandoffService";
import { fallbackAnalysis, generateStockAnalysis } from "../services/llm/AIAnalysisService";
import type { AIAnalysis } from "../services/llm/AIAnalysisService";
import { useSeo } from "../frontend/seo/useSeo";
import { buildCompanySeo } from "../frontend/seo/companySeo";
import { formatNumber } from "../services/ui/dataFormatting";
import {
  buildNewsEventPack,
} from "../components/ai-orchestrator/eventEvidenceAiContext";
import { buildEvidenceRetrievalAggregate } from "../systems/market-brain/evidenceRetrievalOrchestrator";
import { compressEventEvidencePack } from "../systems/market-brain/eventEvidencePack";
import { PriceSkeleton, ChartSkeleton, MetricsSkeleton } from "../components/SkeletonLoader";

// ── Professional Trading Terminal Palette ──
const TERMINAL_COLORS = {
  canvas: "#FAF8F4",
  panel: "#FFFFFF",
  accent: "#B5502E",
  gainGreen: "#17754A",
  lossRed: "#B3311F",
  monoText: "#1C1A16",
  secondaryText: "#6B6559",
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

// ── STOCK HEADER: Compact professional header (60px) ──
function StockHeader({ stock }: { stock: StockResearchDetail }) {
  const isUp = stock.price.changeAbs >= 0;
  const priceColor = isUp ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed;

  return (
    <div style={{
      padding: "8px 12px",
      background: TERMINAL_COLORS.canvas,
      borderBottom: `1px solid rgba(0,0,0,0.08)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "24px",
      minHeight: "60px",
    }}>
      {/* LEFT: Ticker & Company */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
        <span style={{
          fontSize: "20px",
          fontWeight: 700,
          color: TERMINAL_COLORS.monoText,
          fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
          letterSpacing: "-0.02em",
        }}>
          {stock.symbol}
        </span>
        <span style={{
          fontSize: "13px",
          color: TERMINAL_COLORS.secondaryText,
          fontWeight: 500,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {stock.companyName}
        </span>
      </div>

      {/* CENTER: Live Price (very large) */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flex: 1 }}>
        <span style={{
          fontSize: "42px",
          fontWeight: 700,
          color: TERMINAL_COLORS.monoText,
          fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}>
          ₱{formatNumber(stock.price.current)}
        </span>
      </div>

      {/* RIGHT: Change % with color coding */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: priceColor,
        fontSize: "14px",
        fontWeight: 700,
        fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
        fontVariantNumeric: "tabular-nums",
      }}>
        {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        <span>{isUp ? "+" : ""}{formatDecimal(stock.price.changePercent, 2)}%</span>
        <span style={{ fontSize: "12px", opacity: 0.8 }}>({isUp ? "+" : ""}{formatDecimal(stock.price.changeAbs, 2)})</span>
      </div>

      {/* QUICK STATS: High | Low | Vol | P/E */}
      <div style={{
        display: "flex",
        gap: "16px",
        fontSize: "11px",
        fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
      }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "9px", textTransform: "uppercase", fontWeight: 600 }}>H</div>
          <div style={{ color: TERMINAL_COLORS.monoText, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            ₱{formatNumber(stock.fundamentals?.high52w ?? 0)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "9px", textTransform: "uppercase", fontWeight: 600 }}>L</div>
          <div style={{ color: TERMINAL_COLORS.monoText, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            ₱{formatNumber(stock.fundamentals?.low52w ?? 0)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "9px", textTransform: "uppercase", fontWeight: 600 }}>P/E</div>
          <div style={{ color: TERMINAL_COLORS.monoText, fontWeight: 600 }}>
            {stock.fundamentals?.pe ? stock.fundamentals.pe.toFixed(1) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ORDER TICKET: BUY/SELL panel (right side of 2-column layout) ──
function OrderTicket({ stock }: { stock: StockResearchDetail }) {
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<string>("1");
  const [price, setPrice] = useState<string>(stock.price.current.toString());
  const [isMarketOrder, setIsMarketOrder] = useState(true);

  const qty = parseInt(quantity) || 0;
  const effectivePrice = isMarketOrder ? stock.price.current : (parseFloat(price) || 0);
  const totalAmount = qty * effectivePrice;
  const isUp = stock.price.changeAbs >= 0;
  const btnColor = orderType === "buy" ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed;

  return (
    <div style={{
      border: `1px solid rgba(0,0,0,0.05)`,
      borderRadius: "0",
      padding: "12px",
      background: TERMINAL_COLORS.panel,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}>
      {/* BUY/SELL Tabs */}
      <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid rgba(0,0,0,0.05)` }}>
        {["buy", "sell"].map((tab) => (
          <button
            key={tab}
            onClick={() => setOrderType(tab as "buy" | "sell")}
            style={{
              flex: 1,
              padding: "8px",
              border: "none",
              background: orderType === tab ? (tab === "buy" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)") : "transparent",
              color: orderType === tab ? (tab === "buy" ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed) : TERMINAL_COLORS.secondaryText,
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              cursor: "pointer",
              borderBottom: `2px solid ${orderType === tab ? (tab === "buy" ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed) : "transparent"}`,
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Quantity Input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <label style={{ fontSize: "9px", fontWeight: 600, color: TERMINAL_COLORS.secondaryText, textTransform: "uppercase" }}>QTY</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="1"
          style={{
            height: "36px",
            padding: "0 8px",
            border: `1px solid rgba(0,0,0,0.1)`,
            background: TERMINAL_COLORS.canvas,
            color: TERMINAL_COLORS.monoText,
            fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "0",
          }}
        />
      </div>

      {/* Price Toggle & Input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: "9px", fontWeight: 600, color: TERMINAL_COLORS.secondaryText, textTransform: "uppercase" }}>PRICE</label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isMarketOrder}
              onChange={(e) => setIsMarketOrder(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ color: TERMINAL_COLORS.secondaryText }}>Market</span>
          </label>
        </div>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isMarketOrder}
          step="0.01"
          style={{
            height: "36px",
            padding: "0 8px",
            border: `1px solid rgba(0,0,0,0.1)`,
            background: isMarketOrder ? "rgba(0,0,0,0.02)" : TERMINAL_COLORS.canvas,
            color: TERMINAL_COLORS.monoText,
            fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "0",
            opacity: isMarketOrder ? 0.5 : 1,
            cursor: isMarketOrder ? "not-allowed" : "text",
          }}
        />
      </div>

      {/* Total Amount Display */}
      <div style={{
        padding: "8px",
        background: "rgba(0,0,0,0.02)",
        border: `1px solid rgba(0,0,0,0.05)`,
        borderRadius: "0",
      }}>
        <div style={{ fontSize: "9px", color: TERMINAL_COLORS.secondaryText, fontWeight: 600, textTransform: "uppercase", marginBottom: "3px" }}>Total</div>
        <div style={{
          fontSize: "18px",
          fontWeight: 700,
          color: TERMINAL_COLORS.monoText,
          fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
          fontVariantNumeric: "tabular-nums",
        }}>
          ₱{formatNumber(Math.round(totalAmount))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "grid", gap: "6px" }}>
        <motion.button
          whileHover={{ opacity: 0.9 }}
          whileTap={{ scale: 0.98 }}
          style={{
            height: "44px",
            border: "none",
            background: btnColor,
            color: "white",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            textTransform: "uppercase",
            borderRadius: "0",
            transition: "opacity 0.2s",
          }}
        >
          {orderType.toUpperCase()}
        </motion.button>
      </div>
    </div>
  );
}

// ── STOCK INFO GRID: Valuation | Fundamentals | Technical (3 columns) ──
function StockInfoGrid({ stock }: { stock: StockResearchDetail }) {
  const fundamentals = stock.fundamentals ?? {};
  const isPositive = (val: number | null) => val != null && val > 0;

  const getValueColor = (val: number | null, isPercentage: boolean = false) => {
    if (val == null) return TERMINAL_COLORS.secondaryText;
    if (isPercentage) return val >= 0 ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed;
    return TERMINAL_COLORS.monoText;
  };

  const valuationMetrics = [
    { label: "P/E Ratio", value: fundamentals.pe, format: (v: number) => v.toFixed(1) },
    { label: "P/B Ratio", value: fundamentals.pb, format: (v: number) => v.toFixed(1) },
    { label: "Dividend Yield", value: fundamentals.dividendYield, format: (v: number) => v.toFixed(2) + "%" },
    { label: "Market Cap", value: stock.price.marketCap ? stock.price.marketCap / 1_000_000_000 : null, format: (v: number) => v.toFixed(1) + "B" },
  ];

  const fundamentalsMetrics = [
    { label: "EPS (TTM)", value: fundamentals.eps, format: (v: number) => "₱" + v.toFixed(2) },
    { label: "ROE", value: stock.roe, format: (v: number) => v.toFixed(1) + "%" },
    { label: "Debt/Equity", value: stock.debtToEquity, format: (v: number) => v.toFixed(2) },
    { label: "Revenue Growth", value: stock.revenueGrowth, format: (v: number) => v.toFixed(1) + "%" },
  ];

  const technicalMetrics = [
    { label: "52W High", value: fundamentals.high52w, format: (v: number) => "₱" + formatNumber(v) },
    { label: "52W Low", value: fundamentals.low52w, format: (v: number) => "₱" + formatNumber(v) },
    { label: "RSI", value: stock.rsi, format: (v: number) => v.toFixed(0) },
    { label: "Beta", value: null, format: (v: number) => "—" },
  ];

  const MetricColumn = ({ title, metrics }: { title: string; metrics: any[] }) => (
    <div style={{
      border: `1px solid rgba(0,0,0,0.05)`,
      borderRadius: "0",
      padding: "12px",
      background: TERMINAL_COLORS.panel,
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}>
      <div style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        color: TERMINAL_COLORS.secondaryText,
        letterSpacing: "0.05em",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {metrics.map((metric, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "11px" }}>
            <span style={{ color: TERMINAL_COLORS.secondaryText, fontWeight: 500 }}>{metric.label}</span>
            <span style={{
              color: metric.value != null ? getValueColor(metric.value, metric.label.includes("%")) : TERMINAL_COLORS.secondaryText,
              fontWeight: 600,
              fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
              fontVariantNumeric: "tabular-nums",
            }}>
              {metric.value != null ? metric.format(metric.value) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "12px",
    }}>
      <MetricColumn title="Valuation" metrics={valuationMetrics} />
      <MetricColumn title="Fundamentals" metrics={fundamentalsMetrics} />
      <div style={{
        border: `1px solid rgba(0,0,0,0.05)`,
        borderRadius: "0",
        padding: "12px",
        background: TERMINAL_COLORS.panel,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          color: TERMINAL_COLORS.secondaryText,
          letterSpacing: "0.05em",
        }}>
          Technical
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {technicalMetrics.map((metric, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "11px" }}>
              <span style={{ color: TERMINAL_COLORS.secondaryText, fontWeight: 500 }}>{metric.label}</span>
              <span style={{
                color: metric.value != null ? getValueColor(metric.value, metric.label.includes("%")) : TERMINAL_COLORS.secondaryText,
                fontWeight: 600,
                fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}>
                {metric.value != null ? metric.format(metric.value) : "—"}
              </span>
            </div>
          ))}
        </div>
        {stock.rsi != null && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "4px" }}>
            <RSIGauge value={stock.rsi} width={160} height={104} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── TAB NAVIGATION ──
type TabType = "about" | "news" | "research" | "financials";

function TabNavigation({ activeTab, onTabChange }: { activeTab: TabType; onTabChange: (tab: TabType) => void }) {
  const tabs: { id: TabType; label: string }[] = [
    { id: "about", label: "About" },
    { id: "news", label: "News" },
    { id: "research", label: "Research" },
    { id: "financials", label: "Financials" },
  ];

  return (
    <div style={{
      display: "flex",
      gap: "0",
      borderBottom: `1px solid rgba(0,0,0,0.05)`,
      marginBottom: "12px",
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: "8px 16px",
            border: "none",
            background: "transparent",
            color: activeTab === tab.id ? TERMINAL_COLORS.monoText : TERMINAL_COLORS.secondaryText,
            fontSize: "12px",
            fontWeight: activeTab === tab.id ? 600 : 500,
            cursor: "pointer",
            borderBottom: activeTab === tab.id ? `2px solid ${TERMINAL_COLORS.accent}` : "none",
            transition: "all 0.2s",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
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
        border: `1px solid rgba(0,0,0,0.05)`,
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
        <AlertCircle size={20} color="#B3311F" />
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
            border: `1px solid rgba(0,0,0,0.1)`,
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
  const [activeTab, setActiveTab] = useState<TabType>("about");
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
      gap: "0",
      background: TERMINAL_COLORS.canvas,
      color: TERMINAL_COLORS.monoText,
      minHeight: "100vh",
    }}>
      {/* ── STOCK HEADER (60px) ── */}
      <StockHeader stock={stock} />

      {/* ── MAIN CONTENT ── */}
      <div style={{
        display: "grid",
        gap: "12px",
        padding: "12px",
        maxWidth: "1600px",
        margin: "0 auto",
        width: "100%",
      }}>
        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            border: `1px solid rgba(0,0,0,0.1)`,
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

        {/* ── 2-COLUMN LAYOUT: Chart (2/3) + Order Ticket (1/3) ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "12px",
        }}>
          {/* LEFT: Price Chart & Volume */}
          <div style={{
            border: `1px solid rgba(0,0,0,0.05)`,
            borderRadius: "0",
            padding: "12px",
            background: TERMINAL_COLORS.panel,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <div style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
            }}>
              {TIMEFRAMES.map((value) => (
                <button
                  key={value}
                  onClick={() => setTimeframe(value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "0",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: value === timeframe ? TERMINAL_COLORS.accent : "rgba(0,0,0,0.05)",
                    color: value === timeframe ? "white" : TERMINAL_COLORS.secondaryText,
                    height: "32px",
                    transition: "all 0.2s",
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <ChartErrorBoundary>
              <div style={{
                width: "100%",
                height: "320px",
                backgroundColor: TERMINAL_COLORS.canvas,
                borderRadius: "0",
                border: `1px solid rgba(0,0,0,0.05)`,
                overflow: "hidden",
              }}>
                <StockChart
                  symbol={stock.symbol}
                  ohlcData={transformToOHLC(stock.priceHistory?.[getApiTimeframe(timeframe)] ?? [])}
                  timeframe={timeframe as any}
                  showIndicators={true}
                  height={300}
                />
              </div>
            </ChartErrorBoundary>
          </div>

          {/* RIGHT: Order Ticket */}
          <OrderTicket stock={stock} />
        </div>

        {/* ── STOCK INFO GRID: Valuation | Fundamentals | Technical ── */}
        <StockInfoGrid stock={stock} />

        {/* ── TABBED CONTENT SECTION ── */}
        <div style={{
          border: `1px solid rgba(0,0,0,0.05)`,
          borderRadius: "0",
          padding: "12px",
          background: TERMINAL_COLORS.panel,
        }}>
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {/* TAB: ABOUT */}
          {activeTab === "about" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "grid", gap: "16px" }}
            >
              <div>
                <p style={{
                  color: TERMINAL_COLORS.monoText,
                  fontSize: "11px",
                  fontWeight: 400,
                  lineHeight: "1.6",
                  margin: "0 0 12px 0",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}>
                  {stock.description}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Company Profile */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: TERMINAL_COLORS.secondaryText, letterSpacing: "0.05em" }}>
                    Profile
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                    <tbody>
                      {[
                        { label: "Founded", value: companyProfile.founded },
                        { label: "CEO", value: companyProfile.ceo },
                        { label: "Sector", value: stock.sector },
                        { label: "Employees", value: companyProfile.employees },
                      ].map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid rgba(0,0,0,0.05)`, height: "28px" }}>
                          <td style={{ padding: "6px 0", color: TERMINAL_COLORS.secondaryText, fontWeight: 500 }}>{row.label}</td>
                          <td style={{ padding: "6px 0", color: TERMINAL_COLORS.monoText, textAlign: "right", fontWeight: 600 }}>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Scores */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: TERMINAL_COLORS.secondaryText, letterSpacing: "0.05em" }}>
                    Scores
                  </div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {[
                      { label: "Quality", value: stock.scores.quality },
                      { label: "Valuation", value: stock.scores.valuation },
                      { label: "Growth", value: stock.scores.growth },
                      { label: "Momentum", value: stock.scores.momentum },
                    ].map((item, idx) => {
                      const color = !item.value ? TERMINAL_COLORS.secondaryText : item.value >= 70 ? TERMINAL_COLORS.gainGreen : item.value >= 50 ? TERMINAL_COLORS.accent : TERMINAL_COLORS.lossRed;
                      return (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                          <span style={{ color: TERMINAL_COLORS.secondaryText }}>{item.label}</span>
                          <span style={{ color, fontWeight: 600, fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace" }}>
                            {item.value != null ? `${item.value}/100` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: NEWS */}
          {activeTab === "news" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "grid", gap: "8px" }}
            >
              {newsItems.length > 0 ? (
                newsItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link || "#"}
                    target={item.link ? "_blank" : undefined}
                    rel={item.link ? "noopener noreferrer" : undefined}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "10px",
                      borderBottom: `1px solid rgba(0,0,0,0.05)`,
                      textDecoration: "none",
                      color: TERMINAL_COLORS.monoText,
                      alignItems: "flex-start",
                      transition: "background 0.2s",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{
                      color: TERMINAL_COLORS.accent,
                      minWidth: "50px",
                      fontWeight: 600,
                      fontSize: "10px",
                      fontFamily: "'SF Mono', 'JetBrains Mono', 'Roboto Mono', monospace",
                    }}>
                      {formatNewsTime(item.publishedAt) || item.time}
                    </span>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: TERMINAL_COLORS.monoText }}>{item.headline}</span>
                      <span style={{ fontSize: "9px", color: TERMINAL_COLORS.secondaryText }}>{item.source || "PSE"}</span>
                    </div>
                  </a>
                ))
              ) : (
                <div style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "11px", textAlign: "center", padding: "20px" }}>
                  No recent news available
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: RESEARCH */}
          {activeTab === "research" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "grid", gap: "12px" }}
            >
              {ai ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>
                      Stance
                    </div>
                    <div style={{
                      color: stock.thesis.stance === "High conviction" ? TERMINAL_COLORS.gainGreen : TERMINAL_COLORS.lossRed,
                      fontWeight: 700,
                      fontSize: "13px",
                    }}>
                      {stock.thesis.stance}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>
                      Thesis
                    </div>
                    <p style={{ color: TERMINAL_COLORS.monoText, fontSize: "11px", lineHeight: "1.6", margin: 0 }}>
                      {stock.thesis.thesis}
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>
                        Bull Case
                      </div>
                      <p style={{ color: TERMINAL_COLORS.monoText, fontSize: "11px", lineHeight: "1.6", margin: 0 }}>
                        {stock.thesis.bullCase}
                      </p>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: TERMINAL_COLORS.secondaryText, marginBottom: "4px" }}>
                        Bear Case
                      </div>
                      <p style={{ color: TERMINAL_COLORS.monoText, fontSize: "11px", lineHeight: "1.6", margin: 0 }}>
                        {stock.thesis.bearCase}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: TERMINAL_COLORS.secondaryText, fontSize: "11px", textAlign: "center", padding: "20px" }}>
                  {aiLoading ? "Generating AI research..." : "No research available"}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB: FINANCIALS */}
          {activeTab === "financials" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                {["revenue" as const, "profit" as const].map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setFinancialMetric(metric)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "0",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: financialMetric === metric ? TERMINAL_COLORS.accent : "rgba(0,0,0,0.05)",
                      color: financialMetric === metric ? "white" : TERMINAL_COLORS.secondaryText,
                      height: "32px",
                      textTransform: "capitalize",
                      transition: "all 0.2s",
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
                        padding: "6px 12px",
                        borderRadius: "0",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: financialPeriod === p ? TERMINAL_COLORS.accent : "rgba(0,0,0,0.05)",
                        color: financialPeriod === p ? "white" : TERMINAL_COLORS.secondaryText,
                        height: "32px",
                        textTransform: "capitalize",
                        transition: "all 0.2s",
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
                  height: "240px",
                  backgroundColor: TERMINAL_COLORS.canvas,
                  borderRadius: "0",
                  border: `1px solid rgba(0,0,0,0.05)`,
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LazyBarChart data={effectiveChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: TERMINAL_COLORS.secondaryText }} />
                      <YAxis tick={{ fontSize: 10, fill: TERMINAL_COLORS.secondaryText }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: TERMINAL_COLORS.panel,
                          border: `1px solid rgba(0,0,0,0.1)`,
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
            </motion.div>
          )}
        </div>

        {/* ── FOOTER DISCLAIMER ── */}
        <p style={{
          color: TERMINAL_COLORS.secondaryText,
          fontSize: "9px",
          textAlign: "center",
          margin: "12px 0",
          lineHeight: "1.5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          {disclaimer}
        </p>
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
