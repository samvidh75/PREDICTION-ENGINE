// src/components/discovery/SectorExplorer.tsx
import React, { useState, useEffect } from "react";
import { StockRegistry, RegisteredStock } from "../../services/stocks/StockRegistry";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";

export interface SectorDetail {
  name: string;
  health: "Very Healthy" | "Healthy" | "Stable" | "Weakening" | "Unhealthy";
  trend: "Uptrend" | "Sideways" | "Pullback" | "Recovery";
  description: string;
}

const SECTORS: SectorDetail[] = [
  { name: "Banking", health: "Healthy", trend: "Uptrend", description: "Credit expansion remains robust across private and public sectors." },
  { name: "IT", health: "Stable", trend: "Recovery", description: "Global demand and delivery margins are stabilizing smoothly." },
  { name: "Pharma", health: "Very Healthy", trend: "Uptrend", description: "Active API manufacturing and international clearance velocity holds." },
  { name: "Auto", health: "Healthy", trend: "Uptrend", description: "Premium passenger units and EV transition volumes expand." },
  { name: "FMCG", health: "Stable", trend: "Sideways", description: "Rural volume demands stabilize while margins are defended." },
  { name: "Defence", health: "Very Healthy", trend: "Uptrend", description: "Domestic manufacturing and production order pipelines at multi-year highs." },
  { name: "Railways", health: "Very Healthy", trend: "Uptrend", description: "National modernization capital allocations support robust execution." },
  { name: "Energy", health: "Healthy", trend: "Recovery", description: "Transition to renewable assets gains stable structural momentum." },
  { name: "Infrastructure", health: "Healthy", trend: "Uptrend", description: "Capital spends are visible across regional highway and logistic hubs." },
  { name: "Capital Goods", health: "Stable", trend: "Recovery", description: "Corporate capital spending fuels steady private machinery demand." },
  { name: "Metals", health: "Weakening", trend: "Pullback", description: "Global pricing dynamics introduce short-term margin volatility." },
  { name: "Chemicals", health: "Stable", trend: "Sideways", description: "Specialty chemicals adjust to inventory cycles and supply adjustments." },
  { name: "Telecom", health: "Healthy", trend: "Uptrend", description: "Average revenues expand as data consumption density increases." },
  { name: "Real Estate", health: "Healthy", trend: "Uptrend", description: "Residential booking demands are robust near premium corridors." },
];

export const SectorExplorer: React.FC = () => {
  const [selectedSector, setSelectedSector] = useState<string>("Banking");
  const [liveSectors, setLiveSectors] = useState<Record<string, { health: SectorDetail["health"]; trend: SectorDetail["trend"] }>>({});

  useEffect(() => {
    SECTORS.forEach(s => {
      fetch(`/api/intelligence/sector/${s.name}`)
        .then(res => res.json())
        .then(data => {
          const strength = data.sectorStrength;
          let health: SectorDetail["health"] = "Stable";
          if (strength >= 65) health = "Very Healthy";
          else if (strength >= 55) health = "Healthy";
          else if (strength >= 45) health = "Stable";
          else if (strength >= 35) health = "Weakening";
          else health = "Unhealthy";

          const mom = data.sectorMomentum;
          let trend: SectorDetail["trend"] = "Sideways";
          if (mom === "Accelerating") trend = "Uptrend";
          else if (mom === "Steady") trend = "Sideways";
          else if (mom === "Decelerating") trend = "Pullback";

          setLiveSectors(prev => ({
            ...prev,
            [s.name]: { health, trend }
          }));
        })
        .catch(() => {});
    });
  }, []);

  const getTopStocksInSector = (secName: string): RegisteredStock[] => {
    const all = StockRegistry.getAllStocks();
    return all.filter((s) => s.sector.toLowerCase() === secName.toLowerCase()).slice(0, 3);
  };

  const activeSectorData = SECTORS.find((s) => s.name === selectedSector) || SECTORS[0];
  const liveHealth = liveSectors[selectedSector]?.health || activeSectorData.health;
  const liveTrend = liveSectors[selectedSector]?.trend || activeSectorData.trend;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 font-vos-interface">
      {/* 1. Sectors Grid Column */}
      <div className="lg:col-span-2 vos-card p-6 flex flex-col space-y-4">
        <div>
          <span className="text-[11px] font-medium tracking-widest text-cyan-400 uppercase block mb-1">
            Sector Matrix OS // Active Exploration
          </span>
          <h3 className="vos-sec-title font-bold text-white font-vos-display">Explore Sectors</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {SECTORS.map((sec) => {
            const currentHealth = liveSectors[sec.name]?.health || sec.health;
            return (
              <button
                key={sec.name}
                onClick={() => setSelectedSector(sec.name)}
                className={`p-4 rounded-[14px] border text-left transition-all cursor-pointer ${
                  selectedSector === sec.name
                    ? "bg-white text-[#020304] border-white font-bold"
                    : "bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                <div className="text-sm font-semibold">{sec.name}</div>
                <div className={`text-[10px] uppercase font-bold mt-1.5 ${
                  selectedSector === sec.name 
                    ? "text-[#020304]/60" 
                    : currentHealth === "Very Healthy" || currentHealth === "Healthy"
                      ? "text-[#00d17a]"
                      : "text-amber-400"
                }`}>
                  {currentHealth}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sector Detail Column */}
      <div className="vos-card p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Selected Sector Overview</span>
            <h4 className="text-xl font-bold text-white mt-1 font-vos-display">{activeSectorData.name}</h4>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed font-vos-reading">
            {activeSectorData.description}
          </p>

          <div className="border-t border-white/5 pt-4 flex justify-between text-xs">
            <div>
              <span className="text-gray-500 block text-[9px] uppercase">Trend state</span>
              <span className="text-white font-bold font-vos-display">{liveTrend}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[9px] uppercase">Health state</span>
              <span className="text-emerald-400 font-bold font-vos-display">{liveHealth}</span>
            </div>
          </div>
        </div>

        {/* Top Stocks in Active Sector */}
        <div className="border-t border-white/5 pt-4 mt-6">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-3">Top Sector Assets</span>
          <div className="space-y-2">
            {getTopStocksInSector(activeSectorData.name).map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => {
                  navigateToStock({ ticker: stock.symbol, mode: "push" });
                }}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 p-2.5 rounded-[12px] flex items-center justify-between transition-all cursor-pointer text-left"
              >
                <div>
                  <div className="text-xs font-bold text-white font-vos-display">{stock.symbol}</div>
                  <div className="text-[9px] text-gray-400">{stock.companyName}</div>
                </div>
                <div className="text-right">
                  Open for live quote
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">{stock.healthStatus}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectorExplorer;
