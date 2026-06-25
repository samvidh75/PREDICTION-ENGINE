import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  GitCompare,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
  Target,
  BookOpen,
  Sparkles,
  ExternalLink,
  Building2,
  Calendar,
  MapPin,
  Globe,
  Users,
  FileText,
  Shield,
  Activity,
  Disc3,
} from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { UnifiedPredictionEngine } from "../prediction-engine/UnifiedPredictionEngine";
import ScoreRing from "../components/ui/ScoreRing";
import { fMarketCap, fPercent, fPrice, fRatio, fRelativeTime } from "../lib/format";
import PriceChart from "../components/charts/PriceChart";
import { Skeleton } from "../components/ui/Skeleton";
import FinancialHistogram from "../components/charts/FinancialHistogram";
import { SafeBlock } from "../components/ErrorBoundary";
import NewsFeed from "../components/news/NewsFeed";
import HealthGauge from "../components/ui/HealthGauge";
import { computeHealthScore, getHealthLabel, getHealthColor } from "../lib/healthScore";
import { navigate } from "../components/product/routeConfig";
import type { StockDetailResponse, MetricsGroup } from "../types/stockDetail";

const DISPLAY_NAMES: Record<string, string> = {
  RELIANCE: "Reliance Industries Ltd.",
  TCS: "Tata Consultancy Services Ltd.",
  HDFCBANK: "HDFC Bank Ltd.",
  INFY: "Infosys Ltd.",
  ICICIBANK: "ICICI Bank Ltd.",
  SBIN: "State Bank of India",
  ITC: "ITC Ltd.",
  HINDUNILVR: "Hindustan Unilever Ltd.",
  LT: "Larsen & Toubro Ltd.",
  BHARTIARTL: "Bharti Airtel Ltd.",
  SUNPHARMA: "Sun Pharmaceutical Industries Ltd.",
  BAJFINANCE: "Bajaj Finance Ltd.",
  KOTAKBANK: "Kotak Mahindra Bank Ltd.",
  AXISBANK: "Axis Bank Ltd.",
  MARUTI: "Maruti Suzuki India Ltd.",
  TITAN: "Titan Company Ltd.",
  NTPC: "NTPC Ltd.",
  ONGC: "Oil and Natural Gas Corporation Ltd.",
  WIPRO: "Wipro Ltd.",
  HCLTECH: "HCL Technologies Ltd.",
  POWERGRID: "Power Grid Corporation of India Ltd.",
  "M&M": "Mahindra & Mahindra Ltd.",
  NESTLEIND: "Nestlé India Ltd.",
  ULTRACEMCO: "UltraTech Cement Ltd.",
  ASIANPAINT: "Asian Paints Ltd.",
};

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

