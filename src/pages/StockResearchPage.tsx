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
  Shield,
  Eye,
  Activity,
  Target,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { UnifiedPredictionEngine } from "../prediction-engine/UnifiedPredictionEngine";
import ScoreRing, { getScoreColor, getScoreLabel } from "../components/ui/ScoreRing";
import SignalLight from "../components/ui/SignalLight";
import { fMarketCap, fPercent, fPrice, fRatio, fRelativeTime } from "../lib/format";
import BrokerModal from "../components/BrokerModal";
import ThesisCard from "../components/ui/ThesisCard";
import PriceChart from "../components/charts/PriceChart";
import { Skeleton } from "../components/ui/Skeleton";
import FinancialHistogram from "../components/charts/FinancialHistogram";
import { SafeBlock } from "../components/ErrorBoundary";
import NewsFeed from "../components/news/NewsFeed";
import HealthGauge from "../components/ui/HealthGauge";
import { computeHealthScore } from "../lib/healthScore";
import { navigate } from "../components/product/routeConfig";

const IT_THESIS =
  "A high-quality IT services business with strong free cash flow and resilient earnings supported by digital transformation demand.";
const BANK_THESIS =
  "A well-capitalised private sector bank with improving asset quality and a strong deposit franchise.";
const FMCG_THESIS =
  "A consumer staples business with pricing power and consistent volume growth in Indian markets.";
const OTHER_THESIS =
  "A Nifty 50 constituent with data currently being compiled by our research engine.";

const IT_BULL: string[] = [
  "Consistent revenue growth from cloud and digital services",
  "Industry-leading operating margins from scale and automation",
  "Strong balance sheet with minimal debt",
];
const IT_BEAR: string[] = [
  "Macro slowdown affecting discretionary IT spending",
  "Employee attrition and wage cost pressures",
  "Currency fluctuations impacting reported margins",
];
const BANK_BULL: string[] = [
  "Improving asset quality with declining NPAs",
  "Strong deposit franchise providing stable funding",
  "Healthy credit growth driven by economic expansion",
];
const BANK_BEAR: string[] = [
  "Regulatory changes could impact lending margins",
  "Asset quality sensitive to economic cycles",
  "Intense competition from fintech and smaller banks",
];
const FMCG_BULL: string[] = [
  "Pricing power from strong brand portfolio",
  "Consistent volume growth across urban and rural markets",
  "High operating margins from efficient distribution",
];
const FMCG_BEAR: string[] = [
  "Input cost inflation pressuring margins",
  "Slowdown in rural demand affecting volume growth",
  "Intense competition from regional and new-age brands",
];
const DEFAULT_BULL: string[] = [
  "Established market position with competitive advantages",
  "Financial performance tracked across multiple indicators",
  "Balance sheet monitored for stability and efficiency",
];
const DEFAULT_BEAR: string[] = [
  "Demand cyclicality could impact near-term performance",
  "Competitive intensity may pressure margins",
  "Regulatory changes are a potential headwind",
];

const CHECKLIST = [
  "Review recent quarterly earnings and management commentary",
  "Assess valuation relative to historical range and peers",
  "Evaluate debt ratios and interest payment capacity",
  "Check promoter holding trend and institutional activity",
  "Verify dividend track record and payout consistency",
];

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

function factorScoreColor(score: number | null): string {
  if (score === null || score === undefined) return "var(--text-muted)";
  if (score >= 80) return "#16A34A";
  if (score >= 65) return "#22C55E";
  if (score >= 50) return "#2962FF";
  if (score >= 35) return "#F59E0B";
  return "#EF4444";
}

function getRiskColor(riskScore: number | null): string {
  if (riskScore === null || riskScore === undefined) return "var(--text-muted)";
  if (riskScore >= 80) return "#EF4444";
  if (riskScore >= 65) return "#F59E0B";
  if (riskScore >= 50) return "#2962FF";
  if (riskScore >= 35) return "#22C55E";
  return "#16A34A";
}

