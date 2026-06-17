import React, { useState, useEffect } from "react";
import { getMarketIntelligence, getPortfolioIntelligence } from "../../services/intelligence/clientIntelligenceProvider";
import { AlertEngine } from "../../services/portfolio/AlertEngine";
import { Sun, Cloud, CloudRain, AlertTriangle, ShieldCheck } from "lucide-react";

export const DailyBriefWidget: React.FC = () => {
  const [market, setMarket] = useState(() => getMarketIntelligence());
  const [portfolio, setPortfolio] = useState(() => getPortfolioIntelligence());
  const alerts = AlertEngine.getAlerts().filter(a => !a.isRead).slice(0, 3);

  useEffect(() => {
    fetch("/api/intelligence/market").then(r => r.json()).then(setMarket).catch(() => {});
    fetch("/api/intelligence/portfolio").then(r => r.json()).then(setPortfolio).catch(() => {});
  }, []);

  const moodIcon = market.marketMood === "Bullish" ? <Sun className="w-5 h-5 text-emerald-400" /> 
    : market.marketMood === "Bearish" ? <CloudRain className="w-5 h-5 text-rose-400" /> 
    : <Cloud className="w-5 h-5 text-amber-400" />;
  
  const moodColor = market.marketMood === "Bullish" ? "text-emerald-400" 
    : market.marketMood === "Bearish" ? "text-rose-400" 
    : "text-amber-400";

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
          Daily Brief Summary
        </h4>
        <span className="text-[9px] text-white/40 font-medium">Live</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Market Mood & Portfolio Health */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            {moodIcon}
            <div>
              <span className="text-[9px] text-gray-500 uppercase font-mono block">Market Mood</span>
              <span className={`text-sm font-bold ${moodColor}`}>{market.marketMood}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-[9px] text-gray-500 uppercase font-mono block">Portfolio Health</span>
              <span className="text-sm font-bold text-white">{portfolio.diversificationStatus}</span>
            </div>
          </div>
        </div>

        {/* Risk Alerts */}
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[90px]">
          <span className="text-[9px] text-gray-500 uppercase font-mono block mb-2">Active Alerts</span>
          {alerts.length === 0 ? (
            <p className="text-[11px] text-white/30 text-center">No urgent factor alerts</p>
          ) : (
            <div className="space-y-1.5">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center justify-between text-[11px] text-white/70">
                  <span className="truncate max-w-[150px]">{a.title}</span>
                  <span className="text-rose-400 font-mono text-[9px] ml-2 shrink-0">{a.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyBriefWidget;
