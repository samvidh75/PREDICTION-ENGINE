import React, { useMemo } from "react";
import { ShieldCheck, ShieldAlert, Cpu } from "lucide-react";

interface HealthometerDisplayProps {
  status: "HEALTHY" | "STABLE" | "WEAKENING" | "UNHEALTHY";
}

export const HealthometerDisplay: React.FC<HealthometerDisplayProps> = ({ status }) => {
  
  /**
   * Healthometer State Highlights
   */
  const healthMeta = useMemo(() => {
    switch (status) {
      case "HEALTHY":
        return {
          color: "#06B6D4",
          label: "OPERATIONAL HEALTH SECURE",
          bg: "bg-[#06B6D4]/5",
          border: "border-[#06B6D4]/20",
          icon: <ShieldCheck className="w-5 h-5 text-[#06B6D4]" />,
          description: "All core business metrics, debt covenants, and cash flows align with institutional growth expectations."
        };
      case "STABLE":
        return {
          color: "#525252",
          label: "STABLE CORE BOUNDARIES",
          bg: "bg-[#111827]",
          border: "border-[rgba(148,163,184,0.16)]",
          icon: <ShieldCheck className="w-5 h-5 text-[#64748B]" />,
          description: "Enterprise operations track standard parameters with robust margin reserves."
        };
      case "WEAKENING":
        return {
          color: "#D946EF",
          label: "ALERT: WEEK SPREAD DEVIATION",
          bg: "bg-[#D946EF]/5",
          border: "border-[#D946EF]/20",
          icon: <ShieldAlert className="w-5 h-5 text-[#D946EF]" />,
          description: "Short-term temporal deviations identified in EBITDA ratios. Closer monitoring recommended."
        };
      case "UNHEALTHY":
      default:
        return {
          color: "#D946EF",
          label: "ALERT: MARGIN COLLAPSE DETECTED",
          bg: "bg-[#D946EF]/5",
          border: "border-[#D946EF]/20",
          icon: <ShieldAlert className="w-5 h-5 text-[#D946EF]" />,
          description: "Severe leverage deviations detected. Capital restructure indicates critical vulnerability."
        };
    }
  }, [status]);

  return (
    <div className="bg-[#0D1117] border border-[rgba(148,163,184,0.16)] p-6 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col space-y-5 select-none">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.16)] pb-3">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#E6EDF3]">
            Healthometer Deep-Scan Layer
          </span>
        </div>
        <span className="font-mono text-[9px] text-[#9AA7B5]">
          SYS.SCAN: ~150 METRIC RUNS
        </span>
      </div>

      {/* Main Status Panel */}
      <div className={`p-5 border ${healthMeta.bg} ${healthMeta.border} flex flex-col space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {healthMeta.icon}
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider" style={{ color: healthMeta.color }}>
              {healthMeta.label}
            </span>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border" style={{ color: healthMeta.color, borderColor: `${healthMeta.color}30` }}>
            {status}
          </span>
        </div>
        
        <p className="text-[13px] leading-relaxed text-[#9AA7B5]">
          {healthMeta.description}
        </p>
      </div>

      {/* Subtext info */}
      <div className="font-mono text-[9px] text-[#9AA7B5] text-center tracking-widest uppercase">
        ADVISORY EXCLUDED // COMPLIANCE MATRIX SAFE
      </div>

    </div>
  );
};

export default HealthometerDisplay;