function getFactorExplanation(factor: string, score: number | null): string {
  if (score === null) return "Insufficient data to evaluate this factor.";
  switch (factor) {
    case "quality":
      if (score >= 80) return "Exceptional profitability and capital efficiency.";
      if (score >= 65) return "Above-average returns with manageable financial leverage.";
      if (score >= 50) return "Adequate profitability with reasonable financial health.";
      if (score >= 35) return "Below-average profitability metrics raise some concerns.";
      return "Weak profitability and elevated financial risk.";
    case "valuation":
      if (score >= 80) return "Stock appears significantly undervalued relative to earnings.";
      if (score >= 65) return "Valuation is attractive with a reasonable margin of safety.";
      if (score >= 50) return "Valuation is fair and broadly in line with fundamentals.";
      if (score >= 35) return "Valuation appears elevated relative to historical averages.";
      return "Stock is trading at a significant premium to intrinsic value.";
    case "growth":
      if (score >= 80) return "Strong revenue and profit growth trajectory.";
      if (score >= 65) return "Healthy growth rates above industry average.";
      if (score >= 50) return "Moderate growth in line with economic expansion.";
      if (score >= 35) return "Growth is slowing and below recent historical trends.";
      return "Declining revenue or profitability trend.";
    case "risk":
      if (score >= 80) return "Elevated financial or operational risk factors present.";
      if (score >= 65) return "Above-average risk factors warrant closer monitoring.";
      if (score >= 50) return "Moderate risk profile with generally sound financials.";
      if (score >= 35) return "Below-average risk with solid financial structure.";
      return "Strong financial stability with minimal risk factors.";
    case "momentum":
      if (score >= 80) return "Strong positive price momentum with technical alignment.";
      if (score >= 65) return "Favorable price action supported by bullish technicals.";
      if (score >= 50) return "Neutral momentum with mixed technical indicators.";
      if (score >= 35) return "Weakening price momentum suggesting increased caution.";
      return "Bearish price momentum with deteriorating technical structure.";
    default:
      return "";
  }
}

function FactorCard({
  name,
  score,
  reason,
  isRisk = false,
}: {
  name: string;
  score: number | null;
  reason: string;
  isRisk?: boolean;
}) {
  const color = isRisk ? getRiskColor(score) : factorScoreColor(score);
  const explanation = getFactorExplanation(name.toLowerCase(), score);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
        padding: 20,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {name}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>
        {score !== null && score !== undefined ? score : "—"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 6 }}>
        {explanation}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>
        {reason}
      </div>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
      {icon && <span style={{ color: "var(--action)", flexShrink: 0 }}>{icon}</span>}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
        {children}
      </h2>
    </div>
  );
}

