import React, { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import HiddenGridOverlay from "../components/ambient/HiddenGridOverlay";
import AmbientBackground from "../components/ambient/AmbientBackground";
import SentimentFlow from "../components/intelligence/SentimentFlow";
import MarketOrb from "../components/intelligence/MarketOrb";
import OrbEffects from "../components/intelligence/OrbEffects";

import { useCompanyUniverseModel } from "../services/company/useCompanyUniverseModel";
import type { CompanyHealthState } from "../types/CompanyUniverse";
import CompanyFoundingTimeline from "../components/companyUniverse/CompanyFoundingTimeline";
import CompanyLeadershipLayer from "../components/companyUniverse/CompanyLeadershipLayer";
import MasterInfographicEngine from "../components/infographics/MasterInfographicEngine";
import VolumetricFinancialTowers from "../components/infographics/VolumetricFinancialTowers";
import MarketCapPositioningRail from "../components/infographics/MarketCapPositioningRail";

function healthLabel(state: CompanyHealthState): string {
  switch (state) {
    case "STRUCTURALLY_HEALTHY":
      return "Structurally Healthy";
    case "STABLE_EXPANSION":
      return "Stable Expansion";
    case "CONFIDENCE_IMPROVING":
      return "Confidence Improving";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "VOLATILITY_SENSITIVE":
      return "Volatility Sensitive";
    case "STRUCTURALLY_FRAGILE":
    default:
      return "Structurally Fragile";
  }
}

export default function CompanyUniversePage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const ticker = useMemo(() => {
    if (typeof window === "undefined") return "TTM";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ticker") ?? "TTM";
    return raw.toUpperCase().trim() || "TTM";
  }, []);

  const model = useCompanyUniverseModel(ticker);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <HiddenGridOverlay />
      <AmbientBackground />
      <div className="noise" />

      {!prefersReducedMotion && <SentimentFlow />}

      {/* Hero Universe */}
      <section
        className="relative z-[11]"
        style={{
          height: "90vh",
          paddingTop: 96,
          paddingBottom: 64,
          paddingLeft: 72,
          paddingRight: 72,
        }}
      >
        <div className="absolute inset-0" />
        <div className="relative h-full">
          {/* Left: narrative */}
          <div className="absolute left-0 top-0 w-full sm:w-[560px]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
              {model.ticker} • {model.marketStateLabel}
            </div>

            <div className="mt-3 text-[56px] font-semibold leading-[1.03] tracking-[-0.04em]">
              {model.companyName}
            </div>

            <div className="mt-4 text-[16px] leading-[1.9] text-white/85 max-w-[560px]">
              {model.narrative.body}
            </div>

            <div className="mt-6 inline-flex items-center gap-3 rounded-[999px] border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[10px]">
              <div
                className="h-[8px] w-[8px] rounded-full"
                style={{
                  background: model.healthTheme.glowCyan,
                  boxShadow: `0 0 18px ${model.healthTheme.glowCyan}`,
                }}
              />
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Healthometer</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                {healthLabel(model.healthState)}
              </div>
            </div>
          </div>

          {/* Center: orb */}
          <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
            <MarketOrb />
            <OrbEffects />
          </div>

          {/* Right: health + telemetry rail */}
          <div className="absolute right-0 top-0 w-[380px]">
            <div className="rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-[24px] p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Healthometer Engine</div>
              <div className="mt-3 text-[20px] font-semibold text-white/92">{healthLabel(model.healthState)}</div>

              <div className="mt-4 text-[13px] leading-[1.7] text-white/80">
                {model.strategicSummary}
              </div>

              <div className="mt-5 rounded-[20px] border border-white/10 bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Market positioning rail</div>
                <div className="mt-2 text-[14px] leading-[1.6] text-white/85">{model.positioningRailLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 + Section 3 (cinematic modules live) */}
      <CompanyFoundingTimeline milestones={model.foundingTimeline} />
      <CompanyLeadershipLayer founders={model.founders} leadership={model.leadership} />

      {/* Section 4 (first master infographic slice) */}
      <MasterInfographicEngine
        enabled={!prefersReducedMotion}
        ticker={model.ticker}
        healthState={model.healthState}
        healthTheme={model.healthTheme}
        financialTelemetry={model.financialTelemetry}
      >
        <VolumetricFinancialTowers points={model.financialTelemetry} />
        <div className="mt-6">
          <MarketCapPositioningRail />
        </div>
      </MasterInfographicEngine>

      {/* Placeholder for remaining sections (scaffolding only; cinematic components follow later) */}
      <section className="relative z-[12] px-6 sm:px-[72px] pb-24">
        <div className="mx-auto max-w-[1680px]">
          <div className="rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[24px] p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Company Universe</div>
            <div className="mt-3 text-[22px] font-medium text-white/92">Cinematic documentary modules (in-progress)</div>
            <div className="mt-4 text-[14px] leading-[1.9] text-white/80">
              Sections 4–12 will be added next: company evolution engine, market share ecosystem, financial telemetry system, healthometer visuals, institutional consensus atmosphere, future probability layer, company news intelligence, temporal performance evolution, and strategic intelligence summary.
            </div>
          </div>
        </div>
      </section>

      {/* SEBI-style trust line */}
      <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45 px-6 sm:px-[72px] pb-10">
        Educational corporate intelligence only • No trade execution • No certainty guarantees
      </div>
    </div>
  );
}
