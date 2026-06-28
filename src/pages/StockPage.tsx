import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Building2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
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
        <div className="stock-chart-toolbar" style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          {TIMEFRAMES.map((value) => (
            <Button key={value} variant={value === timeframe ? "primary" : "ghost"} onClick={() => setTimeframe(value)}>
              {value}
            </Button>
          ))}
        </div>
        <div style={{ width: "100%", height: "280px" }}>
          <ResponsiveContainer>
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
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
        <div className="stock-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <Stat label="Market Cap" value={`₹${Math.round(stock.price.marketCap).toLocaleString("en-IN")} Cr`} />
          <Stat label="PE (TTM)" value={stock.fundamentals.pe?.toFixed(1) ?? "—"} />
          <Stat label="PB Ratio" value={stock.fundamentals.pb?.toFixed(1) ?? "—"} />
          <Stat label="ROE" value={stock.roe != null ? `${stock.roe.toFixed(1)}%` : "—"} />
          <Stat label="Debt/Equity" value={stock.debtToEquity != null ? stock.debtToEquity.toFixed(2) : "—"} />
          <Stat label="Dividend Yield" value={stock.fundamentals.dividendYield != null ? `${stock.fundamentals.dividendYield.toFixed(2)}%` : "—"} />
          <Stat label="Revenue Growth" value={stock.revenueGrowth != null ? `${stock.revenueGrowth.toFixed(1)}%` : "—"} />
          <Stat label="Profit Growth" value={stock.profitGrowth != null ? `${stock.profitGrowth.toFixed(1)}%` : "—"} />
          <Stat label="EPS" value={stock.fundamentals.eps != null ? `₹${stock.fundamentals.eps.toFixed(1)}` : "—"} />
          <Stat label="RSI" value={stock.rsi != null ? String(stock.rsi) : "—"} />
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
          <Stat label="Website" value={stock.companyProfile.website} />
          <Stat label="Exchange" value={stock.exchange} />
          <Stat label="ISIN" value={stock.companyProfile.isin} />
          <Stat label="Sector" value={stock.sector} />
          <Stat label="Industry" value={stock.industry} />
        </div>
        <div className="stock-chip-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {stock.companyProfile.businessSegments.map((segment) => (
            <Badge key={segment} value={60} label={segment} />
          ))}
        </div>
      </Card>

      <Card className="stock-panel-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <CardLabel>Financials</CardLabel>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Button variant={financialMetric === "revenue" ? "primary" : "secondary"} onClick={() => setFinancialMetric("revenue")}>Revenue</Button>
            <Button variant={financialMetric === "profit" ? "primary" : "secondary"} onClick={() => setFinancialMetric("profit")}>Profit</Button>
            <Button variant={financialMetric === "ebitda" ? "primary" : "secondary"} onClick={() => setFinancialMetric("ebitda")}>EBITDA</Button>
            <Button variant={financialPeriod === "annual" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("annual")}>Annual</Button>
            <Button variant={financialPeriod === "quarterly" ? "primary" : "secondary"} onClick={() => setFinancialPeriod("quarterly")}>Quarterly</Button>
          </div>
        </div>
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
        <CardLabel>Latest news</CardLabel>
        <div className="stock-news-list" style={{ display: "grid", gap: "16px" }}>
          {newsItems.map((item) => {
            const secondary = formatNewsTime(item.publishedAt) || item.time;
            return (
              <a
                className="stock-news-item"
                key={item.headline}
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
        <CardLabel>Sector-relative view</CardLabel>
        <div className="stock-sector-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          {stock.sectorRelative.map((item) => (
            <Stat key={item.label} label={`${item.label} vs sector`} value={`${item.company} / ${item.sectorMedian}`} />
          ))}
        </div>
      </Card>

      <CompanyAnalystSection symbol={stock.symbol} />

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
