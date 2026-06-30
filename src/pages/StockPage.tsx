import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, BarChart3, Building2, TrendingUp, Activity, Search, ChevronDown, ChevronUp, Download, ExternalLink, Star, Zap } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardLabel } from "../ui/Card";
import { Stat } from "../ui/Stat";
import { useResponsiveValue } from "../ui/responsive";
import { SEBIComplianceBanner } from "../components/SEBICompliance";
import { BrokerHandoffModal } from "../components/BrokerHandoffModal";
import { ThesisHistory } from "../components/ThesisHistory";
import { listAvailableBrokers } from "../commercial/BrokerHandoffService";
import type { BrokerEntry } from "../commercial/BrokerRegistry";
import { fallbackAnalysis, generateStockAnalysis } from "../services/llm/AIAnalysisService";
import type { AIAnalysis } from "../services/llm/AIAnalysisService";
import { colors, typography, radius, animation, shadows } from "../design/tokens";
import { InteractiveButton, MetricCard, ExpandingPanel, HoverCard } from "../ui/MicroInteractions";
import { useSeo } from "../frontend/seo/useSeo";
import { buildCompanySeo } from "../frontend/seo/companySeo";
import { CompanyAnalystSection } from "../components/analyst/CompanyAnalystSection";
import { SimilarStocks } from "../components/SimilarStocks";
import { OptionsFlow } from "../components/OptionsFlow";
import { InsiderActivity } from "../components/InsiderActivity";
import { PriceTargets } from "../components/PriceTargets";
import { NativeAd } from "../components/NativeAd";
import { MarketBrainPanel } from "../components/market-brain/MarketBrainPanel";