export default function StockResearchPage({ symbol }: { symbol: string }) {
  const { data, loading, error, refetch } = useStockData(symbol);
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState("1M");
  const [brokerOpen, setBrokerOpen] = useState(false);

  useEffect(() => {
    const open = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest("[data-broker-trigger]")) setBrokerOpen(true);
    };
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);

  const prediction = useMemo(
    () =>
      data
        ? UnifiedPredictionEngine.predict({
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
          })
        : null,
    [data],
  );

  const sector = (data?.price.sector ?? "").toLowerCase();
  const isIT = sector.includes("it") || sector.includes("technology");
  const isBank = sector.includes("bank");
  const isFmcg = sector.includes("fmcg") || sector.includes("consumer");

  const thesis = isIT ? IT_THESIS : isBank ? BANK_THESIS : isFmcg ? FMCG_THESIS : OTHER_THESIS;
  const bullCase = isIT ? IT_BULL : isBank ? BANK_BULL : isFmcg ? FMCG_BULL : DEFAULT_BULL;
  const bearCase = isIT ? IT_BEAR : isBank ? BANK_BEAR : isFmcg ? FMCG_BEAR : DEFAULT_BEAR;

  const positive = (data?.price.change ?? 0) >= 0;

  const fairValue =
    data && data.fundamentals.eps !== null && data.fundamentals.peRatio !== null
      ? data.fundamentals.eps * data.fundamentals.peRatio * 1.05
      : null;
  const upside =
    fairValue !== null && data?.price.current
      ? ((fairValue - data.price.current) / data.price.current) * 100
      : null;

  const riskScore =
    prediction?.factorScores.stability.score !== null &&
    prediction?.factorScores.stability.score !== undefined
      ? Math.max(0, Math.min(100, 100 - prediction.factorScores.stability.score))
      : null;

  const health = useMemo(() => computeHealthScore({
    roe: data?.fundamentals.roe ?? null,
    roce: data?.fundamentals.roce ?? null,
    debtToEquity: data?.fundamentals.debtToEquity ?? null,
    currentRatio: data?.fundamentals.currentRatio ?? null,
    marketCap: data?.price.marketCap ?? null,
    peRatio: data?.fundamentals.peRatio ?? null,
    eps: data?.fundamentals.eps ?? null,
  }), [data])

  if (loading && !data) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <header
          style={{
            height: 64,
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
          }}
          className="flex items-center px-4 sticky top-0 z-50"
        >
          <div className="w-full mx-auto flex items-center" style={{ maxWidth: 1320 }}>
            <div style={{ width: 100, height: 28, background: "var(--border)", borderRadius: 8 }} />
          </div>
        </header>
        <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8" style={{ maxWidth: 1320 }}>
          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr" }}>
            <Skeleton h={40} r={8} />
            <Skeleton h={80} r={12} />
            <Skeleton h={60} r={12} />
            <Skeleton h={60} r={12} />
            <Skeleton h={120} r={12} />
            <Skeleton h={120} r={12} />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
        <header
          style={{
            height: 64,
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
          }}
          className="flex items-center px-4 sticky top-0 z-50"
        >
          <div className="w-full mx-auto flex items-center" style={{ maxWidth: 1320 }}>
            <div style={{ width: 100, height: 28, background: "var(--border)", borderRadius: 8 }} />
          </div>
        </header>
        <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8" style={{ maxWidth: 1320 }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
              padding: 32,
              textAlign: "center",
            }}
          >
            <AlertTriangle size={28} style={{ color: "var(--caution)" }} />
            <p style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 600, marginTop: 12 }}>
              Market data is temporarily unavailable
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
              Please try again shortly.
            </p>
            <button
              onClick={() => void refetch()}
              style={{
                marginTop: 16,
                background: "var(--action)",
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
          </div>
        </div>
      </div>
    );
  }

  const RenderFactorCards = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <FactorCard name="Quality" score={prediction?.factorScores.quality.score ?? null} reason={prediction?.factorScores.quality.reason ?? "Insufficient data"} />
      <FactorCard name="Valuation" score={prediction?.factorScores.valuation.score ?? null} reason={prediction?.factorScores.valuation.reason ?? "Insufficient data"} />
      <FactorCard name="Growth" score={prediction?.factorScores.growth.score ?? null} reason={prediction?.factorScores.growth.reason ?? "Insufficient data"} />
      <FactorCard name="Risk" score={riskScore} reason={prediction?.factorScores.stability.reason ?? "Insufficient data"} isRisk />
      <FactorCard name="Momentum" score={prediction?.factorScores.momentum.score ?? null} reason={prediction?.factorScores.momentum.reason ?? "Insufficient data"} />
    </div>
  );

  const convictionLabel =
    prediction?.composite !== null && prediction?.composite !== undefined ? getScoreLabel(prediction.composite) : "—";

  const desktopScoreRingSize = 52;
  const mobileScoreRingSize = 44;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", paddingBottom: isMobile ? 144 : 0 }}>
      <header
        style={{
          height: 64,
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
        className="flex items-center px-4 sticky top-0 z-50"
      >
        <div className="w-full mx-auto flex items-center" style={{ maxWidth: 1320 }}>
          <button onClick={() => navigate("")} className="flex items-center">
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
              StockStory<span style={{ color: "var(--positive)" }}>.</span>India
            </span>
          </button>
          <nav className="hidden md:flex items-center gap-5 ml-10" style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            <button onClick={() => navigate("")} style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              Home
            </button>
            <button onClick={() => navigate("scanner")}>Scanner</button>
            <button onClick={() => navigate("rankings")}>Rankings</button>
            <button onClick={() => navigate("watchlist")}>Watchlist</button>
          </nav>
        </div>
      </header>

      <div
        className="mx-auto w-full"
        style={{ maxWidth: 1320, padding: isMobile ? "0 16px" : "0 24px", animation: "fadeIn 0.4s ease" }}
      >
        <div style={{ padding: "16px 0 12px" }}>
          <button
            onClick={() => navigate("")}
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Back to Home
          </button>
        </div>

        {brokerOpen && (
          <BrokerModal symbol={symbol} price={data?.price.current ?? null} onClose={() => setBrokerOpen(false)} />
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: "1px solid var(--border)",
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  background: "rgba(148,163,184,0.08)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "1px 6px",
                  letterSpacing: "0.05em",
                }}
              >
                {data?.price.exchange ?? "NSE"}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{symbol}</span>
              {data?.price.sector && (
                <>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>·</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{data.price.sector}</span>
                </>
              )}
            </div>
              <h1
                style={{
                  fontSize: isMobile ? 28 : 32,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                {data?.price.companyName ?? symbol}
              </h1>
          </div>

          <div style={{ flexShrink: 0, marginLeft: 16, textAlign: "center" }}>
            <ScoreRing
              score={prediction?.composite ?? null}
              size={isMobile ? mobileScoreRingSize : desktopScoreRingSize}
              showLabel={!isMobile && (desktopScoreRingSize >= 80)}
            />
            {!isMobile && prediction?.composite !== null ? (
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
                {convictionLabel}
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[8fr_4fr] lg:gap-8">
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <section>
              <SectionTitle icon={<Sparkles size={14} />}>
                AI Thesis
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                }}
              >
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {thesis}
                </p>
              </div>
            </section>

            <section>
              <SectionTitle icon={<Activity size={14} />}>
                What Changed
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                }}
              >
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                  Track this company to receive change notifications.
                </p>
              </div>
            </section>

            {/* Key Metrics Grid */}
            <section>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}>
                {[
                  ["P/E Ratio", fRatio(data?.fundamentals.peRatio ?? null), "var(--text-primary)"],
                  ["Market Cap", fMarketCap(data?.price.marketCap ?? null), "var(--text-primary)"],
                  ["RSI (14)", prediction?.technicals.rsi14 !== null && prediction?.technicals.rsi14 !== undefined ? prediction.technicals.rsi14.toFixed(1) : "—",
                    prediction?.technicals.rsi14 !== null && prediction?.technicals.rsi14 !== undefined
                      ? prediction.technicals.rsi14 > 70 ? "var(--negative)" : prediction.technicals.rsi14 < 30 ? "var(--positive)" : "var(--text-primary)"
                      : "var(--text-muted)"],
                  ["MACD", prediction?.technicals.macd !== null && prediction?.technicals.macd !== undefined ? prediction.technicals.macd.toFixed(2) : "—",
                    prediction?.technicals.macdHist !== null && prediction?.technicals.macdHist !== undefined
                      ? prediction.technicals.macdHist > 0 ? "var(--positive)" : "var(--negative)"
                      : "var(--text-muted)"],
                ].map(([label, value, color]) => (
                  <div key={String(label)}
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      border: "1px solid rgba(229,231,235,0.5)",
                      borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                      padding: isMobile ? 14 : 20,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.03em", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: color as string, fontVariantNumeric: "tabular-nums" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle icon={<Info size={14} />}>
                Why It Matters
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                }}
              >
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {isIT
                    ? "The IT services sector forms the backbone of India's export-driven knowledge economy, contributing significantly to GDP and employment. Companies in this space are bellwethers for global tech spending trends."
                    : isBank
                      ? "India's banking sector is a critical driver of economic growth, with credit expansion closely tracking GDP. Banks with strong deposit franchises and asset quality discipline tend to outperform through cycles."
                      : isFmcg
                        ? "The FMCG sector reflects the health of Indian consumption across urban and rural markets. Companies with strong brand equity and distribution networks are well-positioned to capture rising discretionary spending."
                        : "This company operates in a sector that is a significant component of the Indian economy. Understanding its performance provides insight into broader market dynamics and investment opportunities."}
                </p>
              </div>
            </section>

            <section>
              <SectionTitle icon={<CheckCircle2 size={14} />}>
                Bull Case
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                }}
              >
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {bullCase.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        padding: "4px 0",
                      }}
                    >
                      <span style={{ color: "var(--positive)", flexShrink: 0, marginTop: 3 }}>●</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <SectionTitle icon={<AlertTriangle size={14} />}>
                Bear Case
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                }}
              >
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {bearCase.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        padding: "4px 0",
                      }}
                    >
                      <span style={{ color: "var(--negative)", flexShrink: 0, marginTop: 3 }}>●</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {isMobile && <RenderFactorCards />}

            <section>
              <SectionTitle icon={<GitCompare size={14} />}>
                Peer Context
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                  textAlign: "center",
                }}
              >
                <BarChart3 size={20} style={{ color: "var(--text-muted)" }} />
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
                  Peer comparison data coming soon.
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  Compare this company against its industry peers across key financial metrics.
                </p>
              </div>
            </section>

            <section>
              <SectionTitle icon={<BookOpen size={14} />}>
                Investment Checklist
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                }}
              >
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {CHECKLIST.map((item, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        padding: "6px 0",
                        borderBottom: i < CHECKLIST.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: "1.5px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 1,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <SectionTitle icon={<TrendingUp size={14} />}>
                Price History
              </SectionTitle>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: isMobile ? 14 : 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
                  {["1D", "1W", "1M", "YTD", "1Y", "5Y", "MAX"].map((name) => (
                    <button
                      key={name}
                      onClick={() => setPeriod(name)}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        background:
                          period === name
                            ? "rgba(41,98,255,0.15)"
                            : "transparent",
                        color:
                          period === name
                            ? "var(--action)"
                            : "var(--text-muted)",
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
                    height={isMobile ? 140 : 180}
                  />
                </SafeBlock>
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, textAlign: "right" }}>
                  Daily closing prices
                </p>
              </div>
            </section>

            {/* Corporate Narrative */}
            <section>
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: 20,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
                  About {data?.price.companyName ?? symbol}
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {isIT
                    ? `${data?.price.companyName ?? symbol} is a leading IT services company based in India, providing software development, consulting, and business process outsourcing services to global clients across industries including banking, financial services, insurance, retail, and manufacturing.`
                    : isBank
                      ? `${data?.price.companyName ?? symbol} is a major Indian banking institution offering a comprehensive range of financial products and services including retail banking, corporate banking, treasury operations, and wealth management across domestic and international markets.`
                      : `${data?.price.companyName ?? symbol} operates within the Indian market, serving customers through a diversified business model. The company has established itself as a significant player in its sector with a strong market presence.`}
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}>
                  {[
                    ["Founded", "Information pending"],
                    ["Sector", data?.price.sector ?? "—"],
                    ["Exchange", data?.price.exchange ?? "NSE"],
                    ["Market Cap", fMarketCap(data?.price.marketCap ?? null)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Financial Histograms */}
            <section>
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: 20,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
                  Financial Performance
                </div>
                <SafeBlock>
                  <FinancialHistogram height={isMobile ? 200 : 220} />
                </SafeBlock>
              </div>
            </section>

            {/* News Feed */}
            <section>
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                  padding: 20,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
                  News & Updates
                </div>
                <NewsFeed symbol={symbol} />
              </div>
            </section>
          </div>

          <aside className="hidden lg:block" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                padding: "18px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Research Health
              </div>
              <HealthGauge composite={health.composite} score={health.compositeScore} altmanZ={health.altmanZ} piotroskiF={health.piotroskiF} size={100} />
            </div>

            <RenderFactorCards />

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                padding: isMobile ? 14 : 20,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Key Metrics
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Market Cap", fMarketCap(data?.price.marketCap ?? null)],
                  ["P/E (TTM)", fRatio(data?.fundamentals.peRatio ?? null)],
                  ["ROE", fPercent(data?.fundamentals.roe ?? null)],
                  ["52W Range", `${fPrice(data?.price.weekLow52 ?? null)} — ${fPrice(data?.price.weekHigh52 ?? null)}`],
                  ["Dividend Yield", fPercent(data?.fundamentals.dividendYield ?? null)],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                      paddingBottom: 8,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
        boxShadow: "var(--shadow-sm)",
                padding: isMobile ? 14 : 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <ThesisCard symbol={symbol} companyName={data?.price.companyName ?? undefined} />

              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Actions
              </div>
              <button
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Bookmark size={14} /> Track
              </button>
              <button
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <GitCompare size={14} /> Compare
              </button>
              <button
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--action)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                data-broker-trigger
              >
                Execute via Broker <ArrowRight size={14} />
              </button>
            </div>
          </aside>
        </div>
      </div>

      {isMobile && (
        <div
          style={{
            position: "fixed",
            bottom: 64,
            left: 0,
            right: 0,
            height: 64,
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 16px",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <button
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Bookmark size={15} /> Track
          </button>
          <button
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <GitCompare size={15} /> Compare
          </button>
          <button
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            data-broker-trigger
          >
            Execute via Broker <ArrowRight size={15} />
          </button>
        </div>
      )}

      {isMobile && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: "#FFFFFF",
            borderTop: "1px solid var(--border)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {[
            { icon: "Home", label: "Home", page: "" },
            { icon: "BarChart3", label: "Scanner", page: "scanner" },
            { icon: "Search", label: "Search", page: "search" },
            { icon: "Bookmark", label: "Watchlist", page: "watchlist" },
          ].map(({ label, page }) => (
            <button
              key={label}
              onClick={() => navigate(page)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 10,
                minWidth: 48,
                height: 48,
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
