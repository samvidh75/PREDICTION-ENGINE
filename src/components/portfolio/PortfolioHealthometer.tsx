// src/components/portfolio/PortfolioHealthometer.tsx
import React from "react";
import { PortfolioHealthState } from "../../services/portfolio/PortfolioHealthEngine";

interface PortfolioHealthometerProps {
  score: number;
  status: PortfolioHealthState;
}

export const PortfolioHealthometer: React.FC<PortfolioHealthometerProps> = ({ score, status }) => {
  const statusColors: Record<PortfolioHealthState, string> = {
    Excellent: "text-cyan-400 border-cyan-400 bg-cyan-400/10",
    Strong: "text-emerald-400 border-emerald-400 bg-emerald-400/10",
    Healthy: "text-green-400 border-green-400 bg-green-400/10",
    Stable: "text-blue-400 border-blue-400 bg-blue-400/10",
    Weakening: "text-amber-400 border-amber-400 bg-amber-400/10",
    "At Risk": "text-rose-500 border-rose-500 bg-rose-500/10",
  };

  return (
    <div className="vos-card p-6 flex flex-col items-center text-center space-y-4 font-vos-interface">
      <div className="w-full text-left">
        <span className="text-[11px] font-medium tracking-widest text-cyan-400 uppercase block mb-1">
          Portfolio Healthometer OS // Structural Risk Gauge
        </span>
        <h4 className="vos-sec-title font-bold text-white font-vos-display">Portfolio Health</h4>
      </div>

      {/* Main Dial */}
      <div className="relative w-36 h-36 flex items-center justify-center rounded-full border border-white/5 bg-[#020304]/80 shadow-2xl">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold font-vos-display text-white">{score}</span>
          <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Health Index</span>
        </div>

        {/* Circular stroke indicator */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke={status === "Excellent" || status === "Strong" || status === "Healthy" ? "#00D17A" : "#FF5B6E"}
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={276}
            strokeDashoffset={276 - (276 * score) / 100}
            strokeLinecap="round"
          />
        </svg>
      </div>

      <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase border ${statusColors[status] || "text-white"}`}>
        {status}
      </span>
    </div>
  );
};

export default PortfolioHealthometer;
