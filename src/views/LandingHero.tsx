import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/auth/useAuth";

export const LandingHero: React.FC = () => {
  const {
    isAuthenticated,
    isConnecting,
    authError,
    initializeSession,
    encryptionToken
  } = useAuth();

  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleInitialize = async () => {
    try {
      await initializeSession();
    } catch {
      // Cryptographic timeout handled by useAuth state engine
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-center relative py-12 px-4 select-none">
      
      {/* 
        Atmospheric Depth Overlays:
        Subtle space-haze visual backdrop with zero layout shifts.
      */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.03),transparent_65%)] pointer-events-none -z-10" />

      {/* 
        The Core Handshake Lock-Card Container:
        Max-width exactly 440px, flat premium lock-card style.
        Includes sharp border transition on authError and staggered entry cascade.
      */}
      <div
         className={`max-w-[440px] w-full bg-[#0D1117] border rounded-none shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-8 flex flex-col space-y-6 transition-all duration-1000 ease-out transform ${
          authError ? "border-[#D946EF]" : "border-[rgba(148,163,184,0.16)]"
        } ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {/* Header Block */}
        <div>
          <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-[#9AA7B5] block mb-1">
            STOCKSTORY INDIA
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-[#E6EDF3]">
            Access Platform
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-[#9AA7B5]">
            Explore structured financial analysis, ownership trends, 
            valuation context, and market structure.
          </p>
        </div>

        {/* Handshake Interaction Loop */}
        <div className="flex flex-col">
          <button
            type="button"
            disabled={isConnecting}
            onClick={handleInitialize}
            className={`w-full h-11 rounded-none font-medium text-sm transition-all duration-300 ease-out flex items-center justify-center space-x-2 select-none min-h-[48px] active:scale-[0.98] duration-100 ${
              isConnecting
                ? "bg-[#0D1117] border border-[rgba(148,163,184,0.16)] text-[#9AA7B5] cursor-not-allowed"
                : "bg-[var(--text-900)] text-white hover:bg-[#333]"
            }`}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#9AA7B5]" />
                <span className="font-mono text-[11px] tracking-wider font-semibold">
                  CONNECTING...
                </span>
              </>
            ) : (
              <span>Access Platform</span>
            )}
          </button>

          {/* Absolute Warning Alert Notification Banner */}
          {authError && (
            <div className="text-xs font-mono text-[#D946EF] mt-2 tracking-wide text-left animate-pulse">
              Connection timeout. Please try again.
            </div>
          )}
        </div>

        {/* Security Sub-card */}
        <div className="pt-4 border-t border-[rgba(148,163,184,0.16)] flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-wider text-[#9AA7B5] flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-500" />
            <span className="font-semibold text-[#9AA7B5] uppercase">
              SECURE CONNECTION
            </span>
          </div>
        </div>
      </div>

      {/* Compliance / SEBI Watermark under absolute specifications */}
      <div
        className={`mt-4 text-[9px] font-mono text-[#9AA7B5] tracking-widest uppercase transition-all duration-1000 delay-300 transform ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        SEBI REGISTERED INVESTMENT RESEARCH • ADVISORY-FREE RESOURCE
      </div>
    </div>
  );
};

export default LandingHero;
