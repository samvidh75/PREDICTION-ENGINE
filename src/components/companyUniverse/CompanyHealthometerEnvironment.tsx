import React, { useMemo } from "react";
import type { CompanyHealthState, HealthTheme } from "../../types/CompanyUniverse";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import HolographicTelemetryEngine from "../telemetry/HolographicTelemetryEngine";
import { CompanyUniverseCard } from "./CompanyUniverseSectionFrame";

function healthLabel(state: CompanyHealthState): string {
  switch (state) {
    case "STRUCTURALLY_HEALTHY":
      return "Strong";
    case "STABLE_EXPANSION":
      return "Stable";
    case "CONFIDENCE_IMPROVING":
      return "Improving";
    case "LIQUIDITY_FRAGILE":
      return "Weakening";
    case "VOLATILITY_SENSITIVE":
    case "STRUCTURALLY_WEAKENING":
    default:
      return "High Risk";
  }
}

function seiSafeLine(): string {
  return "SEBI-safe • educational probabilistic lens • no recommendations • no certainty claims • no trade execution framing";
}

export default function CompanyHealthometerEnvironment({
  companyHealthState,
  healthTheme,
  strategicSummary,
  positioningRailLabel,
  futureCapsules,
  synthesis,
  confidenceState,
  theme,
  beginner = false,
  isMobile = false,
}: {
  companyHealthState: CompanyHealthState;
  healthTheme: HealthTheme;
  strategicSummary: string;
  positioningRailLabel: string;
  futureCapsules: { id: string; body: string }[];
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
  isMobile?: boolean;
}): JSX.Element {
  const glow = useMemo(() => {
    if (companyHealthState === "LIQUIDITY_FRAGILE" || companyHealthState === "STRUCTURALLY_WEAKENING") return theme.warningGlow;
    if (companyHealthState === "VOLATILITY_SENSITIVE") return theme.magentaGlow;
    if (companyHealthState === "STABLE_EXPANSION" || companyHealthState === "CONFIDENCE_IMPROVING") return theme.cyanGlow;
    return theme.deepBlueGlow;
  }, [companyHealthState, theme]);

  const capsuleShown = useMemo(() => futureCapsules.slice(0, beginner ? 2 : 3), [futureCapsules, beginner]);

  const structuralCard = (
    <CompanyUniverseCard className="p-6">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Structural Health Core (company)</div>
      <div className="mt-3 text-[28px] font-semibold leading-[1.1] text-white/92" style={{ textShadow: `0 0 50px ${glow}` }}>
        {healthLabel(companyHealthState)}
      </div>
      <div className="mt-4 text-[14px] leading-[1.9] text-white/80">{strategicSummary}</div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Market positioning rail</div>
        <div className="mt-2 text-[14px] leading-[1.7] text-white/85">{positioningRailLabel}</div>
      </div>
    </CompanyUniverseCard>
  );

  const institutionalMacroCard = (
    <CompanyUniverseCard className="p-6">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Institutional + Macro Atmosphere (context)</div>
      <div className="mt-3 text-[16px] font-semibold leading-[1.3] text-white/92">{synthesis.macroGeopolitical.headline}</div>
      <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{synthesis.macroGeopolitical.body}</div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Institutional participation lens</div>
        <div className="mt-2 text-[13px] leading-[1.7] text-white/85">{synthesis.institutionalBehaviour}</div>
      </div>
    </CompanyUniverseCard>
  );

  const futureCapsulesCard = (
    <CompanyUniverseCard className="p-6">
      <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Future probability environments</div>
      <div className="mt-3 space-y-4">
        {capsuleShown.map((c, idx) => (
          <div key={c.id} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Capsule {idx + 1}</div>
            <div className="mt-2 text-[14px] leading-[1.9] text-white/85">{c.body}</div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Educational probability • no certainty claims</div>
          </div>
        ))}
      </div>
    </CompanyUniverseCard>
  );

  return (
    <section className="relative z-[12]">
      <div className="relative z-[12] px-6 sm:px-[72px] pb-14">
        <div className="mx-auto max-w-[1680px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Health Overview</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Calm health boundaries with structured context</div>
            </div>

            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              {beginner ? "Beginner clarity • simplified density" : "Full environment • deep context"} • state: {confidenceState}
            </div>
          </div>

          {/* Visual pulse (neural rings) */}
          <div className="mb-6">
            <HolographicTelemetryEngine
              title={isMobile ? undefined : "Market pulse (contextual visualization)"}
              compact
              heightPx={isMobile ? 280 : 320}
              showHeader={false}
            />
          </div>

          <div className={beginner || isMobile ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-12 gap-6"}>
            <div className={beginner || isMobile ? "" : "lg:col-span-4"}>{structuralCard}</div>
            <div className={beginner || isMobile ? "" : "lg:col-span-4"}>{institutionalMacroCard}</div>
            <div className={beginner || isMobile ? "" : "lg:col-span-4"}>{futureCapsulesCard}</div>
          </div>

          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">{seiSafeLine()}</div>
        </div>
      </div>
    </section>
  );
}
