import React, { useState, useEffect } from 'react';
import { useCompanyData } from '../hooks/useCompanyData';
import { useCompanyTelemetry } from '../services/telemetry/useCompanyTelemetry';
import { CompanyDNAEngine } from '../services/dna/CompanyDNAEngine';
import { StockRegistry } from '../services/stocks/StockRegistry';
import VOSChart from '../components/charts/VOSChart';
import { getCompanyIntelligence } from '../services/intelligence/clientIntelligenceProvider';
import { ShieldCheck, AlertTriangle, ChevronRight, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getFirebaseAuthClient } from '../services/auth/firebaseClient';
import { AnalyticsCoordinator } from '../services/diagnostics/AnalyticsCoordinator';

type Tab = 'overview' | 'financials' | 'valuation' | 'ownership' | 'risks';

export const CompanySuperpage: React.FC = () => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const symbol = (params?.get('id') || '').toUpperCase();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data, loading, error } = useCompanyData(symbol);
  const telemetry = useCompanyTelemetry(data);
  const registeredStock = StockRegistry.getStock(symbol);
  const dna = registeredStock ? CompanyDNAEngine.compute(registeredStock) : null;

  const [intel, setIntel] = useState<any>(() => getCompanyIntelligence(symbol));

  // Detail states — each loads independently
  const [financials, setFinancials] = useState<any>(null);
  const [financialsLoading, setFinancialsLoading] = useState(true);
  const [ownership, setOwnership] = useState<any>(null);
  const [ownershipLoading, setOwnershipLoading] = useState(true);
  const [valuation, setValuation] = useState<any>(null);
  const [valuationLoading, setValuationLoading] = useState(true);
  const [risks, setRisks] = useState<any>(null);
  const [risksLoading, setRisksLoading] = useState(true);
  const [catalysts, setCatalysts] = useState<any>(null);
  const [catalystsLoading, setCatalystsLoading] = useState(true);
  const [timeline, setTimeline] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/intelligence/company/${symbol}`)
      .then(res => res.json()).then(setIntel).catch(() => {});
  }, [symbol]);

  useEffect(() => {
    const start = Date.now();
    return () => {
      const uid = getFirebaseAuthClient().auth.currentUser?.uid || null;
      AnalyticsCoordinator.trackEvent('company_page_viewed', JSON.stringify({
        uid, symbol, duration_ms: Date.now() - start, timestamp: new Date().toISOString()
      }));
    };
  }, [symbol]);

  // Load independently
  useEffect(() => { setFinancialsLoading(true); fetch(`/api/company/${symbol}/financials`).then(r => r.ok ? r.json() : []).then(d => setFinancials(d || [])).catch(() => setFinancials([])).finally(() => setFinancialsLoading(false)); }, [symbol]);
  useEffect(() => { setOwnershipLoading(true); fetch(`/api/company/${symbol}/ownership`).then(r => r.ok ? r.json() : { categories: [], comment: '' }).then(d => setOwnership(d)).catch(() => setOwnership({ categories: [], comment: '' })).finally(() => setOwnershipLoading(false)); }, [symbol]);
  useEffect(() => { setValuationLoading(true); fetch(`/api/company/${symbol}/valuation`).then(r => r.ok ? r.json() : { historicalValuation: '', currentValuation: '', peerComparison: '' }).then(d => setValuation(d)).catch(() => setValuation({ historicalValuation: '', currentValuation: '', peerComparison: '' })).finally(() => setValuationLoading(false)); }, [symbol]);
  useEffect(() => { setRisksLoading(true); fetch(`/api/company/${symbol}/risks`).then(r => r.ok ? r.json() : []).then(d => setRisks(d || [])).catch(() => setRisks([])).finally(() => setRisksLoading(false)); }, [symbol]);
  useEffect(() => { setCatalystsLoading(true); fetch(`/api/company/${symbol}/catalysts`).then(r => r.ok ? r.json() : []).then(d => setCatalysts(d || [])).catch(() => setCatalysts([])).finally(() => setCatalystsLoading(false)); }, [symbol]);
  useEffect(() => { setTimelineLoading(true); fetch(`/api/company/${symbol}/timeline`).then(r => r.ok ? r.json() : []).then(d => setTimeline(d || [])).catch(() => setTimeline([])).finally(() => setTimelineLoading(false)); }, [symbol]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-screen bg-[#020304]">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error || !data || !dna) {
    return (
      <div className="w-full flex items-center justify-center min-h-screen bg-[#020304] text-white/50 text-sm">
        Company data temporarily unavailable.
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'financials', label: 'Financials' },
    { key: 'valuation', label: 'Valuation' },
    { key: 'ownership', label: 'Ownership' },
    { key: 'risks', label: 'Risks' },
  ];

  return (
    <div className="w-full flex flex-col bg-[#020304] text-white min-h-screen font-sans antialiased max-w-5xl mx-auto">
      {/* HERO */}
      <section className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
          <div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
              {intel?.sectorOutlook?.sector || 'NSE'} · {data.symbol}
            </span>
            <h1 className="text-[32px] font-bold tracking-tight text-white">{data.symbol}</h1>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Price</span>
              <span className="text-lg font-bold font-mono text-white">₹{data.fiftyTwoWeekRange?.current?.toLocaleString('en-IN') || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Market Cap</span>
              <span className="text-lg font-bold font-mono text-white">{data.marketCap?.formatted || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Quality Score</span>
              <span className="text-lg font-bold font-mono text-cyan-400">{dna?.businessQuality?.score || '—'}%</span>
            </div>
          </div>
        </div>

        <VOSChart ticker={data.symbol} basePrice={data.fiftyTwoWeekRange?.current ?? undefined} />
      </section>

      {/* EXECUTIVE SUMMARY */}
      <section className="px-6 md:px-8 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">What happened</span>
            <p className="text-sm text-white/80 leading-relaxed">{intel?.insight?.title || '—'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Why it matters</span>
            <p className="text-sm text-white/80 leading-relaxed">{intel?.insight?.summary || '—'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider">What to watch</span>
            <p className="text-sm text-white/80 leading-relaxed">{intel?.companyOutlook?.overallSummary || '—'}</p>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="px-6 md:px-8 border-b border-white/5 flex gap-6 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 bg-transparent cursor-pointer whitespace-nowrap ${
              activeTab === t.key ? 'text-white border-cyan-400' : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <div className="px-6 md:px-8 py-8 space-y-8">
          <div className="text-sm text-white/70 leading-relaxed max-w-2xl">
            {intel?.narrative?.narrative250 || 'Company narrative loading...'}
          </div>

          {/* Drivers */}
          {intel?.insight?.positiveDrivers?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Positive Drivers</h3>
              <div className="space-y-2">
                {intel.insight.positiveDrivers.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-emerald-400/80">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline preview */}
          {!timelineLoading && timeline?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase text-white/40 font-bold tracking-wider">Recent Events</h3>
              <div className="space-y-3 border-l border-white/10 pl-4 ml-2">
                {timeline.slice(0, 4).map((t: any, i: number) => (
                  <div key={i}>
                    <span className="text-[10px] font-mono text-cyan-400">{t.date}</span>
                    <p className="text-xs text-white/60">{t.event}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Financials */}
      {activeTab === 'financials' && (
        <div className="px-6 md:px-8 py-8">
          {financialsLoading ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          ) : !financials || financials.length === 0 ? (
            <p className="text-sm text-white/40">Financial data not available for this company.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {financials.map((f: any, i: number) => (
                <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <span className="text-[10px] uppercase text-white/40 block mb-1">{f.periodEnd || `Q${i+1}`}</span>
                  <span className="text-sm font-mono font-bold text-white block">{f.val || f.peRatio || f.eps || '—'}</span>
                  {f.desc && <span className="text-[10px] text-white/40 mt-1 block">{f.desc}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Valuation */}
      {activeTab === 'valuation' && (
        <div className="px-6 md:px-8 py-8">
          {valuationLoading ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          ) : !valuation || (!valuation.currentValuation && !valuation.historicalValuation) ? (
            <p className="text-sm text-white/40">Valuation data not available.</p>
          ) : (
            <div className="space-y-4 max-w-xl">
              {valuation.currentValuation && <p className="text-sm text-white/80">{valuation.currentValuation}</p>}
              {valuation.historicalValuation && <p className="text-sm text-white/60">{valuation.historicalValuation}</p>}
              {valuation.peerComparison && <p className="text-sm text-white/60">{valuation.peerComparison}</p>}
            </div>
          )}
        </div>
      )}

      {/* TAB: Ownership */}
      {activeTab === 'ownership' && (
        <div className="px-6 md:px-8 py-8">
          {ownershipLoading ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          ) : ownership?.categories?.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ownership.categories.map((o: any) => (
                  <div key={o.category} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-[10px] text-white/40 uppercase block">{o.category}</span>
                    <span className="text-sm font-bold text-white block mt-1">{o.share}</span>
                    <span className={`text-[10px] mt-1 block ${o.change?.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {o.change}
                    </span>
                  </div>
                ))}
              </div>
              {ownership.comment && <p className="text-xs text-white/50">{ownership.comment}</p>}
            </div>
          ) : (
            <p className="text-sm text-white/40">Ownership breakdown not available.</p>
          )}
        </div>
      )}

      {/* TAB: Risks */}
      {activeTab === 'risks' && (
        <div className="px-6 md:px-8 py-8">
          {risksLoading ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          ) : risks?.length > 0 ? (
            <div className="space-y-4">
              {risks.map((r: any, i: number) => (
                <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-semibold text-white">{r.title}</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No significant risks detected from current data.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanySuperpage;
