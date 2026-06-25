import { useMemo, useState } from "react";
import { useStockData } from "../hooks/useStockData";
import { Healthometer } from "../components/stock/Healthometer";
import { PriceChart } from "../components/stock/PriceChart";
import { CompanyHeader } from "../components/stock/CompanyHeader";
import { MetricsGrid, formatMarketCap } from "../components/stock/MetricsGrid";
import { ProUpgradeModal } from "../components/stock/ProUpgradeModal";
import { fMarketCap, fPercent } from "../lib/format";

export default function StockResearchPage({ symbol }: { symbol: string }) {
  const { data, loading, error } = useStockData(symbol);
  const [showProModal, setShowProModal] = useState(false);

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

      {/* Company Info */}
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:'var(--r-lg)', padding:'24px',
        margin:'12px 0',
      }}>
        <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>
          About {data?.price.companyName || symbol}
        </div>

        {data?.price.description ? (
          <p style={{ fontSize:'var(--sz-base)', color:'var(--text-500)', lineHeight:1.7, margin:0 }}>
            {data.price.description}
          </p>
        ) : data?.price.sector && data?.price.sector.toLowerCase().includes('it') ? (
          <p style={{ fontSize:'var(--sz-base)', color:'var(--text-500)', lineHeight:1.7, margin:0 }}>
            {data?.price.companyName || symbol} is an IT services company providing software development, consulting, and business process outsourcing to global clients.
          </p>
        ) : (
          <p style={{ fontSize:'var(--sz-base)', color:'var(--text-500)', lineHeight:1.7, margin:0 }}>
            {data?.price.companyName || symbol} operates in the Indian market with a diversified business model and established market presence.
          </p>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
          {[
            { label:'Sector', value: data?.price.sector ?? '—' },
            { label:'Industry', value: data?.price.industry ?? data?.price.sector ?? '—' },
            { label:'Exchange', value: data?.price.exchange ?? 'NSE' },
            { label:'Market Cap', value: data?.price.marketCap ? formatMarketCap(data.price.marketCap) : '—' },
          ].map(fact => (
            <div key={fact.label}>
              <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', marginBottom:2 }}>{fact.label}</div>
              <div style={{ fontSize:'var(--sz-sm)', fontWeight:600, color:'var(--text-900)' }}>{fact.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Performance */}
      <FinancialSection symbol={symbol} data={data} />

      {/* News */}
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:'var(--r-lg)', padding:'24px',
        margin:'12px 0',
      }}>
        <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>
          News & Updates
        </div>
        <div style={{ fontSize:'var(--sz-sm)', color:'var(--text-300)', textAlign:'center', padding:'20px 0' }}>
          News feed loading...
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize:'var(--sz-xs)', color:'var(--text-300)', textAlign:'center', padding:'16px 0 32px' }}>
        {data?.fetchedAt ? `Research view prepared ${new Date(data.fetchedAt).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric' })}` : 'Based on latest available market data.'}
        <br />
        StockStory is an AI research layer for Indian equities.
      </div>

      <ProUpgradeModal isOpen={showProModal} onClose={() => setShowProModal(false)} symbol={symbol} />
    </div>
  );
}

function FinancialSection({ symbol, data }: { symbol: string; data: any }) {
  const financials = data?.annualFinancials ?? [];
  const hasData = financials.length > 0;

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--r-lg)', padding:'24px',
      margin:'12px 0',
    }}>
      <div style={{ fontSize:'var(--sz-xs)', fontWeight:700, color:'var(--text-300)',
        textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>
        Financial Performance
      </div>

      {!hasData ? (
        <div style={{ fontSize:'var(--sz-sm)', color:'var(--text-300)', textAlign:'center', padding:'24px 0' }}>
          Annual financial history is being compiled.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {['revenue', 'pat', 'operatingProfit'].filter(k => financials.some((e: any) => e[k] != null && e[k] > 0)).map(k => (
            <div key={k}>
              <div style={{ fontSize:'var(--sz-sm)', fontWeight:600, color:'var(--text-900)', marginBottom:10, textTransform:'capitalize' }}>
                {k === 'operatingProfit' ? 'Operating Profit' : k === 'pat' ? 'Net Profit' : 'Revenue'}
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:120 }}>
                {financials.map((entry: any, i: number) => {
                  const val = entry[k];
                  if (val == null || val <= 0) return null;
                  const maxVal = Math.max(...financials.filter((e: any) => e[k] != null).map((e: any) => e[k]));
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  const fyYear = entry.fiscalYear || '';
                  const isCurrentFY = fyYear === 'FY2026' || fyYear.includes('2026');
                  return (
                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <div style={{
                        width:'100%', maxWidth:48, height:`${Math.max(pct, 5)}%`,
                        background: isCurrentFY ? 'var(--amber)' : 'var(--brand)',
                        borderRadius:'var(--r-sm) var(--r-sm) 0 0',
                        minHeight:8,
                        position:'relative',
                        transition:'height 600ms cubic-bezier(0.16,1,0.3,1)',
                      }}>
                        {isCurrentFY && (
                          <span style={{
                            position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)',
                            fontSize:9, fontWeight:700, color:'var(--amber)',
                            whiteSpace:'nowrap',
                          }}>
                            (TTM)
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize:9, color:'var(--text-300)', fontWeight:600 }}>{fyYear.replace('FY', '')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
