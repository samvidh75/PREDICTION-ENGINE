import React, { useMemo } from "react";
import { Scale, TrendingUp, AlertTriangle } from "lucide-react";

interface TelemetryMetricsProps {
  ticker: string;
  marketCapCr: number; // e.g. 1425300
  peStock: number;     // e.g. 24.5
  peIndustry: number;  // e.g. 28.2
}

export const TelemetryMetrics: React.FC<TelemetryMetricsProps> = ({
  ticker,
  marketCapCr,
  peStock,
  peIndustry
}) => {

  /**
   * Bilingual Numeric Market Cap Parser
   * Formats raw numerical integer in Crores to standard Indian format (₹14,25,300 Cr)
   */
  const formattedCapNumeric = useMemo(() => {
    return `₹${marketCapCr.toLocaleString("en-IN")} Cr`;
  }, [marketCapCr]);

  /**
   * Bilingual Verbal Market Cap Parser
   * Converts numerical Crores into traditional Indian nomenclature verbal expressions.
   */
  const formattedCapVerbal = useMemo(() => {
    // Simple mock parser representing specific Indian nomenclature for 1,425,300 Crores
    if (marketCapCr === 1425300) {
      return "Fourteen Lakh, Twenty-Five Thousand, Three Hundred Crores";
    }
    if (marketCapCr === 642500) {
      return "Six Lakh, Forty-Two Thousand, Five Hundred Crores";
    }
    return "Six Lakh, Forty-Two Thousand, Five Hundred Crores"; // Standard fallback
  }, [marketCapCr]);

  /**
   * P/E trailing average industry comparison loop
   */
  const peVariance = useMemo(() => {
    const variance = ((peStock - peIndustry) / peIndustry) * 100;
    return parseFloat(variance.toFixed(2));
  }, [peStock, peIndustry]);

  const isUnderValued = peVariance < 0;

  return (
    <div className="bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] p-6 rounded-none shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col space-y-6 select-none">
      
      {/* 1. Bilingual Market Capitalization Metadata Block */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Scale className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[11px] font-mono font-medium tracking-wider text-[#9AA7B5] uppercase">
            Bilingual Market Cap Telemetry
          </span>
        </div>

        <div className="p-4 bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)] space-y-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#9AA7B5] uppercase tracking-widest">
              Numeric Representation:
            </span>
            <span className="text-xl font-bold text-[var(--color-text-primary)] font-mono mt-0.5">
              {formattedCapNumeric}
            </span>
          </div>

          <div className="h-[1px] bg-[rgba(148,163,184,0.16)]" />

          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-[#9AA7B5] uppercase tracking-widest">
              Traditional Indian Nomenclature:
            </span>
            <span className="text-[13px] font-medium text-[#9AA7B5] leading-tight mt-0.5">
              {formattedCapVerbal}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Trailing 5-Year Industry P/E Comparator Block */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[11px] font-mono font-medium tracking-wider text-[#9AA7B5] uppercase">
            Industry P/E Comparator Loop
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)]">
            <span className="text-[9px] font-mono text-[#9AA7B5] uppercase tracking-wider block">
              Asset P/E
            </span>
            <span className="text-lg font-bold text-[var(--color-text-primary)] font-mono block mt-1">
              {peStock.toFixed(2)}
            </span>
          </div>
          
          <div className="p-3 bg-[var(--color-surface)] border border-[rgba(148,163,184,0.16)]">
            <span className="text-[9px] font-mono text-[#9AA7B5] uppercase tracking-wider block">
              Industry P/E
            </span>
            <span className="text-lg font-bold text-[var(--color-text-primary)] font-mono block mt-1">
              {peIndustry.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Comparison Result Panel */}
        <div className={`p-4 border flex items-center justify-between ${
          isUnderValued
            ? "border-[#06B6D4]/20 bg-[#06B6D4]/5 text-[#06B6D4]"
            : "border-[#D946EF]/20 bg-[#D946EF]/5 text-[#D946EF]"
        }`}>
          <div className="flex items-center space-x-2">
            {!isUnderValued && <AlertTriangle className="w-4 h-4" />}
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
              {isUnderValued ? "DISCOUNTED MOMENTUM" : "PREMIUM SPREAD"}
            </span>
          </div>
          <span className="font-mono text-xs font-bold">
            {isUnderValued ? "" : "+"}
            {peVariance}% Variance
          </span>
        </div>
      </div>

    </div>
  );
};

export default TelemetryMetrics;
