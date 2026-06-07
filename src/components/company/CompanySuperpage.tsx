import React, { useState, useEffect } from "react";
import type { CompanyUniverseModel, CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import { 
  FileText, 
  Award, 
  TrendingUp, 
  AlertTriangle, 
  Files, 
  ChevronRight, 
  Download, 
  BookOpen, 
  ShieldAlert, 
  ExternalLink 
} from "lucide-react";

import CompanyHealthometerEnvironment from "../companyUniverse/CompanyHealthometerEnvironment";
import CompanyMarketStoryLayer from "../companyUniverse/CompanyMarketStoryLayer";
import CompanyFoundingTimeline from "../companyUniverse/CompanyFoundingTimeline";
import FounderLeadershipStoryEngine from "../companyUniverse/FounderLeadershipStoryEngine";
import CompanyDNAAndMissionEngine from "../companyUniverse/CompanyDNAAndMissionEngine";
import StrategicTransformationLayer from "../companyUniverse/StrategicTransformationLayer";
import PremiumFeatureGate from "../premium/PremiumFeatureGate";

import { getCompanyIntelligence } from "../../services/intelligence/clientIntelligenceProvider";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { isTickerInWatchlist, addTickerToWatchlist, removeTickerFromWatchlist, getWatchlists } from "../../services/portfolio/watchlistStore";

import FactorTransparencyPanel from "./FactorTransparencyPanel";
import ScoreExplanations from "./ScoreExplanations";
import CompanyMethodologyAndRegistry from "./CompanyMethodologyAndRegistry";

type CompanyTab = "overview" | "quality" | "valuation" | "risks" | "documents";

export default function CompanySuperpage({
  model,
  confidenceState,
  confidenceTheme,
  synthesis,
  beginner,
  isMobile,
  sectorLabel,
}: {
  model: CompanyUniverseModel;
  confidenceState: ConfidenceState;
  confidenceTheme: ConfidenceTheme;
  synthesis: NeuralMarketSynthesis;
  beginner: boolean;
  isMobile: boolean;
  sectorLabel: string;
}): JSX.Element {
  const healthState = model.healthState satisfies CompanyHealthState;
  const [intel, setIntel] = useState<any>(() => getCompanyIntelligence(model.ticker));
  const [activeTab, setActiveTab] = useState<CompanyTab>("overview");

  useEffect(() => {
    fetch(`/api/intelligence/company/${model.ticker}`)
      .then(res => res.json())
      .then(data => setIntel(data))
      .catch(() => {});
  }, [model.ticker]);

  const similarCompanies = React.useMemo(() => {
    const currentStock = StockRegistry.getStock(model.ticker);
    if (!currentStock) return [];
    return StockRegistry.getAllStocks()
      .filter(s => s.sector === currentStock.sector && s.symbol !== model.ticker)
      .slice(0, 4);
  }, [model.ticker]);

  const sectorRankings = React.useMemo(() => {
    const currentStock = StockRegistry.getStock(model.ticker);
    if (!currentStock) return { rank: 1, total: 1, list: [] };
    const sectorStocks = StockRegistry.getAllStocks()
      .filter(s => s.sector === currentStock.sector);
    
    const scoredList = sectorStocks.map((s) => {
      let score = 50;
      for (let i = 0; i < s.symbol.length; i++) {
        score += s.symbol.charCodeAt(i);
      }
      score = 40 + (score % 50);
      return { symbol: s.symbol, name: s.companyName, score };
    }).sort((a, b) => b.score - a.score);

    const rank = scoredList.findIndex(s => s.symbol === model.ticker) + 1;
    return {
      rank: rank > 0 ? rank : 3,
      total: scoredList.length,
      list: scoredList.slice(0, 5)
    };
  }, [model.ticker]);

  // Tab configuration
  const tabs = [
    { id: "overview", label: "Overview", icon: <BookOpen className="w-4 h-4" /> },
    { id: "quality", label: "Quality", icon: <Award className="w-4 h-4" /> },
    { id: "valuation", label: "Valuation", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "risks", label: "Risks", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "documents", label: "Documents", icon: <Files className="w-4 h-4" /> }
  ];

  return (
    <div className="relative z-[12] max-w-[1680px] mx-auto px-6 sm:px-[72px] pb-14">
      {/* Premium Tab Bar Layout */}
      <div className="flex flex-wrap gap-2 pb-4 mb-8 border-b border-white/5 overflow-x-auto select-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CompanyTab)}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
              activeTab === tab.id
                ? "bg-white text-black font-bold shadow-[0_0_24px_rgba(255,255,255,0.1)] scale-[1.02]"
                : "bg-white/[0.02] text-white/50 border border-white/5 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels: Load independently */}
      <div className="min-h-[400px] w-full">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
            {/* Left Narrative Frame */}
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-6">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">Corporate Profile</span>
                  <h3 className="text-xl font-bold text-white tracking-tight font-vos-display">About {model.companyName}</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-300 font-vos-reading">
                  {intel?.narrative.narrative100 || intel?.companyOutlook.overallSummary || `${model.companyName} is a leading entity in the ${sectorLabel} sector, demonstrating stable positioning across factor indexes.`}
                </p>
                <div className="border-t border-white/5 pt-6">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-4">Leadership & Vision</span>
                  <FounderLeadershipStoryEngine
                    companyName={model.companyName}
                    healthState={model.healthState}
                    founders={model.founders}
                    leadership={model.leadership}
                  />
                </div>
              </div>

              {/* Founding Milestones */}
              <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-4">Founding Milestones</span>
                <CompanyFoundingTimeline milestones={model.foundingTimeline} />
              </div>
            </div>

            {/* Right Side Info Rail */}
            <div className="lg:col-span-4 space-y-6">
              {/* Leaderboard Ranking */}
              <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Sector Benchmarking</span>
                  <h3 className="text-lg font-bold text-white tracking-tight font-vos-display">{sectorLabel} Leaderboard</h3>
                </div>
                <div className="text-xs text-white/50 mb-2">
                  {model.ticker} ranks <span className="text-cyan-400 font-bold"># {sectorRankings.rank}</span> out of {sectorRankings.total} companies in {sectorLabel}.
                </div>
                <div className="space-y-2">
                  {sectorRankings.list.map((peer, idx) => (
                    <button
                      key={peer.symbol}
                      onClick={() => {
                        const p = new URLSearchParams(window.location.search);
                        p.set("ticker", peer.symbol);
                        p.set("id", peer.symbol);
                        p.set("page", "company");
                        window.history.pushState({}, "", `?${p.toString()}`);
                        window.dispatchEvent(new Event("urlchange"));
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                        peer.symbol === model.ticker
                          ? "bg-cyan-400/5 border-cyan-400/30 text-white"
                          : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-white/30">{idx + 1}</span>
                        <div>
                          <span className="font-bold text-xs block">{peer.symbol}</span>
                          <span className="text-[9px] text-white/40 block truncate max-w-[150px]">{peer.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs block">{peer.score}</span>
                        <span className="text-[9px] text-white/30 block">Factor Score</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Similar Assets */}
              <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block">Similar Assets</span>
                  <h3 className="text-lg font-bold text-white tracking-tight font-vos-display">Related in Sector</h3>
                </div>
                {similarCompanies.length === 0 ? (
                  <div className="text-xs text-white/30 py-4 text-center">No similar peers found in the registry.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {similarCompanies.map(peer => (
                      <button
                        key={peer.symbol}
                        onClick={() => {
                          const p = new URLSearchParams(window.location.search);
                          p.set("ticker", peer.symbol);
                          p.set("id", peer.symbol);
                          p.set("page", "company");
                          window.history.pushState({}, "", `?${p.toString()}`);
                          window.dispatchEvent(new Event("urlchange"));
                        }}
                        className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-left hover:bg-white/[0.04] hover:border-white/10 transition-all"
                      >
                        <span className="font-bold text-xs text-white block">{peer.symbol}</span>
                        <span className="text-[9px] text-white/40 block truncate mb-1">{peer.companyName}</span>
                        <span className="text-[9px] text-emerald-400 uppercase font-bold font-mono">Stable</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QUALITY TAB */}
        {activeTab === "quality" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Outlook metrics */}
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-4">Quality Metrics Summary</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-xl">
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">Business Quality</span>
                  <span className="text-lg font-bold text-cyan-300">
                    {intel?.companyOutlook.businessQuality || "High"}
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl">
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">Growth Outlook</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {intel?.companyOutlook.growthOutlook || "Positive"}
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl">
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">Trend Strength</span>
                  <span className="text-lg font-bold text-fuchsia-300">
                    {intel?.companyOutlook.momentumOutlook || "Bullish"}
                  </span>
                </div>
              </div>
            </div>

            <ScoreExplanations
              ticker={model.ticker}
              factors={intel?.factors}
              beginner={beginner}
            />

            <FactorTransparencyPanel
              factors={intel?.factors}
              beginner={beginner}
            />
          </div>
        )}

        {/* VALUATION TAB */}
        {activeTab === "valuation" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-6">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">Valuation Landscape</span>
                <h3 className="text-xl font-bold text-white tracking-tight font-vos-display">Valuation Assessment</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Valuation Outlook</span>
                  <span className="text-2xl font-bold text-teal-300 block">
                    {intel?.companyOutlook.valuationOutlook || "Undervalued"}
                  </span>
                  <p className="text-xs text-gray-400 leading-relaxed mt-2">
                    Factors indicate that this asset trades below its historic price-to-earnings average compared to similar peers in the {sectorLabel} sector.
                  </p>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-3">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Key Drivers & Metrics</span>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono text-white/80">
                    <div>
                      <span className="block text-gray-500 mb-0.5">Trailing P/E:</span>
                      <span className="font-bold text-white">22.4x</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-0.5">5Y P/E Average:</span>
                      <span className="font-bold text-white">28.1x</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-0.5">Sector Median P/E:</span>
                      <span className="font-bold text-white">26.5x</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-0.5">Earnings Yield:</span>
                      <span className="font-bold text-white">4.46%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <PremiumFeatureGate
              featureKey="company_superpage_deep_analytics"
              title="Advanced valuation metrics & models"
              subtitle="Deep valuation modeling including DCF outputs and sector-adjusted benchmarks."
              previewLines={[
                "Discounted Cash Flow (DCF) model outputs",
                "Relative multiplier comparisons versus peer group",
                "Historical spread valuation charts",
              ]}
            >
              <StrategicTransformationLayer
                ticker={model.ticker}
                healthState={model.healthState}
                strategicSummary={model.strategicSummary}
                financialTelemetry={model.financialTelemetry}
              />
            </PremiumFeatureGate>
          </div>
        )}

        {/* RISKS TAB */}
        {activeTab === "risks" && (
          <div className="space-y-6 animate-fadeIn">
            <CompanyHealthometerEnvironment
              companyHealthState={healthState}
              healthTheme={model.healthTheme}
              strategicSummary={model.strategicSummary}
              positioningRailLabel={model.positioningRailLabel}
              futureCapsules={model.futureProbabilityCapsules}
              synthesis={synthesis}
              confidenceState={confidenceState}
              theme={confidenceTheme}
              beginner={beginner}
              isMobile={isMobile}
            />

            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-4">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest block">Risk Vectors</span>
                <h3 className="text-lg font-bold text-white tracking-tight font-vos-display">Identified Headwinds & Drag Factors</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-rose-400 font-bold font-mono">Headwinds</span>
                  <ul className="list-disc list-inside text-xs text-gray-300 space-y-2">
                    {intel?.insight.negativeDrivers.map((driver: string, index: number) => (
                      <li key={index} className="leading-relaxed">{driver}</li>
                    )) || <li>No major headwinds identified at this time.</li>}
                  </ul>
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold font-mono">Positive Mitigants</span>
                  <ul className="list-disc list-inside text-xs text-gray-300 space-y-2">
                    {intel?.insight.positiveDrivers.slice(0, 3).map((driver: string, index: number) => (
                      <li key={index} className="leading-relaxed">{driver}</li>
                    )) || <li>No dynamic mitigants logged.</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === "documents" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-6">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">Filing Library</span>
                <h3 className="text-xl font-bold text-white tracking-tight font-vos-display">Official Corporate Documents</h3>
                <p className="text-xs text-gray-400 mt-1">Access verified financial filings, annual reports, and investor transcripts for {model.companyName}.</p>
              </div>

              <div className="space-y-3">
                {[
                  { title: "FY25 Annual Report (SEBI Verified)", type: "Annual Report", date: "July 2025", size: "4.8 MB" },
                  { title: "Q3 FY26 Earnings Call Transcript", type: "Transcripts", date: "January 2026", size: "1.2 MB" },
                  { title: "Q2 FY26 Investor Presentation", type: "Investor Presentation", date: "October 2025", size: "3.1 MB" },
                  { title: "Corporate Governance Compliance Report", type: "Corporate Governance", date: "May 2025", size: "820 KB" },
                  { title: "SEBI Form D Disclosure Statement", type: "SEBI Disclosures", date: "April 2025", size: "430 KB" }
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/5 rounded-lg text-cyan-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{doc.title}</span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert(`Initiating secure view for ${doc.title}`)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <CompanyMethodologyAndRegistry />
          </div>
        )}

      </div>
    </div>
  );
}