type StockResearchDetail = {
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  sector: string;
  industry: string;
  price: { current: number; changeAbs: number; changePercent: number; marketCap: number };
  fundamentals: {
    pe: number | null; industryPe: number | null; pb: number | null; dividendYield: number | null;
    eps: number | null; high52w?: number | null; low52w?: number | null;
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
  shareholding: Array<{ period: string; promoter: number; fii: number; dii: number; retail: number; deltas: { promoter: number; fii: number; dii: number; retail: number } }>;
  shareholdings?: Array<{ period: string; promoter: number; fii: number; dii: number; retail: number; deltas: { promoter: number; fii: number; dii: number; retail: number } }>;
  news: Array<{ headline: string; source: string; time: string; link?: string; publishedAt?: string }>;
  thesis: { thesis: string; bullCase: string; bearCase: string; whatToWatch: string; stance: "High conviction" | "Watch" | "Needs review" | "Risk rising" | "Avoid for now" };
  priceHistory: Record<string, Array<{ label: string; price: number }>>;
};

const TIMEFRAMES = ["1W", "1M", "3M", "1Y", "5Y"] as const;
const FINANCIAL_METRICS = ["revenue", "profit", "ebitda"] as const;
const FINANCIAL_PERIODS = ["annual", "quarterly"] as const;
type FinancialMetric = (typeof FINANCIAL_METRICS)[number];
type FinancialPeriod = (typeof FINANCIAL_PERIODS)[number];

function formatNewsTime(value?: string): string {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  const minutesAgo = Math.round((Date.now() - timestamp) / 60000);
  if (minutesAgo < 60) return `${Math.max(minutesAgo, 1)}m ago`;
  if (minutesAgo < 1440) return `${Math.round(minutesAgo / 60)}h ago`;
  return `${Math.round(minutesAgo / 1440)}d ago`;
}// ── Sticky Header (48px, shows on scroll past hero) ─────────────
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
        <span style={{ color: colors.textPrimary, fontSize: "16px", fontWeight: 600 }}>
          ₹{price.toLocaleString("en-IN")}
        </span>
        <span style={{ color: trendColor, fontSize: "13px", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {isUp ? "+" : ""}{changeAbs.toFixed(2)} ({changePercent.toFixed(2)}%)
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
  const convictionEmoji = stock.confidenceMeter >= 75 ? "🔥" : stock.confidenceMeter >= 60 ? "📈" : stock.confidenceMeter >= 40 ? "👀" : "⚠️";
  const convictionLabel = stock.confidenceMeter >= 75 ? "HIGH CONVICTION" : stock.confidenceMeter >= 60 ? "WATCH" : stock.confidenceMeter >= 40 ? "NEEDS REVIEW" : "RISK RISING";
  const convictionColor = stock.confidenceMeter >= 75 ? colors.success : stock.confidenceMeter >= 60 ? colors.warning : stock.confidenceMeter >= 40 ? colors.marketOrange : colors.danger;
  return (
    <section className="stock-hero raycast-slideUp" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0 40px", textAlign: "center", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <Badge value={60} label={stock.exchange} />
        <span style={{ color: colors.textSecondary, fontSize: "14px", fontWeight: 500 }}>{stock.companyName}</span>
      </div>
      <div style={{ fontSize: useResponsiveValue("40px", "64px"), fontWeight: 700, color: colors.textPrimary, lineHeight: "1.1", letterSpacing: "-0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        ₹{stock.price.current.toLocaleString("en-IN")}
        <span className="live-indicator" style={{
          width: "10px", height: "10px", borderRadius: "50%", background: colors.marketGreen,
          display: "inline-block", flexShrink: 0, marginTop: "8px",
        }} title="Live data" />
        <span style={{ fontSize: "11px", color: colors.marketGreen, fontWeight: 600, letterSpacing: "0.06em", marginTop: "8px" }}>LIVE</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ color: trendColor, fontSize: "18px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {isUp ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
          {isUp ? "+" : ""}{stock.price.changeAbs.toFixed(2)} ({stock.price.changePercent.toFixed(2)}%)
        </div>
        <div className="raycast-badgePulse" style={{
          display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px",
          borderRadius: radius.full, border: `1px solid ${convictionColor}40`,
          background: `${convictionColor}14`, fontSize: "13px", fontWeight: 600,
          color: convictionColor,
        }}>
          <span>{convictionEmoji}</span><span>{convictionLabel}</span>
        </div>
      </div>
      <div style={{ fontSize: "13px", color: colors.textSecondary, marginTop: "10px" }}>
        Conf: {stock.confidenceMeter}% · Market Cap: ₹{Math.round(stock.price.marketCap).toLocaleString("en-IN")} Cr
      </div>
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
        <div style={{ position: "relative", width: "120px", height: "120px" }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r="54" fill="none" stroke={colors.border} strokeWidth="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke={ringColor} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
          </svg>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: colors.textPrimary, lineHeight: "1" }}>{Math.round(score)}</span>
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
    <div style={{ display: "grid", gap: "16px" }}>
      <div style={{ height: "24px", width: "120px", background: colors.fill, borderRadius: "6px" }} />
      <div style={{ height: "40px", width: "240px", background: colors.fill, borderRadius: "8px" }} />
      <div style={{ height: "240px", background: colors.fill, borderRadius: "8px" }} />
    </div>
  );
}

function StockError({ symbol }: { symbol: string }) {
  return <div style={{ color: colors.textPrimary, padding: "40px", textAlign: "center" }}>We could not load research for {symbol}.</div>;
}function StockView({ stock, financialChartData, shareholding, shareholdingSeries, period: initialPeriod }: {
  stock: StockResearchDetail;
  financialChartData: { period: string; value: number }[];
  shareholding?: { period: string; promoter: number; fii: number; dii: number; retail: number; deltas: { promoter: number; fii: number; dii: number; retail: number } };
  shareholdingSeries: { period: string; promoter: number; fii: number; dii: number; retail: number; deltas: { promoter: number; fii: number; dii: number; retail: number } }[];
  period: string;
}) {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [ai, setAi] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1Y");
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [techIndicator, setTechIndicator] = useState<"none" | "sma" | "rsi" | "macd">("none");
  const [newsFilter, setNewsFilter] = useState<"all" | "positive" | "negative">("all");
  const [showFinancialTable, setShowFinancialTable] = useState(false);
  const [financialMetric, setFinancialMetric] = useState<FinancialMetric>("revenue");
  const [financialPeriod, setFinancialPeriod] = useState<FinancialPeriod>("annual");
  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const [isBrokerOpen, setIsBrokerOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [sectorExpanded, setSectorExpanded] = useState(false);

  const [period, setPeriod] = useState(initialPeriod);
  const availableBrokers = listAvailableBrokers();
  const selectedBroker = availableBrokers[0]?.name ?? null;
  const sectionGap = useResponsiveValue("48px", "80px");
  const isUp = stock.price.changeAbs >= 0;
  const trendColor = isUp ? colors.success : colors.danger;
  const effectiveShareholding = shareholding ?? shareholdingSeries.find((item) => item.period === period) ?? shareholdingSeries[0];
  const selectedFinancialSeries = stock.financials[financialPeriod][financialMetric];
  const effectiveChartData = financialChartData.length > 0 ? financialChartData : selectedFinancialSeries.map((item) => ({ period: item.period, value: Math.round(item.value) }));
  const newsItems = stock.news.slice(0, 7);
  const filteredNews = newsFilter === "all" ? newsItems : newsItems.filter((n: any) => n.sentiment === newsFilter);
  const disclaimer = "This is not investment advice. All data is for educational purposes. Past performance does not guarantee future results.";

  // Sector relative lookup for metric subtitles
  const sectorRelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of stock.sectorRelative ?? []) {
      map[item.label.toLowerCase()] = item.sectorMedian;
    }
    return map;
  }, [stock.sectorRelative]);

  // AI analysis
  useEffect(() => {
    let cancelled = false;
    const scores = {
      quality: stock.scores.quality ?? 50, valuation: stock.scores.valuation ?? 50,
      growth: stock.scores.growth ?? 50, risk: stock.scores.risk ?? 50, technical: stock.scores.momentum ?? 50,
    };
    setAiLoading(true);
    generateStockAnalysis(stock.symbol, stock.companyName, stock.price.current, scores, stock.thesis?.thesis)
      .then((result) => { if (!cancelled) { setAi(result); setAiLoading(false); } })
      .catch(() => { if (!cancelled) { setAi(fallbackAnalysis(scores)); setAiLoading(false); } });
    return () => { cancelled = true; };
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
    { type: "ad" as const, id: "ad1", data: { icon: "📈", title: "Track your portfolio like a pro", subtitle: "Get real-time alerts and expert analysis", cta: "Try StockStory Pro →" } },
    { type: "ad" as const, id: "ad2", data: { icon: "🎯", title: "AI-powered stock screening", subtitle: "Find the next multi-bagger before the crowd", cta: "Start free trial →" } },
  ];
  const newsFeedWithAds = filteredNews.reduce<Array<{ type: "news" | "ad"; id: string; data: any }>>((acc, item, idx) => {
    acc.push({ type: "news", id: `n-${idx}`, data: item });
    if (idx === 2) acc.push(nativeAdSlots[0]);
    if (idx === 6) acc.push(nativeAdSlots[1]);
    return acc;
  }, []);

  const factorBadges = [
    { label: "Quality", value: stock.scores.quality ?? 0 },
    { label: "Valuation", value: stock.scores.valuation ?? 0 },
    { label: "Growth", value: stock.scores.growth ?? 0 },
    { label: "Momentum", value: stock.scores.momentum ?? 0 },
    { label: "Risk", value: stock.scores.risk ?? 0 },
  ];  return (
    <div className="stock-page" style={{ display: "grid", gap: sectionGap }}>
      <SEBIComplianceBanner />

      {/* ── Sticky Header ── */}
      <StickyHeader symbol={stock.symbol} price={stock.price.current} changeAbs={stock.price.changeAbs}
        changePercent={stock.price.changePercent} trendColor={trendColor} />
      <style>{`
        .stock-sticky-header { transition: opacity 0.25s ease, transform 0.25s ease; opacity: ${stickyVisible ? "1" : "0"} !important; pointer-events: ${stickyVisible ? "auto" : "none"}; transform: translateY(${stickyVisible ? "0" : "-8px"}); }
        .live-indicator { animation: livePulse 2s ease-in-out infinite; }
      `}</style>

      {/* ── Hero Section ── */}
      <div ref={heroRef}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <button onClick={() => navigate(-1)} style={{
            border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center",
            gap: "6px", color: colors.textSecondary, cursor: "pointer", fontSize: "13px",
          }}>
            <ArrowLeft size={16} /><span>Back</span>
          </button>
        </div>
        <HeroSection stock={stock} isUp={isUp} trendColor={trendColor} />
      </div>

      {/* ── Price Chart ── */}
      <Card className="stock-chart-card raycast-slideUp" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        <div className="stock-chart-toolbar" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "4px", background: colors.fill, borderRadius: radius.full, padding: "2px" }}>
            <button onClick={() => setChartType("line")} style={{ padding: "6px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: chartType === "line" ? colors.primary : "transparent", color: chartType === "line" ? colors.onPrimary : colors.textSecondary }}>Line</button>
            <button onClick={() => setChartType("candle")} style={{ padding: "6px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: chartType === "candle" ? colors.primary : "transparent", color: chartType === "candle" ? colors.onPrimary : colors.textSecondary }}>Candle</button>
          </div>
          <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
            {(["none", "sma", "rsi", "macd"] as const).map((ind) => (
              <button key={ind} onClick={() => setTechIndicator(ind === techIndicator ? "none" : ind)} style={{ padding: "6px 12px", borderRadius: radius.md, border: `1px solid ${techIndicator === ind ? colors.primary : colors.border}`, cursor: "pointer", fontSize: "11px", fontWeight: 500, background: techIndicator === ind ? `${colors.primary}20` : "transparent", color: techIndicator === ind ? colors.primary : colors.textSecondary }}>
                {ind === "none" ? "Off" : ind.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "4px", width: "100%" }}>
            {TIMEFRAMES.map((value) => (
              <Button key={value} variant={value === timeframe ? "primary" : "tertiary"} onClick={() => setTimeframe(value)}>{value}</Button>
            ))}
          </div>
        </div>
        <div style={{ width: "100%", height: "300px" }}>
          <ResponsiveContainer>
            {chartType === "line" ? (
              <AreaChart data={stock.priceHistory[timeframe]}>
                <defs>
                  <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke={colors.textSecondary} tick={{ fontSize: 11 }} />
                <YAxis stroke={colors.textSecondary} domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "8px", color: colors.textPrimary }} />
                <Area dataKey="price" stroke={trendColor} fill="url(#trendFill)" strokeWidth={2} dot={false} />
                {techIndicator === "sma" && (
                  <Line dataKey="price" stroke={colors.warning} strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="SMA 20" />
                )}
              </AreaChart>
            ) : (
              <BarChart data={stock.priceHistory[timeframe].map((d) => ({ ...d, high: d.price * 1.02, low: d.price * 0.98, open: d.price * 0.99, close: d.price * 1.01 }))}>
                <CartesianGrid vertical={false} stroke={colors.border} />
                <XAxis dataKey="label" stroke={colors.textSecondary} tick={{ fontSize: 11 }} />
                <YAxis stroke={colors.textSecondary} domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Bar dataKey="close" fill={trendColor} radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        {techIndicator !== "none" && (
          <p style={{ color: colors.textSecondary, fontSize: "11px", marginTop: "8px" }}>
            {techIndicator === "sma" ? "SMA 20 (dashed) overlaid on price" : techIndicator === "rsi" ? "RSI shown on separate scale tab (coming soon)" : "MACD histogram overlay (coming soon)"}
          </p>
        )}
      </Card>      {/* ── Healthometer + Score Overview ── */}
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
          <p style={{ color: colors.textTertiary, fontSize: "11px", marginTop: "12px", lineHeight: "1.5" }}>
            Timeline drift: {stock.timeline.map((item) => item.health).join(" → ")}
          </p>
        </Card>
      </section>

      {/* ── Key Metrics Grid ── */}
      <Card className="stock-metrics-card raycast-slideUp" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        <CardLabel>Key metrics</CardLabel>
        <div className="stock-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <MetricCard label="Market Cap" value={`₹${Math.round(stock.price.marketCap).toLocaleString("en-IN")} Cr`} />
          <MetricCard label="PE (TTM)" value={stock.fundamentals.pe?.toFixed(1) ?? "—"}
            trend={stock.fundamentals.pe != null && stock.fundamentals.pe < 20 ? "up" : stock.fundamentals.pe != null && stock.fundamentals.pe > 30 ? "down" : "neutral"}
            subtitle={stock.fundamentals.industryPe != null ? `Sector: ${stock.fundamentals.industryPe.toFixed(1)}` : sectorRelMap["pe"] ? `Sector: ${sectorRelMap["pe"]}` : undefined} />
          <MetricCard label="PB Ratio" value={stock.fundamentals.pb?.toFixed(1) ?? "—"}
            trend={stock.fundamentals.pb != null && stock.fundamentals.pb < 3 ? "up" : stock.fundamentals.pb != null && stock.fundamentals.pb > 5 ? "down" : "neutral"} />
          <MetricCard label="ROE" value={stock.roe != null ? `${stock.roe.toFixed(1)}%` : "—"}
            trend={stock.roe != null && stock.roe > 15 ? "up" : stock.roe != null ? "down" : "neutral"}
            subtitle={sectorRelMap["roe"] ? `Sector: ${sectorRelMap["roe"]}` : undefined} />
          <MetricCard label="Debt/Equity" value={stock.debtToEquity != null ? stock.debtToEquity.toFixed(2) : "—"}
            trend={stock.debtToEquity != null && stock.debtToEquity < 0.5 ? "up" : stock.debtToEquity != null && stock.debtToEquity > 1 ? "down" : "neutral"} />
          <MetricCard label="Dividend Yield" value={stock.fundamentals.dividendYield != null ? `${stock.fundamentals.dividendYield.toFixed(2)}%` : "—"}
            trend={stock.fundamentals.dividendYield != null && stock.fundamentals.dividendYield > 1 ? "up" : "neutral"} />
          <MetricCard label="Revenue Growth" value={stock.revenueGrowth != null ? `${stock.revenueGrowth.toFixed(1)}%` : "—"}
            trend={stock.revenueGrowth != null && stock.revenueGrowth > 10 ? "up" : stock.revenueGrowth != null ? "down" : "neutral"}
            subtitle={sectorRelMap["revenue growth"] ? `Sector: ${sectorRelMap["revenue growth"]}` : undefined} />
          <MetricCard label="Profit Growth" value={stock.profitGrowth != null ? `${stock.profitGrowth.toFixed(1)}%` : "—"}
            trend={stock.profitGrowth != null && stock.profitGrowth > 10 ? "up" : stock.profitGrowth != null ? "down" : "neutral"} />
          <MetricCard label="EPS (TTM)" value={stock.fundamentals.eps != null ? `₹${stock.fundamentals.eps.toFixed(1)}` : "—"} />
          <MetricCard label="RSI (14)" value={stock.rsi != null ? String(stock.rsi) : "—"}
            trend={stock.rsi != null && stock.rsi >= 30 && stock.rsi <= 70 ? "neutral" : "down"} />
          <MetricCard label="52W High" value={stock.fundamentals.high52w != null ? `₹${stock.fundamentals.high52w.toLocaleString("en-IN")}` : "—"} />
          <MetricCard label="52W Low" value={stock.fundamentals.low52w != null ? `₹${stock.fundamentals.low52w.toLocaleString("en-IN")}` : "—"} />
        </div>
      </Card>      {/* ── Company Identity ── */}
      <Card className="stock-company-card raycast-slideUp" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
        <CardLabel>About {stock.companyName}</CardLabel>
        <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, fontWeight: 400, lineHeight: "1.6", marginBottom: "20px" }}>
          {stock.description}
        </p>
        <div className="stock-about-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <Stat label="Founded" value={stock.companyProfile.founded} />
          <Stat label="CEO" value={stock.companyProfile.ceo} />
          <Stat label="HQ" value={stock.companyProfile.hq} />
          <Stat label="Employees" value={stock.companyProfile.employees} />
          <Stat label="Exchange" value={stock.exchange} />
          <Stat label="ISIN" value={stock.companyProfile.isin} />
          <Stat label="Sector" value={stock.sector} />
          <Stat label="Industry" value={stock.industry} />
          <Stat label="Listed on" value="BSE, NSE" />
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
          {stock.companyProfile.businessSegments.map((segment) => (
            <Badge key={segment} value={60} label={segment} />
          ))}
        </div>
      </Card>

      {/* ── Financials ── */}
      <Card className="stock-financials-card raycast-slideUp" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Financials</CardLabel>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <Button variant={financialMetric === "revenue" ? "primary" : "secondary"} onClick={() => setFinancialMetric("revenue")}>Revenue</Button>
            <Button variant={financialMetric === "profit" ? "primary" : "secondary"} onClick={() => setFinancialMetric("profit")}>Profit</Button>
            <Button variant={financialMetric === "ebitda" ? "primary" : "secondary"} onClick={() => setFinancialMetric("ebitda")}>EBITDA</Button>
            <Button variant={financialPeriod === "annual" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("annual")}>Annual</Button>
            <Button variant={financialPeriod === "quarterly" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("quarterly")}>Quarterly</Button>
            <button onClick={() => setShowFinancialTable(!showFinancialTable)} style={{ padding: "6px 12px", borderRadius: radius.md, border: `1px solid ${colors.border}`, cursor: "pointer", fontSize: "12px", background: showFinancialTable ? colors.primary : "transparent", color: showFinancialTable ? colors.onPrimary : colors.textSecondary }}>
              {showFinancialTable ? "Chart" : "Table"}
            </button>
          </div>
        </div>
        {showFinancialTable ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ textAlign: "left", padding: "8px", color: colors.textSecondary }}>Period</th>
                  <th style={{ textAlign: "right", padding: "8px", color: colors.textSecondary }}>{financialMetric === "revenue" ? "Revenue" : financialMetric === "profit" ? "Profit" : "EBITDA"} (₹ Cr)</th>
                  <th style={{ textAlign: "right", padding: "8px", color: colors.textSecondary }}>YoY Growth</th>
                </tr>
              </thead>
              <tbody>
                {effectiveChartData.map((entry, idx) => {
                  const prev = effectiveChartData[idx + 1];
                  const growth = prev ? ((entry.value - prev.value) / prev.value * 100).toFixed(1) : null;
                  return (
                    <tr key={entry.period} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "8px", color: colors.textPrimary }}>{entry.period}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: colors.textPrimary }}>{entry.value.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: growth != null && parseFloat(growth) >= 0 ? colors.success : colors.danger }}>{growth != null ? `${parseFloat(growth) >= 0 ? "+" : ""}${growth}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ width: "100%", height: "280px" }}>
            <ResponsiveContainer>
              <BarChart data={effectiveChartData}>
                <CartesianGrid vertical={false} stroke={colors.border} />
                <XAxis dataKey="period" stroke={colors.textSecondary} tick={{ fontSize: 11 }} />
                <YAxis stroke={colors.textSecondary} tick={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {effectiveChartData.map((entry) => (<Cell key={entry.period} fill={colors.primary} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p style={{ color: colors.textSecondary, fontSize: "12px", marginTop: "12px" }}>All values in ₹ Cr</p>
      </Card>

      {/* ── Shareholdings ── */}
      <Card className="stock-shareholdings-card raycast-slideUp" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Shareholdings</CardLabel>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {shareholdingSeries.map((value) => (
              <Button key={value.period} variant={value.period === period ? "secondary" : "tertiary"} onClick={() => setPeriod(value.period)}>{value.period}</Button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: "16px" }}>
          {[
            { label: "Promoter", value: effectiveShareholding?.promoter ?? 0, delta: effectiveShareholding?.deltas.promoter ?? 0 },
            { label: "FII", value: effectiveShareholding?.fii ?? 0, delta: effectiveShareholding?.deltas.fii ?? 0 },
            { label: "DII", value: effectiveShareholding?.dii ?? 0, delta: effectiveShareholding?.deltas.dii ?? 0 },
            { label: "Retail", value: effectiveShareholding?.retail ?? 0, delta: effectiveShareholding?.deltas.retail ?? 0 },
          ].map((item) => {
            const positive = item.delta >= 0;
            return (
              <div key={item.label} style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: colors.textPrimary }}>{item.label}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: positive ? colors.success : colors.danger, fontSize: "13px" }}>
                    {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{item.value.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: "8px", background: colors.border, borderRadius: radius.lg, overflow: "hidden" }}>
                  <div style={{ width: `${item.value}%`, height: "100%", background: colors.primary, borderRadius: radius.lg }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>      {/* ── News Feed with Native Ads ── */}
      <Card className="stock-news-card raycast-slideUp" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Latest news</CardLabel>
          <div className="stock-news-filters" style={{ display: "flex", gap: "4px", padding: "2px", background: colors.fill, borderRadius: radius.full }}>
            {(["all", "positive", "negative"] as const).map((f) => (
              <button key={f} onClick={() => setNewsFilter(f)} style={{ padding: "4px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: newsFilter === f ? colors.primary : "transparent", color: newsFilter === f ? colors.onPrimary : colors.textSecondary, textTransform: "capitalize" }}>
                {f === "all" ? "All" : f === "positive" ? "Positive" : "Negative"}
              </button>
            ))}
          </div>
        </div>
        <div className="stock-news-list" style={{ display: "grid", gap: "12px" }}>
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
                  <span style={{ fontSize: "24px", flexShrink: 0 }}>{entry.data.icon}</span>
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
        <CardLabel>Research thesis</CardLabel>
        <div style={{ display: "grid", gap: "12px" }}>
          <Badge value={stock.scores.health ?? 0} label={stock.thesis.stance} />
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{stock.thesis.thesis}</p>
          <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}><strong>Bull case:</strong> {stock.thesis.bullCase}</p>
          <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}><strong>Bear case:</strong> {stock.thesis.bearCase}</p>
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}><strong>What to watch:</strong> {stock.thesis.whatToWatch}</p>
        </div>
      </Card>

      {/* ── Thesis History ── */}
      <ThesisHistory symbol={stock.symbol} />

      {/* ── AI Analysis ── */}
      {aiLoading && (
        <Card className="stock-panel-card raycast-slideUp">
          <CardLabel>AI Analysis</CardLabel>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 0" }}>
            <div className="raycast-spinner" style={{ width: "16px", height: "16px", border: `2px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%" }} />
            <span style={{ color: colors.textSecondary, fontSize: "14px" }}>Generating AI analysis…</span>
          </div>
        </Card>
      )}
      {ai && !aiLoading && (
        <Card className="stock-ai-card raycast-slideUp">
          <CardLabel>AI Analysis</CardLabel>
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

      {/* ── Market Brain Panel ── */}
      <MarketBrainPanel symbol={stock.symbol} companyName={stock.companyName} />

      {/* ── What Changed ── */}
      <Card className="stock-whatchanged-card raycast-slideUp" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
        <CardLabel>What changed</CardLabel>
        <div style={{ display: "grid", gap: "12px" }}>
          {stock.whatChanged.map((item, i) => (
            <p key={item} className={`raycast-slideUp raycast-stagger-${i + 1}`} style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{item}</p>
          ))}
        </div>
      </Card>
      {/* ── Sector Relative View ── */}
      <div style={{ cursor: "pointer" }} onClick={() => setSectorExpanded(!sectorExpanded)}>
        <CardLabel>Sector Relative View {sectorExpanded ? "▲" : "▼"}</CardLabel>
      </div>
      <ExpandingPanel isOpen={sectorExpanded}>
        <div style={{ display: "grid", gap: "16px" }}>
          {stock.sectorComparison.map((cmp, i) => (
            <div key={i} style={{ display: "grid", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <span style={{ fontSize: "13px", color: colors.textPrimary }}>
                  {cmp.company}
                  {cmp.company === stock.companyName && (<span style={{ color: colors.primary, marginLeft: "4px" }}>•</span>)}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>{cmp.value}</span>
              </div>
              <div style={{ height: "6px", background: colors.fill, borderRadius: radius.full, overflow: "hidden" }}>
                <div style={{
                  width: `${cmp.percentile}%`,
                  height: "100%",
                  borderRadius: radius.full,
                  background: cmp.percentile >= 80 ? colors.success : cmp.percentile >= 50 ? colors.warning : colors.danger,
                }} />
              </div>
              <span style={{ fontSize: "11px", color: colors.textTertiary }}>{cmp.metric}</span>
            </div>
          ))}
        </div>
      </ExpandingPanel>

      {/* ── Company Analyst Section ── */}
      <CompanyAnalystSection symbol={stock.symbol} />

      {/* ── Native Ad (Position 3) ── */}
      <NativeAd position={3} />

      {/* ── Price Targets ── */}
      <PriceTargets currentPrice={stock.price.current} />

      {/* ── Options Flow ── */}
      <OptionsFlow />

      {/* ── Insider Activity ── */}
      <InsiderActivity />

      {/* ── Similar Stocks ── */}
      <SimilarStocks />

      {/* ── Native Ad (Position 7) ── */}
      <NativeAd position={7} />

      {/* ── Disclaimer ── */}
      <p style={{
        color: colors.textTertiary, fontSize: "11px", textAlign: "center", padding: "0 16px", lineHeight: "1.6",
      }}>
        {disclaimer}
      </p>

      <SEBIComplianceBanner />

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
        <InteractiveButton onClick={() => setTracked(!tracked)} variant={tracked ? "primary" : "secondary"} style={{ minWidth: "100px", justifyContent: "center" }}>
          <Star size={15} fill={tracked ? colors.warning : "none"} color={tracked ? colors.warning : "currentColor"} /> {tracked ? "Untrack" : "Track"}
        </InteractiveButton>
        <InteractiveButton onClick={() => setIsCompareOpen(true)} style={{ minWidth: "100px", justifyContent: "center" }}>
          <ArrowLeftRight size={15} /> Compare
        </InteractiveButton>
        <InteractiveButton onClick={() => setIsExportOpen(true)} style={{ minWidth: "100px", justifyContent: "center" }}>
          <Download size={15} /> Export
        </InteractiveButton>
        <InteractiveButton onClick={() => setIsBrokerOpen(true)} variant="primary" style={{ minWidth: "150px", justifyContent: "center" }}>
          <TrendingUp size={15} /> Trade via {selectedBroker ?? "Broker"}
        </InteractiveButton>
      </div>

      {/* ── Broker Handoff Modal ── */}
      {isBrokerOpen && (
        <BrokerHandoffModal
          broker={availableBrokers[0]}
          stockSymbol={stock.symbol}
          direction="long"
          rationale={ai?.bullCase ?? "Based on AI analysis"}
          confidence={stock.scores.quality ?? 70}
          onClose={() => setIsBrokerOpen(false)}
        />
      )}

      {/* ── Keyboard Hint ── */}
      <p style={{ textAlign: "center", color: colors.textTertiary, fontSize: "12px", padding: "16px 0 100px", opacity: 0.7 }}>
        <ArrowUp size={12} style={{ marginRight: "4px" }} />
        <ArrowDown size={12} style={{ marginRight: "4px" }} />
        Navigate · <kbd className="raycast-hint">t</kbd> Track · <kbd className="raycast-hint">c</kbd> Compare · <kbd className="raycast-hint">r</kbd> Refresh · <kbd className="raycast-hint">⌘K</kbd> Commands
      </p>
    </div>
  );
}

// ── Export ──
export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const seoMeta = useMemo(() => symbol ? buildCompanySeo(symbol, undefined, undefined) : null, [symbol]);
  useSeo(seoMeta);
  const [inView, setInView] = useState(false);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.05 });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock", symbol],
    queryFn: async () => {
      // In production this would call the API; for now return a minimal shape
      const res = await fetch(`/api/stock/${symbol}`);
      if (!res.ok) throw new Error("Failed to load stock data");
      return res.json() as Promise<{ stock: StockResearchDetail; financialChartData: { period: string; value: number }[]; shareholding?: any; shareholdingSeries?: any[]; period?: string }>;
    },
    enabled: !!symbol,
    staleTime: 30_000,
  });

  if (isLoading) return <StockSkeleton />;
  if (error || !data) return <StockError symbol={symbol ?? "unknown"} />;

  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transition: "opacity 0.4s ease" }}>
      <StockView
        stock={data.stock}
        financialChartData={data.financialChartData ?? []}
        shareholding={data.shareholding}
        shareholdingSeries={data.shareholdingSeries ?? []}
        period={data.period ?? "Sep 2025"}
      />
    </div>
  );
}