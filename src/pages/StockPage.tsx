import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
} from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { fMarketCap, fPercent, fPrice, fRatio, fRelativeTime } from "../lib/format";
import { Skeleton } from "../components/ui/Skeleton";
import { SafeBlock } from "../components/ErrorBoundary";
import AppShell from "../components/layout/AppShell";
import CompanyHeader from "../components/stock/CompanyHeader";
import PriceChart from "../components/stock/PriceChart";
import Healthometer from "../components/stock/Healthometer";
import MetricsGrid from "../components/stock/MetricsGrid";
import CompanyInfo from "../components/stock/CompanyInfo";
import FinancialHistogram from "../components/charts/FinancialHistogram";
import NewsFeed from "../components/news/NewsFeed";
import ProUpgradeModal from "../components/stock/ProUpgradeModal";
import ProPaywallGate from "../components/premium/ProPaywallGate";
import ResearchBot from "../components/stock/ResearchBot";
import ScoreSemiCircles from "../components/stock/ScoreSemiCircles";
import ShareholdingsChart from "../components/stock/ShareholdingsChart";
import { FinancialCharts } from "../components/stock/FinancialCharts";
import { computeHealthScore } from "../lib/healthScore";
import { analytics } from "../analytics/EventAnalyticsEngine";

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

