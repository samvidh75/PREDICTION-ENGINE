import { useEffect, useMemo, useState, Fragment } from "react";
import { useStockData } from "../hooks/useStockData";

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
import { Healthometer } from "../components/stock/Healthometer";
import { PriceChart } from "../components/stock/PriceChart";
import { CompanyHeader } from "../components/stock/CompanyHeader";
import { MetricsGrid, formatMarketCap } from "../components/stock/MetricsGrid";
import { ProUpgradeModal } from "../components/stock/ProUpgradeModal";
import { CompanyInfo } from "../components/stock/CompanyInfo";
import { FinancialCharts } from "../components/stock/FinancialCharts";
import { fMarketCap, fPercent } from "../lib/format";

export default function StockResearchPage({ symbol }: { symbol: string }) {
  const isMobile = useIsMobile();
  const { data, loading, error } = useStockData(symbol);
  const [showProModal, setShowProModal] = useState(false);
  const [isTracked, setIsTracked] = useState(false);

  const healthScore = useMemo(() => {
    if (data?.health?.score != null) return data.health.score;
    return null;
  }, [data]);

  const factors = useMemo(() => {
    if (!data) return null;
    const f = data.fundamentals;
    return {
      quality: f.roe ? Math.min(Math.round((f.roe / 50) * 100), 95) : 50,
      valuation: f.peRatio ? Math.min(Math.round(Math.max(0, 100 - ((f.peRatio - 10) / 40) * 100)), 95) : 50,
      growth: f.revenueGrowth ? Math.min(Math.round(f.revenueGrowth * 3), 95) : 50,
      riskStability: f.debtToEquity != null ? Math.min(Math.round(Math.max(0, 100 - f.debtToEquity * 20)), 95) : 50,
      momentum: 50,
    };
  }, [data]);

  const quoteData = useMemo(() => {
    if (!data?.price) return null;
    return {
      price: data.price.current ?? 0,
      change: data.price.change ?? 0,
      changePercent: data.price.changeAbs ?? 0,
      timestamp: new Date().toISOString(),
      high52w: data.price.weekHigh52,
      low52w: data.price.weekLow52,
      open: data.price.open,
    };
  }, [data]);

  const snapshotData = useMemo(() => {
    if (!data) return null;
    return {
      companyName: data.price.companyName || symbol,
      sector: data.price.sector || undefined,
      marketCap: data.price.marketCap,
      peRatio: data.fundamentals.peRatio,
      roe: data.fundamentals.roe,
      revenueGrowth: data.fundamentals.revenueGrowth,
      rsi: null as number | null,
      pbRatio: data.fundamentals.pbRatio,
      evEbitda: null as number | null,
      roic: data.fundamentals.roce,
      debtEquity: data.fundamentals.debtToEquity,
      operatingMargin: null as number | null,
      profitGrowth: data.fundamentals.profitGrowth,
      dividendYield: data.fundamentals.dividendYield,
      macd: null as number | null,
      macdSignal: null as number | null,
      score: healthScore,
    };
  }, [data, symbol, healthScore]);

  const stateLabel = useMemo(() => {
    if (healthScore == null) return null;
    if (healthScore >= 80) return 'High Conviction';
    if (healthScore >= 65) return 'Healthy';
    if (healthScore >= 50) return 'Moderate';
    if (healthScore >= 35) return 'Watch';
    return 'Needs Review';
  }, [healthScore]);

  const thesis = data?.health?.classification
    ? `${symbol} scores ${healthScore}/100 — ${data.health.classification}. Based on analysis across quality, valuation, growth, risk, and momentum dimensions.`
    : null;

  if (loading && !data) {
    return (
      <div>
        <div className="skeleton" style={{ height:48, borderRadius:'var(--r-md)', marginBottom:16 }} />
        <div className="skeleton" style={{ height:300, borderRadius:'var(--r-lg)', marginBottom:16 }} />
        <div className="skeleton" style={{ height:200, borderRadius:'var(--r-lg)', marginBottom:16 }} />
        <div className="skeleton" style={{ height:240, borderRadius:'var(--r-lg)' }} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ textAlign:'center', padding:'60px 20px' }}>
        <span style={{ fontSize:32, display:'block', marginBottom:12 }}>📡</span>
        <div style={{ fontSize:'var(--sz-lg)', fontWeight:700, color:'var(--text-900)', marginBottom:8 }}>
          Market data temporarily unavailable
        </div>
        <div style={{ fontSize:'var(--sz-sm)', color:'var(--text-500)', marginBottom:20 }}>
          Please try again shortly.
        </div>
        <button onClick={() => window.location.reload()} style={{
          height:40, padding:'0 20px', borderRadius:'var(--r-md)',
          background:'var(--brand)', color:'var(--text-inverse)',
          border:'none', fontSize:'var(--sz-sm)', fontWeight:600, cursor:'pointer',
        }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-content">
        <CompanyHeader symbol={symbol} quote={quoteData} snapshot={snapshotData} />
        <PriceChart symbol={symbol} />
        <Healthometer
          score={healthScore}
          factors={factors}
          thesis={thesis}
          stateLabel={stateLabel}
          isPro={false}
          onUpgradeClick={() => setShowProModal(true)}
        />
        <MetricsGrid
          snapshot={snapshotData}
          quote={quoteData}
          isPro={false}
          onUpgradeClick={() => setShowProModal(true)}
        />

        <CompanyInfo symbol={symbol} snapshot={{ companyName: data?.price.companyName }} />

        <FinancialCharts data={data?.annualFinancials} />

        {/* Footer */}
        <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', textAlign:'center', padding:'16px 0 32px' }}>
          {data?.fetchedAt ? `Research view prepared ${new Date(data.fetchedAt).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric' })}` : 'Based on latest available market data.'}
          <br />
          StockStory is an AI research layer for Indian equities.
        </div>

        <ProUpgradeModal isOpen={showProModal} onClose={() => setShowProModal(false)} symbol={symbol} />
      </div>

      {isMobile && (
        <div className="sticky-bottom-bar" style={{
          position:'fixed', bottom:60, left:0, right:0, zIndex:80,
          background:'rgba(248,248,246,0.96)',
          backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
          borderTop:'1px solid var(--border)',
          display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr',
          gap:8, padding:'10px 16px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        }}>
          <button onClick={() => setIsTracked(!isTracked)} style={{
            height:44, borderRadius:'var(--r-md)',
            background:'var(--surface)', color:'var(--text-500)',
            border:'1px solid var(--border)',
            fontSize:'var(--sz-sm)', fontWeight:600, cursor:'pointer',
            fontFamily:'var(--font)',
          }}>
            {isTracked ? '♥ Tracked' : '♡ Track'}
          </button>
          <a href={`/compare?stocks=${symbol}`} style={{
            height:44, borderRadius:'var(--r-md)',
            background:'var(--surface)', color:'var(--text-500)',
            border:'1px solid var(--border)',
            fontSize:'var(--sz-sm)', fontWeight:600, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            textDecoration:'none',
          }}>
            ⊕ Compare
          </a>
          <button onClick={() => {}} style={{
            height:44, borderRadius:'var(--r-md)',
            background:'var(--brand)', color:'var(--text-inverse)',
            border:'none',
            fontSize:'var(--sz-sm)', fontWeight:700, cursor:'pointer',
            fontFamily:'var(--font)',
          }}>
            Invest →
          </button>
        </div>
      )}
    </>
  );
}
