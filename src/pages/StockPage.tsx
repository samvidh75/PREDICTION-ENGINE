import { useMemo, useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { Skeleton } from "../components/ui/Skeleton";
import { SafeBlock } from "../components/ErrorBoundary";
import AppShell from "../components/layout/AppShell";
import CompanyHeader from "../components/stock/CompanyHeader";
import PriceChart from "../components/stock/PriceChart";
import Healthometer from "../components/stock/Healthometer";
import MetricsGrid from "../components/stock/MetricsGrid";
import CompanyInfo from "../components/stock/CompanyInfo";
import NewsFeed from "../components/news/NewsFeed";
import ProUpgradeModal from "../components/stock/ProUpgradeModal";
import ProPaywallGate from "../components/premium/ProPaywallGate";
import { IntelligentAnalysis } from "../components/stock/IntelligentAnalysis";
import ScoreSemiCircles from "../components/stock/ScoreSemiCircles";
import ShareholdingsChart from "../components/stock/ShareholdingsChart";
import { FinancialCharts } from "../components/stock/FinancialCharts";
import { computeHealthScore } from "../lib/healthScore";
import { analytics } from "../analytics/EventAnalyticsEngine";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

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

/* Stripe section card wrapper */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E5E5",
      borderRadius: 8,
      padding: 24,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: "#999999",
      textTransform: "uppercase", letterSpacing: "0.06em",
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function StockPage({ symbol }: { symbol: string }) {
  const { data, loading, error, refetch } = useStockData(symbol);
  const isMobile = useIsMobile();
  const [showProModal,       setShowProModal]       = useState(false);
  const [isTracked,          setIsTracked]          = useState(false);
  const [shareholdersData,   setShareholdersData]   = useState<Array<{ category: string; percent: number; change: number }> | null>(null);
  const [shareholdersLoading,setShareholdersLoading]= useState(false);

  const fetchShareholders = useCallback(async (sym: string) => {
    setShareholdersLoading(true);
    try {
      const res = await fetch(`/api/market/stock/${sym}/shareholding`);
      if (!res.ok) return;
      const result = await res.json();
      const latest = result.data?.snapshots?.[result.data.snapshots.length - 1];
      if (!latest) return;
      setShareholdersData([
        { category: "Promoters", percent: latest.promoter ?? 0, change: 0 },
        { category: "FIIs",      percent: latest.fii      ?? 0, change: 0 },
        { category: "DIIs",      percent: latest.dii      ?? 0, change: 0 },
        { category: "Public",    percent: latest.public_  ?? 0, change: 0 },
      ]);
    } catch { /* best-effort */ } finally {
      setShareholdersLoading(false);
    }
  }, []);

  useEffect(() => { if (symbol) fetchShareholders(symbol); }, [symbol, fetchShareholders]);

  useEffect(() => {
    if (symbol) {
      analytics.trackStockView(symbol, "stock-page", false);
      analytics.trackPageVisit(`/stock/${symbol}`);
    }
  }, [symbol]);

  const health = useMemo(() => computeHealthScore({
    roe:          data?.fundamentals.roe          ?? null,
    roce:         data?.fundamentals.roce         ?? null,
    debtToEquity: data?.fundamentals.debtToEquity ?? null,
    currentRatio: data?.fundamentals.currentRatio ?? null,
    marketCap:    data?.price.marketCap           ?? null,
    peRatio:      data?.fundamentals.peRatio      ?? null,
    pbRatio:      data?.fundamentals.pbRatio      ?? null,
    eps:          data?.fundamentals.eps          ?? null,
  }), [data]);

  const dataUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  const stateLabel = (() => {
    const s = health.compositeScore;
    if (s === null) return null;
    if (s >= 80) return "High Conviction";
    if (s >= 65) return "Healthy";
    if (s >= 50) return "Moderate";
    if (s >= 35) return "Needs Review";
    return "Caution";
  })();

  /* ── Loading ──────────────────────────────────────────────────────────── */
  if (loading && !data) {
    return (
      <AppShell>
        <div style={{ maxWidth: 900 }}>
          <div style={{ display: "grid", gap: 16 }}>
            <Skeleton height={32} radius={6} />
            <Skeleton height={200} radius={8} />
            <Skeleton height={100} radius={8} />
            <Skeleton height={160} radius={8} />
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Error ────────────────────────────────────────────────────────────── */
  if (error && !data) {
    return (
      <AppShell>
        <div style={{ maxWidth: 900 }}>
          <Card style={{ textAlign: "center", padding: 48 }}>
            <AlertTriangle size={28} color="#FAAD14" />
            <p style={{ color: "#111111", fontSize: 16, fontWeight: 600, marginTop: 12 }}>
              Market data is temporarily unavailable
            </p>
            <p style={{ color: "#666666", fontSize: 14, marginTop: 4 }}>Please try again shortly.</p>
            <button
              onClick={() => void refetch()}
              style={{
                marginTop: 20, height: 44, padding: "0 32px",
                background: "#0070F3", color: "#FFFFFF",
                border: "none", borderRadius: 6,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                transition: "background 200ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#0051CC")}
              onMouseLeave={e => (e.currentTarget.style.background = "#0070F3")}
            >
              Try again
            </button>
          </Card>
        </div>
      </AppShell>
    );
  }

  /* ── Page ─────────────────────────────────────────────────────────────── */
  return (
    <AppShell>
      <div style={{ maxWidth: 900 }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 16 }}>
          <a href="/" style={{
            fontSize: 13, color: "#666666", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 4,
            transition: "color 150ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#111111")}
          onMouseLeave={e => (e.currentTarget.style.color = "#666666")}
          >
            {'← Home'}
          </a>
        </div>

        {/* ── 1. Company Header ─────────────────────────────────────────── */}
        <CompanyHeader
          symbol={symbol}
          companyName={data?.price.companyName ?? symbol}
          price={data?.price.current ?? null}
          change={data?.price.change ?? null}
          changeAbs={data?.price.changeAbs ?? null}
          exchange={data?.price.exchange ?? "NSE"}
          sector={data?.price.sector ?? null}
          isMobile={isMobile}
        />

        {/* ── 2. Price Chart ────────────────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <Card style={{ padding: isMobile ? 16 : 24 }}>
            <PriceChart symbol={symbol} height={isMobile ? 180 : 260} />
          </Card>
        </div>

        {/* ── 3. Scores ────────────────────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <ProPaywallGate isLocked={false} onUnlockClick={() => setShowProModal(true)}>
            <Card>
              <SectionLabel>Score Overview</SectionLabel>
              <ScoreSemiCircles
                overallScore={health.compositeScore ?? 50}
                riskScore={Math.min(100, Math.max(0, 100 - (health.compositeScore ?? 50)))}
              />
            </Card>
          </ProPaywallGate>
        </div>

        {/* ── 4. Healthometer ──────────────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <Healthometer
            score={health.compositeScore}
            factors={health.factors}
            thesis={null}
            stateLabel={stateLabel}
            details={health.details}
            isPro={false}
            onUpgradeClick={() => setShowProModal(true)}
          />
        </div>

        {/* ── 5. AI Analysis ────────────────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <IntelligentAnalysis symbol={symbol} />
        </div>

        {/* ── 6. Key Metrics ────────────────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <MetricsGrid
            fundamentals={data?.fundamentals ?? null}
            price={data?.price ?? null}
            isPro={false}
            onUpgradeClick={() => setShowProModal(true)}
          />
        </div>

        {/* ── 7. Company Info ───────────────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <CompanyInfo
            symbol={symbol}
            companyName={data?.price.companyName ?? symbol}
            sector={data?.price.sector ?? null}
            industry={data?.price.industry ?? null}
            description={data?.price.description ?? null}
            exchange={data?.price.exchange ?? "NSE"}
            marketCap={data?.price.marketCap ?? null}
          />
        </div>

        {/* ── 8. Financial Histogram ───────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <ProPaywallGate isLocked={false} onUnlockClick={() => setShowProModal(true)}>
            <Card>
              <SectionLabel>Financial Performance</SectionLabel>
              <SafeBlock>
                {data?.annualFinancials && data.annualFinancials.length > 0 && (
                  <FinancialCharts data={data.annualFinancials} />
                )}
              </SafeBlock>
            </Card>
          </ProPaywallGate>
        </div>

        {/* ── 9. Shareholdings ─────────────────────────────────────────── */}
        {shareholdersData && shareholdersData.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            <Card>
              <SectionLabel>Shareholding Pattern</SectionLabel>
              <ShareholdingsChart shareholdersData={shareholdersData} />
            </Card>
          </div>
        )}

        {/* ── 11. News ─────────────────────────────────────────────────── */}
        <div style={{ margin: "16px 0" }}>
          <Card>
            <SectionLabel>Latest News</SectionLabel>
            <NewsFeed symbol={symbol} />
          </Card>
        </div>

        {/* ── Data recency ─────────────────────────────────────────────── */}
        <div style={{ fontSize: 11, color: "#999999", textAlign: "center", padding: "16px 0 40px" }}>
          {dataUpdated ? `Data prepared ${dataUpdated}` : "Based on latest available market data."}
          <br />
          StockStory is an AI research layer for Indian equities. Not SEBI-registered.
        </div>

      </div>

      {/* ── Mobile sticky action bar ───────────────────────────────────── */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "#FFFFFF",
          borderTop: "1px solid #E5E5E5",
          display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr",
          gap: 8, padding: "10px 12px",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
        }}>
          {/* Track */}
          <button
            onClick={() => setIsTracked(!isTracked)}
            style={{
              height: 44, borderRadius: 6,
              background: isTracked ? "#E8F9ED" : "#FFFFFF",
              color: isTracked ? "#0A8C2A" : "#666666",
              border: isTracked ? "1px solid #13C23E" : "1px solid #E5E5E5",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 200ms ease",
            }}
          >
            {isTracked ? '♥ Tracked' : '♡ Track'}
          </button>

          {/* Compare */}
          <a href={`/compare?stocks=${symbol}`} style={{
            height: 44, borderRadius: 6,
            background: "#FFFFFF", color: "#666666",
            border: "1px solid #E5E5E5",
            fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            textDecoration: "none", transition: "background 200ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
          onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
          >
            Compare
          </a>

          {/* Invest CTA */}
          <button style={{
            height: 44, borderRadius: 6,
            background: "#0070F3", color: "#FFFFFF",
            border: "none", fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "background 200ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#0051CC")}
          onMouseLeave={e => (e.currentTarget.style.background = "#0070F3")}
          >
            {'Invest →'}
          </button>
        </div>
      )}

      {/* ── Desktop action buttons ────────────────────────────────────── */}
      {!isMobile && (
        <div style={{ position: "fixed", bottom: 24, right: 32, display: "flex", gap: 8, zIndex: 50 }}>
          <button
            onClick={() => setIsTracked(!isTracked)}
            style={{
              height: 44, padding: "0 20px", borderRadius: 6,
              background: isTracked ? "#E8F9ED" : "#FFFFFF",
              color: isTracked ? "#0A8C2A" : "#666666",
              border: isTracked ? "1px solid #13C23E" : "1px solid #E5E5E5",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              transition: "all 200ms ease",
            }}
          >
            {isTracked ? '♥ Tracked' : '♡ Track'}
          </button>
          <a href={`/compare?stocks=${symbol}`} style={{
            height: 44, padding: "0 20px", borderRadius: 6,
            background: "#FFFFFF", color: "#666666",
            border: "1px solid #E5E5E5",
            fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center",
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            transition: "background 200ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
          onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
          >
            Compare
          </a>
        </div>
      )}

      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        symbol={symbol}
      />
    </AppShell>
  );
}
