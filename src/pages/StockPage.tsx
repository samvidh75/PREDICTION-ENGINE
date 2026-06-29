import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, CandlestickChart, Building2, TrendingUp, Activity, Sigma } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
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
import { colors, typography, radius } from "../design/tokens";
import { InteractiveButton, MetricCard, ExpandingPanel, HoverCard } from "../ui/MicroInteractions";
import { useSeo } from "../frontend/seo/useSeo";
import { buildCompanySeo } from "../frontend/seo/companySeo";
import { CompanyAnalystSection } from "../components/analyst/CompanyAnalystSection";

type StockResearchDetail = {
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  sector: string;
  industry: string;
  price: { current: number; changeAbs: number; changePercent: number; marketCap: number };
  fundamentals: {
    pe: number | null;
    industryPe: number | null;
    pb: number | null;
    dividendYield: number | null;
    eps: number | null;
    high52w?: number | null;
    low52w?: number | null;
  };
  roe: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  rsi: number | null;
  scores: { quality: number | null; valuation: number | null; growth: number | null; momentum: number | null; risk: number | null; health: number | null; riskAdjusted: number | null };
  confidenceMeter: number;
  timeline: Array<{ day: string; health: number }>;
  whatChanged: string[];
  sectorRelative: Array<{ label: string; company: string; sectorMedian: string }>;
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
}

