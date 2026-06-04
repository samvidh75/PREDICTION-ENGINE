// src/components/company/CompanyMethodologyAndRegistry.tsx
import React from "react";

export default function CompanyMethodologyAndRegistry(): JSX.Element {
  const sources = [
    {
      provider: "IndianAPI (NSE/BSE Master Registry)",
      refresh: "Daily at 08:30 AM IST",
      coverage: "505 listed equities, company names, sectors, and ISIN metadata",
      status: "Verified & Audited"
    },
    {
      provider: "Yahoo Finance Gateway",
      refresh: "Every 15 minutes during trading hours",
      coverage: "5-year daily pricing history (660,037 candles active in database)",
      status: "Active Sync (No gaps)"
    },
    {
      provider: "GNews & Finnhub Ingestion",
      refresh: "Hourly feed check",
      coverage: "1,515 sentiment-relevant corporate announcements and articles",
      status: "Synced & Verified"
    }
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />

      {/* Part 1: How StockStory Analyses Companies */}
      <div>
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">
          Methodology
        </span>
        <h3 className="text-lg font-bold text-white tracking-tight font-vos-display">
          How StockStory Analyses Companies
        </h3>
        <p className="mt-2 text-xs text-white/70 leading-relaxed font-vos-reading">
          We process raw stock market numbers and convert them into clean, understandable stories. We do not use "black-box" models. Everything is calculated using a clear four-step process:
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <span className="font-bold text-white/90 block mb-1">1. Features (Raw Market Data)</span>
            <p className="text-white/70 leading-relaxed font-vos-reading">
              We gather basic numbers directly from stock markets. This includes how much the price changed, total trading volume, price swing range (price movement intensity), and buying vs selling pressure.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <span className="font-bold text-white/90 block mb-1">2. Factors (Relative Rankings)</span>
            <p className="text-white/70 leading-relaxed font-vos-reading">
              We score every stock from 0 to 100 by comparing it against all other 505 companies. A higher score means it ranks stronger than others in that category (e.g. higher Cheapness or better Safety).
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <span className="font-bold text-white/90 block mb-1">3. Intelligence (Driver Analysis)</span>
            <p className="text-white/70 leading-relaxed font-vos-reading">
              Our system audits the scores to pull out the exact reasons supporting a stock rating. We list the primary positive drivers pushing it up and the negative warning signs dragging it down.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
            <span className="font-bold text-white/90 block mb-1">4. Narratives (Plain English Summaries)</span>
            <p className="text-white/70 leading-relaxed font-vos-reading">
              We translate our math into plain-English sentences. This gives you a calm, readable overview of the business status without forcing you to look at dense spread sheets.
            </p>
          </div>
        </div>
      </div>

      {/* Part 2: Data Source Registry */}
      <div className="pt-6 border-t border-white/5">
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
          Data Lineage
        </span>
        <h3 className="text-lg font-bold text-white tracking-tight font-vos-display">
          DataSourceRegistry
        </h3>
        <p className="mt-2 text-xs text-white/70 leading-relaxed font-vos-reading">
          Every number shown in StockStory is traceable back to official market feeds and registered providers:
        </p>

        <div className="mt-4 space-y-3">
          {sources.map((s, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white block">{s.provider}</span>
                <span className="text-[11px] text-white/70 block">{s.coverage}</span>
                <span className="text-[10px] text-white/40 block font-mono">Last refresh: {s.refresh}</span>
              </div>
              <div className="flex sm:flex-col items-start sm:items-end justify-between">
                <span className="text-[9px] uppercase tracking-wider font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-md">
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
