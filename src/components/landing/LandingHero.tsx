import React, { useEffect, useState } from "react";

interface LandingHeroProps {
  isConnecting: boolean;
  onInitialize: () => void;
  error: string | null;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  isConnecting,
  onInitialize,
  error
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center select-none py-12 md:py-20">
      {/* Cinematic Planetary Ambient Haze Glow Backdrop (Restrained Cyan/Magenta) */}
      <div className="absolute -top-20 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,rgba(217,70,239,0.04)_40%,transparent_70%)] blur-[40px] pointer-events-none -z-10" />

      {/* Trust Signifier: 256-Bit Encrypted Node Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(148,163,184,0.16)] bg-[#0D1117]/70 shadow-[0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-sm transition-all duration-700 transform ${
          mounted ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-[10px] tracking-[0.2em] font-mono font-semibold text-[#9AA7B5] uppercase">
          256-BIT SECURE CONNECTION ACTIVE
        </span>
      </div>

      {/* Main Title Heading */}
      <h1
        className={`mt-6 text-4xl md:text-6xl font-semibold tracking-tight text-[#E6EDF3] leading-tight transition-all duration-1000 delay-100 transform ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        Luxury Market Intelligence
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-magenta-500">
          Engineered for Purity.
        </span>
      </h1>

      {/* Narrative Subtitle */}
      <p
        className={`mt-6 text-[15px] md:text-[16px] text-[#9AA7B5] max-w-2xl leading-relaxed transition-all duration-1000 delay-200 transform ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        Experience clean, structured financial insights. Free of aggressive trading noise, 
        designed around clean visual metrics and evidence-based company analysis.
      </p>

      {/* Session Initiation Button (CTA Handshake target) */}
      <div
        className={`mt-10 w-full max-w-sm px-4 transition-all duration-1000 delay-300 transform ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <button
          type="button"
          disabled={isConnecting}
          onClick={onInitialize}
          className={`group relative w-full h-[48px] rounded-md text-[13px] font-semibold uppercase tracking-wider transition-all duration-300 ${
            error ? "border-2 border-magenta-500 bg-white text-magenta-500" : ""
          } ${
            isConnecting
              ? "bg-neutral-900 text-[#64748B] cursor-not-allowed border border-neutral-800"
              : error
              ? "hover:bg-magenta-50"
              : "bg-neutral-950 text-white hover:bg-neutral-900 hover:scale-[1.01] active:scale-[0.97] shadow-lg shadow-neutral-950/10"
          }`}
          style={{
            borderColor: error ? "#D946EF" : undefined,
          }}
        >
          {isConnecting ? (
            <span className="flex items-center justify-center gap-2.5 font-mono text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              CONNECTING
            </span>
          ) : (
            "Sign in"
          )}
        </button>

        {/* Dynamic Warning Alert Overlay */}
        {error && (
          <div className="mt-3 text-[11px] font-semibold text-magenta-500 font-mono animate-pulse tracking-wide">
            {error.toUpperCase()}
          </div>
        )}
      </div>

      {/* System Watermarks Grid */}
      <div
        className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 transition-all duration-1000 delay-400 transform ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {[
          { label: "LATENCY", value: "0.12MS // PURE" },
          { label: "METRICS", value: "HEALTH-CENTRIC" },
          { label: "VERBIAGE", value: "NON-ADVISORY" },
          { label: "COMPLIANCE", value: "CERT.IN-256" }
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center">
            <span className="text-[10px] tracking-widest text-[#64748B] uppercase font-mono">
              {item.label}
            </span>
            <span className="mt-1 text-[12px] font-semibold text-[#9AA7B5] font-mono tracking-wide">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default LandingHero;
