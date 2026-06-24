// src/components/intelligence/IntelligenceSnapshotCard.tsx
// React component rendering the combined Intelligence Snapshot.

import React from "react";

export interface IntelligenceSnapshotCardProps {
  company: {
    symbol: string;
    businessQuality: string;
    growthOutlook: string;
    riskOutlook: string;
    valuationOutlook: string;
    momentumOutlook: string;
    overallSummary: string;
  } | null;
  sector: {
    sectorName: string;
    strength: number;
    momentum: string;
    risk: string;
    rotationSignal: string;
  } | null;
  market: {
    marketMood: string;
    marketBreadth: number;
    riskAppetite: string;
  } | null;
  portfolio: {
    diversificationStatus: string;
    riskConcentration: string;
  } | null;
}

export const IntelligenceSnapshotCard: React.FC<IntelligenceSnapshotCardProps> = ({
  company,
  sector,
  market,
  portfolio,
}) => {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/40 backdrop-blur-2xl p-6 shadow-2xl space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Core OS</span>
          <h4 className="text-lg font-bold text-white tracking-tight">Intelligence Snapshot</h4>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full text-[9px] font-mono text-cyan-300">
          FACTOR_DRIVEN // STABLE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Outlook Section */}
        {company && (
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col space-y-3">
            <span className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono font-bold">Company Outlook // {company.symbol}</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Quality:</span> <span className="text-white font-semibold">{company.businessQuality}</span></div>
              <div><span className="text-gray-500">Growth:</span> <span className="text-white font-semibold">{company.growthOutlook}</span></div>
              <div><span className="text-gray-500">Valuation:</span> <span className="text-white font-semibold">{company.valuationOutlook}</span></div>
              <div><span className="text-gray-500">Momentum:</span> <span className="text-white font-semibold">{company.momentumOutlook}</span></div>
            </div>
            <p className="text-xs text-gray-300 italic border-t border-white/5 pt-2 leading-relaxed">{company.overallSummary}</p>
          </div>
        )}

        {/* Sector Outlook Section */}
        {sector && (
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col space-y-3">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono font-bold">Sector Outlook // {sector.sectorName}</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Strength:</span> <span className="text-white font-semibold">{sector.strength}/100</span></div>
              <div><span className="text-gray-500">Momentum:</span> <span className="text-white font-semibold">{sector.momentum}</span></div>
              <div><span className="text-gray-500">Risk Profile:</span> <span className="text-white font-semibold">{sector.risk}</span></div>
              <div><span className="text-gray-500">Rotation:</span> <span className="text-emerald-400 font-semibold">{sector.rotationSignal}</span></div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed border-t border-white/5 pt-2">
              Sectors are evaluated dynamically based on relative capitalization flows and systematic beta exposures.
            </p>
          </div>
        )}

        {/* Market Outlook Section */}
        {market && (
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col space-y-2">
            <span className="text-[9px] uppercase tracking-widest text-fuchsia-400 font-mono font-bold">Market Outlook</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Market Mood:</span> <span className="text-white font-semibold">{market.marketMood}</span></div>
              <div><span className="text-gray-500">Breadth:</span> <span className="text-white font-semibold">{market.marketBreadth}% Above SMA50</span></div>
              <div><span className="text-gray-500">Risk Appetite:</span> <span className="text-white font-semibold">{market.riskAppetite}</span></div>
            </div>
          </div>
        )}

        {/* Portfolio Outlook Section */}
        {portfolio && (
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col space-y-2">
            <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-mono font-bold">Portfolio Outlook</span>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div><span className="text-gray-500">Diversification:</span> <span className="text-white font-semibold">{portfolio.diversificationStatus}</span></div>
              <div><span className="text-gray-500">Concentration:</span> <span className="text-rose-400 font-semibold">{portfolio.riskConcentration}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceSnapshotCard;
