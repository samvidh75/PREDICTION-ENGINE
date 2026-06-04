import React, { useState, useEffect } from "react";
import { useCompanyData } from "../hooks/useCompanyData";
import { useCompanyTelemetry } from "../services/telemetry/useCompanyTelemetry";
import { CompanyDNAEngine } from "../services/dna/CompanyDNAEngine";
import { StockRegistry } from "../services/stocks/StockRegistry";
import VOSChart from "../components/charts/VOSChart";
import { getCompanyIntelligence } from "../services/intelligence/clientIntelligenceProvider";
import { ShieldCheck, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { getFirebaseAuthClient } from "../services/auth/firebaseClient";
import { AnalyticsCoordinator } from "../services/diagnostics/AnalyticsCoordinator";

export const CompanySuperpage: React.FC = () => {
  // Extract symbol from URL parameters safely
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const symbol = (params?.get("id") || "").toUpperCase();

  // Fetch raw performance metrics
  const { data, loading, error } = useCompanyData(symbol);

  // Derive presentational snapshots
  const telemetry = useCompanyTelemetry(data);
  const registeredStock = StockRegistry.getStock(symbol);
  const dna = registeredStock ? CompanyDNAEngine.compute(registeredStock) : null;

  const [intel, setIntel] = useState<any>(() => getCompanyIntelligence(symbol));

  // Details states — each section loads independently
  const [financials, setFinancials] = useState<any>(null);
  const [financialsLoading, setFinancialsLoading] = useState<boolean>(true);
  const [ownership, setOwnership] = useState<any>(null);
  const [ownershipLoading, setOwnershipLoading] = useState<boolean>(true);
  const [valuation, setValuation] = useState<any>(null);
  const [valuationLoading, setValuationLoading] = useState<boolean>(true);
  const [risks, setRisks] = useState<any>(null);
  const [risksLoading, setRisksLoading] = useState<boolean>(true);
  const [catalysts, setCatalysts] = useState<any>(null);
  const [catalystsLoading, setCatalystsLoading] = useState<boolean>(true);
  const [timeline, setTimeline] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch(`/api/intelligence/company/${symbol}`)
      .then(res => res.json())
      .then(data => setIntel(data))
      .catch(() => {});
  }, [symbol]);

  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const duration_ms = Date.now() - startTime;
      const uid = getFirebaseAuthClient().auth.currentUser?.uid || null;
      AnalyticsCoordinator.trackEvent("company_page_viewed", JSON.stringify({
        uid,
        symbol,
        duration_ms,
        timestamp: new Date().toISOString()
      }));
    };
  }, [symbol]);

  // Load each section independently — never block page rendering
  useEffect(() => {
    setFinancialsLoading(true);
    fetch(`/api/company/${symbol}/financials`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setFinancials(data || []))
      .catch(() => setFinancials([]))
      .finally(() => setFinancialsLoading(false));
  }, [symbol]);

  useEffect(() => {
    setOwnershipLoading(true);
    fetch(`/api/company/${symbol}/ownership`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setOwnership(data || { categories: [], comment: '' }))
      .catch(() => setOwnership({ categories: [], comment: '' }))
      .finally(() => setOwnershipLoading(false));
  }, [symbol]);

  useEffect(() => {
    setValuationLoading(true);
    fetch(`/api/company/${symbol}/valuation`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setValuation(data || { historicalValuation: '', currentValuation: '', peerComparison: '' }))
      .catch(() => setValuation({ historicalValuation: '', currentValuation: '', peerComparison: '' }))
      .finally(() => setValuationLoading(false));
  }, [symbol]);

  useEffect(() => {
    setRisksLoading(true);
    fetch(`/api/company/${symbol}/risks`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setRisks(Array.isArray(data) ? data : []))
      .catch(() => setRisks([]))
      .finally(() => setRisksLoading(false));
  }, [symbol]);

  useEffect(() => {
    setCatalystsLoading(true);
    fetch(`/api/company/${symbol}/catalysts`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setCatalysts(Array.isArray(data) ? data : []))
      .catch(() => setCatalysts([]))
      .finally(() => setCatalystsLoading(false));
  }, [symbol]);

  useEffect(() => {
    setTimelineLoading(true);
    fetch(`/api/company/${symbol}/timeline`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setTimeline(Array.isArray(data) ? data : []))
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, [symbol]);

  const setPage = (pageKey: string, idVal?: string) => {
    const p = new URLSearchParams(window.location.search);
    p.set("page", pageKey);
    if (idVal) p.set("id", idVal);
    else p.delete("id");
    window.history.pushState({}, "", `?${p.toString()}`);
    window.dispatchEvent(new Event("urlchange"));
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-12 min-h-screen bg-[#020304]">
        <div className="max-w-md w-full text-center space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-mono">LOADING COMPANY BOOKLET...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !telemetry || !dna) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 min-h-screen bg-[#020304] font-mono text-center text-gray-500">
        <span className="text-sm uppercase tracking-widest text-amber-400 mb-2 font-bold">Data temporarily unavailable</span>
        <span className="text-xs text-gray-400">Please verify connection or try again later.</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-12 select-none p-6 md:p-8 bg-[#020304] text-white min-h-screen font-sans animate-[fadeIn_300ms_ease-out]">
      
      {/* SECTION 1: Company Hero */}
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
          <div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
              NSE: {data.symbol} // {intel?.sectorOutlook?.sector || "Data unavailable"}
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white">{data.symbol} Corp.</h1>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[9px] text-gray-500 uppercase block">Current Price</span>
              <span className="text-lg font-bold font-mono text-white">₹{data.fiftyTwoWeekRange.current.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 uppercase block">Daily Change</span>
              <span className="text-lg font-bold font-mono text-gray-500">Unavailable</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-500 uppercase block">Market Cap</span>
              <span className="text-lg font-bold font-mono text-white">₹{data.marketCap.formatted}</span>
            </div>
          </div>
        </div>

        {/* Interactive price chart */}
        <div className="w-full">
          <VOSChart ticker={data.symbol} basePrice={data.fiftyTwoWeekRange.current} />
        </div>
      </section>

      {/* SECTION 2: Executive Summary */}
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Executive Summary
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-gray-300">
          <div>
            <span className="text-white font-bold block mb-1">What happened?</span>
            <p>{intel?.insight?.title || "Data unavailable"}</p>
          </div>
          <div>
            <span className="text-white font-bold block mb-1">Why it matters?</span>
            <p>{intel?.insight?.summary || "Data unavailable"}</p>
          </div>
          <div>
            <span className="text-white font-bold block mb-1">What should investors watch?</span>
            <p>{intel?.companyOutlook?.overallSummary || "Data unavailable"}</p>
          </div>
        </div>
      </section>

      {/* SECTION 3: The Story */}
      <section className="bg-gradient-to-br from-cyan-950/15 via-[#0b0d11]/80 to-[#020304] border border-cyan-500/20 rounded-2xl p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.05)]">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          THE STORY
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Why investors are watching this company
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed">
          <div className="space-y-4 text-gray-300">
            <p>
              {intel?.narrative?.narrative250 || "Data unavailable"}
            </p>
          </div>
          <div className="space-y-3">
            {intel?.insight?.positiveDrivers && intel.insight.positiveDrivers.length > 0 ? (
              intel.insight.positiveDrivers.map((bullet: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs bg-white/[0.02] border border-white/5 p-3 rounded-lg text-gray-200">
                  <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{bullet}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 italic p-3">No positive catalyst data available.</div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: Business Quality */}
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
            Business Quality
          </span>
          <div className="text-5xl font-mono font-bold text-white">
            {dna?.businessQuality.score || "N/A"}%
          </div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-400/10 px-3 py-1 rounded-full">
            {dna?.businessQuality.status || "Data unavailable"}
          </span>
        </div>
        <div className="md:col-span-2 text-xs leading-relaxed text-gray-300 space-y-2">
          <p><strong>Competitive Position:</strong> Data currently unavailable.</p>
          <p><strong>Market Leadership:</strong> Data currently unavailable.</p>
          <p><strong>Industry Structure:</strong> Data currently unavailable.</p>
        </div>
      </section>

      {/* SECTION 5: Financial Quality */}
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-6">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Financial Quality
        </span>
        {financialsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-xl p-4 h-[150px] flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            ))}
          </div>
        ) : !financials || financials.length === 0 ? null : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {financials.map((chart: any) => (
              <div key={chart.label} className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-[150px]">
                <span className="text-[9px] text-gray-500 uppercase font-mono block">{chart.label}</span>
                <div>
                  <span className="text-base font-bold font-mono text-white block">{chart.val}</span>
                  <span className="text-[9px] text-gray-500 block leading-tight mt-1">{chart.desc}</span>
                </div>
                {/* Minimal inline Sparkline */}
                {chart.spark && (
                  <div className="h-6 w-full mt-2">
                    <svg className="w-full h-full" viewBox="0 0 100 30">
                      <path
                        d={`M 0 ${30 - chart.spark[0]} L 30 ${30 - chart.spark[1]} L 60 ${30 - chart.spark[2]} L 100 ${30 - chart.spark[3]}`}
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 6: Ownership Trends — hide if no data */}
      {!ownershipLoading && ownership && ownership.categories && ownership.categories.length > 0 && (
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-6">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Ownership Trends
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="grid grid-cols-2 gap-4">
            {ownership.categories.map((o: any) => (
              <div key={o.category} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                <span className="text-[9px] text-gray-500 uppercase block">{o.category}</span>
                <span className="text-sm font-bold text-white font-mono block mt-1">{o.share}</span>
                <span className={`text-[9px] mt-1 block ${o.change.startsWith("-") ? "text-rose-400" : o.change === "Unchanged" ? "text-gray-400" : "text-emerald-400"}`}>
                  {o.change}
                </span>
              </div>
            ))}
          </div>
          {ownership.comment && (
            <p className="text-xs leading-relaxed text-gray-300">
              <strong>Ownership Shift Commentary:</strong> {ownership.comment}
            </p>
          )}
        </div>
      </section>
      )}

      {/* SECTION 7: Valuation Context — hide if no data */}
      {!valuationLoading && valuation && (valuation.currentValuation || valuation.historicalValuation) && (
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Valuation Context
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-gray-300">
          <div className="space-y-2">
            {valuation.historicalValuation && <p><strong>Historical Valuation:</strong> {valuation.historicalValuation}</p>}
            {valuation.currentValuation && <p><strong>Current Valuation:</strong> {valuation.currentValuation}</p>}
          </div>
          <div className="space-y-2">
            {valuation.peerComparison && <p><strong>Peer Comparison:</strong> {valuation.peerComparison}</p>}
          </div>
        </div>
      </section>
      )}

      {/* SECTION 8: Risks — hide if no risks generated */}
      {!risksLoading && risks && risks.length > 0 && (
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Risks
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {risks.map((r: any, i: number) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-semibold text-white">{r.title}</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* SECTION 9: Catalysts — hide if no catalysts detected */}
      {!catalystsLoading && catalysts && catalysts.length > 0 && (
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Catalysts
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalysts.map((c: any, i: number) => (
            <div key={i} className="flex gap-4 items-start p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs leading-relaxed text-gray-300">
              <span className="text-cyan-400 font-bold font-mono">0{i+1}</span>
              <div>
                <h4 className="font-semibold text-white mb-1">{c.title}</h4>
                <p>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* SECTION 10: Timeline — hide if no events */}
      {!timelineLoading && timeline && timeline.length > 0 && (
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-6">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Corporate Timeline
        </span>
        <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
          {timeline.map((t: any, i: number) => (
            <div key={i} className="relative space-y-1">
              <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white/10" />
              <span className="text-[10px] font-mono text-cyan-400 block">{t.date}</span>
              <h4 className="text-xs font-semibold text-white">{t.event}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{t.detail}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* SECTION 11: Related Companies */}
      <section className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 space-y-4">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
          Related Companies
        </span>
        <div className="flex flex-wrap gap-3">
          <div className="text-xs text-gray-500">Related companies data currently unavailable.</div>
        </div>
      </section>

    </div>
  );
};

export default CompanySuperpage;