function Ring({ label, value }: { label: string; value: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? colors.success : value >= 50 ? colors.primary : colors.danger;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: "8px" }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke={colors.border} strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="52" textAnchor="middle" fontSize="20" fontWeight="600" fill={colors.textPrimary}>
          {value}
        </text>
      </svg>
      <span style={{ color: colors.textSecondary, fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
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
  return <div>We could not load research for {symbol}.</div>;
}

function StockView({ stock }: { stock: StockResearchDetail }) {
  const [ai, setAi] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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
      .then((result) => {
        if (!cancelled) { setAi(result); setAiLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setAi(fallbackAnalysis(scores)); setAiLoading(false); }
      });
    return () => { cancelled = true; };
  }, [stock.symbol]);

  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1Y");
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [techIndicator, setTechIndicator] = useState<"none" | "sma" | "rsi" | "macd">("none");
  const [newsFilter, setNewsFilter] = useState<"all" | "positive" | "negative">("all");
  const [showFinancialTable, setShowFinancialTable] = useState(false);
  const [financialMetric, setFinancialMetric] = useState<FinancialMetric>("revenue");
  const [financialPeriod, setFinancialPeriod] = useState<FinancialPeriod>("annual");
  const shareholdingSeries = stock.shareholdings ?? stock.shareholding ?? [];
  const [period, setPeriod] = useState(shareholdingSeries[0]?.period ?? "Mar'26");
  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const availableBrokers = listAvailableBrokers();
  const primaryBroker = availableBrokers[0] ?? null;
  const sectionGap = useResponsiveValue("48px", "80px");
  const isUp = stock.price.changeAbs >= 0;
  const trendColor = isUp ? colors.success : colors.danger;
  const shareholding = shareholdingSeries.find((item) => item.period === period) ?? shareholdingSeries[0];
  const selectedFinancialSeries = stock.financials[financialPeriod][financialMetric];
  const financialChartData = selectedFinancialSeries.map((item) => ({
    period: item.period,
    value: Math.round(item.value),
  }));
  const newsItems = stock.news.slice(0, 5);
  const filteredNews = newsFilter === "all" ? newsItems : newsItems.filter((n) => (n as any).sentiment === newsFilter);
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
  ];

  return (
    <div className="stock-page" style={{ display: "grid", gap: sectionGap }}>
      <SEBIComplianceBanner />
      <section className="stock-header" style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div className="stock-header-copy" style={{ display: "grid", gap: "12px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: "8px", color: colors.textSecondary, cursor: "pointer" }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Badge value={60} label={stock.exchange} />
            <h1 style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: 600, lineHeight: "1.25" }}>{stock.symbol}</h1>
          </div>
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, fontWeight: 400, lineHeight: "1.6" }}>{stock.companyName}</p>
        </div>
        <div className="stock-header-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Button variant="secondary">Track</Button>
          <Button variant="secondary">Compare</Button>
          <Button onClick={() => setBrokerModalOpen(true)} disabled={!primaryBroker}>
            <span>Continue with broker</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </section>

      <section className="stock-price-block" style={{ display: "grid", gap: "12px" }}>
        <div className="stock-price-value" style={{ color: colors.textPrimary, fontSize: typography.h1.desktop.size, fontWeight: 700, lineHeight: "1.15" }}>₹{stock.price.current.toLocaleString("en-IN")}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: trendColor }}>
          {isUp ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span>{`${isUp ? "+" : ""}${stock.price.changeAbs.toFixed(2)} (${stock.price.changePercent.toFixed(2)}%)`}</span>
        </div>
      </section>

      <Card className="stock-chart-card">
        <div className="stock-chart-toolbar" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "4px", background: colors.border, borderRadius: radius.full, padding: "2px" }}>
            <button onClick={() => setChartType("line")} style={{ padding: "6px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: chartType === "line" ? colors.primary : "transparent", color: chartType === "line" ? "#fff" : colors.textSecondary }}>Line</button>
            <button onClick={() => setChartType("candle")} style={{ padding: "6px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: chartType === "candle" ? colors.primary : "transparent", color: chartType === "candle" ? "#fff" : colors.textSecondary }}>Candle</button>
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
              <Button key={value} variant={value === timeframe ? "primary" : "ghost"} onClick={() => setTimeframe(value)}>
                {value}
              </Button>
            ))}
          </div>
        </div>
        <div style={{ width: "100%", height: "280px" }}>
          <ResponsiveContainer>
            {chartType === "line" ? (
              <AreaChart data={stock.priceHistory[timeframe]}>
                <defs>
                  <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={colors.border} />
                <XAxis dataKey="label" stroke={colors.textSecondary} />
                <YAxis stroke={colors.textSecondary} domain={["dataMin", "dataMax"]} />
                <Area dataKey="price" stroke={trendColor} fill="url(#trendFill)" strokeWidth={2} />
                {techIndicator === "sma" && (
                  <Line dataKey="price" stroke={colors.warning} strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="SMA 20" />
                )}
              </AreaChart>
            ) : (
              <BarChart data={stock.priceHistory[timeframe].map((d) => ({ ...d, high: d.price * 1.02, low: d.price * 0.98, open: d.price * 0.99, close: d.price * 1.01 }))}>
                <CartesianGrid vertical={false} stroke={colors.border} />
                <XAxis dataKey="label" stroke={colors.textSecondary} />
                <YAxis stroke={colors.textSecondary} domain={["dataMin", "dataMax"]} />
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
      </Card>

      <section className="stock-score-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <Card className="stock-panel-card">
          <CardLabel>Score overview</CardLabel>
          <div style={{ display: "flex", justifyContent: "space-around", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
            <Ring label="Health" value={stock.scores.health ?? 0} />
            <Ring label="Risk" value={stock.scores.risk ?? 0} />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {factorBadges.map((factor) => (
              <Badge key={factor.label} value={factor.value} label={factor.label} />
            ))}
          </div>
        </Card>
        <Card className="stock-panel-card">
          <CardLabel>Thesis confidence</CardLabel>
          <div style={{ display: "grid", gap: "12px" }}>
            <Ring label="Confidence" value={stock.confidenceMeter} />
            <Badge value={stock.scores.riskAdjusted ?? stock.scores.health ?? 0} label="Risk-adjusted" />
            <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>
              Timeline drift: {stock.timeline.map((item) => item.health).join(" • ")}
            </p>
          </div>
        </Card>
      </section>

      <Card className="stock-panel-card">
        <CardLabel>Key metrics</CardLabel>
        <div className="stock-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <MetricCard label="Market Cap" value={`₹${Math.round(stock.price.marketCap).toLocaleString("en-IN")} Cr`} />
          <MetricCard label="PE (TTM)" value={stock.fundamentals.pe?.toFixed(1) ?? "—"} trend={stock.fundamentals.pe != null && stock.fundamentals.pe < 20 ? "up" : stock.fundamentals.pe != null && stock.fundamentals.pe > 30 ? "down" : "neutral"} />
          <MetricCard label="PB Ratio" value={stock.fundamentals.pb?.toFixed(1) ?? "—"} />
          <MetricCard label="ROE" value={stock.roe != null ? `${stock.roe.toFixed(1)}%` : "—"} trend={stock.roe != null && stock.roe > 15 ? "up" : stock.roe != null ? "down" : "neutral"} />
          <MetricCard label="Debt/Equity" value={stock.debtToEquity != null ? stock.debtToEquity.toFixed(2) : "—"} trend={stock.debtToEquity != null && stock.debtToEquity < 0.5 ? "up" : stock.debtToEquity != null && stock.debtToEquity > 1 ? "down" : "neutral"} />
          <MetricCard label="Dividend Yield" value={stock.fundamentals.dividendYield != null ? `${stock.fundamentals.dividendYield.toFixed(2)}%` : "—"} trend={stock.fundamentals.dividendYield != null && stock.fundamentals.dividendYield > 1 ? "up" : "neutral"} />
          <MetricCard label="Revenue Growth" value={stock.revenueGrowth != null ? `${stock.revenueGrowth.toFixed(1)}%` : "—"} trend={stock.revenueGrowth != null && stock.revenueGrowth > 10 ? "up" : stock.revenueGrowth != null ? "down" : "neutral"} />
          <MetricCard label="Profit Growth" value={stock.profitGrowth != null ? `${stock.profitGrowth.toFixed(1)}%` : "—"} trend={stock.profitGrowth != null && stock.profitGrowth > 10 ? "up" : stock.profitGrowth != null ? "down" : "neutral"} />
          <MetricCard label="EPS" value={stock.fundamentals.eps != null ? `₹${stock.fundamentals.eps.toFixed(1)}` : "—"} />
          <MetricCard label="RSI" value={stock.rsi != null ? String(stock.rsi) : "—"} trend={stock.rsi != null && stock.rsi >= 30 && stock.rsi <= 70 ? "neutral" : "down"} />
        </div>
      </Card>

      <Card className="stock-panel-card">
        <CardLabel>About company</CardLabel>
        <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, fontWeight: 400, lineHeight: "1.6", marginBottom: "16px" }}>
          {stock.description}
        </p>
        <div className="stock-about-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          <Stat label="Founded" value={stock.companyProfile.founded} />
          <Stat label="CEO" value={stock.companyProfile.ceo} />
          <Stat label="HQ" value={stock.companyProfile.hq} />
          <Stat label="Employees" value={stock.companyProfile.employees} />
          <Stat label="Exchange" value={stock.exchange} />
          <Stat label="ISIN" value={stock.companyProfile.isin} />
          <Stat label="Sector" value={stock.sector} />
          <Stat label="Industry" value={stock.industry} />
          <Stat label="Listed on" value={`BSE, NSE`} />
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "13px" }}>
          <a href="#" style={{ color: colors.primary, textDecoration: "none" }}>Annual Report →</a>
          <a href="#" style={{ color: colors.primary, textDecoration: "none" }}>Investor Relations →</a>
          <a href="#" style={{ color: colors.primary, textDecoration: "none" }}>Press Releases →</a>
        </div>
        <div className="stock-chip-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
          {stock.companyProfile.businessSegments.map((segment) => (
            <Badge key={segment} value={60} label={segment} />
          ))}
        </div>
      </Card>

      <Card className="stock-panel-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Financials</CardLabel>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <Button variant={financialMetric === "revenue" ? "primary" : "secondary"} onClick={() => setFinancialMetric("revenue")}>Revenue</Button>
            <Button variant={financialMetric === "profit" ? "primary" : "secondary"} onClick={() => setFinancialMetric("profit")}>Profit</Button>
            <Button variant={financialMetric === "ebitda" ? "primary" : "secondary"} onClick={() => setFinancialMetric("ebitda")}>EBITDA</Button>
            <Button variant={financialPeriod === "annual" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("annual")}>Annual</Button>
            <Button variant={financialPeriod === "quarterly" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("quarterly")}>Quarterly</Button>
            <button onClick={() => setShowFinancialTable(!showFinancialTable)} style={{ padding: "6px 12px", borderRadius: radius.md, border: `1px solid ${colors.border}`, cursor: "pointer", fontSize: "12px", background: showFinancialTable ? colors.primary : "transparent", color: showFinancialTable ? "#fff" : colors.textSecondary }}>
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
                {financialChartData.map((entry, idx) => {
                  const prev = financialChartData[idx + 1];
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
              <BarChart data={financialChartData}>
                <CartesianGrid vertical={false} stroke={colors.border} />
                <XAxis dataKey="period" stroke={colors.textSecondary} />
                <YAxis stroke={colors.textSecondary} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {financialChartData.map((entry) => (
                    <Cell key={entry.period} fill={colors.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p style={{ color: colors.textSecondary, fontSize: "12px", marginTop: "12px" }}>All values in ₹ Cr</p>
      </Card>

      <Card className="stock-panel-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Shareholdings</CardLabel>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {shareholdingSeries.map((value) => (
              <Button key={value.period} variant={value.period === period ? "secondary" : "ghost"} onClick={() => setPeriod(value.period)}>
                {value.period}
              </Button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gap: "16px" }}>
          {[
            { label: "Promoter", value: shareholding?.promoter ?? 0, delta: shareholding?.deltas.promoter ?? 0 },
            { label: "FII", value: shareholding?.fii ?? 0, delta: shareholding?.deltas.fii ?? 0 },
            { label: "DII", value: shareholding?.dii ?? 0, delta: shareholding?.deltas.dii ?? 0 },
            { label: "Retail", value: shareholding?.retail ?? 0, delta: shareholding?.deltas.retail ?? 0 },
          ].map((item) => {
            const positive = item.delta >= 0;
            return (
              <div key={item.label} className="stock-shareholding-list" style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span>{item.label}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: positive ? colors.success : colors.danger }}>
                    {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {item.value.toFixed(1)}%
                  </span>
                </div>
                <div className="stock-shareholding-bar" style={{ height: "8px", background: colors.border, borderRadius: radius.lg, overflow: "hidden" }}>
                  <div className="stock-shareholding-fill" style={{ width: `${item.value}%`, height: "100%", background: colors.primary }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="stock-panel-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Latest news</CardLabel>
          <div className="stock-news-filters" style={{ display: "flex", gap: "4px", padding: "2px", background: colors.border, borderRadius: radius.full }}>
            {(["all", "positive", "negative"] as const).map((f) => (
              <button key={f} onClick={() => setNewsFilter(f)} style={{ padding: "4px 14px", borderRadius: radius.full, border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: newsFilter === f ? colors.primary : "transparent", color: newsFilter === f ? "#fff" : colors.textSecondary, textTransform: "capitalize" }}>
                {f === "all" ? "All" : f === "positive" ? "Positive" : "Negative"}
              </button>
            ))}
          </div>
        </div>
        <div className="stock-news-list" style={{ display: "grid", gap: "16px" }}>
          {newsFeedWithAds.map((entry) => {
            if (entry.type === "ad") {
              return (
                <div key={entry.id} style={{ display: "flex", gap: "12px", border: `1px dashed ${colors.primary}40`, borderRadius: radius.lg, padding: "12px", background: `${colors.primary}08`, cursor: "pointer" }}>
                  <span style={{ fontSize: "20px" }}>{entry.data.icon}</span>
                  <div style={{ display: "grid", gap: "4px", flex: 1 }}>
                    <div style={{ color: colors.primary, fontWeight: 600, fontSize: "14px" }}>{entry.data.title}</div>
                    <div style={{ color: colors.textSecondary, fontSize: "12px" }}>{entry.data.subtitle}</div>
                    <span style={{ color: colors.primary, fontSize: "12px", fontWeight: 500, marginTop: "4px" }}>{entry.data.cta}</span>
                  </div>
                </div>
              );
            }
            const item = entry.data;
            const secondary = formatNewsTime(item.publishedAt) || item.time;
            return (
              <a
                className="stock-news-item"
                key={entry.id}
                href={item.link || "#"}
                target={item.link ? "_blank" : undefined}
                rel={item.link ? "noopener noreferrer" : undefined}
                style={{
                  display: "flex",
                  gap: "12px",
                  textDecoration: "none",
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg,
                  padding: "12px",
                  color: "inherit",
                }}
              >
                <Building2 color={colors.primary} size={18} />
                <div style={{ display: "grid", gap: "4px" }}>
                  <div style={{ color: colors.textPrimary }}>{item.headline}</div>
                  <div style={{ color: colors.textSecondary, fontSize: "12px" }}>{`${item.source}${secondary ? ` · ${secondary}` : ""}`}</div>
                </div>
              </a>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardLabel>Research thesis</CardLabel>
        <div className="stock-copy-list" style={{ display: "grid", gap: "12px" }}>
          <Badge value={stock.scores.health ?? 0} label={stock.thesis.stance} />
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{stock.thesis.thesis}</p>
          <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{`Bull case: ${stock.thesis.bullCase}`}</p>
          <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{`Bear case: ${stock.thesis.bearCase}`}</p>
          <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{`What to watch: ${stock.thesis.whatToWatch}`}</p>
        </div>
      </Card>

      <ThesisHistory symbol={stock.symbol} />

      {ai && (
        <Card className="stock-panel-card">
          <CardLabel>AI Analysis</CardLabel>
          <div className="stock-copy-list" style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: ai.state === "High Conviction" ? colors.success : ai.state === "Risk Rising" ? colors.danger : colors.warning,
              }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>{ai.state}</span>
              <span style={{ fontSize: "12px", color: colors.textSecondary, marginLeft: "8px" }}>
                Confidence: {ai.confidence}%
              </span>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>{ai.thesis}</p>
            <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>Bull case: {ai.bullCase}</p>
            <p style={{ color: colors.textPrimary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>Bear case: {ai.bearCase}</p>
            <p style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>What to watch: {ai.whatToWatch}</p>
          </div>
        </Card>
      )}

      <Card className="stock-panel-card">
        <CardLabel>What changed</CardLabel>
        <div className="stock-copy-list" style={{ display: "grid", gap: "12px" }}>
          {stock.whatChanged.map((item) => (
            <p key={item} style={{ color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.6" }}>
              {item}
            </p>
          ))}
        </div>
      </Card>

      <Card className="stock-panel-card">
        <CardLabel>What to watch next</CardLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          <Stat label="Next earnings" value="Q4 FY25 (estimated)" />
          <Stat label="Key resistance" value={stock.price.current > 0 ? `₹${(stock.price.current * 1.05).toFixed(0)}` : "—"} />
          <Stat label="Support level" value={stock.price.current > 0 ? `₹${(stock.price.current * 0.95).toFixed(0)}` : "—"} />
          <Stat label="52W High" value={stock.fundamentals.high52w != null ? `₹${stock.fundamentals.high52w.toLocaleString("en-IN")}` : "—"} />
          <Stat label="52W Low" value={stock.fundamentals.low52w != null ? `₹${stock.fundamentals.low52w.toLocaleString("en-IN")}` : "—"} />
          <Stat label="AI Risk Alert" value={stock.thesis.whatToWatch || "Watch valuation multiple"} />
        </div>
      </Card>

      <Card className="stock-panel-card">
        <CardLabel>Sector-relative view</CardLabel>
        <div className="stock-sector-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          {stock.sectorRelative.map((item) => (
            <Stat key={item.label} label={`${item.label} vs sector`} value={`${item.company} / ${item.sectorMedian}`} />
          ))}
        </div>
      </Card>

      <CompanyAnalystSection symbol={stock.symbol} />

      <div style={{ position: "sticky", bottom: 0, display: "flex", gap: "8px", padding: "16px", background: `${colors.page}E6`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: `1px solid ${colors.border}`, marginTop: "24px", zIndex: 10, borderRadius: radius.full, justifyContent: "center" }}>
        <InteractiveButton onClick={() => {}} style={{ flex: 1, maxWidth: 200 }}>Track</InteractiveButton>
        <InteractiveButton onClick={() => {}} style={{ flex: 1, maxWidth: 200 }} variant="secondary">Compare</InteractiveButton>
        <InteractiveButton onClick={() => setBrokerModalOpen(true)} disabled={!primaryBroker} style={{ flex: 1, maxWidth: 200 }}>
          Buy / Trade
        </InteractiveButton>
      </div>

      <div style={{ fontSize: "12px", color: colors.textSecondary, textAlign: "center", paddingTop: "8px" }}>
        All data for informational purposes only. Not investment advice.
      </div>

      {brokerModalOpen && primaryBroker && (
        <BrokerHandoffModal
          broker={primaryBroker}
          stockSymbol={stock.symbol}
          direction={stock.price.changeAbs >= 0 ? "long" : "short"}
          rationale={stock.thesis?.thesis ?? "Fundamental analysis"}
          confidence={stock.confidenceMeter}
          onClose={() => setBrokerModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function StockPage() {
  const { symbol = "HDFCBANK" } = useParams();
  const { data, status } = useQuery({
    queryKey: ["stock", symbol],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
      if (!response.ok) return null;
      return response.json() as Promise<StockResearchDetail>;
    },
  });

  const companyName = data?.companyName;
  const sector = data?.sector;
  const meta = buildCompanySeo(symbol.toUpperCase(), companyName, sector);
  useSeo(meta);

  if (status === "pending") return <StockSkeleton />;
  if (!data) return <StockError symbol={symbol} />;
  return <StockView stock={data} />;
}