function MetricValue({ value, unit, change }: { value: number | string | null; unit?: string; change?: number | null }) {
  if (value === null || value === undefined) {
    return <span style={{ fontSize: 20, fontWeight: 700, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>—</span>;
  }
  const formatted = typeof value === 'number' ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : value;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>
        {formatted}{unit || ""}
      </span>
      {change !== null && change !== undefined && (
        <span style={{ fontSize: 12, fontWeight: 600, color: change >= 0 ? "#16A34A" : "#DC2626" }}>
          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid rgba(15,23,42,0.10)",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", margin: 0, marginBottom: 16 }}>
      {children}
    </h2>
  );
}

export default function StockResearchPage({ symbol }: { symbol: string }) {
  const { data, loading, error, refetch } = useStockData(symbol);
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState("1M");
  const [showAllFacts, setShowAllFacts] = useState(false);

  const positive = (data?.price.change ?? 0) >= 0;
  const lastClose = data?.historical.closes?.length ? data.historical.closes[data.historical.closes.length - 1] : null;
  const displayPrice = data?.price.current ?? lastClose ?? null;

  const health = useMemo(() => computeHealthScore({
    roe: data?.fundamentals.roe ?? null,
    roce: data?.fundamentals.roce ?? null,
    debtToEquity: data?.fundamentals.debtToEquity ?? null,
    currentRatio: data?.fundamentals.currentRatio ?? null,
    marketCap: data?.price.marketCap ?? null,
    peRatio: data?.fundamentals.peRatio ?? null,
    eps: data?.fundamentals.eps ?? null,
  }), [data]);

  const prediction = useMemo(
    () => {
      if (!data) return null;
      const engineResult = UnifiedPredictionEngine.predict({
        peRatio: data.fundamentals.peRatio,
        pbRatio: data.fundamentals.pbRatio,
        roe: data.fundamentals.roe,
        roce: data.fundamentals.roce,
        debtToEquity: data.fundamentals.debtToEquity,
        currentRatio: data.fundamentals.currentRatio,
        revenueGrowth: data.fundamentals.revenueGrowth,
        profitGrowth: data.fundamentals.profitGrowth,
        dividendYield: data.fundamentals.dividendYield,
        closes: data.historical.closes,
      });
      if (engineResult?.composite !== null && engineResult?.composite !== undefined) {
        return engineResult;
      }
      if (data.health?.score !== null && data.health?.score !== undefined) {
        return { ...engineResult, composite: data.health.score, classification: data.health.classification || engineResult?.classification };
      }
      return engineResult;
    },
    [data],
  );

  const metricGroups: MetricsGroup[] = useMemo(() => [
    {
      label: "Valuation",
      metrics: [
        { label: "P/E Ratio", value: data?.fundamentals.peRatio ?? null },
        { label: "P/B Ratio", value: data?.fundamentals.pbRatio ?? null },
        { label: "Market Cap", value: data?.price.marketCap ? fMarketCap(data.price.marketCap) : null, unit: "" },
        { label: "EPS", value: data?.fundamentals.eps ?? null },
        { label: "Dividend Yield", value: data?.fundamentals.dividendYield ?? null, unit: "%" },
      ],
    },
    {
      label: "Profitability",
      metrics: [
        { label: "ROE", value: data?.fundamentals.roe ?? null, unit: "%" },
        { label: "ROCE", value: data?.fundamentals.roce ?? null, unit: "%" },
      ],
    },
    {
      label: "Growth",
      metrics: [
        { label: "Revenue Growth", value: data?.fundamentals.revenueGrowth ?? null, unit: "%" },
        { label: "Profit Growth", value: data?.fundamentals.profitGrowth ?? null, unit: "%" },
      ],
    },
    {
      label: "Balance Sheet",
      metrics: [
        { label: "Debt/Equity", value: data?.fundamentals.debtToEquity ?? null },
        { label: "Current Ratio", value: data?.fundamentals.currentRatio ?? null },
      ],
    },
    {
      label: "Technicals",
      metrics: [
        { label: "RSI (14)", value: prediction?.technicals.rsi14 ?? null },
        { label: "MACD", value: prediction?.technicals.macd ?? null },
        { label: "52W High", value: data?.price.weekHigh52 ?? null },
        { label: "52W Low", value: data?.price.weekLow52 ?? null },
      ],
    },
    {
      label: "Market Activity",
      metrics: [
        { label: "Volume", value: data?.price.volume ?? null },
        { label: "Open", value: data?.price.open ?? null },
        { label: "High", value: data?.price.high ?? null },
        { label: "Low", value: data?.price.low ?? null },
      ],
    },
  ], [data, prediction]);

  const sector = (data?.price.sector ?? null);
  const sectorLower = (sector ?? "").toLowerCase();
  const isIT = sectorLower.includes("it") || sectorLower.includes("technology");
  const isBank = sectorLower.includes("bank");

  const companyDescription = data?.price?.description
    ? data.price.description
    : !sector
      ? `Company profile details are being compiled for ${data?.price.companyName ?? symbol}.`
      : isIT
        ? `${data?.price.companyName ?? symbol} is an IT services company providing software development, consulting, and business process outsourcing to global clients.`
        : isBank
          ? `${data?.price.companyName ?? symbol} is a banking institution offering retail banking, corporate banking, treasury, and wealth management services.`
          : `${data?.price.companyName ?? symbol} operates in the Indian market with a diversified business model and established market presence.`;

  const hasHealth = data?.health?.score !== null && data?.health?.classification !== null;
  const healthItem = hasHealth ? [
    { label: "Health Score", value: `${data?.health?.classification} (${data?.health?.score})` },
  ] : [];

  const companyFacts = [
    { label: "Sector", value: data?.price.sector ?? data?.health?.sector ?? "—" },
    { label: "Industry", value: data?.price.industry ?? "—" },
    { label: "Exchange", value: data?.price.exchange ?? "NSE" },
    { label: "Market Cap", value: data?.price.marketCap ? fMarketCap(data.price.marketCap) : "—" },
    ...healthItem,
  ];

  const dataUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  if (loading && !data) {
    return (
      <div style={{ background: "#F3F4F6", minHeight: "100vh" }}>
        <header style={{ height: 64, background: "#FFFFFF", borderBottom: "1px solid rgba(15,23,42,0.10)" }} className="flex items-center px-4 sticky top-0 z-50">
          <div className="w-full mx-auto flex items-center" style={{ maxWidth: 1200 }}>
            <div style={{ width: 100, height: 28, background: "#F3F4F6", borderRadius: 8 }} />
          </div>
        </header>
        <div className="mx-auto w-full px-4 py-6" style={{ maxWidth: 1200 }}>
          <div style={{ display: "grid", gap: 20 }}>
            <Skeleton h={32} r={8} />
            <Skeleton h={200} r={12} />
            <Skeleton h={100} r={12} />
            <Skeleton h={160} r={12} />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ background: "#F3F4F6", minHeight: "100vh" }}>
        <header style={{ height: 64, background: "#FFFFFF", borderBottom: "1px solid rgba(15,23,42,0.10)" }} className="flex items-center px-4 sticky top-0 z-50">
          <div className="w-full mx-auto flex items-center" style={{ maxWidth: 1200 }}>
            <div style={{ width: 100, height: 28, background: "#F3F4F6", borderRadius: 8 }} />
          </div>
        </header>
        <div className="mx-auto w-full px-4 py-6" style={{ maxWidth: 1200 }}>
          <SectionCard style={{ textAlign: "center", padding: 40 }}>
            <AlertTriangle size={28} color="#F59E0B" />
            <p style={{ color: "#0F172A", fontSize: 15, fontWeight: 600, marginTop: 12 }}>
              Market data is temporarily unavailable
            </p>
            <p style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
              Please try again shortly.
            </p>
            <button
              onClick={() => void refetch()}
              style={{
                marginTop: 16,
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#F3F4F6", minHeight: "100vh", paddingBottom: isMobile ? 144 : 40 }}>
      {/* 1. Stock Name / Header */}
      <div className="mx-auto w-full" style={{ maxWidth: 1200, padding: isMobile ? "0 16px" : "0 24px" }}>
        <div style={{ padding: "16px 0 12px" }}>
          <button
            onClick={() => navigate("")}
            style={{ fontSize: 11, color: "#64748B", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            ← Back to Home
          </button>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0",
          borderBottom: "1px solid rgba(15,23,42,0.10)",
          marginBottom: 20,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: "#64748B",
                background: "rgba(148,163,184,0.08)", border: "1px solid rgba(15,23,42,0.10)",
                borderRadius: 4, padding: "1px 6px", letterSpacing: "0.05em",
              }}>
                {data?.price.exchange ?? "NSE"}
              </span>
              <span style={{ fontSize: 11, color: "#64748B" }}>{symbol}</span>
              {data?.price.sector && (
                <>
                  <span style={{ fontSize: 11, color: "#64748B" }}>·</span>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{data.price.sector}</span>
                </>
              )}
              {data?.price.industry && (
                <>
                  <span style={{ fontSize: 11, color: "#64748B" }}>·</span>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{data.price.industry}</span>
                </>
              )}
            </div>
            <h1 style={{
              fontSize: isMobile ? 28 : 32, fontWeight: 800, color: "#0F172A",
              letterSpacing: "-0.5px", lineHeight: 1.2, margin: 0,
            }}>
              {data?.price.companyName && data?.price.companyName !== symbol ? data.price.companyName : (DISPLAY_NAMES[symbol] ?? symbol)}
            </h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>
                {displayPrice ? fPrice(displayPrice) : "—"}
              </span>
              {data?.price.change !== null && data?.price.change !== undefined && (
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: (data.price.change ?? 0) >= 0 ? "#16A34A" : "#DC2626",
                }}>
                  {positive ? "+" : ""}{data.price.change.toFixed(2)}
                  {data?.price.changeAbs ? ` (${positive ? "+" : ""}${data.price.changeAbs.toFixed(2)}%)` : ""}
                </span>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0, marginLeft: 16 }}>
            <ScoreRing score={prediction?.composite ?? null} size={isMobile ? 44 : 52} />
          </div>
        </div>

        {/* 2. Price Graph */}
        <SectionCard style={{ marginBottom: 16, padding: isMobile ? 14 : 20 }}>
          {data?.historical.closes && data.historical.closes.length > 0 ? (
            <>
              {/* 3. Time Intervals */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"].map((name) => (
                  <button
                    key={name}
                    onClick={() => setPeriod(name)}
                    style={{
                      fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                      border: period === name ? "none" : "1px solid rgba(15,23,42,0.10)",
                      background: period === name ? "#111827" : "transparent",
                      color: period === name ? "#FFFFFF" : "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <SafeBlock>
                <PriceChart
                  closes={data?.historical.closes ?? []}
                  timestamps={data?.historical.timestamps ?? []}
                  height={isMobile ? 180 : 240}
                />
              </SafeBlock>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>
                Price history is not available yet.
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>
                Current price and fundamentals remain available above.
              </div>
            </div>
          )}
        </SectionCard>

        <div className="lg:grid lg:grid-cols-[8fr_4fr] lg:gap-6">
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            {/* 4. Healthometer */}
            <SectionCard>
              <SectionTitle>Healthometer</SectionTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <HealthGauge
                  composite={health.composite}
                  score={health.compositeScore}
                  altmanZ={health.altmanZ}
                  piotroskiF={health.piotroskiF}
                  size={100}
                />
                <div style={{ flex: 1, minWidth: 200 }}>
                  {health.details.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>
                        Key Factors
                      </div>
                      {health.details.slice(0, 6).map((detail, i) => (
                        <div key={i} style={{
                          fontSize: 12, color: "#475569", lineHeight: 1.6,
                          padding: "2px 0", display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                            background: detail.startsWith("✓") ? "#16A34A" : detail.startsWith("✗") ? "#DC2626" : "#94A3B8",
                          }} />
                          {detail.replace(/^[✓✗?]\s*/, "")}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 8 }}>
                    Confidence: {health.compositeScore !== null ? "Medium" : "Low"}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* 5. Key Metrics */}
            <SectionCard>
              <SectionTitle>Key Metrics</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 16 }}>
                {metricGroups.map((group) => (
                  <div key={group.label}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                      {group.label}
                    </div>
                    {group.metrics.map((m) => (
                      <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                        <span style={{ fontSize: 12, color: "#64748B" }}>{m.label}</span>
                        <MetricValue value={m.value} unit={m.unit} change={m.change} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 6. Company Details & Business Summary */}
            <SectionCard>
              <SectionTitle>About {data?.price.companyName ?? symbol}</SectionTitle>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: 0 }}>
                {companyDescription}
              </p>
            </SectionCard>

            {/* 7. Company Facts */}
            <SectionCard>
              <SectionTitle>Company Facts</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {companyFacts.map((fact) => (
                  <div key={fact.label}>
                    <div style={{ fontSize: 11, color: "#64748B", marginBottom: 2 }}>{fact.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{fact.value}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 8. Financial Histogram */}
            <SectionCard>
              <SectionTitle>Financial Performance</SectionTitle>
              <SafeBlock>
                <FinancialHistogram data={data?.annualFinancials ?? []} height={isMobile ? 200 : 220} />
              </SafeBlock>
            </SectionCard>

            {/* 9. News */}
            <SectionCard>
              <SectionTitle>News & Updates</SectionTitle>
              <NewsFeed symbol={symbol} />
            </SectionCard>

            {/* 12. Methodology & Data Update Note */}
            <div style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", padding: "8px 0" }}>
              {dataUpdated ? `Data updated: ${dataUpdated}` : "Data is being compiled from multiple sources."}
              <br />
              StockStory is an AI research layer for Indian equities.
            </div>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionCard>
              <SectionTitle>Actions</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={{
                  width: "100%", padding: "10px 16px", borderRadius: 8,
                  border: "1px solid rgba(15,23,42,0.10)", background: "transparent",
                  color: "#0F172A", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <Bookmark size={14} /> Track
                </button>
                <button style={{
                  width: "100%", padding: "10px 16px", borderRadius: 8,
                  border: "1px solid rgba(15,23,42,0.10)", background: "transparent",
                  color: "#0F172A", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <GitCompare size={14} /> Compare
                </button>
                <button style={{
                  width: "100%", padding: "10px 16px", borderRadius: 8,
                  border: "none", background: "#111827", color: "#FFFFFF",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  Execute via Broker <ArrowRight size={14} />
                </button>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionTitle>Research Health</SectionTitle>
              <HealthGauge
                composite={health.composite}
                score={health.compositeScore}
                altmanZ={health.altmanZ}
                piotroskiF={health.piotroskiF}
                size={100}
              />
            </SectionCard>

            <SectionCard>
              <SectionTitle>Key Metrics</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Market Cap", data?.price.marketCap ? fMarketCap(data.price.marketCap) : "—"],
                  ["P/E (TTM)", data?.fundamentals.peRatio ? fRatio(data.fundamentals.peRatio) : "—"],
                  ["ROE", data?.fundamentals.roe ? fPercent(data.fundamentals.roe) : "—"],
                  ["52W Range", `${data?.price.weekLow52 ? fPrice(data.price.weekLow52) : "—"} — ${data?.price.weekHigh52 ? fPrice(data.price.weekHigh52) : "—"}`],
                  ["Dividend Yield", data?.fundamentals.dividendYield ? fPercent(data.fundamentals.dividendYield) : "—"],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 12, paddingBottom: 8, borderBottom: "1px solid rgba(15,23,42,0.10)",
                  }}>
                    <span style={{ color: "#64748B" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>{value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>

      {/* Mobile bottom action bar */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 64, left: 0, right: 0, height: 64,
          background: "#FFFFFF", borderTop: "1px solid rgba(15,23,42,0.10)",
          zIndex: 40, display: "flex", alignItems: "center", gap: 8,
          padding: "0 16px", paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          <button style={{
            flex: 1, height: 44, borderRadius: 10, border: "1px solid rgba(15,23,42,0.10)",
            background: "transparent", color: "#0F172A", fontSize: 12, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Bookmark size={15} /> Track
          </button>
          <button style={{
            flex: 1, height: 44, borderRadius: 10, border: "1px solid rgba(15,23,42,0.10)",
            background: "transparent", color: "#0F172A", fontSize: 12, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <GitCompare size={15} /> Compare
          </button>
          <button style={{
            flex: 1, height: 40, borderRadius: 8, border: "none",
            background: "#111827", color: "#FFFFFF", fontSize: 12, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            Invest <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: 64,
          background: "#FFFFFF", borderTop: "1px solid rgba(15,23,42,0.10)",
          zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-around",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          {[
            { label: "Home", page: "" },
            { label: "Scanner", page: "scanner" },
            { label: "Search", page: "search" },
            { label: "Watchlist", page: "watchlist" },
          ].map(({ label, page }) => (
            <button
              key={label}
              onClick={() => navigate(page)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: "none", border: "none", cursor: "pointer",
                color: "#64748B", fontSize: 10, minWidth: 48, height: 48,
              }}
            >
              <span style={{ fontSize: 20 }}>
                {label === "Home" ? "⌂" : label === "Scanner" ? "≡" : label === "Search" ? "⌕" : "◈"}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