export default function StockPage({ symbol }: { symbol: string }) {
  const { data, loading, error, refetch } = useStockData(symbol);
  const isMobile = useIsMobile();
  const [showProModal, setShowProModal] = useState(false);
  const [isTracked, setIsTracked] = useState(false);
  const [shareholdersData, setShareholdersData] = useState<Array<{ category: string; percent: number; change: number }> | null>(null);
  const [shareholdersLoading, setShareholdersLoading] = useState(false);

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
        { category: "FIIs", percent: latest.fii ?? 0, change: 0 },
        { category: "DIIs", percent: latest.dii ?? 0, change: 0 },
        { category: "Public", percent: latest.public_ ?? 0, change: 0 },
      ]);
    } catch {
      // Best-effort shareholders fetch
    } finally {
      setShareholdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (symbol) fetchShareholders(symbol);
  }, [symbol, fetchShareholders]);

  useEffect(() => {
    if (symbol) {
      analytics.trackStockView(symbol, "stock-page", false);
      analytics.trackPageVisit(`/stock/${symbol}`);
    }
  }, [symbol]);

  const health = useMemo(() => computeHealthScore({
    roe: data?.fundamentals.roe ?? null,
    roce: data?.fundamentals.roce ?? null,
    debtToEquity: data?.fundamentals.debtToEquity ?? null,
    currentRatio: data?.fundamentals.currentRatio ?? null,
    marketCap: data?.price.marketCap ?? null,
    peRatio: data?.fundamentals.peRatio ?? null,
    pbRatio: data?.fundamentals.pbRatio ?? null,
    eps: data?.fundamentals.eps ?? null,
  }), [data]);

  const dataUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  if (loading && !data) {
    return (
      <AppShell>
        <div style={{ maxWidth: 900 }}>
          <div style={{ display: "grid", gap: 20 }}>
            <Skeleton height={32} radius={8} />
            <Skeleton height={200} radius={12} />
            <Skeleton height={100} radius={12} />
            <Skeleton height={160} radius={12} />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !data) {
    return (
      <AppShell>
        <div style={{ maxWidth: 900 }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)", padding: 40, textAlign: "center",
          }}>
            <AlertTriangle size={28} color="var(--amber)" />
            <p style={{ color: "var(--text-900)", fontSize: 15, fontWeight: 600, marginTop: 12 }}>
              Market data is temporarily unavailable
            </p>
            <p style={{ color: "var(--text-500)", fontSize: 13, marginTop: 4 }}>
              Please try again shortly.
            </p>
              <button
                onClick={() => void refetch()}
                style={{
                  marginTop: 16, background: "var(--brand)", color: "#fff",
                  border: "none", borderRadius: "var(--r-md)", height: 44,
                  padding: "0 24px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "var(--font)",
                }}
              >
                Retry
              </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-content" style={{ maxWidth: 900 }}>
        {/* Back link */}
        <div style={{ marginBottom: 12 }}>
          <a href="/" style={{
            fontSize: 11, color: "var(--text-300)", background: "none",
            border: "none", cursor: "pointer", textDecoration: "none",
          }}>
            \u2190 Back to Home
          </a>
        </div>

        {/* 1. Company Header */}
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

        {/* 2. Price Chart */}
        <PriceChart
          symbol={symbol}
          height={isMobile ? 180 : 260}
        />

        {/* 3. Score Display */}
        <div style={{ margin: "16px 0" }}>
          <ProPaywallGate isLocked={false} onUnlockClick={() => setShowProModal(true)}>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "20px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-300)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
                Score Overview
              </div>
              <ScoreSemiCircles
                overallScore={health.compositeScore ?? 50}
                riskScore={Math.min(100, Math.max(0, 100 - (health.compositeScore ?? 50)))}
              />
            </div>
          </ProPaywallGate>
        </div>

        {/* 4. Healthometer */}
        <div style={{ margin: "16px 0" }}>
          <Healthometer
            score={health.compositeScore}
            factors={health.factors}
            thesis={null}
            stateLabel={(() => {
              const s = health.compositeScore;
              if (s === null) return null;
              if (s >= 80) return "High Conviction";
              if (s >= 65) return "Healthy";
              if (s >= 50) return "Moderate";
              if (s >= 35) return "Needs Review";
              return "Caution";
            })()}
            details={health.details}
            isPro={false}
            onUpgradeClick={() => setShowProModal(true)}
          />
        </div>

        {/* 4. Key Metrics */}
        <div style={{ margin: "16px 0" }}>
          <MetricsGrid
            fundamentals={data?.fundamentals ?? null}
            price={data?.price ?? null}
            isPro={false}
            onUpgradeClick={() => setShowProModal(true)}
          />
        </div>

        {/* 5. Company Info */}
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

        {/* 6. Financial Performance */}
        <div style={{ margin: "16px 0" }}>
          <ProPaywallGate isLocked={false} onUnlockClick={() => setShowProModal(true)}>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)", padding: 24,
            }}>
              <div style={{
                fontSize: "var(--sz-xs)", fontWeight: 700, color: "var(--text-300)",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16,
              }}>
                Financial Performance
              </div>
              <SafeBlock>
                <FinancialHistogram data={data?.annualFinancials ?? []} height={isMobile ? 200 : 240} />
              </SafeBlock>
            </div>
          </ProPaywallGate>
        </div>

        {/* 7. Financial Charts (Tabs + YoY) */}
        {data?.annualFinancials && data.annualFinancials.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            <FinancialCharts data={data.annualFinancials} />
          </div>
        )}

        {/* 8. Shareholdings */}
        {shareholdersData && shareholdersData.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            <ShareholdingsChart shareholdersData={shareholdersData} />
          </div>
        )}

        {/* 9. News */}
        <div style={{ margin: "16px 0" }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)", padding: 24,
          }}>
            <NewsFeed symbol={symbol} />
          </div>
        </div>

        {/* 8. Data freshness note */}
        <div style={{ fontSize: 10, color: "var(--text-300)", textAlign: "center", padding: "16px 0" }}>
          {dataUpdated ? `Research view prepared ${dataUpdated}` : "Based on latest available market data."}
          <br />
          StockStory is an AI research layer for Indian equities.
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      {isMobile && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:50,
          background:'var(--surface)',
          borderTop:'1px solid var(--border)',
          display:'grid', gridTemplateColumns:'1fr 1fr 1.2fr',
          gap:8, padding:'10px 12px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        }}>
          <button onClick={() => setIsTracked(!isTracked)} style={{
            height:44, borderRadius:8,
            background: isTracked ? 'var(--green-tint)' : 'transparent',
            color: isTracked ? 'var(--green-text)' : 'var(--text-500)',
            border:'1px solid var(--border)',
            fontSize:12, fontWeight:600, cursor:'pointer',
            fontFamily:'var(--font)',
          }}>
            {isTracked ? '\u2665 Tracked' : '\u2661 Track'}
          </button>
          <a href={`/compare?stocks=${symbol}`} style={{
            height:44, borderRadius:8,
            background:'transparent', color:'var(--text-500)',
            border:'1px solid var(--border)', fontSize:12,
            fontWeight:600, display:'flex', alignItems:'center',
            justifyContent:'center', textDecoration:'none',
          }}>
            \u2295 Compare
          </a>
          <button style={{
            height:44, borderRadius:8,
            background:'var(--brand)', color:'var(--text-inverse)',
            border:'none', fontSize:12, fontWeight:700,
            cursor:'pointer', fontFamily:'var(--font)',
          }}>
            Invest \u2192
          </button>
        </div>
      )}

      <ResearchBot symbol={symbol} isPro={false} />

      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        symbol={symbol}
      />
    </AppShell>
  );
}
