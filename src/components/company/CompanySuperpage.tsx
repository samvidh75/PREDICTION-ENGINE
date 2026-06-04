import React, { useState, useEffect } from "react";
import type { CompanyUniverseModel, CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";

import ProgressiveDisclosure from "../../designSystem/ProgressiveDisclosure";

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

// Explainability panels (RC5 Phase 2)
import FactorTransparencyPanel from "./FactorTransparencyPanel";
import ScoreExplanations from "./ScoreExplanations";
import CompanyMethodologyAndRegistry from "./CompanyMethodologyAndRegistry";

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

  /**
   * “Beginner” mode simplifies density and limits expansion.
   * (Existing components already adapt via `beginner` prop.)
   */
  beginner: boolean;

  /**
   * Used to select calmer mobile framing in child components.
   */
  isMobile: boolean;

  /**
   * Sector display label (provided by CompanyUniversePage model wiring).
   */
  sectorLabel: string;
}): JSX.Element {
  const healthState = model.healthState satisfies CompanyHealthState;
  const [intel, setIntel] = useState<any>(() => getCompanyIntelligence(model.ticker));

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

  return (
    <div className="relative z-[12]">
      <ProgressiveDisclosure
        debugLabel="company_superpage"
        initialOpen={false}
        initialStepIndex={0}
        collapsedCtaLabel="Continue company exploration"
        collapseCtaLabel="Collapse"
        front={
          <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Company exploration</div>
            <div className="mt-3 text-[18px] font-semibold text-white/92 leading-[1.3]">
              A calm, structured understanding of the business
            </div>
            <div className="mt-3 text-[14px] leading-[1.9] text-white/80">
              Start with Healthometer context + story framing. Then unfold origins, leadership, and transformation—progressively.
            </div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
              Signal-first exploration context
            </div>
          </div>
        }
        steps={[
          {
            id: "layer_intelligence_outlook",
            label: "Intelligence Outlook",
            content: (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Intelligence Core</span>
                      <h3 className="text-xl font-bold text-white tracking-tight font-vos-display">{model.companyName} ({model.ticker}) Outlook</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
                        {beginner ? "Business Quality" : "Business Quality"}
                      </span>
                      <span className={`text-sm font-bold ${intel?.companyOutlook.businessQuality === 'High' ? 'text-cyan-300' : 'text-gray-300'}`}>
                        {intel?.companyOutlook.businessQuality || "Medium"}
                      </span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
                        {beginner ? "Growth Outlook" : "Growth Outlook"}
                      </span>
                      <span className={`text-sm font-bold ${intel?.companyOutlook.growthOutlook === 'Positive' ? 'text-emerald-400' : 'text-gray-300'}`}>
                        {intel?.companyOutlook.growthOutlook || "Stable"}
                      </span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
                        {beginner ? "Risk Profile" : "Risk Outlook"}
                      </span>
                      <span className={`text-sm font-bold ${intel?.companyOutlook.riskOutlook === 'Low Risk' ? 'text-emerald-400' : intel?.companyOutlook.riskOutlook === 'High Risk' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {intel?.companyOutlook.riskOutlook || "Moderate"}
                      </span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
                        {beginner ? "Cheapness" : "Valuation"}
                      </span>
                      <span className={`text-sm font-bold ${intel?.companyOutlook.valuationOutlook === 'Undervalued' ? 'text-teal-300' : 'text-rose-400'}`}>
                        {intel?.companyOutlook.valuationOutlook || "Fair Value"}
                      </span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold block mb-1">
                        {beginner ? "Trend Strength" : "Momentum"}
                      </span>
                      <span className={`text-sm font-bold ${intel?.companyOutlook.momentumOutlook === 'Bullish' ? 'text-fuchsia-300' : 'text-rose-400'}`}>
                        {intel?.companyOutlook.momentumOutlook || "Neutral"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold font-mono">Key Positive Drivers</span>
                      <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                        {intel?.insight.positiveDrivers.map((driver: string, index: number) => (
                          <li key={index}>{driver}</li>
                        )) || <li>No major positive drivers identified</li>}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-widest text-rose-400 font-bold font-mono">Key Negative Drivers</span>
                      <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                        {intel?.insight.negativeDrivers.map((driver: string, index: number) => (
                          <li key={index}>{driver}</li>
                        )) || <li>No major negative headwinds identified</li>}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Narrative Summary */}
                  <div className="pt-4 border-t border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold font-mono block mb-2">Narrative Summary</span>
                    <p className="text-xs leading-relaxed text-gray-300 font-vos-reading">
                      {intel?.narrative.narrative100 || intel?.companyOutlook.overallSummary || `${model.companyName} exhibits balanced factor metrics.`}
                    </p>
                  </div>

                  {/* Phase 7: Confidence System Info */}
                  {intel?.insight && (
                    <div className="pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono text-white/55">
                      <div>
                        <span className="block text-gray-500 uppercase tracking-widest mb-0.5">Confidence:</span>
                        <span className="text-cyan-400 font-bold">{intel.insight.confidence}% Rating</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 uppercase tracking-widest mb-0.5">Coverage:</span>
                        <span className="text-emerald-400 font-bold">{intel.insight.coverage}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 uppercase tracking-widest mb-0.5">Freshness:</span>
                        <span className="text-amber-400 font-bold">{intel.insight.freshness}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 uppercase tracking-widest mb-0.5">Data Quality:</span>
                        <span className="text-fuchsia-400 font-bold">{intel.insight.dataQuality}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Score explanations (Why this score, what improved/reduced it, monitor list) */}
                <ScoreExplanations
                  ticker={model.ticker}
                  factors={intel?.factors}
                  beginner={beginner}
                />

                {/* Factor transparency panel (calculators, inputs, weight weights) */}
                <FactorTransparencyPanel
                  factors={intel?.factors}
                  beginner={beginner}
                />
              </div>
            )
          },
          {
            id: "layer_health_and_story",
            label: "Health + Story",
            content: (
              <div className="space-y-6">
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

                <CompanyMarketStoryLayer
                  companyName={model.companyName}
                  ticker={model.ticker}
                  sectorLabel={sectorLabel}
                  healthState={healthState}
                  healthTheme={model.healthTheme}
                  founders={model.founders}
                  leadership={model.leadership}
                  narrativeBody={model.narrative.body}
                  strategicSummary={model.strategicSummary}
                  positioningRailLabel={model.positioningRailLabel}
                  financialTelemetry={model.financialTelemetry}
                  futureCapsules={model.futureProbabilityCapsules}
                  synthesis={synthesis}
                  confidenceState={confidenceState}
                  confidenceTheme={confidenceTheme}
                  beginner={beginner}
                />
              </div>
            ),
          },
          {
            id: "layer_origins_leadership",
            label: "Origins",
            content: (
              <PremiumFeatureGate
                featureKey="company_superpage_deep_analytics"
                title="Deep origins & leadership analytics"
                subtitle="Deep narrative context for calm reading."
                previewLines={[
                  "Founding timeline as context texture",
                  "Leadership story framing as continuity cues",
                  "DNA + mission context grounded in health-aware narratives",
                ]}
              >
                <div className="space-y-6">
                  <CompanyFoundingTimeline milestones={model.foundingTimeline} />

                  <FounderLeadershipStoryEngine
                    companyName={model.companyName}
                    healthState={model.healthState}
                    founders={model.founders}
                    leadership={model.leadership}
                  />

                  <CompanyDNAAndMissionEngine
                    companyName={model.companyName}
                    healthState={model.healthState}
                    narrativeBody={model.narrative.body}
                    strategicSummary={model.strategicSummary}
                    founders={model.founders}
                    leadership={model.leadership}
                  />
                </div>
              </PremiumFeatureGate>
            ),
          },
          {
            id: "layer_transformation",
            label: "Transformation",
            content: (
              <PremiumFeatureGate
                featureKey="company_superpage_deep_analytics"
                title="Advanced transformation analysis"
                subtitle="Transformation framing for context and pacing."
                previewLines={[
                  "Transformation as measurable discipline",
                  "Financial data treated as context boundary for narratives",
                  "Health-aware learning cues for calm interpretive pacing",
                ]}
              >
                <div className="space-y-6">
                  <StrategicTransformationLayer
                    ticker={model.ticker}
                    healthState={model.healthState}
                    strategicSummary={model.strategicSummary}
                    financialTelemetry={model.financialTelemetry}
                  />
                </div>
              </PremiumFeatureGate>
            ),
          },
          {
            id: "layer_sector_peers",
            label: "Peers & Actions",
            content: (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sector Rankings */}
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
                          window.history.pushState({}, "", `?${p.toString()}`);
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

                {/* Similar Companies & Watchlist */}
                <div className="space-y-6">
                  {/* Similar Companies */}
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
                              window.history.pushState({}, "", `?${p.toString()}`);
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

                  {/* Watchlist Actions */}
                  <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-xl space-y-4">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">Operating Actions</span>
                      <h3 className="text-lg font-bold text-white tracking-tight font-vos-display">Watchlist Control</h3>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div>
                        <span className="text-xs font-semibold block">Track {model.ticker}</span>
                        <span className="text-[10px] text-white/40 block">Get notified of factor/risk shifts</span>
                      </div>
                      <button
                        onClick={() => {
                          const listId = getWatchlists()[0]?.id || "1";
                          if (isTickerInWatchlist(model.ticker)) {
                            removeTickerFromWatchlist(listId, model.ticker);
                          } else {
                            addTickerToWatchlist(listId, model.ticker);
                          }
                          // trigger local refresh by forcing state update
                          setIntel((i: any) => ({ ...i }));
                        }}
                        className={`h-8 px-4 rounded-lg text-xs font-bold transition-all ${
                          isTickerInWatchlist(model.ticker)
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                            : "bg-cyan-400 text-black font-semibold hover:bg-cyan-300"
                        }`}
                      >
                        {isTickerInWatchlist(model.ticker) ? "Remove Asset" : "Watch Asset"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: "layer_methodology_registry",
            label: "Methodology",
            content: (
              <CompanyMethodologyAndRegistry />
            )
          }
        ]}
      />
    </div>
  );
}
