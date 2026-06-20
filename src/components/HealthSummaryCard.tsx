import React from "react";
import { ShieldCheck, AlertTriangle, Activity } from "lucide-react";

export type StockEntity = {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  marketCapCr: number;
  healthIndicator: string;
};

export const HealthSummaryCard: React.FC = () => {
  const HEALTH_DICTIONARY = ["VERY HEALTHY", "HEALTHY", "STABLE", "WEAKENING", "UNHEALTHY"];

  const stockDataset: StockEntity[] = [
    {
      id: "SSI_INFY",
      ticker: "INFY",
      companyName: "Infosys Limited",
      exchange: "NSE",
      marketCapCr: 642500,
      healthIndicator: "HEALTHY"
    },
    {
      id: "SSI_TCS",
      ticker: "TCS",
      companyName: "Tata Consultancy Services",
      exchange: "NSE",
      marketCapCr: 1254300,
      healthIndicator: "VERY HEALTHY"
    },
    {
      id: "SSI_RELIANCE",
      ticker: "RELIANCE",
      companyName: "Reliance Industries Limited",
      exchange: "BSE",
      marketCapCr: 1845000,
      healthIndicator: "STABLE"
    },
    {
      id: "SSI_GRANULES",
      ticker: "GRANULES",
      companyName: "Granules India",
      exchange: "NSE",
      marketCapCr: 9800,
      healthIndicator: "WEAKENING"
    },
    {
      id: "SSI_CHENTRADA",
      ticker: "CHENNPETRO",
      companyName: "Chennai Petroleum Corp",
      exchange: "NSE",
      marketCapCr: 12400,
      healthIndicator: "UNHEALTHY"
    },
    {
      id: "SSI_MOCKINVALID",
      ticker: "TESTFALLBACK",
      companyName: "Mock Fallback Corp",
      exchange: "SME",
      marketCapCr: 450,
      healthIndicator: "INVALID_STATUS_TEST" // Triggers fallback immediately to "STABLE"
    }
  ];

  /**
   * Healthometer Evaluator Pipeline
   */
  const evaluateHealth = (status: string): string => {
    const uppercaseStatus = (status || "").toUpperCase().trim();
    if (HEALTH_DICTIONARY.includes(uppercaseStatus)) {
      return uppercaseStatus;
    }
    // Edge Case Guardrail: Fall back immediately to "STABLE"
    return "STABLE";
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] rounded-none p-6 flex flex-col space-y-4 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#E6EDF3]">
            Exchange Health Overview
          </span>
        </div>
        <span className="font-mono text-[9px] text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] px-2 py-0.5 rounded">
          NON-ADVISORY METRIC LENS
        </span>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left font-sans text-xs border-collapse">
          <thead>
            <tr className="border-b border-[rgba(148,163,184,0.16)] text-[var(--color-text-secondary)] font-mono text-[10px] uppercase tracking-wider">
              <th className="pb-2 font-medium">Symbol // Entity</th>
              <th className="pb-2 font-medium">Exchange</th>
              <th className="pb-2 font-medium text-right">Market Cap (Cr)</th>
              <th className="pb-2 font-medium text-center">Health Frame</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(148,163,184,0.16)]">
            {stockDataset.map((stock) => {
              const validatedHealth = evaluateHealth(stock.healthIndicator);
              
              // Color mapping based on string resolution
              const isCyanAccent = validatedHealth === "VERY HEALTHY" || validatedHealth === "HEALTHY";
              const isMagentaAccent = validatedHealth === "WEAKENING" || validatedHealth === "UNHEALTHY";

              let badgeStyle = "text-[var(--color-text-secondary)] bg-[var(--color-surface-raised)] border-[rgba(148,163,184,0.16)]";
              if (isCyanAccent) {
                badgeStyle = "text-[#06B6D4] bg-[#06B6D4]/5 border-[#06B6D4]/10";
              } else if (isMagentaAccent) {
                badgeStyle = "text-[#D946EF] bg-[#D946EF]/5 border-[#D946EF]/10";
              }

              return (
                <tr
                  key={stock.id}
                  className="hover:bg-white/[0.04] transition-colors"
                >
                  {/* Symbol & Name */}
                  <td className="py-3">
                    <div className="font-bold text-[#E6EDF3] font-mono">{stock.ticker}</div>
                    <div className="text-[10px] text-[var(--color-text-secondary)] truncate max-w-[150px]">
                      {stock.companyName}
                    </div>
                  </td>

                  {/* Exchange */}
                  <td className="py-3 font-mono text-[#64748B] uppercase">
                    {stock.exchange}
                  </td>

                  {/* Market Cap */}
                  <td className="py-3 font-mono text-right text-[var(--color-text-secondary)]">
                    ₹{stock.marketCapCr.toLocaleString("en-IN")}
                  </td>

                  {/* Health status badge */}
                  <td className="py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-mono font-bold border ${badgeStyle}`}
                    >
                      {isCyanAccent && <ShieldCheck className="w-3 h-3" />}
                      {isMagentaAccent && <AlertTriangle className="w-3 h-3" />}
                      {validatedHealth}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[9px] leading-relaxed text-[var(--color-text-secondary)] text-center font-mono uppercase tracking-widest pt-2 border-t border-[rgba(148,163,184,0.16)]">
        Strict Healthometer Matrix // Prohibits Buy Sell Commands
      </div>
    </div>
  );
};

export default HealthSummaryCard;
