// src/components/dashboard/PersonalDashboard.tsx
import React, { useState, useEffect } from "react";
import CustomSelect from "../ui/CustomSelect";
import { getWatchlists, CustomWatchlist } from "../../services/portfolio/watchlistStore";
import { AlertEngine, SmartAlert } from "../../services/portfolio/AlertEngine";
import { InvestorMemoryEngine, MemoryData } from "../../services/portfolio/InvestorMemoryEngine";

interface DiscoveryRank {
  symbol: string;
  quality: number;
  value: number;
  growth: number;
  momentum: number;
  risk: number;
  score: number;
  delta: number;
}

interface DiscoveryData {
  highestQuality: DiscoveryRank[];
  highestMomentum: DiscoveryRank[];
  highestGrowth: DiscoveryRank[];
  highestRisk: DiscoveryRank[];
  topImproving: DiscoveryRank[];
  topDeteriorating: DiscoveryRank[];
}

export default function PersonalDashboard({
  beginner
}: {
  beginner: boolean;
}): JSX.Element {
  const [watchlists, setWatchlists] = useState<CustomWatchlist[]>(() => getWatchlists());
  const [selectedListId, setSelectedListId] = useState<string>(watchlists[0]?.id || "");
  const [alerts, setAlerts] = useState<SmartAlert[]>(() => AlertEngine.getAlerts());
  const [memory, setMemory] = useState<MemoryData>(() => InvestorMemoryEngine.getMemory());
  const [rankings, setRankings] = useState<DiscoveryData | null>(null);

  // User Profile States
  const [riskProfile, setRiskProfile] = useState<string>(() => window.localStorage.getItem("user_risk_profile") || "Balanced");
  const [investStyle, setInvestStyle] = useState<string>(() => window.localStorage.getItem("user_investing_style") || "Growth");
  const [favSector, setFavSector] = useState<string>(() => window.localStorage.getItem("user_favourite_sector") || "Technology");

  useEffect(() => {
    // Fetch live db rankings
    fetch("/api/intelligence/discovery/rankings")
      .then(res => res.json())
      .then(data => {
        if (data) {
          const filterFn = (r: DiscoveryRank) => !/^\d{5,6}$/.test(r.symbol);
          setRankings({
            highestQuality: (data.highestQuality || []).filter(filterFn),
            highestMomentum: (data.highestMomentum || []).filter(filterFn),
            highestGrowth: (data.highestGrowth || []).filter(filterFn),
            highestRisk: (data.highestRisk || []).filter(filterFn),
            topImproving: (data.topImproving || []).filter(filterFn),
            topDeteriorating: (data.topDeteriorating || []).filter(filterFn),
          });
        }
      })
      .catch(() => {});
  }, []);

  const activeWatchlist = watchlists.find(w => w.id === selectedListId) || watchlists[0];

  const handleSaveProfileSettings = (risk: string, style: string, sector: string) => {
    setRiskProfile(risk);
    setInvestStyle(style);
    setFavSector(sector);
    window.localStorage.setItem("user_risk_profile", risk);
    window.localStorage.setItem("user_investing_style", style);
    window.localStorage.setItem("user_favourite_sector", sector);
    InvestorMemoryEngine.logActivity(`Updated investing style to ${style} and risk to ${risk}`);
    setMemory(InvestorMemoryEngine.getMemory());
  };

  const handleMarkRead = (id: string) => {
    AlertEngine.markAsRead(id);
    setAlerts(AlertEngine.getAlerts());
  };

  const handleClearAlert = (id: string) => {
    AlertEngine.deleteAlert(id);
    setAlerts(AlertEngine.getAlerts());
  };

  return (
    <div className="space-y-8 select-none">
      {/* Personalized Greeting & Habit Loop */}
      <div className="bg-gradient-to-r from-cyan-950/20 to-emerald-950/20 border border-white/10 rounded-[28px] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
          HABIT_LOOP // DAILY BRIEFING
        </span>
        <h3 className="text-xl font-bold text-white tracking-tight font-vos-display">
          Personalized Briefing for {riskProfile} {investStyle} Allocators
        </h3>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-white/80 leading-relaxed font-vos-reading">
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
            <span className="text-gray-400 font-bold block uppercase text-[9px] font-mono mb-1 text-cyan-300">
              What changed?
            </span>
            <p>
              Your pinned watchlist containing **{activeWatchlist?.tickers.join(", ") || "no assets"}** has consolidated with moderate support. Sector leadership highlights high activity in the **{favSector}** space.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
            <span className="text-gray-400 font-bold block uppercase text-[9px] font-mono mb-1 text-emerald-300">
              What matters?
            </span>
            <p>
              Underlying factor updates show that value score levels are compressed across large-caps, while momentum remains high in defense.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
            <span className="text-gray-400 font-bold block uppercase text-[9px] font-mono mb-1 text-amber-300">
              What should I watch?
            </span>
            <p>
              Watch the upcoming earnings releases for defense manufacturing contracts. Watch **{riskProfile === "Conservative" ? "Low Volatility Blue-chips" : "Momentum Breakout Candidates"}** in your dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Column 1: Watchlists & User Profile Settings */}
        <div className="space-y-6">
          
          {/* Watchlists Selector */}
          <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 shadow-xl space-y-4">
            <span className="text-[10px] uppercase text-gray-400 font-bold font-mono tracking-wider block">My Watchlists</span>
            <div className="space-y-2">
              {watchlists.map(wl => (
                <button
                  key={wl.id}
                  onClick={() => setSelectedListId(wl.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    (selectedListId === wl.id || (!selectedListId && wl.id === watchlists[0]?.id))
                      ? "bg-white text-[#020304] border-white font-bold"
                      : "bg-white/5 border-white/5 hover:bg-white/10 text-white/90"
                  }`}
                >
                  <span className="text-sm font-semibold">{wl.name}</span>
                  <span className="text-[10px] font-mono font-bold">
                    {wl.tickers.length} Assets
                  </span>
                </button>
              ))}
            </div>

            {activeWatchlist && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <span className="text-[10px] text-gray-500 font-mono block">Watchlist Tickers:</span>
                <div className="flex flex-wrap gap-2">
                  {activeWatchlist.tickers.map(ticker => (
                    <span key={ticker} className="px-2 py-1 bg-white/10 rounded-lg text-xs font-mono text-cyan-300 border border-white/5">
                      {ticker}
                    </span>
                  ))}
                  {activeWatchlist.tickers.length === 0 && (
                    <span className="text-xs text-white/40 italic">No tickers in list.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Settings Panel */}
          <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 shadow-xl space-y-4">
            <span className="text-[10px] uppercase text-gray-400 font-bold font-mono tracking-wider block">User Profile & Style</span>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-white/60 mb-1">Risk Profile</label>
                <CustomSelect
                  value={riskProfile}
                  onChange={e => handleSaveProfileSettings(e.target.value, investStyle, favSector)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none cursor-pointer"
                >
                  <option value="Conservative">Conservative (Low Volatility)</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Aggressive">Aggressive (High Momentum)</option>
                </CustomSelect>
              </div>

              <div>
                <label className="block text-white/60 mb-1">Investing Style</label>
                <CustomSelect
                  value={investStyle}
                  onChange={e => handleSaveProfileSettings(riskProfile, e.target.value, favSector)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none cursor-pointer"
                >
                  <option value="Growth">Growth Focus</option>
                  <option value="Value">Value-oriented</option>
                  <option value="Momentum">Momentum Breakouts</option>
                  <option value="Quality">High ROE / Quality</option>
                </CustomSelect>
              </div>

              <div>
                <label className="block text-white/60 mb-1">Favorite Sector</label>
                <CustomSelect
                  value={favSector}
                  onChange={e => handleSaveProfileSettings(riskProfile, investStyle, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none cursor-pointer"
                >
                  <option value="Technology">Technology</option>
                  <option value="Defense">Defense</option>
                  <option value="Banking">Banking</option>
                  <option value="Energy">Energy</option>
                </CustomSelect>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Alerts & Saved Research */}
        <div className="space-y-6">
          
          {/* My Alerts */}
          <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 shadow-xl space-y-4">
            <span className="text-[10px] uppercase text-gray-400 font-bold font-mono tracking-wider block">My Persistent Alerts</span>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {alerts.map(a => (
                <div key={a.id} className={`bg-white/5 border border-white/5 p-3 rounded-xl space-y-1 relative ${!a.isRead ? "border-l-2 border-l-cyan-400" : ""}`}>
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="font-bold text-cyan-400">{a.category} Alert // {a.symbol}</span>
                    <span className="text-white/40">{a.timestamp}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{a.title}</h4>
                  <p className="text-[11px] text-white/70 leading-relaxed font-vos-reading">{a.body}</p>
                  
                  <div className="pt-2 flex justify-end space-x-2 text-[9px] font-mono">
                    {!a.isRead && (
                      <button onClick={() => handleMarkRead(a.id)} className="text-cyan-400 hover:underline cursor-pointer">
                        Mark Read
                      </button>
                    )}
                    <button onClick={() => handleClearAlert(a.id)} className="text-white/40 hover:text-white hover:underline cursor-pointer">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-white/40 text-xs italic text-center py-4">No active alerts.</div>
              )}
            </div>
          </div>

          {/* Saved Research */}
          <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 shadow-xl space-y-4">
            <span className="text-[10px] uppercase text-gray-400 font-bold font-mono tracking-wider block">My Saved Research</span>
            <div className="space-y-3">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono block mb-1">Companies Bookmarked:</span>
                <div className="flex flex-wrap gap-1.5">
                  {memory.savedCompanies.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded-md text-[10px] text-white font-mono border border-white/5">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono block mb-1">Recent Searches:</span>
                <div className="flex flex-wrap gap-1.5">
                  {memory.savedSearches.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-white/5 rounded-md text-[10px] text-white/70">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono block mb-1">Recent Activities:</span>
                <ul className="list-disc list-inside space-y-1 text-[10px] text-white/70">
                  {memory.recentActivity.slice(0, 3).map((a, idx) => (
                    <li key={idx} className="truncate">
                      {a.action} <span className="text-white/30 font-mono text-[9px]">({a.timestamp})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Live Discovery Rankings Feed */}
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 shadow-xl space-y-4">
          <span className="text-[10px] uppercase text-gray-400 font-bold font-mono tracking-wider block">Discovery Feed // DB Rankings</span>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {rankings ? (
              <>
                {/* Top Improving */}
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono block mb-2 uppercase tracking-widest">
                    ▲ Top Improving (30D Delta)
                  </span>
                  <div className="space-y-1.5">
                    {rankings.topImproving.map(r => (
                      <div key={r.symbol} className="bg-white/5 p-2.5 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-white font-mono">{r.symbol}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-gray-400 font-mono">Score: {r.score}</span>
                          <span className="text-emerald-400 font-bold font-mono">+{r.delta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Deteriorating */}
                <div>
                  <span className="text-[10px] font-bold text-rose-400 font-mono block mb-2 uppercase tracking-widest">
                    ▼ Top Deteriorating (30D Delta)
                  </span>
                  <div className="space-y-1.5">
                    {rankings.topDeteriorating.map(r => (
                      <div key={r.symbol} className="bg-white/5 p-2.5 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-white font-mono">{r.symbol}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-gray-400 font-mono">Score: {r.score}</span>
                          <span className="text-rose-400 font-bold font-mono">{r.delta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Highest Quality */}
                <div>
                  <span className="text-[10px] font-bold text-cyan-400 font-mono block mb-2 uppercase tracking-widest">
                    ★ Highest Quality Ranking
                  </span>
                  <div className="space-y-1.5">
                    {rankings.highestQuality.map(r => (
                      <div key={r.symbol} className="bg-white/5 p-2.5 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-white font-mono">{r.symbol}</span>
                        <span className="text-cyan-400 font-bold font-mono">Quality: {r.quality}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-white/40 text-xs italic py-4 text-center">Loading rankings from DB...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
